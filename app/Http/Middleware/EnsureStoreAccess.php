<?php

namespace App\Http\Middleware;

use App\Models\Store;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class EnsureStoreAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $store = $request->route('store');

        if (!$store instanceof Store) {
            abort(404);
        }

        if (!$user || !$user->canAccessStore($store)) {
            abort(403, 'You do not have access to this store.');
        }

        if ($store->status !== 'active') {
            abort(403, 'This store is inactive.');
        }

        $request->attributes->set('current_store', $store);
        URL::defaults(['store' => $store->slug]);
        // Remember this store so org-level pages (no route binding) can keep showing it
        session(['last_store_slug' => $store->slug]);

        return $next($request);
    }
}
