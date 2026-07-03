<?php

namespace App\Http\Controllers\Vendor;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        $upcomingCelebrations = $this->upcomingCelebrations($storeId, $now, 30, 8);

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
            'upcomingCelebrations' => $upcomingCelebrations,
        ]);
    }

    /**
     * Customers whose birthday or anniversary falls within the next $windowDays.
     * Matches on month/day (ignores year), handles year rollover and Feb-29,
     * and returns the soonest events first.
     */
    private function upcomingCelebrations(int $storeId, Carbon $now, int $windowDays, int $limit): array
    {
        $today = $now->copy()->startOfDay();

        $customers = Customer::where('store_id', $storeId)
            ->where(fn ($q) => $q->whereNotNull('birthdate')->orWhereNotNull('anniversary'))
            ->get(['id', 'name', 'whatsapp', 'birthdate', 'anniversary']);

        $events = [];
        foreach ($customers as $c) {
            foreach (['birthday' => $c->birthdate, 'anniversary' => $c->anniversary] as $type => $date) {
                if (!$date) {
                    continue;
                }
                $next = $this->nextOccurrence($date, $today);
                $daysUntil = (int) $today->diffInDays($next);
                if ($daysUntil <= $windowDays) {
                    $events[] = [
                        'customer_id' => $c->id,
                        'name' => $c->name,
                        'whatsapp' => $c->whatsapp,
                        'type' => $type,
                        'date' => $next->toDateString(),
                        'days_until' => $daysUntil,
                    ];
                }
            }
        }

        usort($events, fn ($a, $b) => $a['days_until'] <=> $b['days_until']);

        return array_slice($events, 0, $limit);
    }

    /**
     * The next date (today or later) on which the given day/month recurs.
     * Feb-29 falls back to Feb-28 in non-leap years.
     */
    private function nextOccurrence(Carbon $date, Carbon $today): Carbon
    {
        $month = (int) $date->month;
        $day = (int) $date->day;

        $make = function (int $year) use ($month, $day): Carbon {
            if ($month === 2 && $day === 29 && !Carbon::create($year)->isLeapYear()) {
                return Carbon::create($year, 2, 28)->startOfDay();
            }
            return Carbon::create($year, $month, $day)->startOfDay();
        };

        $candidate = $make($today->year);
        if ($candidate->lt($today)) {
            $candidate = $make($today->year + 1);
        }

        return $candidate;
    }
}
