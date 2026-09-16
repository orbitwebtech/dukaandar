<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Models\WhatsappAccount;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Console\Command;

/**
 * Local testing helper.
 *
 * Embedded Signup cannot be used with Meta's free test number, and it needs
 * advanced access before an outside shop can complete it. This links a number
 * to a store directly so the app can be exercised before either is in place.
 */
class WhatsappLinkNumber extends Command
{
    protected $signature = 'whatsapp:link
                            {store : Store slug, e.g. shivam-fashion-ahmedabad}
                            {--phone-number-id= : From the Meta dashboard, WhatsApp > API Setup}
                            {--waba-id= : The WhatsApp Business Account id shown on the same screen}
                            {--token= : Temporary or system-user access token}
                            {--demo : Link a fake number so the screens can be clicked without Meta}
                            {--register : Also register the number for Cloud API (only if it is still Pending)}
                            {--no-subscribe : Skip subscribing this app to the account\'s webhooks}
                            {--clear : Remove this store\'s WhatsApp connection}';

    protected $description = 'Link a WhatsApp number to a store for local testing';

    public function handle(): int
    {
        if (app()->environment('production')) {
            $this->error('Refusing to run in production. Use Embedded Signup there.');

            return self::FAILURE;
        }

        $store = Store::where('slug', $this->argument('store'))->first();

        if (! $store) {
            $this->error("No store with slug '{$this->argument('store')}'.");
            $this->line('Available: ' . Store::pluck('slug')->implode(', '));

            return self::FAILURE;
        }

        if ($this->option('clear')) {
            $store->whatsappAccount?->delete();
            $this->info("Disconnected WhatsApp for {$store->name}.");

            return self::SUCCESS;
        }

        if ($this->option('demo')) {
            WhatsappAccount::updateOrCreate(['store_id' => $store->id], [
                'waba_id' => 'DEMO-WABA',
                'phone_number_id' => 'DEMO-' . $store->id,
                'access_token' => 'demo-token-not-real',
                'display_phone_number' => '+91 90000 00000',
                'verified_name' => $store->getSetting('shop_name', $store->name),
                'status' => 'connected',
                'connected_at' => now(),
            ]);

            $this->info("Demo number linked to {$store->name}.");
            $this->warn('Nothing will actually reach WhatsApp — sends will fail at Meta. Use this only to click through the screens.');

            return self::SUCCESS;
        }

        foreach (['phone-number-id', 'waba-id', 'token'] as $required) {
            if (! $this->option($required)) {
                $this->error("--{$required} is required (or pass --demo).");

                return self::FAILURE;
            }
        }

        $token = $this->option('token');
        $phoneNumberId = $this->option('phone-number-id');

        $this->line('Checking the number with Meta…');

        try {
            $details = CloudApi::phoneNumberDetails($phoneNumberId, $token);
        } catch (\Throwable $e) {
            $this->error('Meta rejected that number or token:');
            $this->line('  ' . $e->getMessage());

            return self::FAILURE;
        }

        $account = WhatsappAccount::updateOrCreate(['store_id' => $store->id], [
            'waba_id' => $this->option('waba-id'),
            'phone_number_id' => $phoneNumberId,
            'access_token' => $token,
            'display_phone_number' => $details['display_phone_number'] ?? null,
            'verified_name' => $details['verified_name'] ?? null,
            'quality_rating' => $details['quality_rating'] ?? null,
            'status' => 'connected',
            'connected_at' => now(),
            'last_error' => null,
        ]);

        $this->info("Linked {$details['display_phone_number']} to {$store->name}.");

        // Embedded Signup does this automatically. A number linked by hand has
        // not had it done, and without it no incoming message ever arrives.
        if (! $this->option('no-subscribe')) {
            try {
                CloudApi::subscribeApp($account->waba_id, $token);
                $this->info('Subscribed this app to the account\'s webhooks.');
            } catch (\Throwable $e) {
                $this->error('Could not subscribe to webhooks: ' . $e->getMessage());
                $this->line('Incoming messages will not arrive until this succeeds.');
            }
        }

        if ($this->option('register')) {
            $pin = $account->two_step_pin
                ?: str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

            try {
                CloudApi::registerNumber($account->phone_number_id, $token, $pin);
                $account->update(['two_step_pin' => $pin]);
                $this->info('Number registered for Cloud API. PIN stored.');
            } catch (\Throwable $e) {
                // Already-registered numbers fail here, which is harmless.
                $this->warn('Registration skipped: ' . $e->getMessage());
            }
        }

        $this->newLine();
        $this->line('Sending works now. For replies to arrive, the app\'s webhook callback URL');
        $this->line('must also be set in the Meta dashboard, subscribed to the "messages" field.');

        return self::SUCCESS;
    }
}
