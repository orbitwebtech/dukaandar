import { Head, Link } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Store, LogOut } from 'lucide-react';

export default function SelectStore({ stores }) {
    return (
        <GuestLayout>
            <Head title="Select Store" />
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-1">Select a Store</h2>
                <p className="text-sm text-gray-500 text-center mb-8">Choose which store to work in.</p>

                <div className="space-y-2">
                    {stores.map(s => (
                        <Link
                            key={s.slug}
                            href={`/store/${s.slug}/dashboard`}
                            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-primary-300 hover:bg-primary-50/30 transition"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                    <Store className="h-5 w-5 text-primary-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{s.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">Role: {s.role}</p>
                                </div>
                            </div>
                            <span className="text-sm text-primary-600 font-medium">Open →</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-8 text-center">
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600"
                    >
                        <LogOut className="h-4 w-4" /> Sign out
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}
