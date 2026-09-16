<?php

namespace App\Jobs;

use App\Models\Customer;
use App\Models\WhatsappAccount;
use App\Models\WhatsappConversation;
use App\Models\WhatsappMessage;
use App\Models\WhatsappTemplate;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ProcessWhatsappWebhook implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public array $payload)
    {
    }

    public function handle(): void
    {
        foreach ($this->payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                $value = $change['value'] ?? [];
                $field = $change['field'] ?? '';

                if ($field === 'message_template_status_update') {
                    $this->templateStatus($entry['id'] ?? null, $value);
                    continue;
                }

                // Everything else is scoped by the phone number that received it.
                $phoneNumberId = $value['metadata']['phone_number_id'] ?? null;

                if (! $phoneNumberId) {
                    continue;
                }

                $account = WhatsappAccount::where('phone_number_id', $phoneNumberId)->first();

                if (! $account) {
                    // Never guess a tenant. An unknown number is a bug or an
                    // account we no longer serve.
                    Log::info('WhatsApp webhook for unknown number', ['phone_number_id' => $phoneNumberId]);
                    continue;
                }

                $account->update(['last_webhook_at' => now()]);

                foreach ($value['messages'] ?? [] as $message) {
                    $this->inbound($account, $value, $message);
                }

                foreach ($value['statuses'] ?? [] as $status) {
                    $this->status($status);
                }
            }
        }
    }

    private function inbound(WhatsappAccount $account, array $value, array $message): void
    {
        $waId = (string) ($message['from'] ?? '');

        if ($waId === '') {
            return;
        }

        $profileName = $value['contacts'][0]['profile']['name'] ?? null;
        $conversation = $this->conversationFor($account, $waId, $profileName);

        $sentAt = isset($message['timestamp'])
            ? Carbon::createFromTimestamp((int) $message['timestamp'])
            : now();

        // firstOrCreate on the unique wamid is the whole dedupe strategy.
        // Meta delivers at least once, so the same message can arrive twice.
        $record = WhatsappMessage::firstOrCreate(
            ['wamid' => $message['id'] ?? null],
            [
                'store_id' => $account->store_id,
                'whatsapp_conversation_id' => $conversation->id,
                'direction' => 'inbound',
                'type' => $message['type'] ?? 'text',
                'body' => $this->extractBody($message),
                'payload' => $message,
                'media_id' => $this->extractMediaId($message),
                'status' => 'delivered',
                'sent_at' => $sentAt,
            ]
        );

        if (! $record->wasRecentlyCreated) {
            return; // duplicate delivery, nothing more to do
        }

        $conversation->forceFill([
            'last_inbound_at' => $sentAt,
            'last_message_at' => $sentAt,
            'unread_count' => $conversation->unread_count + 1,
            'profile_name' => $conversation->profile_name ?: $profileName,
        ])->save();
    }

    private function status(array $status): void
    {
        $wamid = $status['id'] ?? null;

        if (! $wamid) {
            return;
        }

        $message = WhatsappMessage::where('wamid', $wamid)->first();

        if (! $message) {
            return;
        }

        $state = $status['status'] ?? null;
        $at = isset($status['timestamp'])
            ? Carbon::createFromTimestamp((int) $status['timestamp'])
            : now();

        $updates = ['status' => $state];

        match ($state) {
            'sent' => $updates['sent_at'] = $at,
            'delivered' => $updates['delivered_at'] = $at,
            'read' => $updates['read_at'] = $at,
            'failed' => $updates = array_merge($updates, [
                'error_code' => $status['errors'][0]['code'] ?? null,
                'error_message' => $status['errors'][0]['title'] ?? null,
            ]),
            default => null,
        };

        $message->update($updates);
    }

    private function templateStatus(?string $wabaId, array $value): void
    {
        if (! $wabaId) {
            return;
        }

        $account = WhatsappAccount::where('waba_id', $wabaId)->first();

        if (! $account) {
            return;
        }

        WhatsappTemplate::where('store_id', $account->store_id)
            ->where('name', $value['message_template_name'] ?? '')
            ->update([
                'status' => $value['event'] ?? 'PENDING',
                'rejected_reason' => $value['reason'] ?? null,
            ]);
    }

    private function conversationFor(WhatsappAccount $account, string $waId, ?string $profileName): WhatsappConversation
    {
        $conversation = WhatsappConversation::firstOrCreate(
            ['store_id' => $account->store_id, 'wa_id' => $waId],
            ['profile_name' => $profileName]
        );

        if (! $conversation->customer_id) {
            // Customers are stored with a leading + (see Customer::normalizeWhatsapp),
            // while WhatsApp reports wa_id as bare digits.
            $customer = Customer::where('store_id', $account->store_id)
                ->where('whatsapp', '+' . $waId)
                ->first();

            if ($customer) {
                $conversation->update(['customer_id' => $customer->id]);
            }
        }

        return $conversation;
    }

    private function extractBody(array $message): ?string
    {
        return match ($message['type'] ?? '') {
            'text' => $message['text']['body'] ?? null,
            'button' => $message['button']['text'] ?? null,
            'interactive' => $message['interactive']['button_reply']['title']
                ?? $message['interactive']['list_reply']['title']
                ?? null,
            'image', 'document', 'video', 'audio' => $message[$message['type']]['caption'] ?? null,
            default => null,
        };
    }

    private function extractMediaId(array $message): ?string
    {
        $type = $message['type'] ?? '';

        return in_array($type, ['image', 'document', 'video', 'audio', 'sticker'], true)
            ? ($message[$type]['id'] ?? null)
            : null;
    }
}
