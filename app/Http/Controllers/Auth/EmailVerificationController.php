<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class EmailVerificationController extends Controller
{
    public function notice(Request $request)
    {
        $email = session('pending_email') ?? session('unverified_email');

        return Inertia::render('Auth/VerifyEmail', [
            'email' => $email,
        ]);
    }

    public function verify(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);

        if (!hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            abort(403, 'Invalid verification link.');
        }

        if ($user->hasVerifiedEmail()) {
            Auth::login($user);
            return $this->redirectAfterVerification($user);
        }

        $user->markEmailAsVerified();
        event(new Verified($user));

        Auth::login($user);

        return $this->redirectAfterVerification($user)
            ->with('success', 'Email verified! Welcome.');
    }

    public function resend(Request $request)
    {
        $validated = $request->validate(['email' => 'required|email']);

        $user = User::where('email', $validated['email'])->first();

        if ($user && !$user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return back()->with('success', 'If an unverified account exists for that email, a new verification link has been sent.');
    }

    private function redirectAfterVerification(User $user)
    {
        if ($user->isSuperAdmin()) {
            return redirect('/admin/dashboard');
        }

        $stores = $user->stores()->where('stores.status', 'active')->get();
        if ($stores->count() === 1) {
            return redirect("/store/{$stores->first()->slug}/dashboard");
        }
        return redirect('/select-store');
    }
}
