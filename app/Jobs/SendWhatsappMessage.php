<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\WhatsappMessage;
use App\Services\InvoicePdf;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendWhatsappMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [5, 30];

    public function __construct(public int $messageId)
    {
    }

    public function handle(): void
    {
        $message = WhatsappMessage::find($this->messageId);

        if (! $message || $message->status !== 'queued') {
            return; // deleted, or already sent by an earlier attempt
        }

        $account = $message->conversation?->store?->whatsappAccount;

        if (! $account || ! $account->isConnected()) {
            $this->markFailed($message, null, 'WhatsApp is not connected for this store.');

            return;
        }

        $api = CloudApi::for($account);
        $to = $message->conversation->wa_id;

        try {
            $response = match ($message->type) {
                'document' => $this->sendInvoiceDocument($api, $message, $to),
                'template' => $api->sendTemplate(
                    $to,
                    $message->template_name,
                    $message->payload['language'] ?? 'en',
                    $message->payload['params'] ?? []
                ),
                default => $api->sendText($to, (string) $message->body),
            };
        } catch (\Throwable $e) {
            $this->handleFailure($message, $e);

            return;
        }

        $wamid = $response['messages'][0]['id'] ?? null;

        $message->update([
            'wamid' => $wamid,
            'status' => 'accepted',
            'sent_at' => now(),
        ]);

        $message->conversation->update(['last_message_at' => now()]);
    }

    /**
     * Render the invoice, upload it once, and attach it — either as a plain
     * document inside the 24-hour window, or in an approved template's header
     * outside it.
     */
    private function sendInvoiceDocument(CloudApi $api, WhatsappMessage $message, string $to): array
    {
        $order = $message->order ?? Order::find($message->payload['attach_invoice_for_order'] ?? null);

        if (! $order) {
            throw new \RuntimeException('The order for this invoice no longer exists.');
        }

        $filename = $message->payload['filename'] ?? InvoicePdf::filename($order);

        // Reuse the id if this is a retry — media lasts 30 days, and uploading
        // the same PDF again on every attempt is pure waste.
        $mediaId = $message->media_id ?: $api->uploadMedia(InvoicePdf::bytes($order), $filename);

        if ($mediaId !== $message->media_id) {
            $message->update(['media_id' => $mediaId]);
        }

        if ($message->template_name) {
            return $api->sendTemplate(
                $to,
                $message->template_name,
                $message->payload['language'] ?? 'en',
                $message->payload['params'] ?? [],
                ['id' => $mediaId, 'filename' => $filename]
            );
        }

        return $api->sendDocument($to, $mediaId, $filename, (string) $message->body);
    }

    private function handleFailure(WhatsappMessage $message, \Throwable $e): void
    {
        $code = null;
        $detail = $e->getMessage();

        if ($e instanceof \Illuminate\Http\Client\RequestException) {
            $body = $e->response->json();
            $code = $body['error']['code'] ?? null;
            $detail = $body['error']['message'] ?? $detail;
        }

        // 190 means the store revoked our access or the token expired. Retrying
        // cannot help, and every later send would fail silently in the queue.
        if ((int) $code === 190) {
            $account = $message->conversation?->store?->whatsappAccount;
            $account?->update([
                'status' => 'disconnected',
                'last_error' => 'Access was revoked. Please reconnect WhatsApp.',
            ]);

            $this->markFailed($message, $code, 'Access was revoked. Reconnect WhatsApp in Settings.');

            return;
        }

        // Out of the 24-hour window: a template is required, retrying will not help.
        if (in_array((int) $code, [131047, 131026], true)) {
            $this->markFailed($message, $code, 'This customer has not messaged in the last 24 hours, so a template is required.');

            return;
        }

        if ($this->attempts() >= $this->tries) {
            $this->markFailed($message, $code, $detail);

            return;
        }

        Log::warning('WhatsApp send failed, will retry', [
            'message_id' => $message->id,
            'code' => $code,
        ]);

        $this->release($this->backoff[$this->attempts() - 1] ?? 30);
    }

    private function markFailed(WhatsappMessage $message, $code, string $reason): void
    {
        $message->update([
            'status' => 'failed',
            'error_code' => $code,
            'error_message' => substr($reason, 0, 250),
        ]);
    }
}
