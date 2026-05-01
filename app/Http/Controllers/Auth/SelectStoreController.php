<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SelectStoreController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $stores = $user->stores()
            ->where('stores.status', 'active')
            ->get()
            ->map(fn($s) => [
                'slug' => $s->slug,
                'name' => $s->name,
                'role' => $s->pivot->role,
            ]);

        if ($stores->count() === 1) {
            return redirect("/store/{$stores->first()['slug']}/dashboard");
        }

        return Inertia::render('Auth/SelectStore', [
            'stores' => $stores,
        ]);
    }
}
