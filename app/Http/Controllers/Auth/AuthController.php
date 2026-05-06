<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Store;
use App\Models\StoreUser;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors([
                'email' => 'The provided credentials do not match our records.',
            ]);
        }

        $user = Auth::user();

        if (!$user->isSuperAdmin() && !$user->hasVerifiedEmail()) {
            Auth::logout();
            return back()->withErrors([
                'email' => 'Please verify your email address. Check your inbox or request a new link.',
            ])->with('unverified_email', $user->email);
        }

        // Block members of suspended organizations
        if (!$user->isSuperAdmin() && $user->organization?->status === 'suspended') {
            Auth::logout();
            return back()->withErrors([
                'email' => 'This account has been suspended. Please contact support.',
            ]);
        }

        // Block members whose paid subscription has lapsed (trial users still allowed until trial_ends_at)
        if (!$user->isSuperAdmin() && $user->organization) {
            $org = $user->organization;
            if ($org->status === 'active' && $org->subscription_ends_at && $org->subscription_ends_at->isPast()) {
                Auth::logout();
                return back()->withErrors([
                    'email' => 'Your subscription has expired. Please contact support to renew.',
                ]);
            }
        }

        $request->session()->regenerate();

        return $this->redirectAfterLogin($user);
    }

    public function showRegister()
    {
        return Inertia::render('Auth/Register');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'organization_name' => 'required|string|max:255',
            'store_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|string|max:15',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $organization = Organization::create([
                'name' => $validated['organization_name'],
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
            ]);

            $user = User::create([
                'organization_id' => $organization->id,
                'system_role' => 'member',
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ]);

            $organization->update(['owner_user_id' => $user->id]);

            $store = Store::create([
                'organization_id' => $organization->id,
                'name' => $validated['store_name'],
                'slug' => $this->uniqueStoreSlug($organization->id, $validated['store_name']),
                'phone' => $validated['phone'],
                'status' => 'active',
            ]);

            StoreUser::create([
                'store_id' => $store->id,
                'user_id' => $user->id,
                'role' => 'owner',
                'permissions' => Permissions::defaultsFor('owner'),
            ]);

            $this->seedStoreDefaults($store, $validated);

            return $user;
        });

        event(new Registered($user));

        return redirect()->route('verification.notice')
            ->with('pending_email', $user->email);
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }

    public function showChangePassword()
    {
        return Inertia::render('Auth/ChangePassword');
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => ['required'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        if (!Hash::check($validated['current_password'], $request->user()->password)) {
            return back()->withErrors(['current_password' => 'Current password is incorrect.']);
        }

        $request->user()->forceFill([
            'password' => $validated['password'],
        ])->save();

        return back()->with('success', 'Password updated.');
    }

    protected function redirectAfterLogin(User $user)
    {
        if ($user->isSuperAdmin()) {
            return redirect()->intended('/admin/dashboard');
        }

        $stores = $user->stores()->where('stores.status', 'active')->get();

        if ($stores->isEmpty()) {
            Auth::logout();
            return redirect('/login')->withErrors([
                'email' => 'You do not have access to any active store. Contact your organization owner.',
            ]);
        }

        if ($stores->count() === 1) {
            return redirect("/store/{$stores->first()->slug}/dashboard");
        }

        return redirect('/select-store');
    }

    protected function uniqueStoreSlug(int $organizationId, string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i = 1;
        while (Store::where('organization_id', $organizationId)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }
        return $slug;
    }

    protected function seedStoreDefaults(Store $store, array $input): void
    {
        $defaults = [
            'shop_name' => $input['store_name'],
            'owner_name' => $input['name'],
            'whatsapp_number' => $input['phone'],
            'invoice_prefix' => 'ORD',
            'invoice_footer' => 'Thank you for shopping with us!',
            'whatsapp_template' => "Hello [CustomerName],\n\nThank you for your purchase from [ShopName].\n\nYou can find your Invoice on below Link: [InvoiceLink]",
            'review_text' => "Hi [CustomerName],\n\nYou have recently purchased from [ShopName].\n\nWe value our customers and to improve future services please review us on Google: [ReviewLink]\n\nThanks\n[ShopName]",
            'review_reprompt_interval' => '3',
            'slow_moving_days' => '30',
        ];
        foreach ($defaults as $key => $value) {
            $store->setSetting($key, $value);
        }
    }
}
