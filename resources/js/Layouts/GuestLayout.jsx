import { Link } from '@inertiajs/react';
import { Store } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex flex-col items-center justify-center px-4 py-12 overflow-hidden">
            {/* Ambient gradient blobs */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-gradient opacity-20 blur-3xl" />

            <div className="relative mb-8 flex flex-col items-center">
                <Link href="/" className="flex items-center gap-3 mb-3 group">
                    <div className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-brand transition-transform duration-200 group-hover:scale-105">
                        <Store className="h-7 w-7 text-white" />
                    </div>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-brand-gradient">Dukaandar</h1>
                <p className="text-sm text-gray-500">Garment Vendor Management Platform</p>
            </div>
            <div className="relative w-full max-w-md">
                {children}
            </div>
        </div>
    );
}
