<?php

namespace App\Console\Commands;

use App\Jobs\SendWhatsappMessage;
use App\Models\WhatsappMessage;
use Illuminate\Console\Command;

/**
 * Sends queued WhatsApp messages immediately, in this process.
 *
 * queue:work hides the reason a job keeps failing: it releases the job, the
 * message stays queued, and the exception only reaches the log. This runs the
 * same job inline and prints what happened to each message, which is what you
 * want when a send is stuck and you need the actual error.
 */
class WhatsappSendQueued extends Command
{
    protected $signature = 'whatsapp:send-queued
                            {--limit=10 : How many to attempt}
                            {--id= : Send one specific message id}
                            {--cancel : Give up on queued messages instead of sending them}';

    protected $description = 'Send queued WhatsApp messages now and report what happened';

    public function handle(): int
    {
        if ($this->option('cancel')) {
            return $this->cancel();
        }

        $query = WhatsappMessage::where('direction', 'outbound')
            ->where('status', 'queued')
            ->orderBy('id');

        if ($this->option('id')) {
            $query->where('id', $this->option('id'));
        }

        $messages = $query->limit((int) $this->option('limit'))->get();

        if ($messages->isEmpty()) {
            $this->info('Nothing is queued.');

            return self::SUCCESS;
        }

        $this->line("Attempting {$messages->count()} message(s)…");
        $this->newLine();

        $sent = 0;

        foreach ($messages as $message) {
            $this->line("#{$message->id}  {$message->type}  to +{$message->conversation?->wa_id}");

            // A parameter mismatch is almost always our copy of the template
            // disagreeing with Meta's, so show what we are working from.
            if ($message->template_name) {
                $template = \App\Models\WhatsappTemplate::where('store_id', $message->store_id)
                    ->where('name', $message->template_name)
                    ->first();

                $this->line("  template: {$message->template_name} ({$message->payload['language']})");

                if (! $template) {
                    $this->error('  We hold no copy of this template. Press Refresh from Meta in Settings.');
                } else {
                    $body = $template->body ?: $template->bodyFromComponents();

                    $this->line('  our copy expects ' . $template->variableCount() . ' value(s)'
                        . ', header: ' . ($template->headerFormat() ?? 'none'));
                    $this->line('  body: ' . ($body ? mb_strimwidth(str_replace("\n", ' ', $body), 0, 70, '…') : '(empty — never refreshed from Meta)'));
                    $this->line('  sending ' . count($message->payload['params'] ?? []) . ' value(s)');

                    // Every component Meta declares can demand its own
                    // parameter, and a button with a variable is the usual
                    // culprit behind "required parameter is missing".
                    foreach ($template->components ?? [] as $component) {
                        $type = strtoupper($component['type'] ?? '?');

                        if ($type !== 'BUTTONS') {
                            $this->line("    component: {$type} " . ($component['format'] ?? ''));

                            continue;
                        }

                        foreach ($component['buttons'] ?? [] as $i => $button) {
                            $this->line(sprintf(
                                '    button %d: %s  %s%s',
                                $i,
                                strtoupper($button['type'] ?? '?'),
                                $button['text'] ?? '',
                                isset($button['url']) ? '  url=' . $button['url'] : ''
                            ));
                        }
                    }
                }
            }

            try {
                // Straight to handle(), so nothing is swallowed by the queue.
                (new SendWhatsappMessage($message->id))->handle();
            } catch (\Throwable $e) {
                $this->error('  Threw: ' . $this->explain($e));

                continue;
            }

            $message->refresh();

            if ($message->status === 'accepted' || $message->status === 'sent') {
                $this->info("  Sent. wamid {$message->wamid}");
                $sent++;

                continue;
            }

            $this->error("  Still {$message->status}.");

            if ($message->error_message) {
                $this->line('  ' . $message->error_message);
            }

            if ($message->error_code) {
                $this->line('  Meta error code: ' . $message->error_code);
            }
        }

        $this->newLine();
        $this->line("{$sent} of {$messages->count()} sent.");

        if ($sent < $messages->count()) {
            $this->newLine();
            $this->comment('If nothing sent, the usual causes are:');
            $this->line('  - no payment method on the WhatsApp account (business-initiated messages are chargeable)');
            $this->line('  - the customer has not messaged in 24 hours and no approved template is available');
            $this->line('  - the access token has expired');
            $this->line('Run whatsapp:diagnose <store-slug> to check those.');
        }

        return self::SUCCESS;
    }

    /**
     * Stop trying, and say so on the message.
     *
     * Clearing the jobs table alone would leave these rows queued forever,
     * showing "sending…" in the inbox for something nothing will ever send.
     */
    private function cancel(): int
    {
        $messages = WhatsappMessage::where('direction', 'outbound')
            ->where('status', 'queued')
            ->get();

        if ($messages->isEmpty()) {
            $this->info('Nothing is queued.');

            return self::SUCCESS;
        }

        foreach ($messages as $message) {
            $message->update([
                'status' => 'failed',
                'error_message' => 'Cancelled before sending.',
            ]);

            $this->line("  #{$message->id} cancelled");
        }

        $this->newLine();
        $this->info($messages->count() . ' message(s) cancelled.');
        $this->line('The queued jobs themselves are separate — clear those with: artisan queue:clear');

        return self::SUCCESS;
    }

    private function explain(\Throwable $e): string
    {
        if ($e instanceof \Illuminate\Http\Client\RequestException) {
            return 'HTTP ' . $e->response->status() . ' ' . $e->response->body();
        }

        return get_class($e) . ': ' . $e->getMessage();
    }
}
