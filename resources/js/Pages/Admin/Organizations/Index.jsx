import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import { Plus, Edit, Pause, Play, LogIn } from 'lucide-react';

const cycleColor = { monthly: 'blue', yearly: 'warning' };
const statusColor = { active: 'success', trial: 'blue', suspended: 'danger' };

const subStatus = (org) => {
    // Effective access date: subscription if set, else trial
    const dateStr = org.subscription_ends_at || org.trial_ends_at;
    const isTrial = !org.subscription_ends_at && org.trial_ends_at;
    if (!dateStr) return { color: 'gray', label: 'Not subscribed', isTrial: false };
    const end = new Date(dateStr);
    const now = new Date();
    if (end < now) return { color: 'danger', label: isTrial ? 'Trial expired' : 'Expired', isTrial };
    const daysLeft = Math.ceil((end - now) / 86400000);
    const prefix = isTrial ? 'Trial · ' : '';
    if (daysLeft <= 7) return { color: 'warning', label: `${prefix}${daysLeft}d left`, isTrial };
    return { color: 'success', label: `${prefix}${daysLeft}d left`, isTrial };
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function OrganizationsIndex({ organizations, filters = {} }) {
    const toggleStatus = (org) => {
        const action = org.status === 'suspended' ? 'activate' : 'suspend';
        if (confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${org.name}?`)) {
            router.post(`/admin/organizations/${org.id}/${action}`);
        }
    };

    const applyFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
        router.get('/admin/organizations', next, { preserveScroll: true, preserveState: true });
    };

    const clearFilters = () => router.get('/admin/organizations');

    const hasFilters = Object.values(filters).some(v => v);

    return (
        <AdminLayout title="Organizations">
            <Head title="Organizations" />

            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">All organizations on the platform</p>
                <Link href="/admin/organizations/create">
                    <Button><Plus className="h-4 w-4 mr-1" /> Add Organization</Button>
                </Link>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <input
                        type="text"
                        defaultValue={filters.search || ''}
                        placeholder="Search by org name or owner email"
                        onChange={(e) => applyFilter('search', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm lg:col-span-2"
                    />
                    <select
                        value={filters.status || ''}
                        onChange={(e) => applyFilter('status', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All statuses</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <select
                        value={filters.billing_cycle || ''}
                        onChange={(e) => applyFilter('billing_cycle', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All billing cycles</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <select
                        value={filters.subscription_state || ''}
                        onChange={(e) => applyFilter('subscription_state', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All subscriptions</option>
                        <option value="active">Active (&gt;7 days left)</option>
                        <option value="expiring">Expiring soon (≤7 days)</option>
                        <option value="expired">Expired</option>
                        <option value="never_paid">Never paid</option>
                    </select>
                </div>
                {hasFilters && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">{organizations.total} result{organizations.total !== 1 ? 's' : ''}</p>
                        <button onClick={clearFilters} className="text-xs font-medium text-primary-600 hover:text-primary-700">
                            Clear filters
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/60">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Organization</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Owner</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Stores</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Users</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Sales</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Cycle</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Subscription</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {organizations.data.map(org => (
                                <tr key={org.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{org.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {org.owner ? <>{org.owner.name}<br /><span className="text-xs">{org.owner.email}</span></> : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">{org.stores_count}</td>
                                    <td className="px-4 py-3 text-sm text-right">{org.users_count}</td>
                                    <td className="px-4 py-3 text-sm text-right font-medium">{inr(org.total_revenue)}</td>
                                    <td className="px-4 py-3">
                                        {org.billing_cycle
                                            ? <Badge color={cycleColor[org.billing_cycle]}>{org.billing_cycle}</Badge>
                                            : <span className="text-xs text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3"><Badge color={statusColor[org.status] || 'gray'}>{org.status}</Badge></td>
                                    <td className="px-4 py-3 text-xs">
                                        {(() => { const s = subStatus(org); return <Badge color={s.color}>{s.label}</Badge>; })()}
                                        {(org.subscription_ends_at || org.trial_ends_at) && (
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                until {formatDate(org.subscription_ends_at || org.trial_ends_at)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(org.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button
                                                onClick={() => router.post(`/admin/organizations/${org.id}/impersonate`)}
                                                title="Impersonate owner"
                                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                            >
                                                <LogIn className="h-4 w-4" />
                                            </button>
                                            <Link href={`/admin/organizations/${org.id}/edit`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                                                <Edit className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => toggleStatus(org)}
                                                title={org.status === 'suspended' ? 'Activate' : 'Suspend'}
                                                className={`rounded p-1.5 ${org.status === 'suspended' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                            >
                                                {org.status === 'suspended' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {organizations.data.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-12">No organizations found.</p>
                )}
            </div>
        </AdminLayout>
    );
}
