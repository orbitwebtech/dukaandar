<?php

namespace App\Services;

use App\Models\Coupon;
use App\Models\CouponIssuance;
use App\Models\Customer;
use App\Models\Store;

class CouponService
{
    public function autoIssueFor(Customer $customer): array
    {
        $issued = [];
        $coupons = Coupon::where('store_id', $customer->store_id)
            ->where('active', true)
            ->whereNotNull('auto_send_threshold')
            ->where('auto_send_threshold', '<=', $customer->total_spent)
            ->get();

        foreach ($coupons as $coupon) {
            // Auto-issue this coupon only once per customer (ever).
            // If the customer has been issued it before — used, expired, or active — skip.
            if ($this->customerHasAnyIssuance($customer, $coupon)) continue;
            $issued[] = $this->issue($coupon, $customer);
        }
        return $issued;
    }

    public function customerHasAnyIssuance(Customer $customer, Coupon $coupon): bool
    {
        return CouponIssuance::where('coupon_id', $coupon->id)
            ->where('customer_id', $customer->id)
            ->exists();
    }

    public function issue(Coupon $coupon, Customer $customer, ?int $orderId = null): CouponIssuance
    {
        $issuance = CouponIssuance::create([
            'coupon_id' => $coupon->id,
            'customer_id' => $customer->id,
            'order_id' => $orderId,
            'issued_at' => now(),
            'expires_at' => now()->addDays($coupon->valid_days),
        ]);
        $coupon->increment('times_issued');
        return $issuance;
    }

    public function customerHasActiveIssuance(Customer $customer, Coupon $coupon): bool
    {
        return CouponIssuance::where('coupon_id', $coupon->id)
            ->where('customer_id', $customer->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->exists();
    }

    public function findValidIssuance(Store $store, Customer $customer, string $code): ?CouponIssuance
    {
        $coupon = Coupon::where('store_id', $store->id)
            ->where('code', strtoupper($code))
            ->where('active', true)
            ->first();

        if (!$coupon) return null;

        return CouponIssuance::where('coupon_id', $coupon->id)
            ->where('customer_id', $customer->id)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->with('coupon')
            ->first();
    }

    public function redeem(CouponIssuance $issuance, int $orderId): void
    {
        $issuance->update([
            'used_at' => now(),
            'used_order_id' => $orderId,
        ]);
        $issuance->coupon->increment('times_redeemed');
    }

    public function calculateDiscount(Coupon $coupon, float $subtotal): float
    {
        if ($coupon->discount_type === 'percent') {
            return round($subtotal * ((float)$coupon->discount_value / 100), 2);
        }
        return round(min((float)$coupon->discount_value, $subtotal), 2);
    }
}
