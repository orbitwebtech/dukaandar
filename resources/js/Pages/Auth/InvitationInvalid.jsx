import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function InvitationInvalid() {
    return (
        <GuestLayout>
            <Head title="Invalid Invitation" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Invalid</h2>
                <p className="text-sm text-gray-500 mb-6">This invitation has expired, been revoked, or already been used.</p>
                <Link href="/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    Go to login →
                </Link>
            </div>
        </GuestLayout>
    );
}
