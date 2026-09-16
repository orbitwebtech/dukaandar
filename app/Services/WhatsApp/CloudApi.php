<?php

namespace App\Services\WhatsApp;

use App\Models\WhatsappAccount;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Thin wrapper over Meta's WhatsApp Cloud API.
 *
 * Every call is made with the *store's* own business token against the store's
 * own phone number id — we are a Tech Provider, not the sender. The app secret
 * is only ever used for the one-time code exchange and webhook signatures.
 */
class CloudApi
{
    public function __construct(private ?WhatsappAccount $account = null)
    {
    }

    public static function for(WhatsappAccount $account): self
    {
        return new self($account);
    }

    public static function graphUrl(string $path = ''): string
    {
        $version = config('services.meta.graph_version');

        return rtrim("https://graph.facebook.com/{$version}/" . ltrim($path, '/'), '/');
    }

    /**
     * Exchange the short-lived code from Embedded Signup for the store's
     * business access token. Embedded Signup takes no redirect_uri — passing
     * one fails with an opaque OAuth error.
     */
    public static function exchangeCode(string $code): string
    {
        $response = Http::asJson()
            ->get(self::graphUrl('oauth/access_token'), [
                'client_id' => config('services.meta.app_id'),
                'client_secret' => config('services.meta.app_secret'),
                'code' => $code,
            ])
            ->throw();

        $token = $response->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new \RuntimeException('Meta did not return an access token for this code.');
        }

