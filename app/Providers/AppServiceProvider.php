<?php

namespace App\Providers;

use App\Models\Store;
use App\Support\Permissions;
use App\Support\ThemePalette;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\View;
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

        // Inject the current store's primary-colour ramp into the app shell head
        // so the whole UI is themed on first paint (no flash of the default colour).
        View::composer('app', function ($view) {
            $slug = session('last_store_slug');
            $hex = $slug ? optional(Store::where('slug', $slug)->first())->getSetting('primary_color') : null;
            $view->with('themeRootCss', ThemePalette::rootCss($hex));
        });
    }
}
