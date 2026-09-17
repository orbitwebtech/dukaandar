<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\WhatsappTemplate;
use App\Services\InvoicePdf;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsappTemplateController extends Controller
{
    /**
     * Create a template on the store's own WABA and mirror it locally.
     *
     * Meta reviews every template. PENDING is a normal state, not an error —
     * the webhook flips it to APPROVED or REJECTED later.
     */
    public function store(Request $request, Store $store)
    {
        $account = $store->whatsappAccount;

        if (! $account?->isConnected()) {
            return back()->withErrors(['template' => 'Connect WhatsApp before creating templates.']);
        }

        $validated = $request->validate([
            // Meta only accepts lowercase letters, digits and underscores.
            'name' => ['required', 'string', 'max:60', 'regex:/^[a-z0-9_]+$/'],
            'language' => 'required|string|max:12',
            'category' => 'required|in:UTILITY,MARKETING',
            'body' => 'required|string|max:1024',
            'footer' => 'nullable|string|max:60',
            'attach_pdf' => 'boolean',
            'examples' => 'array',
            'examples.*' => 'string|max:80',
        ], [
            'name.regex' => 'Use only lowercase letters, numbers and underscores — for example order_ready.',
        ]);

        $placeholders = $this->placeholderCount($validated['body']);
        $examples = array_values(array_filter($validated['examples'] ?? []));

        // Meta requires variables to start at {{1}} and run without gaps. A body
        // using only {{2}} is rejected, and a review cycle is wasted finding out.
        if ($gap = $this->firstMissingPlaceholder($validated['body'], $placeholders)) {
            return back()->withErrors([
                'template' => "This message uses {{{$placeholders}}} but not {{{$gap}}}. WhatsApp needs the blanks numbered in order, starting at {{1}} — renumber them and try again.",
            ]);
        }

        // Meta also refuses a body that opens or closes on a blank.
        if ($edge = $this->variableAtEdge($validated['body'])) {
            return back()->withErrors([
                'template' => $edge === 'start'
                    ? 'The message cannot begin with a blank. Put some words before it — for example "Hello {{1}}," instead of "{{1}},".'
                    : 'The message cannot end with a blank. Add a few words after it — for example "Location: {{1}}. See you soon!"',
            ]);
        }

        // Meta cannot review a template whose variables it can't see filled in,
        // so a missing example is the single most common rejection.
        if (count($examples) < $placeholders) {
            return back()->withErrors([
                'template' => "This message uses {$placeholders} variable(s). Give a sample value for each so Meta can review it.",
            ]);
        }

        $components = [];

        // A document header is what lets the invoice PDF itself reach the
        // customer. Meta will not review one without a sample file to look at.
        if (! empty($validated['attach_pdf'])) {
            // Rendering and uploading both talk to slow things. Shared hosting
            // defaults are tight enough to kill the request mid-way, which
            // leaves no error anywhere — the failure we spent a day chasing.
            @set_time_limit(120);

            try {
                Log::info('WhatsApp template: building sample invoice', [
                    'store_id' => $store->id,
                    'template' => $validated['name'],
                ]);

                $sample = InvoicePdf::sampleBytes($store);

                Log::info('WhatsApp template: uploading sample', [
                    'store_id' => $store->id,
                    'bytes' => strlen($sample),
                ]);

                $handle = CloudApi::uploadSampleFile($sample, 'sample-invoice.pdf');

                Log::info('WhatsApp template: sample uploaded', ['store_id' => $store->id]);
            } catch (\Throwable $e) {
                Log::warning('WhatsApp sample invoice upload failed', [
                    'store_id' => $store->id,
                    'error' => $e->getMessage(),
                ]);

                return back()->withErrors([
                    'template' => 'Could not upload the sample invoice Meta needs to review a PDF template: ' . $e->getMessage(),
                ]);
            }

            $components[] = [
                'type' => 'HEADER',
                'format' => 'DOCUMENT',
                'example' => ['header_handle' => [$handle]],
            ];
        }

        $body = ['type' => 'BODY', 'text' => $validated['body']];

        if ($placeholders > 0) {
            $body['example'] = ['body_text' => [array_slice($examples, 0, $placeholders)]];
        }

        $components[] = $body;

        if (! empty($validated['footer'])) {
            $components[] = ['type' => 'FOOTER', 'text' => $validated['footer']];
        }

        try {
            $response = Http::withToken($account->access_token)
                ->asJson()
                ->post(CloudApi::graphUrl("{$account->waba_id}/message_templates"), [
                    'name' => $validated['name'],
                    'language' => $validated['language'],
                    'category' => $validated['category'],
                    'components' => $components,
                ])
                ->throw()
                ->json();
        } catch (\Illuminate\Http\Client\RequestException $e) {
            // Without this, a rejected template leaves no trace on the server
            // and the only clue is a red box the user may have scrolled past.
            Log::warning('WhatsApp template rejected by Meta', [
                'store_id' => $store->id,
                'template' => $validated['name'],
                'status' => $e->response->status(),
                'response' => $e->response->json('error'),
            ]);

            return back()->withErrors([
                'template' => $e->response->json('error.error_user_msg')
                    ?? $e->response->json('error.message')
                    ?? 'Meta rejected this template.',
            ]);
        }

        WhatsappTemplate::updateOrCreate(
            [
                'store_id' => $store->id,
                'name' => $validated['name'],
                'language' => $validated['language'],
            ],
            [
                'meta_id' => $response['id'] ?? null,
                'category' => $response['category'] ?? $validated['category'],
                'status' => $response['status'] ?? 'PENDING',
                'body' => $validated['body'],
                'components' => $components,
                'rejected_reason' => null,
            ]
        );

        return back()->with('success', 'Template sent to Meta for review.');
    }

    /** Pull the current list from Meta — statuses change without a webhook if we were offline. */
    public function sync(Store $store)
    {
        $account = $store->whatsappAccount;

        if (! $account?->isConnected()) {
            return back()->withErrors(['template' => 'Connect WhatsApp first.']);
        }

        try {
            $templates = CloudApi::for($account)->listTemplates();
        } catch (\Throwable $e) {
            return back()->withErrors(['template' => 'Could not reach Meta: ' . $e->getMessage()]);
        }

        $seen = [];

        foreach ($templates as $t) {
            $body = collect($t['components'] ?? [])
                ->firstWhere('type', 'BODY')['text'] ?? null;

            $language = $t['language'] ?? 'en';
            $seen[] = $t['name'] . '|' . $language;

            WhatsappTemplate::updateOrCreate(
                [
                    'store_id' => $store->id,
                    'name' => $t['name'],
                    'language' => $language,
                ],
                [
                    'meta_id' => $t['id'] ?? null,
                    'category' => $t['category'] ?? 'UTILITY',
                    'status' => $t['status'] ?? 'PENDING',
                    'body' => $body,
                    'components' => $t['components'] ?? null,
                    'rejected_reason' => $t['rejected_reason'] ?? null,
                ]
            );
        }

        // Meta is the source of truth, so a refresh mirrors rather than merges.
        // Without this, a template deleted in WhatsApp Manager stays here still
        // marked APPROVED, keeps being offered in the inbox, and fails on send.
        $removed = WhatsappTemplate::where('store_id', $store->id)
            ->get()
            ->reject(fn ($t) => in_array($t->name . '|' . $t->language, $seen, true))
            ->each->delete()
            ->count();

        $message = count($templates) . ' template(s) synced from Meta.';

        if ($removed > 0) {
            $message .= " {$removed} removed here because " .
                ($removed === 1 ? 'it no longer exists' : 'they no longer exist') . ' at Meta.';
        }

        return back()->with('success', $message);
    }

    private function placeholderCount(string $body): int
    {
        preg_match_all('/\{\{\s*(\d+)\s*\}\}/', $body, $matches);

        return $matches[1] ? max(array_map('intval', $matches[1])) : 0;
    }

    /** Does the body open or close on a variable? Meta refuses both. */
    private function variableAtEdge(string $body): ?string
    {
        $trimmed = trim($body);

        if (preg_match('/^\{\{\s*\d+\s*\}\}/', $trimmed)) {
            return 'start';
        }

        if (preg_match('/\{\{\s*\d+\s*\}\}$/', $trimmed)) {
            return 'end';
        }

        return null;
    }

    /** The lowest number between 1 and the highest used that the body skips. */
    private function firstMissingPlaceholder(string $body, int $highest): ?int
    {
        preg_match_all('/\{\{\s*(\d+)\s*\}\}/', $body, $matches);
        $used = array_map('intval', $matches[1] ?? []);

        for ($i = 1; $i <= $highest; $i++) {
            if (! in_array($i, $used, true)) {
                return $i;
            }
        }

        return null;
    }
}
