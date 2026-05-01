<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Store;
use App\Models\StoreUser;
use App\Models\SubscriptionPayment;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class OrganizationController extends Controller
{
    public function index(Request $request)
    {
        $query = Organization::with('owner:id,name,email')
            ->withCount(['users', 'stores'])
            ->withSum(['orders as total_revenue' => fn ($q) => $q->whereIn('orders.status', ['confirmed', 'delivered'])], 'total');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('owner', fn ($o) => $o->where('email', 'like', "%{$search}%"));
            });
        }

        if ($status = $request->input('status')) $query->where('status', $status);
        if ($cycle = $request->input('billing_cycle')) $query->where('billing_cycle', $cycle);

        if ($subState = $request->input('subscription_state')) {
            $now = now();
            $weekOut = now()->copy()->addDays(7);
            // Effective access date = whichever is later: subscription_ends_at or trial_ends_at (treat null as 1970)
            // We split per-org by checking BOTH columns with OR-grouped conditions.
            match ($subState) {
                'active' => $query->where(function ($q) use ($weekOut) {
                    $q->where('subscription_ends_at', '>', $weekOut)
                      ->orWhere(function ($q2) use ($weekOut) {
                          $q2->whereNull('subscription_ends_at')->where('trial_ends_at', '>', $weekOut);
                      });
                }),
                'expiring' => $query->where(function ($q) use ($now, $weekOut) {
                    $q->where(function ($q2) use ($now, $weekOut) {
                        $q2->whereNotNull('subscription_ends_at')
                           ->whereBetween('subscription_ends_at', [$now, $weekOut]);
                    })->orWhere(function ($q2) use ($now, $weekOut) {
                        $q2->whereNull('subscription_ends_at')
                           ->whereNotNull('trial_ends_at')
                           ->whereBetween('trial_ends_at', [$now, $weekOut]);
                    });
                }),
                'expired' => $query->where(function ($q) use ($now) {
                    $q->where(function ($q2) use ($now) {
                        $q2->whereNotNull('subscription_ends_at')->where('subscription_ends_at', '<', $now);
                    })->orWhere(function ($q2) use ($now) {
                        $q2->whereNull('subscription_ends_at')
                           ->whereNotNull('trial_ends_at')
                           ->where('trial_ends_at', '<', $now);
                    });
                }),
                'never_paid' => $query->whereNull('subscription_ends_at')->whereNull('trial_ends_at'),
                default => null,
            };
        }

        $organizations = $query->orderBy('created_at', 'desc')
            ->paginate($request->input('per_page', 10))
            ->withQueryString();

        return Inertia::render('Admin/Organizations/Index', [
            'organizations' => $organizations,
            'filters' => $request->only(['search', 'status', 'billing_cycle', 'subscription_state']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Admin/Organizations/Form');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'organization_name' => 'required|string|max:255',
            'store_name' => 'required|string|max:255',
            'status' => 'required|in:active,trial,suspended',
            'trial_days' => 'nullable|integer|min:1|max:365',
            'max_stores' => 'nullable|integer|min:1|max:1000',
            'owner_name' => 'required|string|max:255',
            'owner_email' => 'required|email|unique:users,email',
            'owner_phone' => 'required|string|max:15',
            'owner_password' => 'required|string|min:8',
        ]);

        DB::transaction(function () use ($validated) {
            $trialDays = (int) ($validated['trial_days'] ?? 14);
            $organization = Organization::create([
                'name' => $validated['organization_name'],
                'status' => $validated['status'],
                'max_stores' => (int) ($validated['max_stores'] ?? 1),
                'trial_ends_at' => $validated['status'] === 'trial' ? now()->addDays($trialDays) : null,
            ]);

            $owner = User::create([
                'organization_id' => $organization->id,
                'system_role' => 'member',
                'name' => $validated['owner_name'],
                'email' => $validated['owner_email'],
                'phone' => $validated['owner_phone'],
                'password' => $validated['owner_password'],
            ]);

            $organization->update(['owner_user_id' => $owner->id]);

            $store = Store::create([
                'organization_id' => $organization->id,
                'name' => $validated['store_name'],
                'slug' => Str::slug($validated['store_name']),
                'phone' => $validated['owner_phone'],
                'status' => 'active',
            ]);

            StoreUser::create([
                'store_id' => $store->id,
                'user_id' => $owner->id,
                'role' => 'owner',
                'permissions' => Permissions::defaultsFor('owner'),
            ]);
        });

        return redirect()->route('admin.organizations')->with('success', 'Organization created.');
    }

    public function edit(Organization $organization)
    {
        $organization->load('owner:id,name,email,phone')
            ->loadCount(['users', 'stores']);

        return Inertia::render('Admin/Organizations/Form', ['organization' => $organization]);
    }

    public function update(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'status' => 'required|in:active,trial,suspended',
            'max_stores' => 'required|integer|min:1|max:1000',
        ]);

        // Prevent setting max below current store count
        $current = $organization->stores()->count();
        if ($validated['max_stores'] < $current) {
            return back()->withErrors([
                'max_stores' => "Cannot set limit below current store count ({$current}). Delete stores first or pick a higher number.",
            ]);
        }

        $organization->update($validated);

        return redirect()->route('admin.organizations')->with('success', 'Organization updated.');
    }

    public function suspend(Organization $organization)
    {
        $organization->update(['status' => 'suspended']);
        return back()->with('success', 'Organization suspended.');
    }

    public function activate(Organization $organization)
    {
        $organization->update(['status' => 'active']);
        return back()->with('success', 'Organization activated.');
    }

    public function recordPayment(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'cycle' => ['required', Rule::in(['monthly', 'yearly'])],
        ]);

        // Extend from whichever is later: today or current subscription end
        $base = $organization->subscription_ends_at && $organization->subscription_ends_at->isFuture()
            ? $organization->subscription_ends_at
            : now();
        $months = $validated['cycle'] === 'yearly' ? 12 : 1;
        $amount = $validated['cycle'] === 'yearly' ? 38500 : 3500;
        $newEnd = $base->copy()->addMonths($months);

        DB::transaction(function () use ($organization, $validated, $amount, $base, $newEnd, $request) {
            $organization->update([
                'status' => 'active',
                'billing_cycle' => $validated['cycle'],
                'subscription_ends_at' => $newEnd,
                'trial_ends_at' => null,
            ]);

            SubscriptionPayment::create([
                'organization_id' => $organization->id,
                'recorded_by' => $request->user()->id,
                'cycle' => $validated['cycle'],
                'amount' => $amount,
                'paid_at' => now()->toDateString(),
                'period_start' => $base->copy()->toDateString(),
                'period_end' => $newEnd->toDateString(),
            ]);
        });

        $cycleLabel = $validated['cycle'] === 'yearly' ? 'yearly' : 'monthly';
        return back()->with('success', "Payment recorded — ₹" . number_format($amount, 0) . " {$cycleLabel} subscription extended to {$newEnd->format('d M Y')}.");
    }

    public function setSubscriptionEnd(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'subscription_ends_at' => 'nullable|date',
        ]);

        $organization->update([
            'subscription_ends_at' => $validated['subscription_ends_at'] ?: null,
        ]);

        return back()->with('success', 'Subscription end date updated.');
    }

    public function setTrial(Request $request, Organization $organization)
    {
        $validated = $request->validate([
            'trial_ends_at' => 'nullable|date',
            'extend_days' => 'nullable|integer|min:1|max:365',
        ]);

        $newDate = null;
        if (!empty($validated['extend_days'])) {
            $base = $organization->trial_ends_at && $organization->trial_ends_at->isFuture()
                ? $organization->trial_ends_at
                : now();
            $newDate = $base->copy()->addDays($validated['extend_days']);
        } elseif (array_key_exists('trial_ends_at', $validated)) {
            $newDate = $validated['trial_ends_at'] ?: null;
        }

        $organization->update([
            'trial_ends_at' => $newDate,
            'status' => $newDate && (!$organization->subscription_ends_at || $organization->subscription_ends_at->isPast())
                ? 'trial'
                : $organization->status,
        ]);

        return back()->with('success', $newDate
            ? 'Trial set to ' . $organization->fresh()->trial_ends_at->format('d M Y') . '.'
            : 'Trial cleared.');
    }

    public function impersonate(Request $request, Organization $organization)
    {
        $owner = $organization->owner;
        if (!$owner) {
            return back()->with('error', 'No owner found for this organization.');
        }

        DB::table('impersonation_logs')->insert([
            'admin_id' => $request->user()->id,
            'organization_id' => $organization->id,
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        session(['impersonating_from' => $request->user()->id]);
        auth()->login($owner);

        $firstStore = $organization->stores()->where('status', 'active')->first();
        if ($firstStore) {
            return redirect("/store/{$firstStore->slug}/dashboard");
        }
        return redirect('/select-store');
    }
}
