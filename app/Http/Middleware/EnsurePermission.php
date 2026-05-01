<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = $request->user();
        $store = $request->route('store');

        if (!$user || !$store instanceof Store) {
            abort(403);
        }

        if (!$user->hasPermission($store, $permission)) {
            abort(403, "Missing permission: {$permission}");
        }

        return $next($request);
    }
}
