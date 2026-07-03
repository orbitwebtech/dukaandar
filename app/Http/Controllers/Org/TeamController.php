<?php

namespace App\Http\Controllers\Org;

use App\Http\Controllers\Controller;
use App\Models\StoreUser;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class TeamController extends Controller
{
    public function index(Request $request)
    {
        $org = $request->user()->organization;
        abort_unless($org, 403);

        $members = $org->users()
            ->with(['stores' => fn ($q) => $q->select('stores.id', 'stores.slug', 'stores.name')])
            ->where('id', '!=', $org->owner_user_id)
            ->orderBy('name')
            ->get()
            ->map(fn ($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'stores' => $u->stores->map(fn ($s) => [
                    'id' => $s->id,
                    'slug' => $s->slug,
                    'name' => $s->name,
                    'role' => $s->pivot->role,
                    'permissions' => $s->pivot->permissions,
                ]),
            ]);

        $owner = $org->owner;

        return Inertia::render('Org/Team/Index', [
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
            ] : null,
            'members' => $members,
            'stores' => $org->stores()->where('status', 'active')->get(['id', 'slug', 'name']),
            'permissionsCatalog' => Permissions::grouped(),
            'roleDefaults' => [
                'manager' => Permissions::defaultsFor('manager'),
                'employee' => Permissions::defaultsFor('employee'),
                'sales' => Permissions::defaultsFor('sales'),
            ],
        ]);
    }

    public function storeMember(Request $request)
    {
        $org = $request->user()->organization;
        abort_unless($org, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::in(['manager', 'employee', 'sales'])],
            'store_ids' => 'required|array|min:1',
            'store_ids.*' => ['integer', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'permissions' => 'nullable|array',
            'permissions.*' => ['string'],
        ]);

        $permissions = $validated['permissions'] ?? Permissions::defaultsFor($validated['role']);
        $permissions = array_values(array_intersect($permissions, Permissions::all()));

        DB::transaction(function () use ($validated, $org, $permissions) {
            $user = User::create([
                'organization_id' => $org->id,
                'system_role' => 'member',
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => $validated['password'],
                // Owner-created accounts are trusted immediately — no verification email.
                'email_verified_at' => now(),
            ]);

            foreach ($validated['store_ids'] as $storeId) {
                StoreUser::create([
                    'store_id' => $storeId,
                    'user_id' => $user->id,
                    'role' => $validated['role'],
                    'permissions' => $permissions,
                ]);
            }
        });

        return back()->with('success', "{$validated['name']} added to your team.");
    }

    public function updateMember(Request $request, User $member)
    {
        $org = $request->user()->organization;
        abort_unless($org && $member->organization_id === $org->id, 403);
        abort_if($member->id === $org->owner_user_id, 403, 'Cannot modify the owner.');

        $validated = $request->validate([
            'memberships' => 'required|array',
            'memberships.*.store_id' => ['required', 'integer', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'memberships.*.role' => ['required', Rule::in(['manager', 'employee', 'sales'])],
            'memberships.*.permissions' => 'nullable|array',
            'memberships.*.permissions.*' => ['string'],
        ]);

        DB::transaction(function () use ($validated, $member) {
            $keepStoreIds = collect($validated['memberships'])->pluck('store_id')->all();
            StoreUser::where('user_id', $member->id)->whereNotIn('store_id', $keepStoreIds)->delete();

            foreach ($validated['memberships'] as $m) {
                $permissions = $m['permissions'] ?? Permissions::defaultsFor($m['role']);
                // Drop any stale permissions no longer in the catalog (e.g. removed features)
                // so legacy data can't fail the whole save.
                $permissions = array_values(array_intersect($permissions, Permissions::all()));

                StoreUser::updateOrCreate(
                    ['store_id' => $m['store_id'], 'user_id' => $member->id],
                    [
                        'role' => $m['role'],
                        'permissions' => $permissions,
                    ]
                );
            }
        });

        return back()->with('success', 'Member updated.');
    }

    public function removeMember(Request $request, User $member)
    {
        $org = $request->user()->organization;
        abort_unless($org && $member->organization_id === $org->id, 403);
        abort_if($member->id === $org->owner_user_id, 403, 'Cannot remove the owner.');

        $member->delete();

        return back()->with('success', 'Member removed.');
    }
}
