<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function inventory(Request $request, Store $store)
    {
        $storeId = $store->id;

        $products = Product::where('store_id', $storeId)
            ->where('status', 'active')
            ->with('variants', 'category')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'type' => $p->type,
                'category' => $p->category?->name,
                'stock_qty' => $p->getTotalStock(),
                'low_stock_threshold' => $p->low_stock_threshold,
                'stock_status' => $p->getStockStatus(),
                'last_restocked_at' => $p->last_restocked_at?->format('Y-m-d'),
                'variants' => $p->type === 'variable' ? $p->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'attributes' => $v->attributes,
                    'stock_qty' => $v->stock_qty,
                    'low_stock_threshold' => $v->low_stock_threshold,
                ]) : null,
            ]);

        $slowDays = (int)$store->getSetting('slow_moving_days', '30');
        $slowMoving = Product::where('store_id', $storeId)
            ->where('status', 'active')
            ->with('category')
            ->get()
            ->map(function ($p) use ($storeId) {
                $lastOrdered = OrderItem::where('store_id', $storeId)
                    ->where('product_id', $p->id)
                    ->whereHas('order', fn ($q) => $q->whereIn('status', ['confirmed', 'delivered']))
                    ->latest('created_at')
                    ->first();

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'category' => $p->category?->name,
                    'stock_qty' => $p->getTotalStock(),
                    'last_ordered' => $lastOrdered ? $lastOrdered->created_at->format('Y-m-d') : null,
                    'days_since' => $lastOrdered ? now()->diffInDays($lastOrdered->created_at) : null,
                ];
            })
            ->filter(fn ($p) => $p['days_since'] === null || $p['days_since'] > $slowDays)
            ->values();

        return Inertia::render('Vendor/Reports/Inventory', [
            'products' => $products,
            'slowMoving' => $slowMoving,
            'slowDays' => $slowDays,
        ]);
    }

    public function sales(Request $request, Store $store)
    {
        $storeId = $store->id;

        $period = $request->input('period', 'this_month');
        [$startDate, $endDate] = $this->getDateRange($period, $request);

        $orders = Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$startDate, $endDate]);

        $totalRevenue = (clone $orders)->sum('total');
        $totalOrders = (clone $orders)->count();
        $avgOrderValue = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;

        $newCustomers = Customer::where('store_id', $storeId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        $repeatCustomers = Customer::where('store_id', $storeId)
            ->whereHas('orders', function ($q) use ($startDate, $endDate) {
                $q->whereIn('status', ['confirmed', 'delivered'])
                  ->whereBetween('order_date', [$startDate, $endDate]);
            }, '>=', 2)
            ->count();

        $revenueByDay = (clone $orders)
            ->select(DB::raw('DATE(order_date) as date'), DB::raw('SUM(total) as revenue'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $topProducts = OrderItem::where('order_items.store_id', $storeId)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['confirmed', 'delivered'])
            ->whereBetween('orders.order_date', [$startDate, $endDate])
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->select('products.name', DB::raw('SUM(order_items.line_total) as revenue'), DB::raw('SUM(order_items.qty) as qty'))
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $topCustomers = Order::where('orders.store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->select('customers.name', 'customers.whatsapp', DB::raw('SUM(orders.total) as total_spent'), DB::raw('COUNT(*) as order_count'))
            ->groupBy('customers.id', 'customers.name', 'customers.whatsapp')
            ->orderByDesc('total_spent')
            ->limit(10)
            ->get();

        $paymentBreakdown = (clone $orders)
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('payment_method')
            ->get();

        $pendingPayments = Order::where('store_id', $storeId)
            ->where('payment_status', 'pending')
            ->whereIn('status', ['confirmed', 'delivered'])
            ->with('customer:id,name,whatsapp')
            ->orderBy('order_date')
            ->get(['id', 'order_number', 'customer_id', 'total', 'order_date']);

        // Sales by category — sum line totals grouped by product category
        $salesByCategory = OrderItem::where('order_items.store_id', $storeId)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['confirmed', 'delivered'])
            ->whereBetween('orders.order_date', [$startDate, $endDate])
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->select(
                DB::raw('COALESCE(categories.name, "Uncategorised") as name'),
                DB::raw('SUM(order_items.line_total) as revenue'),
                DB::raw('SUM(order_items.qty) as qty')
            )
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('revenue')
            ->get();

        // Sales by status — every order regardless of status filter
        $salesByStatus = Order::where('store_id', $storeId)
            ->whereBetween('order_date', [$startDate, $endDate])
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('status')
            ->get();

        // Customer type mix — revenue contribution by VIP / regular / new
        $customerTypeMix = Order::where('orders.store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->join('customers', 'customers.id', '=', 'orders.customer_id')
            ->select('customers.type', DB::raw('SUM(orders.total) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('customers.type')
            ->get();

        // Hour of day — when do orders happen
        $hourOfDay = (clone $orders)
            ->select(DB::raw('HOUR(created_at) as hour'), DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        return Inertia::render('Vendor/Reports/Sales', [
            'stats' => [
                'totalRevenue' => round($totalRevenue, 2),
                'totalOrders' => $totalOrders,
                'avgOrderValue' => round($avgOrderValue, 2),
                'newCustomers' => $newCustomers,
                'repeatCustomers' => $repeatCustomers,
            ],
            'revenueByDay' => $revenueByDay,
            'topProducts' => $topProducts,
            'topCustomers' => $topCustomers,
            'paymentBreakdown' => $paymentBreakdown,
            'pendingPayments' => $pendingPayments,
            'salesByCategory' => $salesByCategory,
            'salesByStatus' => $salesByStatus,
            'customerTypeMix' => $customerTypeMix,
            'hourOfDay' => $hourOfDay,
            'period' => $period,
            'dateRange' => ['from' => $startDate->format('Y-m-d'), 'to' => $endDate->format('Y-m-d')],
        ]);
    }

    public function profitLoss(Request $request, Store $store)
    {
        $storeId = $store->id;
        $period = $request->input('period', 'this_month');
        [$startDate, $endDate] = $this->getDateRange($period, $request);

        // Same-length previous period for comparison
        $rangeDays = $startDate->diffInDays($endDate) + 1;
        $prevEnd = $startDate->copy()->subDay()->endOfDay();
        $prevStart = $prevEnd->copy()->subDays($rangeDays - 1)->startOfDay();

        // ==== TAB 1: Margin (orders × products) ====
        // Per line item: revenue = line_total, cost = qty * (variant.cost_price ?? product.cost_price)
        $marginRows = OrderItem::where('order_items.store_id', $storeId)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['confirmed', 'delivered'])
            ->whereBetween('orders.order_date', [$startDate, $endDate])
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'order_items.variant_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->select(
                'order_items.id',
                'products.id as product_id',
                'products.name as product_name',
                DB::raw('COALESCE(categories.name, "Uncategorised") as category_name'),
                'order_items.qty',
                'order_items.line_total as revenue',
                DB::raw('order_items.qty * COALESCE(product_variants.cost_price, products.cost_price, 0) as cost'),
                DB::raw('CASE WHEN COALESCE(product_variants.cost_price, products.cost_price) IS NULL THEN 1 ELSE 0 END as missing_cost'),
            )
            ->get();

        $marginRevenue = (float) $marginRows->sum('revenue');
        $marginCogs = (float) $marginRows->sum('cost');
        $grossMargin = $marginRevenue - $marginCogs;
        $marginPct = $marginRevenue > 0 ? ($grossMargin / $marginRevenue) * 100 : 0;
        $missingCostCount = (int) $marginRows->sum('missing_cost');

        // Aggregate by product
        $byProduct = $marginRows->groupBy('product_id')->map(function ($rows) {
            $rev = (float) $rows->sum('revenue');
            $cost = (float) $rows->sum('cost');
            return [
                'product_id' => $rows->first()->product_id,
                'name' => $rows->first()->product_name,
                'qty' => (int) $rows->sum('qty'),
                'revenue' => round($rev, 2),
                'cost' => round($cost, 2),
                'margin' => round($rev - $cost, 2),
                'margin_pct' => $rev > 0 ? round((($rev - $cost) / $rev) * 100, 1) : 0,
            ];
        })->values()->sortByDesc('margin')->values();

        $topProducts = $byProduct->take(10);
        $bottomProducts = $byProduct->reverse()->values()->take(10)->values();

        // Aggregate by category
        $byCategory = $marginRows->groupBy('category_name')->map(function ($rows, $name) {
            $rev = (float) $rows->sum('revenue');
            $cost = (float) $rows->sum('cost');
            return [
                'name' => $name,
                'revenue' => round($rev, 2),
                'cost' => round($cost, 2),
                'margin' => round($rev - $cost, 2),
                'margin_pct' => $rev > 0 ? round((($rev - $cost) / $rev) * 100, 1) : 0,
            ];
        })->values()->sortByDesc('margin')->values();

        // Daily margin trend
        $dailyMargin = OrderItem::where('order_items.store_id', $storeId)
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->whereIn('orders.status', ['confirmed', 'delivered'])
            ->whereBetween('orders.order_date', [$startDate, $endDate])
            ->leftJoin('products', 'products.id', '=', 'order_items.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'order_items.variant_id')
            ->select(
                DB::raw('DATE(orders.order_date) as date'),
                DB::raw('SUM(order_items.line_total) as revenue'),
                DB::raw('SUM(order_items.qty * COALESCE(product_variants.cost_price, products.cost_price, 0)) as cost'),
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r) => [
                'date' => $r->date,
                'revenue' => (float) $r->revenue,
                'cost' => (float) $r->cost,
                'margin' => (float) $r->revenue - (float) $r->cost,
            ]);

        // ==== TAB 2: Cash P&L (orders / purchases / expenses) ====
        $cashRevenue = (float) Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->sum('total');

        $cashCogs = (float) Purchase::where('store_id', $storeId)
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->sum('total');

        // Operating expenses for THIS store + org-wide expenses (store_id null)
        $cashOpex = (float) Expense::where('organization_id', $store->organization_id)
            ->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        $grossProfit = $cashRevenue - $cashCogs;
        $netProfit = $grossProfit - $cashOpex;
        $netMarginPct = $cashRevenue > 0 ? ($netProfit / $cashRevenue) * 100 : 0;

        // Previous period
        $prevRevenue = (float) Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$prevStart, $prevEnd])
            ->sum('total');
        $prevCogs = (float) Purchase::where('store_id', $storeId)
            ->whereBetween('purchase_date', [$prevStart, $prevEnd])
            ->sum('total');
        $prevOpex = (float) Expense::where('organization_id', $store->organization_id)
            ->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->whereBetween('expense_date', [$prevStart, $prevEnd])
            ->sum('amount');
        $prevNet = $prevRevenue - $prevCogs - $prevOpex;

        // Revenue by day
        $revenueByDay = Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereBetween('order_date', [$startDate, $endDate])
            ->select(DB::raw('DATE(order_date) as date'), DB::raw('SUM(total) as revenue'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Expenses by category
        $expensesByCategory = Expense::where('organization_id', $store->organization_id)
            ->where(function ($q) use ($storeId) {
                $q->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->orderByDesc('total')
            ->get();

        // Top suppliers
        $topSuppliers = Purchase::where('store_id', $storeId)
            ->whereBetween('purchase_date', [$startDate, $endDate])
            ->select(
                DB::raw('COALESCE(NULLIF(supplier, ""), "Unspecified") as supplier'),
                DB::raw('SUM(total) as total'),
                DB::raw('COUNT(*) as count'),
            )
            ->groupBy('supplier')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return Inertia::render('Vendor/Reports/ProfitLoss', [
            'period' => $period,
            'dateRange' => ['from' => $startDate->format('Y-m-d'), 'to' => $endDate->format('Y-m-d')],
            'previousRange' => ['from' => $prevStart->format('Y-m-d'), 'to' => $prevEnd->format('Y-m-d')],
            'margin' => [
                'totals' => [
                    'revenue' => round($marginRevenue, 2),
                    'cogs' => round($marginCogs, 2),
                    'gross_margin' => round($grossMargin, 2),
                    'margin_pct' => round($marginPct, 1),
                    'missing_cost_count' => $missingCostCount,
                ],
                'top_products' => $topProducts,
                'bottom_products' => $bottomProducts,
                'by_category' => $byCategory,
                'daily' => $dailyMargin,
            ],
            'profit' => [
                'totals' => [
                    'revenue' => round($cashRevenue, 2),
                    'cogs' => round($cashCogs, 2),
                    'opex' => round($cashOpex, 2),
                    'gross_profit' => round($grossProfit, 2),
                    'net_profit' => round($netProfit, 2),
                    'net_margin_pct' => round($netMarginPct, 1),
                ],
                'previous' => [
                    'revenue' => round($prevRevenue, 2),
                    'cogs' => round($prevCogs, 2),
                    'opex' => round($prevOpex, 2),
                    'net_profit' => round($prevNet, 2),
                ],
                'revenue_by_day' => $revenueByDay,
                'expenses_by_category' => $expensesByCategory,
                'top_suppliers' => $topSuppliers,
            ],
        ]);
    }

    public function export(Request $request, Store $store, string $type): StreamedResponse
    {
        $storeId = $store->id;

        if ($type === 'inventory') {
            $products = Product::where('store_id', $storeId)->where('status', 'active')->with('category')->get();
            return response()->streamDownload(function () use ($products) {
                $h = fopen('php://output', 'w');
                fputcsv($h, ['Product', 'Category', 'Type', 'Stock', 'Low Stock Threshold', 'Status']);
                foreach ($products as $p) {
                    fputcsv($h, [$p->name, $p->category?->name, $p->type, $p->getTotalStock(), $p->low_stock_threshold, $p->getStockStatus()]);
                }
                fclose($h);
            }, 'inventory-' . date('Y-m-d') . '.csv');
        }

        if ($type === 'sales') {
            [$startDate, $endDate] = $this->getDateRange($request->input('period', 'this_month'), $request);
            $orders = Order::where('store_id', $storeId)
                ->whereIn('status', ['confirmed', 'delivered'])
                ->whereBetween('order_date', [$startDate, $endDate])
                ->with('customer')
                ->get();
            return response()->streamDownload(function () use ($orders) {
                $h = fopen('php://output', 'w');
                fputcsv($h, ['Order #', 'Date', 'Customer', 'Total', 'Payment', 'Status']);
                foreach ($orders as $o) {
                    fputcsv($h, [$o->order_number, $o->order_date->format('Y-m-d'), $o->customer->name, $o->total, $o->payment_method, $o->payment_status]);
                }
                fclose($h);
            }, 'sales-' . date('Y-m-d') . '.csv');
        }

        if ($type === 'margin') {
            [$startDate, $endDate] = $this->getDateRange($request->input('period', 'this_month'), $request);
            $rows = OrderItem::where('order_items.store_id', $storeId)
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->whereIn('orders.status', ['confirmed', 'delivered'])
                ->whereBetween('orders.order_date', [$startDate, $endDate])
                ->join('products', 'products.id', '=', 'order_items.product_id')
                ->leftJoin('product_variants', 'product_variants.id', '=', 'order_items.variant_id')
                ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
                ->select(
                    'products.name as product_name',
                    DB::raw('COALESCE(categories.name, "Uncategorised") as category_name'),
                    'order_items.qty',
                    'order_items.line_total as revenue',
                    DB::raw('order_items.qty * COALESCE(product_variants.cost_price, products.cost_price, 0) as cost'),
                )
                ->get();

            return response()->streamDownload(function () use ($rows) {
                $h = fopen('php://output', 'w');
                fputcsv($h, ['Product', 'Category', 'Qty', 'Revenue', 'Cost', 'Margin', 'Margin %']);
                foreach ($rows as $r) {
                    $rev = (float) $r->revenue;
                    $cost = (float) $r->cost;
                    $margin = $rev - $cost;
                    $pct = $rev > 0 ? round(($margin / $rev) * 100, 1) : 0;
                    fputcsv($h, [$r->product_name, $r->category_name, $r->qty, number_format($rev, 2, '.', ''), number_format($cost, 2, '.', ''), number_format($margin, 2, '.', ''), $pct]);
                }
                fclose($h);
            }, 'margin-' . date('Y-m-d') . '.csv');
        }

        if ($type === 'profit') {
            [$startDate, $endDate] = $this->getDateRange($request->input('period', 'this_month'), $request);

            $revenue = (float) Order::where('store_id', $storeId)
                ->whereIn('status', ['confirmed', 'delivered'])
                ->whereBetween('order_date', [$startDate, $endDate])
                ->sum('total');
            $cogs = (float) Purchase::where('store_id', $storeId)
                ->whereBetween('purchase_date', [$startDate, $endDate])
                ->sum('total');
            $opex = (float) Expense::where('organization_id', $store->organization_id)
                ->where(function ($q) use ($storeId) {
                    $q->where('store_id', $storeId)->orWhereNull('store_id');
                })
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->sum('amount');

            $expensesByCategory = Expense::where('organization_id', $store->organization_id)
                ->where(function ($q) use ($storeId) {
                    $q->where('store_id', $storeId)->orWhereNull('store_id');
                })
                ->whereBetween('expense_date', [$startDate, $endDate])
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->orderByDesc('total')
                ->get();

            return response()->streamDownload(function () use ($revenue, $cogs, $opex, $expensesByCategory, $startDate, $endDate) {
                $h = fopen('php://output', 'w');
                fputcsv($h, ['Profit & Loss', $startDate->format('Y-m-d') . ' to ' . $endDate->format('Y-m-d')]);
                fputcsv($h, []);
                fputcsv($h, ['Line', 'Amount']);
                fputcsv($h, ['Revenue', number_format($revenue, 2, '.', '')]);
                fputcsv($h, ['Cost of Goods Sold (Purchases)', number_format($cogs, 2, '.', '')]);
                fputcsv($h, ['Gross Profit', number_format($revenue - $cogs, 2, '.', '')]);
                fputcsv($h, ['Operating Expenses', number_format($opex, 2, '.', '')]);
                fputcsv($h, ['Net Profit', number_format($revenue - $cogs - $opex, 2, '.', '')]);
                fputcsv($h, []);
                fputcsv($h, ['Expenses by Category']);
                fputcsv($h, ['Category', 'Amount']);
                foreach ($expensesByCategory as $e) {
                    fputcsv($h, [$e->category, number_format((float) $e->total, 2, '.', '')]);
                }
                fclose($h);
            }, 'profit-loss-' . date('Y-m-d') . '.csv');
        }

        abort(404);
    }

    private function getDateRange(string $period, Request $request): array
    {
        return match ($period) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'this_week' => [now()->startOfWeek(), now()->endOfWeek()],
            'this_month' => [now()->startOfMonth(), now()->endOfMonth()],
            'last_month' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'custom' => [
                \Carbon\Carbon::parse($request->input('from', now()->startOfMonth()))->startOfDay(),
                \Carbon\Carbon::parse($request->input('to', now()))->endOfDay(),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }
}
