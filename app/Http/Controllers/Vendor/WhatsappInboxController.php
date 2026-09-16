<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\WhatsappConversation;
use App\Services\WhatsApp\CloudApi;
use App\Services\WhatsApp\WhatsappSender;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WhatsappInboxController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $account = $store->whatsappAccount;

        $conversations = $store->whatsappConversations()
            ->with('customer:id,name,whatsapp')
            ->orderByRaw('COALESCE(last_message_at, last_inbound_at, created_at) DESC')
            ->limit(100)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'wa_id' => $c->wa_id,
                'name' => $c->customer?->name ?: ($c->profile_name ?: '+' . $c->wa_id),
                'customer_id' => $c->customer_id,
                'unread_count' => $c->unread_count,
                'window_open' => $c->isWindowOpen(),
                'last_message_at' => $c->last_message_at?->diffForHumans(),
            ]);

        $selected = null;
        $messages = [];

        $conversationId = $request->integer('conversation')
            ?: ($conversations[0]['id'] ?? null);

        if ($conversationId) {
            $conversation = $store->whatsappConversations()
                ->with('customer:id,name,whatsapp')
                ->find($conversationId);

            if ($conversation) {
                // Opening a thread clears its badge.
                if ($conversation->unread_count > 0) {
                    $conversation->update(['unread_count' => 0]);
                }

                $selected = [
                    'id' => $conversation->id,
                    'wa_id' => $conversation->wa_id,
                    'name' => $conversation->customer?->name
                        ?: ($conversation->profile_name ?: '+' . $conversation->wa_id),
                    'customer_id' => $conversation->customer_id,
                    'window_open' => $conversation->isWindowOpen(),
                    'window_expires_at' => $conversation->windowExpiresAt()?->toIso8601String(),
                ];

                $messages = $conversation->messages()
                    ->with('sender:id,name')
                    ->orderBy('created_at')
                    ->limit(200)
                    ->get()
                    ->map(fn ($m) => [
                        'id' => $m->id,
                        'direction' => $m->direction,
                        'type' => $m->type,
                        'body' => $m->body,
                        'status' => $m->status,
                        'error_message' => $m->error_message,
                        'sender' => $m->sender?->name,
                        'at' => $m->created_at->format('d M, g:i a'),
                    ]);
            }
        }

        return Inertia::render('Vendor/Whatsapp/Inbox', [
            'connected' => (bool) $account?->isConnected(),
            'conversations' => $conversations,
            'selected' => $selected,
            'messages' => $messages,
            'templates' => $store->whatsappTemplates()
                ->where('status', 'APPROVED')
                ->orderBy('name')
                ->get(['name', 'language', 'body']),
        ]);
    }

    public function reply(Request $request, Store $store, WhatsappConversation $whatsappConversation)
    {
        $conversation = $whatsappConversation;
        abort_unless($conversation->store_id === $store->id, 404);

        if (! $store->whatsappAccount?->isConnected()) {
            return back()->withErrors(['reply' => 'WhatsApp is not connected.']);
        }

        $validated = $request->validate([
            'body' => 'required_without:template_name|nullable|string|max:4000',
            'template_name' => 'required_without:body|nullable|string|max:60',
            'language' => 'nullable|string|max:12',
            'params' => 'array',
            'params.*' => 'string|max:200',
        ]);

        // Outside the window Meta only accepts approved templates. Refuse here
        // with a clear reason rather than letting the send fail in the queue.
        if (! $conversation->isWindowOpen() && empty($validated['template_name'])) {
            return back()->withErrors([
                'reply' => 'This customer last messaged over 24 hours ago, so you can only send an approved template.',
            ]);
        }

        if (! empty($validated['template_name'])) {
            WhatsappSender::queueTemplate(
                $store,
                $conversation->wa_id,
                $validated['template_name'],
                $validated['language'] ?? 'en',
                $validated['params'] ?? [],
                $conversation->customer,
                $request->user()
            );
        } else {
            WhatsappSender::queueText(
                $store,
                $conversation->wa_id,
                $validated['body'],
                $conversation->customer,
                $request->user()
            );
        }

        return back();
    }

    /** Tell Meta the customer's message was read, so they see the blue ticks. */
    public function markRead(Store $store, WhatsappConversation $whatsappConversation)
    {
        $conversation = $whatsappConversation;
        abort_unless($conversation->store_id === $store->id, 404);

        $conversation->update(['unread_count' => 0]);

        $account = $store->whatsappAccount;
        $lastInbound = $conversation->messages()
            ->where('direction', 'inbound')
            ->whereNotNull('wamid')
            ->latest('created_at')
            ->first();

        if ($account?->isConnected() && $lastInbound) {
            try {
                CloudApi::for($account)->markRead($lastInbound->wamid);
            } catch (\Throwable) {
                // Read receipts are cosmetic — never fail the request over one.
            }
        }

        return back();
    }
}
