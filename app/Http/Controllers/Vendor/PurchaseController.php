<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $query = $store->purchases()
            ->with('recorder:id,name')
            ->orderByDesc('purchase_date')
            ->orderByDesc('id');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('supplier', 'like', "%{$search}%");
            });
        }
        if ($from = $request->input('from')) $query->whereDate('purchase_date', '>=', $from);
        if ($to = $request->input('to')) $query->whereDate('purchase_date', '<=', $to);

        $purchases = $query->paginate($request->input('per_page', 25))->withQueryString();

        $totalsQuery = $store->purchases();
        if ($request->input('search')) {
            $totalsQuery->where(function ($q) use ($request) {
                $q->where('product_name', 'like', "%{$request->input('search')}%")
                  ->orWhere('supplier', 'like', "%{$request->input('search')}%");
            });
        }
        if ($request->input('from')) $totalsQuery->whereDate('purchase_date', '>=', $request->input('from'));
        if ($request->input('to')) $totalsQuery->whereDate('purchase_date', '<=', $request->input('to'));

        return Inertia::render('Vendor/Purchases/Index', [
            'purchases' => $purchases,
            'filters' => $request->only(['search', 'from', 'to']),
            'summary' => [
                'filtered_total' => (float) (clone $totalsQuery)->sum('total'),
                'filtered_gst' => (float) (clone $totalsQuery)->sum('gst_amount'),
                'this_month_total' => (float) $store->purchases()
                    ->whereMonth('purchase_date', now()->month)
                    ->whereYear('purchase_date', now()->year)
                    ->sum('total'),
                'count' => (int) (clone $totalsQuery)->count(),
            ],
        ]);
    }

    public function create(Store $store)
    {
        return Inertia::render('Vendor/Purchases/Form');
    }

    public function store(Request $request, Store $store)
    {
        $validated = $this->validatePayload($request);

        $store->purchases()->create([
            'recorded_by' => $request->user()->id,
            'supplier' => $validated['supplier'] ?: null,
            'product_name' => $validated['product_name'],
            'qty' => $validated['qty'],
            'cost' => $validated['cost'],
            'gst_percent' => $validated['gst_percent'] ?? 0,
            'gst_amount' => $validated['gst_amount'],
            'total' => $validated['total'],
            'purchase_date' => $validated['purchase_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('purchases.index')->with('success', 'Purchase recorded.');
    }

    public function edit(Store $store, Purchase $purchase)
    {
        return Inertia::render('Vendor/Purchases/Form', ['purchase' => $purchase]);
    }

    public function update(Request $request, Store $store, Purchase $purchase)
    {
        $validated = $this->validatePayload($request);

        $purchase->update([
            'supplier' => $validated['supplier'] ?: null,
            'product_name' => $validated['product_name'],
            'qty' => $validated['qty'],
            'cost' => $validated['cost'],
            'gst_percent' => $validated['gst_percent'] ?? 0,
            'gst_amount' => $validated['gst_amount'],
            'total' => $validated['total'],
            'purchase_date' => $validated['purchase_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('purchases.index')->with('success', 'Purchase updated.');
    }

    public function destroy(Store $store, Purchase $purchase)
    {
        $purchase->delete();
        return back()->with('success', 'Purchase deleted.');
    }

    private function validatePayload(Request $request): array
    {
        $data = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'product_name' => 'required|string|max:255',
            'qty' => 'required|integer|min:1',
            'cost' => 'required|numeric|min:0',
            'gst_percent' => 'nullable|numeric|min:0|max:100',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string|max:2000',
        ]);

        // Recompute server-side so the user can't tamper with totals
        $subtotal = $data['qty'] * (float) $data['cost'];
        $gstPct = (float) ($data['gst_percent'] ?? 0);
        $data['gst_amount'] = round($subtotal * $gstPct / 100, 2);
        $data['total'] = round($subtotal + $data['gst_amount'], 2);

        return $data;
    }
}
