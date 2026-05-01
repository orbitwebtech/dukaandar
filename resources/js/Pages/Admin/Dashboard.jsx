import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Badge from '@/Components/Badge';
import {
    Building2,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    IndianRupee,
} from 'lucide-react';

const statusBadgeColor = {
    active: 'success',
    trial: 'blue',
    suspended: 'danger',
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export default function Dashboard({
    stats = {},
    recentOrganizations = [],
}) {
    return (
        <AdminLayout title="Dashboard">
            <Head title="Admin Dashboard" />

            {/* SaaS revenue (your money) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                <StatCard
                    title="SAAS Revenue (this month)"
                    value={`₹${Number(stats.saasRevenueThisMonth || 0).toLocaleString('en-IN')}`}
                    icon={DollarSign}
                    color="success"
                />
                <StatCard
                    title="MRR (estimated)"
                    value={`₹${Number(stats.mrr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    icon={TrendingUp}
                    color="primary"
                />
                <StatCard
                    title="SAAS Revenue (Lifetime)"
                    value={`₹${Number(stats.saasRevenueLifetime || 0).toLocaleString('en-IN')}`}
                    icon={IndianRupee}
                    color="warning"
                />
            </div>

            {/* Org status counters */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
                <StatCard title="Total Orgs" value={Number(stats.totalOrganizations || 0).toLocaleString('en-IN')} icon={Building2} color="primary" />
                <StatCard title="Active" value={Number(stats.activeOrganizations || 0).toLocaleString('en-IN')} icon={CheckCircle2} color="success" />
                <StatCard title="Trial" value={Number(stats.trialOrganizations || 0).toLocaleString('en-IN')} icon={Clock} color="blue" />
                <StatCard title="Expiring Trials" value={Number(stats.expiringTrials || 0).toLocaleString('en-IN')} icon={AlertTriangle} color="warning" />
                <StatCard title="Vendor Orders (Mo)" value={Number(stats.vendorOrdersThisMonth || 0).toLocaleString('en-IN')} icon={ShoppingCart} color="primary" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 mb-6">
                <div className="xl:col-span-1">
                    <Card>
                        <CardHeader title="Subscriptions" subtitle="Active paying organizations by billing cycle" />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-blue-700">Monthly</p>
                                    <p className="text-xs text-blue-400 mt-0.5">₹3,500/month</p>
                                </div>
                                <span className="text-2xl font-bold text-blue-900">{stats.monthlyBilling ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-amber-700">Yearly</p>
                                    <p className="text-xs text-amber-400 mt-0.5">₹38,500/year (1 month free)</p>
                                </div>
                                <span className="text-2xl font-bold text-amber-900">{stats.yearlyBilling ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-red-700">Expiring soon</p>
                                    <p className="text-xs text-red-400 mt-0.5">Active subs ending in 7 days</p>
                                </div>
                                <span className="text-2xl font-bold text-red-900">{stats.expiringSubscriptions ?? 0}</span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">Suspended</p>
                                </div>
                                <span className="text-2xl font-bold text-gray-900">{stats.suspendedOrganizations ?? 0}</span>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="xl:col-span-2">
                    <Card padding={false}>
                        <div className="p-6 pb-0">
                            <CardHeader
                                title="Recent Organizations"
                                subtitle="Newest accounts on the platform"
                                className="mb-0"
                                action={
                                    <Link href="/admin/organizations" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                                        View all
                                    </Link>
                                }
                            />
                        </div>

                        {recentOrganizations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                                <Building2 className="h-10 w-10 mb-3 opacity-40" />
                                <p className="text-sm">No organizations yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto mt-4">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/60">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stores</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {recentOrganizations.map((org) => (
                                            <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Link href={`/admin/organizations/${org.id}/edit`} className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition">
                                                        {org.name}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">
                                                    {org.owner ? `${org.owner.name} · ${org.owner.email}` : '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">{org.stores_count}</td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-600 capitalize">
                                                    {org.billing_cycle || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Badge color={statusBadgeColor[org.status] || 'gray'}>
                                                        {org.status ? org.status.charAt(0).toUpperCase() + org.status.slice(1) : '—'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">{formatDate(org.created_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}
