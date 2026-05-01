<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        $organization = $user?->organization;
        $isOwner = $user && $organization && $organization->owner_user_id === $user->id;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'system_role' => $user->system_role,
                    'is_owner' => $isOwner,
                ] : null,
                'organization' => $organization ? [
                    'id' => $organization->id,
                    'name' => $organization->name,
                    'status' => $organization->status,
                    'billing_cycle' => $organization->billing_cycle,
                    'subscription_ends_at' => $organization->subscription_ends_at?->toDateString(),
                ] : null,
                'currentStore' => function () use ($request, $user, $isOwner) {
                    $store = $request->attributes->get('current_store');
                    if (!$store instanceof Store) {
                        // Outside a store-scoped route (e.g. /org/*) — try the last-visited store first
                        $lastSlug = session('last_store_slug');
                        if ($lastSlug && $user) {
                            $store = $user->stores()
                                ->where('stores.slug', $lastSlug)
                                ->where('stores.status', 'active')
                                ->first();
                        }
                        // Final fallback: the user's first active store
                        if (!$store && $user) {
                            $store = $user->stores()->where('stores.status', 'active')->first();
                        }
                    }
                    if (!$store) return null;
                    return [
                        'id' => $store->id,
                        'slug' => $store->slug,
                        'name' => $store->name,
                        'role' => $user?->roleIn($store),
                        'permissions' => $isOwner
                            ? \App\Support\Permissions::all()
                            : ($user?->membershipFor($store)?->permissions ?? []),
                    ];
                },
                'stores' => $user ? $user->stores()
                    ->where('stores.status', 'active')
                    ->get()
                    ->map(fn ($s) => [
                        'slug' => $s->slug,
                        'name' => $s->name,
                    ]) : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'importErrors' => fn () => $request->session()->get('importErrors'),
            ],
        ];
    }
}
