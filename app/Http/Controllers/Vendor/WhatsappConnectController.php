<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\WhatsappAccount;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappConnectController extends Controller
{
    /**
     * Finish Embedded Signup for this store.
     *
     * The browser sends only the one-time code plus the two asset ids Meta
     * posted to it. The token exchange happens here so no token ever reaches
     * the React bundle.
     */
    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'waba_id' => 'required|string|max:64',
            'phone_number_id' => 'required|string|max:64',
        ]);

        // A number can only belong to one store. Catch it before Meta does.
        $takenElsewhere = WhatsappAccount::where('phone_number_id', $validated['phone_number_id'])
            ->where('store_id', '!=', $store->id)
            ->exists();

        if ($takenElsewhere) {
            return back()->withErrors([
                'whatsapp' => 'That WhatsApp number is already connected to another store.',
            ]);
        }

        try {
            $token = CloudApi::exchangeCode($validated['code']);
        } catch (\Throwable $e) {
            Log::warning('WhatsApp code exchange failed', [
                'store_id' => $store->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'whatsapp' => 'Could not complete the connection with Meta. Please try connecting again.',
            ]);
        }

        // Save the token first: re-registering a number is cheap, re-running
        // signup is not. Everything after this point is recoverable.
        $account = WhatsappAccount::updateOrCreate(
            ['store_id' => $store->id],
            [
                'waba_id' => $validated['waba_id'],
                'phone_number_id' => $validated['phone_number_id'],
                'access_token' => $token,
                'status' => 'pending',
                'last_error' => null,
            ]
        );

        try {
            CloudApi::subscribeApp($account->waba_id, $token);

            if (! $account->two_step_pin) {
                $account->two_step_pin = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            }

            CloudApi::registerNumber($account->phone_number_id, $token, $account->two_step_pin);

            $details = CloudApi::phoneNumberDetails($account->phone_number_id, $token);

            $account->fill([
                'display_phone_number' => $details['display_phone_number'] ?? null,
                'verified_name' => $details['verified_name'] ?? null,
                'quality_rating' => $details['quality_rating'] ?? null,
                'status' => 'connected',
                'connected_at' => now(),
            ])->save();
        } catch (\Throwable $e) {
            $account->fill([
                'status' => 'pending',
                'last_error' => substr($e->getMessage(), 0, 250),
            ])->save();

            Log::warning('WhatsApp connection incomplete', [
                'store_id' => $store->id,
                'error' => $e->getMessage(),
            ]);

            return back()->withErrors([
                'whatsapp' => 'Connected to Meta, but the number could not be registered yet. Try Retry registration in a moment.',
            ]);
        }

        return back()->with('success', 'WhatsApp connected successfully.');
    }

    /** Re-run registration without repeating the whole signup. */
    public function retry(Store $store)
    {
        $account = $store->whatsappAccount;

        if (! $account) {
            return back()->withErrors(['whatsapp' => 'Connect WhatsApp first.']);
        }

        try {
            CloudApi::registerNumber(
                $account->phone_number_id,
                $account->access_token,
                $account->two_step_pin ?? str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT)
            );

            $account->fill(['status' => 'connected', 'connected_at' => now(), 'last_error' => null])->save();
        } catch (\Throwable $e) {
            $account->update(['last_error' => substr($e->getMessage(), 0, 250)]);

            return back()->withErrors(['whatsapp' => 'Registration failed again: ' . $e->getMessage()]);
        }

        return back()->with('success', 'Number registered.');
    }

    /** Forget the token. The store can reconnect at any time. */
    public function destroy(Store $store)
    {
        $store->whatsappAccount?->delete();

        return back()->with('success', 'WhatsApp disconnected.');
    }
}
