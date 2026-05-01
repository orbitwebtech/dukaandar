import { Link } from '@inertiajs/react';
import { Store } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex flex-col items-center justify-center px-4 py-12">
            <div className="mb-8 flex flex-col items-center">
                <Link href="/" className="flex items-center gap-3 mb-2">
                    <div className="h-12 w-12 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <Store className="h-7 w-7 text-white" />
                    </div>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Dukaandar</h1>
                <p className="text-sm text-gray-500">Garment Vendor Management Platform</p>
            </div>
            <div className="w-full max-w-md">
                {children}
            </div>
        </div>
    );
}
