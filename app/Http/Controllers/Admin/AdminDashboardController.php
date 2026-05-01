<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Organization;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $totalOrgs = Organization::count();
        $activeOrgs = Organization::where('status', 'active')->count();
        $trialOrgs = Organization::where('status', 'trial')->count();
        $suspendedOrgs = Organization::where('status', 'suspended')->count();

        $expiringTrials = Organization::where('status', 'trial')
            ->where('trial_ends_at', '<=', now()->addDays(7))
            ->where('trial_ends_at', '>=', now())
            ->count();

        $expiringSubscriptions = Organization::where('status', 'active')
            ->whereNotNull('subscription_ends_at')
            ->where('subscription_ends_at', '<=', now()->addDays(7))
            ->where('subscription_ends_at', '>=', now())
            ->count();

        $monthlyBilling = Organization::where('status', 'active')->where('billing_cycle', 'monthly')->count();
        $yearlyBilling = Organization::where('status', 'active')->where('billing_cycle', 'yearly')->count();

        // Vendor activity (informational only)
        $vendorOrdersThisMonth = Order::whereIn('status', ['confirmed', 'delivered'])
            ->whereMonth('created_at', now()->month)
            ->count();

        // SAAS revenue you actually collected
        $saasRevenueThisMonth = SubscriptionPayment::whereMonth('paid_at', now()->month)
            ->whereYear('paid_at', now()->year)
            ->sum('amount');

        $saasRevenueLifetime = SubscriptionPayment::sum('amount');

        // MRR estimate from currently-active subscribers
        $mrr = ($monthlyBilling * 3500) + ($yearlyBilling * (38500 / 12));

        $recentOrgs = Organization::with('owner:id,name,email')
            ->withCount('stores')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalOrganizations' => $totalOrgs,
                'activeOrganizations' => $activeOrgs,
                'trialOrganizations' => $trialOrgs,
                'suspendedOrganizations' => $suspendedOrgs,
                'expiringTrials' => $expiringTrials,
                'expiringSubscriptions' => $expiringSubscriptions,
                'monthlyBilling' => $monthlyBilling,
                'yearlyBilling' => $yearlyBilling,
                'vendorOrdersThisMonth' => $vendorOrdersThisMonth,
                'saasRevenueThisMonth' => round($saasRevenueThisMonth, 2),
                'saasRevenueLifetime' => round($saasRevenueLifetime, 2),
                'mrr' => round($mrr, 2),
            ],
            'recentOrganizations' => $recentOrgs,
        ]);
    }

    public function analytics()
    {
        $monthlySignups = Organization::select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('month')
            ->orderBy('month', 'desc')
            ->limit(12)
            ->get();

        $featureUsage = [
            'orders' => Order::whereMonth('created_at', now()->month)->count(),
        ];

        return Inertia::render('Admin/Analytics', [
            'monthlySignups' => $monthlySignups,
            'featureUsage' => $featureUsage,
        ]);
    }

    public function plans()
    {
        $monthly = (int) Organization::where('status', 'active')->where('billing_cycle', 'monthly')->count();
        $yearly = (int) Organization::where('status', 'active')->where('billing_cycle', 'yearly')->count();

        return Inertia::render('Admin/Plans', [
            'plan' => [
                'name' => 'Standard',
                'monthly_price' => 3500,
                'yearly_price' => 38500,
                'yearly_discount_label' => '1 month free',
            ],
            'subscriptions' => [
                'monthly' => $monthly,
                'yearly' => $yearly,
                'monthly_mrr' => $monthly * 3500,
                'yearly_arr_monthly' => $yearly * (38500 / 12),
            ],
        ]);
    }
}
