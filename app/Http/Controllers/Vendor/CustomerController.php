<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\CouponIssuance;
use App\Models\Customer;
use App\Models\Store;
use App\Services\CouponService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CustomerController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $query = $store->customers();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('whatsapp', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        if ($type = $request->input('type')) $query->where('type', $type);
        if ($city = $request->input('city')) $query->where('city', $city);

        $customers = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        $cities = $store->customers()
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->distinct()
            ->pluck('city');

        return Inertia::render('Vendor/Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'type', 'city']),
            'cities' => $cities,
        ]);
    }

    public function create(Store $store)
    {
        return Inertia::render('Vendor/Customers/Form');
    }

    public function store(Request $request, Store $store)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'whatsapp' => 'required|string|max:15',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1000',
            'size_pref' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($store->customers()->where('whatsapp', $validated['whatsapp'])->exists()) {
            return back()->withErrors(['whatsapp' => 'A customer with this WhatsApp number already exists.']);
        }

        $store->customers()->create($validated);

        return redirect()->route('customers.index')->with('success', 'Customer added successfully.');
    }

    public function show(Store $store, Customer $customer)
    {
        $customer->load(['orders' => fn ($q) => $q->with('items.product:id,name')->orderBy('order_date', 'desc')]);

        $issuances = CouponIssuance::with('coupon:id,name,code,discount_type,discount_value,min_order_value')
            ->where('customer_id', $customer->id)
            ->whereHas('coupon', fn ($q) => $q->where('store_id', $store->id))
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'coupon' => $i->coupon,
                'issued_at' => $i->issued_at,
                'expires_at' => $i->expires_at,
                'used_at' => $i->used_at,
                'used_order_id' => $i->used_order_id,
                'state' => $i->used_at
                    ? 'used'
                    : ($i->expires_at->isPast() ? 'expired' : 'active'),
            ]);

        $availableCoupons = Coupon::where('store_id', $store->id)
            ->where('active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'discount_type', 'discount_value', 'min_order_value', 'valid_days']);

        return Inertia::render('Vendor/Customers/Show', [
            'customer' => $customer,
            'issuances' => $issuances,
            'availableCoupons' => $availableCoupons,
        ]);
    }

    public function issueCoupon(Request $request, Store $store, Customer $customer, CouponService $coupons)
    {
        $validated = $request->validate([
            'coupon_id' => ['required', Rule::exists('coupons', 'id')->where('store_id', $store->id)->where('active', true)],
        ]);

        $coupon = Coupon::find($validated['coupon_id']);

        if ($coupons->customerHasActiveIssuance($customer, $coupon)) {
            return back()->withErrors(['coupon_id' => 'This customer already has an active issuance for that coupon.']);
        }

        $coupons->issue($coupon, $customer);

        return back()->with('success', "Coupon {$coupon->code} issued to {$customer->name}.");
    }

    public function edit(Store $store, Customer $customer)
    {
        return Inertia::render('Vendor/Customers/Form', ['customer' => $customer]);
    }

    public function update(Request $request, Store $store, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'whatsapp' => 'required|string|max:15',
            'city' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1000',
            'size_pref' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $exists = $store->customers()
            ->where('whatsapp', $validated['whatsapp'])
            ->where('id', '!=', $customer->id)
            ->exists();

        if ($exists) {
            return back()->withErrors(['whatsapp' => 'A customer with this WhatsApp number already exists.']);
        }

        $customer->update($validated);

        return redirect()->route('customers.index')->with('success', 'Customer updated successfully.');
    }

    public function destroy(Store $store, Customer $customer)
    {
        $customer->delete();
        return redirect()->route('customers.index')->with('success', 'Customer deleted.');
    }

    public function toggleReviewed(Store $store, Customer $customer)
    {
        $customer->reviewed_at = $customer->reviewed_at ? null : now();
        $customer->save();

        return back()->with('success', $customer->reviewed_at
            ? "Marked {$customer->name} as reviewed."
            : "Cleared review status for {$customer->name}."
        );
    }

    public function printLabel(Store $store, Customer $customer)
    {
        return response()->view('customers.label', [
            'customer' => $customer,
            'store' => $store,
        ]);
    }

    public function export(Store $store): StreamedResponse
    {
        $customers = $store->customers()->orderBy('name')->get();

        return response()->streamDownload(function () use ($customers) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Name', 'WhatsApp', 'City', 'Type', 'Total Orders', 'Total Spent', 'Last Order', 'Added On']);

            foreach ($customers as $c) {
                fputcsv($handle, [
                    $c->name, $c->whatsapp, $c->city, $c->type,
                    $c->total_orders, $c->total_spent,
                    $c->last_order_date?->format('Y-m-d'),
                    $c->created_at->format('Y-m-d'),
                ]);
            }

            fclose($handle);
        }, 'customers-' . date('Y-m-d') . '.csv');
    }
}
