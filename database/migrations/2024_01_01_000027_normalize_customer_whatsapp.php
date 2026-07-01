<?php

use App\Models\Customer;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Canonicalise existing customer WhatsApp numbers to "+<code><national>" so
     * the new country-code picker can parse them and wa.me links stay valid.
     */
    public function up(): void
    {
        Customer::query()->chunkById(200, function ($customers) {
            foreach ($customers as $customer) {
                $normalized = Customer::normalizeWhatsapp($customer->whatsapp);

                if ($normalized === '' || $normalized === $customer->whatsapp) {
                    continue;
                }

                // Respect the (store_id, whatsapp) unique constraint — skip on clash.
                $clash = Customer::where('store_id', $customer->store_id)
                    ->where('whatsapp', $normalized)
                    ->where('id', '!=', $customer->id)
                    ->exists();

                if ($clash) {
                    continue;
                }

                $customer->whatsapp = $normalized;
                $customer->saveQuietly();
            }
        });
    }

    public function down(): void
    {
        // Normalisation is not reversible.
    }
};