        return $token;
    }

    /** Subscribe our app to this WABA so webhooks start flowing. */
    public static function subscribeApp(string $wabaId, string $token): void
    {
        Http::withToken($token)
            ->post(self::graphUrl("{$wabaId}/subscribed_apps"))
            ->throw();
    }

    /**
     * Claim the number for Cloud API. Meta rate limits this to 10 calls per
     * number per 72 hours (error 133016), so it must never sit inside a retry
     * loop — that is why the PIN is stored rather than regenerated.
     */
    public static function registerNumber(string $phoneNumberId, string $token, string $pin): void
    {
        Http::withToken($token)
            ->post(self::graphUrl("{$phoneNumberId}/register"), [
                'messaging_product' => 'whatsapp',
                'pin' => $pin,
            ])
            ->throw();
    }

    /** Display number, verified name, quality rating and messaging tier. */
    public static function phoneNumberDetails(string $phoneNumberId, string $token): array
    {
        return Http::withToken($token)
            ->get(self::graphUrl($phoneNumberId), [
                'fields' => 'display_phone_number,verified_name,quality_rating,throughput,status,code_verification_status,platform_type',
            ])
            ->throw()
            ->json() ?: [];
    }

    /**
     * Is this number already usable for Cloud API messaging?
     *
     * A number registered previously — by hand, or by an earlier connection —
     * needs no second registration, and attempting one fails on the two-step
     * PIN it already has.
     */
    public static function isAlreadyRegistered(array $details): bool
    {
        return in_array(strtoupper((string) ($details['status'] ?? '')), ['CONNECTED', 'VERIFIED'], true);
    }

    /** Send a free-form text reply. Only valid inside the 24-hour window. */
    public function sendText(string $to, string $body): array
    {
        return $this->request()
            ->post(self::graphUrl("{$this->account->phone_number_id}/messages"), [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $to,
                'type' => 'text',
                'text' => ['preview_url' => true, 'body' => $body],
            ])
            ->throw()
            ->json() ?: [];
    }

    /**
     * Upload a file to the store's number and get a media id back.
     *
     * Media ids last 30 days and are scoped to the phone number, which is why
     * this is preferred over giving Meta a public link to fetch — nothing about
     * the invoice is exposed on the open web.
     */
    public function uploadMedia(string $contents, string $filename, string $mime = 'application/pdf'): string
    {
        $response = Http::withToken($this->account->access_token)
            ->timeout(60)
            ->attach('file', $contents, $filename, ['Content-Type' => $mime])
            ->post(self::graphUrl("{$this->account->phone_number_id}/media"), [
                'messaging_product' => 'whatsapp',
                'type' => $mime,
            ])
            ->throw()
            ->json();

        $id = $response['id'] ?? null;

        if (! $id) {
            throw new \RuntimeException('Meta accepted the upload but returned no media id.');
        }

        return $id;
    }

    /** Send a file on its own. Only valid inside the 24-hour window. */
    public function sendDocument(string $to, string $mediaId, string $filename, ?string $caption = null): array
    {
        $document = ['id' => $mediaId, 'filename' => $filename];

        if ($caption !== null && $caption !== '') {
            $document['caption'] = $caption;
        }

        return $this->request()
            ->post(self::graphUrl("{$this->account->phone_number_id}/messages"), [
                'messaging_product' => 'whatsapp',
                'recipient_type' => 'individual',
                'to' => $to,
                'type' => 'document',
                'document' => $document,
            ])
            ->throw()
            ->json() ?: [];
    }

    /**
     * Send an approved template. Valid at any time.
     *
     * $headerDocument attaches a PDF to a template whose header format is
     * DOCUMENT — this is the only way to put a file in front of a customer once
     * the 24-hour window has closed.
     */
    public function sendTemplate(
        string $to,
        string $name,
        string $language,
        array $bodyParams = [],
        ?array $headerDocument = null
    ): array {
        $components = [];

        if ($headerDocument) {
            $components[] = [
                'type' => 'header',
                'parameters' => [[
                    'type' => 'document',
                    'document' => array_filter([
                        'id' => $headerDocument['id'] ?? null,
                        'link' => $headerDocument['link'] ?? null,
                        'filename' => $headerDocument['filename'] ?? null,
                    ]),
                ]],
            ];
        }

        if ($bodyParams !== []) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(
                    fn ($value) => ['type' => 'text', 'text' => (string) $value],
                    array_values($bodyParams)
                ),
            ];
        }

        $template = ['name' => $name, 'language' => ['code' => $language]];

        if ($components !== []) {
            $template['components'] = $components;
        }

        return $this->request()
            ->post(self::graphUrl("{$this->account->phone_number_id}/messages"), [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'template',
                'template' => $template,
            ])
            ->throw()
            ->json() ?: [];
    }

    /**
     * Upload a sample file for template approval and return its handle.
     *
     * A template with a document header cannot be submitted without an example
     * file, because Meta's reviewers need to see what customers will receive.
     * This uses the resumable upload API and the app token rather than a
     * store's token — the sample belongs to the app, not to any one shop.
     */
    public static function uploadSampleFile(string $contents, string $filename, string $mime = 'application/pdf'): string
    {
        $appId = config('services.meta.app_id');
        $appToken = $appId . '|' . config('services.meta.app_secret');

        $sessionId = Http::asForm()
            ->post(self::graphUrl("{$appId}/uploads"), [
                'file_length' => strlen($contents),
                'file_type' => $mime,
                'file_name' => $filename,
                'access_token' => $appToken,
            ])
            ->throw()
            ->json('id');

        if (! $sessionId) {
            throw new \RuntimeException('Meta did not start an upload session for the sample file.');
        }

        $handle = Http::withHeaders([
            'Authorization' => 'OAuth ' . $appToken,
            'file_offset' => '0',
        ])
            ->withBody($contents, $mime)
            ->timeout(60)
            ->post(self::graphUrl($sessionId))
            ->throw()
            ->json('h');

        if (! $handle) {
            throw new \RuntimeException('Meta did not return a file handle for the sample file.');
        }

        return $handle;
    }

    /** Templates live on the WABA, not the phone number. */
    public function listTemplates(): array
    {
        return $this->request()
            ->get(self::graphUrl("{$this->account->waba_id}/message_templates"), ['limit' => 200])
            ->throw()
            ->json('data') ?: [];
    }

    public function markRead(string $wamid): void
    {
        $this->request()
            ->post(self::graphUrl("{$this->account->phone_number_id}/messages"), [
                'messaging_product' => 'whatsapp',
                'status' => 'read',
                'message_id' => $wamid,
            ]);
    }

    private function request(): PendingRequest
    {
        if (! $this->account) {
            throw new \LogicException('This CloudApi call needs a store account. Use CloudApi::for($account).');
        }

        return Http::withToken($this->account->access_token)
            ->asJson()
            ->timeout(20)
            // Only retry what retrying can fix. A 4xx from Meta — a revoked
            // token, a closed 24-hour window — is permanent, and repeating it
            // just burns rate limit.
            ->retry(2, 200, function ($exception) {
                if ($exception instanceof \Illuminate\Http\Client\ConnectionException) {
                    return true;
                }

                return $exception instanceof \Illuminate\Http\Client\RequestException
                    && in_array($exception->response->status(), [429, 500, 502, 503, 504], true);
            }, throw: false);
    }
}
