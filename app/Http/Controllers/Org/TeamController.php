<?php

namespace App\Http\Controllers\Org;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\Store;
use App\Models\StoreUser;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
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
                ]),
            ]);

        $owner = $org->owner;

        $pendingInvitations = $org->invitations()
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->with('stores:id,name,slug')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Org/Team/Index', [
            'owner' => $owner ? [
                'id' => $owner->id,
                'name' => $owner->name,
                'email' => $owner->email,
            ] : null,
            'members' => $members,
            'invitations' => $pendingInvitations,
            'stores' => $org->stores()->where('status', 'active')->get(['id', 'slug', 'name']),
            'permissionsCatalog' => Permissions::grouped(),
            'roleDefaults' => [
                'manager' => Permissions::defaultsFor('manager'),
                'employee' => Permissions::defaultsFor('employee'),
            ],
        ]);
    }

    public function invite(Request $request)
    {
        $org = $request->user()->organization;
        abort_unless($org, 403);

        $validated = $request->validate([
            'email' => 'required|email',
            'role' => ['required', Rule::in(['manager', 'employee'])],
            'store_ids' => 'required|array|min:1',
            'store_ids.*' => ['integer', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in(Permissions::all())],
        ]);

        $existingUser = User::where('email', $validated['email'])
            ->where('organization_id', $org->id)
            ->first();

        if ($existingUser) {
            return back()->withErrors(['email' => 'A user with this email already exists in your organization.']);
        }

        $invitation = DB::transaction(function () use ($validated, $org, $request) {
            $inv = Invitation::create([
                'organization_id' => $org->id,
                'email' => $validated['email'],
                'role' => $validated['role'],
                'permissions' => $validated['permissions'] ?? Permissions::defaultsFor($validated['role']),
                'invited_by' => $request->user()->id,
                'token' => Invitation::generateToken(),
                'expires_at' => now()->addDays(7),
            ]);

            $inv->stores()->attach($validated['store_ids']);

            return $inv;
        });

        return back()->with('success', "Invitation sent. Share this link: " . url("/invitations/{$invitation->token}"));
    }

    public function updateMember(Request $request, User $member)
    {
        $org = $request->user()->organization;
        abort_unless($org && $member->organization_id === $org->id, 403);
        abort_if($member->id === $org->owner_user_id, 403, 'Cannot modify the owner.');

        $validated = $request->validate([
            'memberships' => 'required|array',
            'memberships.*.store_id' => ['required', 'integer', Rule::exists('stores', 'id')->where('organization_id', $org->id)],
            'memberships.*.role' => ['required', Rule::in(['manager', 'employee'])],
            'memberships.*.permissions' => 'nullable|array',
            'memberships.*.permissions.*' => ['string', Rule::in(Permissions::all())],
        ]);

        DB::transaction(function () use ($validated, $member) {
            $keepStoreIds = collect($validated['memberships'])->pluck('store_id')->all();
            StoreUser::where('user_id', $member->id)->whereNotIn('store_id', $keepStoreIds)->delete();

            foreach ($validated['memberships'] as $m) {
                StoreUser::updateOrCreate(
                    ['store_id' => $m['store_id'], 'user_id' => $member->id],
                    [
                        'role' => $m['role'],
                        'permissions' => $m['permissions'] ?? Permissions::defaultsFor($m['role']),
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

    public function revokeInvitation(Request $request, Invitation $invitation)
    {
        $org = $request->user()->organization;
        abort_unless($org && $invitation->organization_id === $org->id, 403);

        $invitation->delete();

        return back()->with('success', 'Invitation revoked.');
    }
}
