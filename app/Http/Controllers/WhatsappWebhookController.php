<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessWhatsappWebhook;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappWebhookController extends Controller
{
    /**
     * Meta's one-time subscription check.
     *
     * Meta sends hub.mode / hub.verify_token / hub.challenge, but PHP turns
     * dots into underscores in query keys — so we read hub_mode. This catches
     * everyone exactly once.
     */
    public function verify(Request $request)
    {
        $expected = (string) config('services.meta.verify_token');

        if ($expected !== ''
            && $request->query('hub_mode') === 'subscribe'
            && hash_equals($expected, (string) $request->query('hub_verify_token', ''))) {
            return response((string) $request->query('hub_challenge'), 200)
                ->header('Content-Type', 'text/plain');
        }

        abort(403);
    }

    /**
     * Receive notifications for every connected store on one URL.
     *
     * Validate, queue, return 200 immediately. A slow response here makes Meta
     * retry, which is how duplicate messages get created.
     */
    public function handle(Request $request)
    {
        $secret = (string) config('services.meta.app_secret');
        $signature = (string) $request->header('X-Hub-Signature-256', '');

        if ($secret === '') {
            Log::error('WhatsApp webhook received but META_APP_SECRET is not set.');
            abort(500);
        }

        // The signature covers the RAW body. Re-encoding the parsed array
        // produces different bytes and will never match.
        $expected = 'sha256=' . hash_hmac('sha256', $request->getContent(), $secret);

        if (! hash_equals($expected, $signature)) {
            Log::warning('WhatsApp webhook rejected: bad signature', ['ip' => $request->ip()]);
            abort(401);
        }

        \App\Services\WhatsApp\Dispatch::job(ProcessWhatsappWebhook::dispatch($request->all()));

        return response()->noContent();
    }
}
