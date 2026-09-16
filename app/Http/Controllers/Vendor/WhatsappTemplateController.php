<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\WhatsappTemplate;
use App\Services\InvoicePdf;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

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
            try {
                $handle = CloudApi::uploadSampleFile(
                    InvoicePdf::sampleBytes($store),
                    'sample-invoice.pdf'
                );
            } catch (\Throwable $e) {
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

        foreach ($templates as $t) {
            $body = collect($t['components'] ?? [])
                ->firstWhere('type', 'BODY')['text'] ?? null;

            WhatsappTemplate::updateOrCreate(
                [
                    'store_id' => $store->id,
                    'name' => $t['name'],
                    'language' => $t['language'] ?? 'en',
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

        return back()->with('success', count($templates) . ' template(s) synced from Meta.');
    }

    private function placeholderCount(string $body): int
    {
        preg_match_all('/\{\{\s*(\d+)\s*\}\}/', $body, $matches);

        return $matches[1] ? max(array_map('intval', $matches[1])) : 0;
    }
}
