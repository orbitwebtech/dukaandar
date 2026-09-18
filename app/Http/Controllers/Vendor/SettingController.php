<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index(Store $store)
    {
        $settings = $store->settings->pluck('value', 'key')->toArray();

        $account = $store->whatsappAccount;

        return Inertia::render('Vendor/Settings/Index', [
            'settings' => $settings,
            // Tokens are hidden on the model, but be explicit about what leaves the server.
            'whatsappAccount' => $account ? [
                'status' => $account->status,
                'display_phone_number' => $account->display_phone_number,
                'verified_name' => $account->verified_name,
                'quality_rating' => $account->quality_rating,
                'messaging_tier' => $account->messaging_tier,
                'last_error' => $account->last_error,
                'connected_at' => $account->connected_at?->diffForHumans(),
                'last_webhook_at' => $account->last_webhook_at?->diffForHumans(),
            ] : null,
            'whatsappTemplates' => $store->whatsappTemplates()
                ->orderBy('name')
                ->get(['name', 'language', 'category', 'status', 'body', 'rejected_reason']),
            'store' => [
                'id' => $store->id,
                'name' => $store->name,
                'slug' => $store->slug,
            ],
            'organization' => [
                'id' => $store->organization->id,
                'name' => $store->organization->name,
            ],
        ]);
    }

    public function update(Request $request, Store $store)
    {
        $allowed = [
            'shop_name', 'owner_name', 'whatsapp_number', 'address', 'city',
            'gst_number', 'prices_include_tax', 'google_review_link', 'instagram_handle',
            'invoice_prefix', 'invoice_footer', 'whatsapp_template', 'show_cost_price',
            'review_text', 'review_reprompt_interval',
            'whatsapp_invoice_template',
            'whatsapp_auto_send_invoice',
            'slow_moving_days', 'primary_color',
        ];

        foreach ($request->only($allowed) as $key => $value) {
            if ($key === 'primary_color') {
                $value = \App\Support\ThemePalette::normalize($value);
            } elseif (is_array($value)) {
                $value = json_encode($value);
            } elseif (is_bool($value)) {
                $value = $value ? '1' : '0';
            }
            $store->setSetting($key, $value);
        }

        return back()->with('success', 'Settings saved successfully.');
    }

    public function uploadLogo(Request $request, Store $store)
    {
        $request->validate(['logo' => 'required|image|max:2048']);

        $path = $request->file('logo')->store('logos', 'public');
        $store->setSetting('logo', $path);

        return back()->with('success', 'Logo uploaded successfully.');
    }
}
