<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\StoreUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class InvitationController extends Controller
{
    public function show(string $token)
    {
        $invitation = Invitation::where('token', $token)->with('organization:id,name', 'stores:id,name')->first();

        if (!$invitation || !$invitation->isPending()) {
            return Inertia::render('Auth/InvitationInvalid');
        }

        return Inertia::render('Auth/AcceptInvitation', [
            'invitation' => [
                'token' => $invitation->token,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'organization' => $invitation->organization->name,
                'stores' => $invitation->stores->pluck('name'),
            ],
        ]);
    }

    public function accept(Request $request, string $token)
    {
        $invitation = Invitation::where('token', $token)->first();

        if (!$invitation || !$invitation->isPending()) {
            return redirect('/login')->withErrors(['email' => 'This invitation is invalid or expired.']);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:15',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = DB::transaction(function () use ($validated, $invitation) {
            $user = User::create([
                'organization_id' => $invitation->organization_id,
                'system_role' => 'member',
                'name' => $validated['name'],
                'email' => $invitation->email,
                'phone' => $validated['phone'] ?? null,
                'password' => $validated['password'],
            ]);

            foreach ($invitation->stores as $store) {
                StoreUser::create([
                    'store_id' => $store->id,
                    'user_id' => $user->id,
                    'role' => $invitation->role,
                    'permissions' => $invitation->permissions,
                ]);
            }

            $invitation->update(['accepted_at' => now()]);

            return $user;
        });

        Auth::login($user);

        $stores = $user->stores()->where('stores.status', 'active')->get();
        if ($stores->count() === 1) {
            return redirect("/store/{$stores->first()->slug}/dashboard");
        }
        return redirect('/select-store');
    }
}
