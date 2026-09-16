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
                'fields' => 'display_phone_number,verified_name,quality_rating,throughput',
            ])
            ->throw()
            ->json() ?: [];
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

    /** Send an approved template. Valid at any time. */
    public function sendTemplate(string $to, string $name, string $language, array $bodyParams = []): array
    {
        $components = [];

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
