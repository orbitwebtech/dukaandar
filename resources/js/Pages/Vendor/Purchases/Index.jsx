import { Head, Link, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath, useCan } from '@/lib/storePath';
import Card, { StatCard } from '@/Components/Card';
import Button from '@/Components/Button';
import { Plus, Pencil, Trash2, ShoppingBag, Calendar, Receipt, Filter } from 'lucide-react';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function PurchasesIndex({ purchases, filters = {}, summary = {} }) {
    const url = useStorePath();
    const can = useCan();

    const applyFilter = (key, value) => {
        const next = { ...filters, [key]: value || undefined };
        Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
        router.get(url('/purchases'), next, { preserveScroll: true, preserveState: true });
    };

    const clearFilters = () => router.get(url('/purchases'));
    const hasFilters = Object.values(filters).some(v => v);

    const handleDelete = (p) => {
        if (!confirm(`Delete purchase "${p.product_name}" of ${inr(p.total)}?`)) return;
        router.delete(url(`/purchases/${p.id}`), { preserveScroll: true });
    };

    return (
        <VendorLayout title="Purchases">
            <Head title="Purchases" />

            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">Stock and supplier purchases for this store.</p>
                {can('purchases.create') && (
                    <Link href={url('/purchases/create')}>
                        <Button><Plus className="h-4 w-4 mr-1" /> Add Purchase</Button>
                    </Link>
                )}
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <StatCard title="This Month" value={inr(summary.this_month_total)} icon={Calendar} color="primary" />
                <StatCard title={hasFilters ? 'Filtered Total' : 'Total (all time)'} value={inr(summary.filtered_total)} icon={ShoppingBag} color="warning" />
                <StatCard title="GST Paid (filter)" value={inr(summary.filtered_gst)} icon={Receipt} color="blue" />
                <StatCard title="Records" value={Number(summary.count || 0).toLocaleString('en-IN')} icon={ShoppingBag} color="success" />
            </div>

            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <input
                        type="text"
                        defaultValue={filters.search || ''}
                        placeholder="Search product or supplier"
                        onChange={(e) => applyFilter('search', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="date"
                        value={filters.from || ''}
                        onChange={(e) => applyFilter('from', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="date"
                        value={filters.to || ''}
                        onChange={(e) => applyFilter('to', e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Cost / unit</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">GST</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">By</th>
                                {(can('purchases.update') || can('purchases.delete')) && (
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchases.data.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-gray-400">
                                        No purchases yet. {can('purchases.create') && (<Link href={url('/purchases/create')} className="text-primary-600 hover:text-primary-700 font-medium">Record the first one →</Link>)}
                                    </td>
                                </tr>
                            )}
                            {purchases.data.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(p.purchase_date)}</td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {p.product_name}
                                        {p.notes && <p className="text-[10px] text-gray-400 mt-0.5 max-w-xs truncate">{p.notes}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{p.supplier || <span className="text-gray-400 italic">—</span>}</td>
                                    <td className="px-4 py-3 text-sm text-right">{p.qty}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-700">{inr(p.cost)}</td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                                        {Number(p.gst_percent) > 0
                                            ? <span>{Number(p.gst_percent)}% <span className="text-[10px] text-gray-400">({inr(p.gst_amount)})</span></span>
                                            : <span className="text-gray-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{inr(p.total)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{p.recorder?.name || '—'}</td>
                                    {(can('purchases.update') || can('purchases.delete')) && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                {can('purchases.update') && (
                                                    <Link href={url(`/purchases/${p.id}/edit`)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600">
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                )}
                                                {can('purchases.delete') && (
                                                    <button onClick={() => handleDelete(p)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {purchases.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>Showing {purchases.from}-{purchases.to} of {purchases.total}</span>
                        <div className="flex gap-1">
                            {purchases.links.filter(l => l.url).map((l, i) => (
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
