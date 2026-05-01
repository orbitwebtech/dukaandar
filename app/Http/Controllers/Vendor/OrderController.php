<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\CouponIssuance;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Services\CouponService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $query = $store->orders()->with('customer:id,name,whatsapp');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->input('status')) $query->where('status', $status);
        if ($paymentStatus = $request->input('payment_status')) $query->where('payment_status', $paymentStatus);

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('Vendor/Orders/Index', [
            'orders' => $orders,
            'filters' => $request->only(['search', 'status', 'payment_status']),
        ]);
    }

    public function create(Store $store)
    {
        $customers = $store->customers()->orderBy('name')->get(['id', 'name', 'whatsapp']);
        $products = $store->products()->where('status', 'active')->with('variants')->get();

        $settings = [
            'invoice_prefix' => $store->getSetting('invoice_prefix', 'ORD'),
            'google_review_link' => $store->getSetting('google_review_link'),
            'review_text' => $store->getSetting('review_text'),
            'review_reprompt_interval' => $store->getSetting('review_reprompt_interval', '3'),
            'whatsapp_template' => $store->getSetting('whatsapp_template'),
            'shop_name' => $store->getSetting('shop_name'),
        ];

        return Inertia::render('Vendor/Orders/Form', [
            'customers' => $customers,
            'products' => $products,
            'nextOrderNumber' => Order::generateOrderNumber($store->id),
            'settings' => $settings,
        ]);
    }

    public function store(Request $request, Store $store, CouponService $coupons)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'new_customer' => 'nullable|array',
            'new_customer.name' => 'required_without:customer_id|string|max:255',
            'new_customer.whatsapp' => 'required_without:customer_id|string|max:15',
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.line_discount_type' => 'nullable|in:flat,percent',
            'items.*.line_discount_value' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:flat,percent',
            'discount_value' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,upi,bank_transfer,card',
            'payment_status' => 'required|in:paid,pending,partial',
            'notes' => 'nullable|string',
            'coupon_code' => 'nullable|string',
            'status' => 'nullable|in:draft,confirmed,delivered,cancelled',
        ]);

        // Stock check (skip if cancelled — those don't reserve stock)
        if (($validated['status'] ?? 'delivered') !== 'cancelled') {
            $stockErrors = $this->checkStockAvailability($validated['items']);
            if (!empty($stockErrors)) {
                return back()->withErrors($stockErrors)->withInput();
            }
        }

        $customerId = $validated['customer_id'];
        if (!$customerId && !empty($validated['new_customer'])) {
            $customer = $store->customers()->create([
                'name' => $validated['new_customer']['name'],
                'whatsapp' => $validated['new_customer']['whatsapp'],
            ]);
            $customerId = $customer->id;
        }

        $subtotal = 0;
        $processedItems = [];
        foreach ($validated['items'] as $item) {
            $lineSubtotal = $item['qty'] * $item['unit_price'];
            $lineDiscountAmount = 0;

            if (!empty($item['line_discount_value']) && $item['line_discount_value'] > 0) {
                $lineDiscountAmount = $item['line_discount_type'] === 'percent'
                    ? $lineSubtotal * ($item['line_discount_value'] / 100)
                    : $item['line_discount_value'];
            }

            $lineTotal = $lineSubtotal - $lineDiscountAmount;
            $subtotal += $lineTotal;

            $processedItems[] = [
                ...$item,
                'line_discount_amount' => round($lineDiscountAmount, 2),
                'line_total' => round($lineTotal, 2),
            ];
        }

        $orderDiscountAmount = 0;
        $discountType = $validated['discount_type'] ?? null;
        $discountValue = $validated['discount_value'] ?? 0;
        $couponIssuance = null;

        if (!empty($validated['coupon_code'])) {
            $customerForCoupon = Customer::find($customerId);
            $couponIssuance = $customerForCoupon
                ? $coupons->findValidIssuance($store, $customerForCoupon, $validated['coupon_code'])
                : null;

            if (!$couponIssuance) {
                return back()->withErrors([
                    'coupon_code' => 'This coupon is invalid, expired, or not issued to this customer.',
                ])->withInput();
            }

            $coupon = $couponIssuance->coupon;
            if ((float)$coupon->min_order_value > $subtotal) {
                return back()->withErrors([
                    'coupon_code' => "Order subtotal must be at least ₹{$coupon->min_order_value} to use this coupon.",
                ])->withInput();
            }

            $orderDiscountAmount = $coupons->calculateDiscount($coupon, $subtotal);
            $discountType = $coupon->discount_type;
            $discountValue = $coupon->discount_value;
        } elseif (!empty($validated['discount_value']) && $validated['discount_value'] > 0) {
            $orderDiscountAmount = $discountType === 'percent'
                ? $subtotal * ($discountValue / 100)
                : $discountValue;
        }

        $total = $subtotal - $orderDiscountAmount;

        $order = $store->orders()->create([
            'order_number' => Order::generateOrderNumber($store->id),
            'customer_id' => $customerId,
            'order_date' => $validated['order_date'],
            'subtotal' => round($subtotal, 2),
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'discount_amount' => round($orderDiscountAmount, 2),
            'total' => round(max(0, $total), 2),
            'payment_method' => $validated['payment_method'],
            'payment_status' => $validated['payment_status'],
            'status' => $validated['status'] ?? 'delivered',
            'notes' => $validated['notes'] ?? null,
            'coupon_code' => $couponIssuance ? $couponIssuance->coupon->code : ($validated['coupon_code'] ?? null),
        ]);

        if ($couponIssuance) {
            $coupons->redeem($couponIssuance, $order->id);
        }

        foreach ($processedItems as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'store_id' => $store->id,
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'qty' => $item['qty'],
                'unit_price' => $item['unit_price'],
                'line_discount_type' => $item['line_discount_type'] ?? null,
                'line_discount_value' => $item['line_discount_value'] ?? 0,
                'line_discount_amount' => $item['line_discount_amount'],
                'line_total' => $item['line_total'],
            ]);
        }

        // Decrement stock if order is created as delivered
        if ($order->status === 'delivered') {
            $order->load('items.product', 'items.variant');
            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->stock_qty = max(0, $item->variant->stock_qty - $item->qty);
                    $item->variant->save();
                } elseif ($item->product) {
                    $item->product->stock_qty = max(0, $item->product->stock_qty - $item->qty);
                    $item->product->save();
                }
            }
        }

        $customer = Customer::find($customerId);
        if ($customer) {
            $customer->updateStats();
            if ($order->status === 'delivered') {
                $coupons->autoIssueFor($customer);
            }
        }

        return redirect()->route('orders.show', $order)->with('success', 'Order created successfully.');
    }

    public function show(Store $store, Order $order)
    {
        $order->load([
            'customer',
            'items.product:id,name,sku,type',
            'items.variant',
        ]);

        $settings = [
            'shop_name' => $store->getSetting('shop_name'),
            'google_review_link' => $store->getSetting('google_review_link'),
            'review_text' => $store->getSetting('review_text'),
            'review_reprompt_interval' => (int)$store->getSetting('review_reprompt_interval', '3'),
            'whatsapp_template' => $store->getSetting('whatsapp_template'),
            'whatsapp_number' => $store->getSetting('whatsapp_number'),
        ];

        $invoiceLink = \Illuminate\Support\Facades\URL::signedRoute('public.invoice', ['order' => $order->id]);

        $activeCoupons = CouponIssuance::with('coupon:id,code,name,discount_type,discount_value,min_order_value')
            ->where('customer_id', $order->customer_id)
            ->whereHas('coupon', fn ($q) => $q->where('store_id', $store->id))
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->orderByDesc('issued_at')
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'code' => $i->coupon->code,
                'name' => $i->coupon->name,
                'discount' => $i->coupon->discount_type === 'percent'
                    ? $i->coupon->discount_value . '%'
                    : '₹' . $i->coupon->discount_value,
                'min_order_value' => (float) $i->coupon->min_order_value,
                'expires_at' => $i->expires_at,
            ])
            ->values();

        return Inertia::render('Vendor/Orders/Show', [
            'order' => $order,
            'settings' => $settings,
            'invoiceLink' => $invoiceLink,
            'activeCoupons' => $activeCoupons,
        ]);
    }

    public function edit(Store $store, Order $order)
    {
        $order->load('items.product', 'items.variant', 'customer');

        $customers = $store->customers()->orderBy('name')->get(['id', 'name', 'whatsapp']);
        $products = $store->products()->where('status', 'active')->with('variants')->get();

        return Inertia::render('Vendor/Orders/Form', [
            'order' => $order,
            'customers' => $customers,
            'products' => $products,
            'nextOrderNumber' => $order->order_number,
        ]);
    }

    public function update(Request $request, Store $store, Order $order, CouponService $coupons)
    {
        $validated = $request->validate([
            'order_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.line_discount_type' => 'nullable|in:flat,percent',
            'items.*.line_discount_value' => 'nullable|numeric|min:0',
            'discount_type' => 'nullable|in:flat,percent',
            'discount_value' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:cash,upi,bank_transfer,card',
            'payment_status' => 'required|in:paid,pending,partial',
            'status' => 'required|in:draft,confirmed,delivered,cancelled',
            'notes' => 'nullable|string',
            'coupon_code' => 'nullable|string',
        ]);

        $oldStatus = $order->status;
        $wasDelivered = $oldStatus === 'delivered';

        // Stock check (skip if cancelled — those don't reserve stock)
        if ($validated['status'] !== 'cancelled') {
            $stockErrors = $this->checkStockAvailability($validated['items'], $order);
            if (!empty($stockErrors)) {
                return back()->withErrors($stockErrors)->withInput();
            }
        }

        // 1. Revert stock if order was delivered (so we can recompute against new items)
        if ($wasDelivered) {
            $order->load('items.product', 'items.variant');
            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->stock_qty = $item->variant->stock_qty + $item->qty;
                    $item->variant->save();
                } elseif ($item->product) {
                    $item->product->stock_qty = $item->product->stock_qty + $item->qty;
                    $item->product->save();
                }
            }
        }

        // 2. Release any previously-redeemed coupon issuance for this order
        $previousIssuance = CouponIssuance::with('coupon')->where('used_order_id', $order->id)->first();
        if ($previousIssuance) {
            $previousIssuance->coupon->decrement('times_redeemed');
            $previousIssuance->update(['used_at' => null, 'used_order_id' => null]);
        }

        // 3. Recompute line totals from new items
        $subtotal = 0;
        $processedItems = [];
        foreach ($validated['items'] as $item) {
            $lineSubtotal = $item['qty'] * $item['unit_price'];
            $lineDiscountAmount = 0;
            if (!empty($item['line_discount_value']) && $item['line_discount_value'] > 0) {
                $lineDiscountAmount = ($item['line_discount_type'] ?? 'flat') === 'percent'
                    ? $lineSubtotal * ($item['line_discount_value'] / 100)
                    : $item['line_discount_value'];
            }
            $lineTotal = $lineSubtotal - $lineDiscountAmount;
            $subtotal += $lineTotal;
            $processedItems[] = [
                ...$item,
                'line_discount_amount' => round($lineDiscountAmount, 2),
                'line_total' => round($lineTotal, 2),
            ];
        }

        // 4. Apply coupon (or fall back to manual order discount)
        $orderDiscountAmount = 0;
        $discountType = $validated['discount_type'] ?? null;
        $discountValue = $validated['discount_value'] ?? 0;
        $newIssuance = null;

        if (!empty($validated['coupon_code'])) {
            $newIssuance = $coupons->findValidIssuance($store, $order->customer, $validated['coupon_code']);
            if (!$newIssuance) {
                return back()->withErrors([
                    'coupon_code' => 'This coupon is invalid, expired, or not issued to this customer.',
                ])->withInput();
            }
            $coupon = $newIssuance->coupon;
            if ((float) $coupon->min_order_value > $subtotal) {
                return back()->withErrors([
                    'coupon_code' => "Order subtotal must be at least ₹{$coupon->min_order_value} to use this coupon.",
                ])->withInput();
            }
            $orderDiscountAmount = $coupons->calculateDiscount($coupon, $subtotal);
            $discountType = $coupon->discount_type;
            $discountValue = $coupon->discount_value;
        } elseif (!empty($validated['discount_value']) && $validated['discount_value'] > 0) {
            $orderDiscountAmount = $discountType === 'percent'
                ? $subtotal * ($discountValue / 100)
                : $discountValue;
        }

        $total = $subtotal - $orderDiscountAmount;

        // 5. Update order header
        $order->update([
            'order_date' => $validated['order_date'],
            'subtotal' => round($subtotal, 2),
            'discount_type' => $discountType,
            'discount_value' => $discountValue,
            'discount_amount' => round($orderDiscountAmount, 2),
            'total' => round(max(0, $total), 2),
            'payment_method' => $validated['payment_method'],
            'payment_status' => $validated['payment_status'],
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
            'coupon_code' => $newIssuance ? $newIssuance->coupon->code : null,
        ]);

        // 6. Replace items
        $order->items()->delete();
        foreach ($processedItems as $item) {
            OrderItem::create([
                'order_id' => $order->id,
                'store_id' => $store->id,
                'product_id' => $item['product_id'],
                'variant_id' => $item['variant_id'] ?? null,
                'qty' => $item['qty'],
                'unit_price' => $item['unit_price'],
                'line_discount_type' => $item['line_discount_type'] ?? null,
                'line_discount_value' => $item['line_discount_value'] ?? 0,
                'line_discount_amount' => $item['line_discount_amount'],
                'line_total' => $item['line_total'],
            ]);
        }

        // 7. Mark new coupon as redeemed
        if ($newIssuance) {
            $coupons->redeem($newIssuance, $order->id);
        }

        // 8. Apply stock decrement if order is now delivered
        if ($validated['status'] === 'delivered') {
            $order->load('items.product', 'items.variant');
            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->stock_qty = max(0, $item->variant->stock_qty - $item->qty);
                    $item->variant->save();
                } elseif ($item->product) {
                    $item->product->stock_qty = max(0, $item->product->stock_qty - $item->qty);
                    $item->product->save();
                }
            }
        }

        // 9. Customer stats + auto-issue on first delivery
        $order->customer->updateStats();
        if (!$wasDelivered && $validated['status'] === 'delivered') {
            $coupons->autoIssueFor($order->customer->fresh());
        }

        return redirect()->route('orders.show', $order)->with('success', 'Order updated successfully.');
    }

    public function quickUpdate(Request $request, Store $store, Order $order, CouponService $coupons)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,confirmed,delivered,cancelled',
            'payment_status' => 'required|in:paid,pending,partial',
            'payment_method' => 'required|in:cash,upi,bank_transfer,card',
            'notes' => 'nullable|string',
        ]);

        $oldStatus = $order->status;
        $order->update($validated);

        // Forward stock decrement on first delivery
        if ($oldStatus !== 'delivered' && $validated['status'] === 'delivered') {
            $order->load('items.product', 'items.variant');
            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->stock_qty = max(0, $item->variant->stock_qty - $item->qty);
                    $item->variant->save();
                } elseif ($item->product) {
                    $item->product->stock_qty = max(0, $item->product->stock_qty - $item->qty);
                    $item->product->save();
                }
            }
        }

        // Reverse stock decrement if undoing a delivery
        if ($oldStatus === 'delivered' && $validated['status'] !== 'delivered') {
            $order->load('items.product', 'items.variant');
            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->stock_qty = $item->variant->stock_qty + $item->qty;
                    $item->variant->save();
                } elseif ($item->product) {
                    $item->product->stock_qty = $item->product->stock_qty + $item->qty;
                    $item->product->save();
                }
            }
        }

        $order->customer->updateStats();
        if ($oldStatus !== 'delivered' && $validated['status'] === 'delivered') {
            $coupons->autoIssueFor($order->customer->fresh());
        }

        return back()->with('success', 'Order updated.');
    }

    public function destroy(Store $store, Order $order)
    {
        $customerId = $order->customer_id;
        $order->delete();

        $customer = Customer::find($customerId);
        if ($customer) $customer->updateStats();

        return redirect()->route('orders.index')->with('success', 'Order deleted.');
    }

    public function sendInvoice(Store $store, Order $order)
    {
        $order->update(['invoice_sent' => true]);
        return back()->with('success', 'Invoice marked as sent.');
    }

    public function invoicePdf(Request $request, Store $store, Order $order)
    {
        $order->load('customer', 'items.product', 'items.variant');
        $settings = collect($store->settings)->pluck('value', 'key');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.pdf', [
            'order' => $order,
            'settings' => $settings,
        ])->setPaper('a4');

        $filename = "Invoice-{$order->order_number}.pdf";

        if ($request->query('download')) {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    /**
     * Check that each item has enough stock available.
     * For an edit, the existing order's qty is added back to the pool if it was delivered
     * (since we'll revert that reservation before re-applying).
     * Returns ['items.{idx}.qty' => 'message'] map; empty if all OK.
     */
    private function checkStockAvailability(array $items, ?Order $existingOrder = null): array
    {
        $errors = [];
        $existingByKey = [];
        if ($existingOrder && $existingOrder->status === 'delivered') {
            $existingOrder->loadMissing('items');
            foreach ($existingOrder->items as $item) {
                $key = ($item->variant_id ?: 'p') . '-' . $item->product_id;
                $existingByKey[$key] = ($existingByKey[$key] ?? 0) + (int) $item->qty;
            }
        }

        foreach ($items as $idx => $item) {
            $variantId = $item['variant_id'] ?? null;
            $productId = $item['product_id'];
            $newQty = (int) $item['qty'];
            $key = ($variantId ?: 'p') . '-' . $productId;
            $existingQty = $existingByKey[$key] ?? 0;

            if ($variantId) {
                $variant = ProductVariant::find($variantId);
                if (!$variant) continue;
                $available = (int) $variant->stock_qty + $existingQty;
                if ($available < $newQty) {
                    $name = $variant->product?->name ?: 'this variant';
                    $label = $variant->getAttributeLabel() ?: '';
                    $errors["items.{$idx}.qty"] = $available <= 0
                        ? "Out of stock: {$name}" . ($label ? " ({$label})" : '')
                        : "Only {$available} in stock for {$name}" . ($label ? " ({$label})" : '');
                }
            } else {
                $product = Product::find($productId);
                if (!$product || $product->type === 'variable') continue;
                $available = (int) $product->stock_qty + $existingQty;
                if ($available < $newQty) {
                    $errors["items.{$idx}.qty"] = $available <= 0
                        ? "Out of stock: {$product->name}"
                        : "Only {$available} in stock for {$product->name}";
                }
            }
        }
        return $errors;
    }
}
