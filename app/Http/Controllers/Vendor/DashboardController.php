<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $storeId = $store->id;
        $now = now();

        $totalRevenue = Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereMonth('order_date', $now->month)
            ->whereYear('order_date', $now->year)
            ->sum('total');

        $totalOrders = Order::where('store_id', $storeId)
            ->whereIn('status', ['confirmed', 'delivered'])
            ->whereMonth('order_date', $now->month)
            ->whereYear('order_date', $now->year)
            ->count();

        $totalCustomers = Customer::where('store_id', $storeId)->count();

        $pendingPayments = Order::where('store_id', $storeId)
            ->where('payment_status', 'pending')
            ->whereIn('status', ['confirmed', 'delivered'])
            ->sum('total');

        $recentOrders = Order::where('store_id', $storeId)
            ->with('customer:id,name,whatsapp')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get(['id', 'order_number', 'customer_id', 'total', 'status', 'payment_status', 'order_date']);

        $lowStockProducts = Product::where('store_id', $storeId)
            ->where('status', 'active')
            ->where('type', 'simple')
            ->whereColumn('stock_qty', '<=', 'low_stock_threshold')
            ->where('low_stock_threshold', '>', 0)
            ->limit(5)
            ->get(['id', 'name', 'stock_qty', 'low_stock_threshold']);

        $topCustomers = Customer::where('store_id', $storeId)
            ->where('total_orders', '>', 0)
            ->orderBy('total_spent', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'whatsapp', 'total_orders', 'total_spent', 'type']);

        return Inertia::render('Vendor/Dashboard', [
            'stats' => [
                'totalRevenue' => round($totalRevenue, 2),
                'totalOrders' => $totalOrders,
                'totalCustomers' => $totalCustomers,
                'pendingPayments' => round($pendingPayments, 2),
                'avgOrderValue' => $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0,
            ],
            'recentOrders' => $recentOrders,
            'lowStockProducts' => $lowStockProducts,
            'topCustomers' => $topCustomers,
        ]);
    }
}
