import { Head, Link, router, usePage } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import { Plus, Pencil, Trash2, Wallet, Calendar, Filter } from 'lucide-react';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function ExpensesIndex({ expenses, filters = {}, stores = [], categories = [], summary = {} }) {
    const { auth } = usePage().props;
    const isOwner = !!auth?.user?.is_owner;

    const applyFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
        router.get('/org/expenses', next, { preserveScroll: true, preserveState: true });
    };

    const clearFilters = () => router.get('/org/expenses');
    const hasFilters = Object.values(filters).some(v => v);

    const handleDelete = (e) => {
        if (!confirm(`Delete expense "${e.category}" of ${inr(e.amount)}?`)) return;
        router.delete(`/org/expenses/${e.id}`, { preserveScroll: true });
    };

    return (
        <VendorLayout title="Expenses">
            <Head title="Expenses" />

            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Track org-wide and store-specific expenses.</p>
                {isOwner && (
                    <Link href="/org/expenses/create">
                        <Button><Plus className="h-4 w-4 mr-1" /> Add Expense</Button>
                    </Link>
                )}
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <StatCard
                    title="This Month"
                    value={inr(summary.this_month_total)}
                    icon={Calendar}
                    color="primary"
                />
                <StatCard
                    title={hasFilters ? 'Filtered Total' : 'Total (all time)'}
                    value={inr(summary.filtered_total)}
                    icon={Wallet}
                    color="warning"
                />
                <Card>
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Top Categories</p>
                    {summary.by_category && summary.by_category.length > 0 ? (
                        <div className="space-y-1.5">
                            {summary.by_category.slice(0, 4).map((c) => (
                                <div key={c.category} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-700 truncate mr-2">{c.category}</span>
                                    <span className="font-medium text-gray-900 shrink-0">{inr(c.total)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No expenses yet</p>
                    )}
                </Card>
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <select
                        value={filters.category || ''}
                        onChange={(e) => applyFilter('category', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                        value={filters.store_id || ''}
                        onChange={(e) => applyFilter('store_id', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All stores</option>
                        <option value="org">Organization-wide (no store)</option>
                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input
                        type="date"
                        value={filters.from || ''}
                        onChange={(e) => applyFilter('from', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="From"
                    />
                    <input
                        type="date"
                        value={filters.to || ''}
                        onChange={(e) => applyFilter('to', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="To"
                    />
                    {hasFilters && (
                        <button onClick={clearFilters} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5">
                            <Filter className="h-4 w-4" /> Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/60">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Store</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Recorded by</th>
                                {isOwner && <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {expenses.data.length === 0 && (
                                <tr>
                                    <td colSpan={isOwner ? 7 : 6} className="px-4 py-12 text-center text-sm text-gray-400">
                                        No expenses yet. {isOwner && (<Link href="/org/expenses/create" className="text-primary-600 hover:text-primary-700 font-medium">Add the first one →</Link>)}
                                    </td>
                                </tr>
                            )}
                            {expenses.data.map(e => (
                                <tr key={e.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(e.expense_date)}</td>
                                    <td className="px-4 py-3 text-sm">
                                        <Badge color="gray">{e.category}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {e.store ? e.store.name : <span className="text-gray-400 italic">Org-wide</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={e.notes || ''}>{e.notes || '—'}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{inr(e.amount)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{e.recorder?.name || '—'}</td>
                                    {isOwner && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Link href={`/org/expenses/${e.id}/edit`} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600">
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => handleDelete(e)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {expenses.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Showing {expenses.from}-{expenses.to} of {expenses.total}</span>
                        <div className="flex gap-1">
                            {expenses.links.filter(l => l.url).map((l, i) => (
                                <Link
                                    key={i}
                                    href={l.url}
                                    preserveScroll
                                    preserveState
                                    className={`px-2 py-1 rounded ${l.active ? 'bg-primary-500 text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </VendorLayout>
    );
}
