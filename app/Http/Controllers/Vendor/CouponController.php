<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\Customer;
use App\Models\Store;
use App\Services\CouponService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CouponController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $coupons = $store->coupons()
            ->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10));

        return Inertia::render('Vendor/Coupons/Index', ['coupons' => $coupons]);
    }

    public function create(Store $store)
    {
        return Inertia::render('Vendor/Coupons/Form');
    }

    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'discount_type' => 'required|in:flat,percent',
            'discount_value' => 'required|numeric|min:0',
            'min_order_value' => 'nullable|numeric|min:0',
            'valid_days' => 'required|integer|min:1',
            'auto_send_threshold' => 'nullable|numeric|min:0',
            'active' => 'boolean',
        ]);

        $validated['code'] = strtoupper($validated['code']);

        if ($store->coupons()->where('code', $validated['code'])->exists()) {
            return back()->withErrors(['code' => 'This coupon code already exists.']);
        }

        $store->coupons()->create($validated);

        return redirect()->route('coupons.index')->with('success', 'Coupon created.');
    }

    public function edit(Store $store, Coupon $coupon)
    {
        return Inertia::render('Vendor/Coupons/Form', ['coupon' => $coupon]);
    }

    public function update(Request $request, Store $store, Coupon $coupon)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'discount_type' => 'required|in:flat,percent',
            'discount_value' => 'required|numeric|min:0',
            'min_order_value' => 'nullable|numeric|min:0',
            'valid_days' => 'required|integer|min:1',
            'auto_send_threshold' => 'nullable|numeric|min:0',
            'active' => 'boolean',
        ]);

        $validated['code'] = strtoupper($validated['code']);
        $coupon->update($validated);

        return redirect()->route('coupons.index')->with('success', 'Coupon updated.');
    }

    public function destroy(Store $store, Coupon $coupon)
    {
        $coupon->delete();
        return redirect()->route('coupons.index')->with('success', 'Coupon deleted.');
    }

    public function toggle(Store $store, Coupon $coupon)
    {
        $coupon->update(['active' => !$coupon->active]);
        return back()->with('success', $coupon->active ? 'Coupon activated.' : 'Coupon deactivated.');
    }

    public function validate(Request $request, Store $store, CouponService $coupons)
    {
        $validated = $request->validate([
            'code' => 'required|string',
            'customer_id' => 'required|integer',
            'subtotal' => 'required|numeric|min:0',
        ]);

        $customer = Customer::where('store_id', $store->id)->find($validated['customer_id']);
        if (!$customer) {
            return response()->json(['valid' => false, 'message' => 'Customer not found in this store.'], 404);
        }

        $issuance = $coupons->findValidIssuance($store, $customer, $validated['code']);
        if (!$issuance) {
            return response()->json([
                'valid' => false,
                'message' => 'Coupon is invalid, expired, used, or not issued to this customer.',
            ]);
        }

        $coupon = $issuance->coupon;
        $subtotal = (float) $validated['subtotal'];

        if ((float) $coupon->min_order_value > $subtotal) {
            $missing = $coupon->min_order_value - $subtotal;
            return response()->json([
                'valid' => false,
                'message' => "Order subtotal must be at least ₹{$coupon->min_order_value} (need ₹" . number_format($missing, 2) . " more).",
            ]);
        }

        $discount = $coupons->calculateDiscount($coupon, $subtotal);

        return response()->json([
            'valid' => true,
            'message' => "Coupon will apply ₹" . number_format($discount, 2) . " off ({$coupon->name}).",
            'discount_amount' => $discount,
            'discount_type' => $coupon->discount_type,
            'discount_value' => (float) $coupon->discount_value,
        ]);
    }
}
