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

        WhatsappAccount::updateOrCreate(['store_id' => $store->id], [
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
        $this->line('Sending will work now. Receiving still needs the webhook pointed at a public URL.');

        return self::SUCCESS;
    }
}
