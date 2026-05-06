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

        return Inertia::render('Vendor/Settings/Index', [
            'settings' => $settings,
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
            'slow_moving_days',
        ];

        foreach ($request->only($allowed) as $key => $value) {
            if (is_array($value)) {
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
