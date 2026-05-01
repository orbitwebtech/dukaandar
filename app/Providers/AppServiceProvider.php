<?php

namespace App\Providers;

use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RedirectIfAuthenticated::redirectUsing(fn () => '/');

        foreach (Permissions::all() as $permission) {
            Gate::define($permission, function ($user, ?Store $store = null) use ($permission) {
                if (!$store) return false;
                return $user->hasPermission($store, $permission);
            });
        }

        Gate::define('access-store', function ($user, Store $store) {
            return $user->canAccessStore($store);
        });

        Gate::define('manage-organization', function ($user) {
            if ($user->isSuperAdmin()) return true;
            $org = $user->organization;
            return $org && $org->owner_user_id === $user->id;
        });
    }
}
