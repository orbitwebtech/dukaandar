<?php

namespace App\Console\Commands;

use App\Jobs\ProcessWhatsappWebhook;
use App\Models\Store;
use Illuminate\Console\Command;

/**
 * Local testing helper.
 *
 * Feeds a realistic Meta webhook payload straight into the same job the real
 * webhook dispatches, so the inbox, customer matching and the 24-hour window
 * can be exercised before a public URL exists.
 */
class WhatsappSimulateInbound extends Command
{
    protected $signature = 'whatsapp:simulate
                            {store : Store slug}
                            {--from= : Customer number, digits only, e.g. 919876500101}
                            {--text=Hi, is my order ready? : Message text}';

    protected $description = 'Simulate a customer WhatsApp message arriving (no Meta needed)';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to run in production.');

            return self::FAILURE;
        }

        $store = Store::where('slug', $this->argument('store'))->first();

        if (! $store) {
            $this->error("No store with slug '{$this->argument('store')}'.");

            return self::FAILURE;
        }

        $account = $store->whatsappAccount;

        if (! $account) {
            $this->error('This store has no WhatsApp connection. Run whatsapp:link first.');

            return self::FAILURE;
        }

        $from = $this->option('from')
            ?: ltrim((string) $store->customers()->value('whatsapp'), '+');

        if (! $from) {
            $this->error('No --from given and no customer found to borrow a number from.');

            return self::FAILURE;
        }

        $customerName = $store->customers()
            ->where('whatsapp', '+' . $from)
            ->value('name') ?: 'WhatsApp user';

        $payload = [
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'id' => $account->waba_id,
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'metadata' => [
                            'display_phone_number' => $account->display_phone_number ?? '',
                            'phone_number_id' => $account->phone_number_id,
                        ],
                        'contacts' => [[
                            'profile' => ['name' => $customerName],
                            'wa_id' => $from,
                        ]],
                        'messages' => [[
                            'from' => $from,
                            // Unique per run, so repeated calls create separate messages
                            // rather than being deduped as a Meta retry.
                            'id' => 'wamid.SIM_' . bin2hex(random_bytes(6)),
                            'timestamp' => (string) now()->timestamp,
                            'type' => 'text',
                            'text' => ['body' => $this->option('text')],
                        ]],
                    ],
                ]],
            ]],
        ];

        ProcessWhatsappWebhook::dispatchSync($payload);

        $this->info("Delivered a message from +{$from} to {$store->name}.");
        $this->line("Open the WhatsApp tab in the app — the 24-hour reply window is now open for this customer.");

        return self::SUCCESS;
    }
}
