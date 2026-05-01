import { Head, Link, usePage } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import Button from '@/Components/Button';
import Badge from '@/Components/Badge';
import { Plus, Edit, ExternalLink } from 'lucide-react';

export default function StoresIndex({ stores, limits = {} }) {
    const { auth, flash } = usePage().props;
    const isOwner = auth?.user?.is_owner;
    const atLimit = !limits.can_add;

    return (
        <VendorLayout title="Stores">
            <Head title="Stores" />

            {flash?.error && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    {flash.error}
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-sm text-gray-500">All stores in {auth?.organization?.name}</p>
                    {limits.max_stores != null && (
                        <p className="text-xs text-gray-400 mt-1">
                            Using <strong className="text-gray-700">{limits.used}</strong> of <strong className="text-gray-700">{limits.max_stores}</strong> stores allowed.
                            {atLimit && ' To add more, contact support.'}
                        </p>
                    )}
                </div>
                {isOwner && !atLimit && (
                    <Link href="/org/stores/create">
                        <Button>
                            <Plus className="h-4 w-4 mr-1" /> Add Store
                        </Button>
                    </Link>
                )}
                {isOwner && atLimit && (
                    <Button variant="outline" disabled title="Contact support to add more stores">
                        <Plus className="h-4 w-4 mr-1" /> Limit Reached
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                                <p className="text-xs text-gray-400 mt-0.5">/{s.slug}</p>
                            </div>
                            <Badge color={s.status === 'active' ? 'success' : 'gray'}>{s.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                            <div>
                                <p className="text-xs text-gray-400">Users</p>
                                <p className="font-semibold text-gray-900">{s.users_count}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Products</p>
                                <p className="font-semibold text-gray-900">{s.products_count}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Orders</p>
                                <p className="font-semibold text-gray-900">{s.orders_count}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href={`/store/${s.slug}/dashboard`} className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <ExternalLink className="h-4 w-4 mr-1" /> Open
                                </Button>
                            </Link>
                            {isOwner && (
                                <Link href={`/org/stores/${s.slug}/edit`}>
                                    <Button variant="outline">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </VendorLayout>
    );
}
