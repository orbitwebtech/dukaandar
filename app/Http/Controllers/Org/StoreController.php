<?php

namespace App\Http\Controllers\Org;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreUser;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $org = $request->user()->organization;
        abort_unless($org, 403);

        $stores = $org->stores()->withCount(['users', 'products', 'orders'])->orderBy('name')->get();
        $usedCount = $stores->count();

        return Inertia::render('Org/Stores/Index', [
            'stores' => $stores,
            'limits' => [
                'max_stores' => (int) ($org->max_stores ?? 1),
                'used' => $usedCount,
                'can_add' => $usedCount < (int) ($org->max_stores ?? 1),
            ],
        ]);
    }

    public function create(Request $request)
    {
        $this->authorize('manage-organization');
        $org = $request->user()->organization;
        if ($org->stores()->count() >= (int) ($org->max_stores ?? 1)) {
            return redirect()->route('org.stores.index')->with('error',
                "Your plan allows {$org->max_stores} store(s). Contact support to add more.");
        }
        return Inertia::render('Org/Stores/Form');
    }

    public function store(Request $request)
    {
        $this->authorize('manage-organization');
        $org = $request->user()->organization;

        if ($org->stores()->count() >= (int) ($org->max_stores ?? 1)) {
            return redirect()->route('org.stores.index')->with('error',
                "Your plan allows {$org->max_stores} store(s). Contact support to add more.");
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:15',
            'address' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($validated, $org, $request) {
            $store = Store::create([
                'organization_id' => $org->id,
                'name' => $validated['name'],
                'slug' => $this->uniqueSlug($org->id, $validated['name']),
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'status' => 'active',
            ]);

            StoreUser::create([
                'store_id' => $store->id,
                'user_id' => $request->user()->id,
                'role' => 'owner',
                'permissions' => Permissions::defaultsFor('owner'),
            ]);
        });

        return redirect()->route('org.stores.index')->with('success', 'Store created.');
    }

    public function edit(Store $store, Request $request)
    {
        $this->authorize('manage-organization');
        abort_unless($store->organization_id === $request->user()->organization_id, 403);
        return Inertia::render('Org/Stores/Form', ['store' => $store]);
    }

    public function update(Request $request, Store $store)
    {
        $this->authorize('manage-organization');
        abort_unless($store->organization_id === $request->user()->organization_id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:15',
            'address' => 'nullable|string|max:255',
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $store->update($validated);

        return redirect()->route('org.stores.index')->with('success', 'Store updated.');
    }

    private function uniqueSlug(int $orgId, string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (Store::where('organization_id', $orgId)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }
}
