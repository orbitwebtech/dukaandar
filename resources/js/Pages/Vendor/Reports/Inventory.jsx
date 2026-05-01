import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import { Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

const STATUS_BADGE = {
    in_stock: { color: 'success', label: 'In Stock' },
    low_stock: { color: 'warning', label: 'Low Stock' },
    out_of_stock: { color: 'danger', label: 'Out of Stock' },
};

export default function InventoryReport({
    products = [],
    slowMoving = [],
    slowDays = 60,
}) {
    const url = useStorePath();
    const [activeTab, setActiveTab] = useState('stock');

    const inStockCount = products.filter((p) => p.stock_status === 'in_stock').length;
    const lowStockCount = products.filter((p) => p.stock_status === 'low_stock').length;
    const outOfStockCount = products.filter((p) => p.stock_status === 'out_of_stock').length;

    return (
        <VendorLayout title="Inventory Reports">
            <Head title="Inventory Reports" />

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
                <StatCard
                    title="Total Products"
                    value={products.length.toLocaleString('en-IN')}
                    icon={Package}
                    color="primary"
                />
                <StatCard
                    title="In Stock"
                    value={inStockCount.toLocaleString('en-IN')}
                    icon={CheckCircle}
                    color="success"
                />
                <StatCard
                    title="Low Stock"
                    value={lowStockCount.toLocaleString('en-IN')}
                    icon={AlertTriangle}
                    color="warning"
                />
                <StatCard
                    title="Out of Stock"
                    value={outOfStockCount.toLocaleString('en-IN')}
                    icon={XCircle}
                    color="danger"
                />
            </div>

            {/* Tab Bar */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex gap-1">
                    {[
                        { id: 'stock', label: 'Stock Status' },
                        { id: 'slow', label: 'Slow-Moving Stock' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Stock Status Tab */}
            {activeTab === 'stock' && (
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader
                            title="Stock Status"
                            subtitle={`${products.length} products`}
                            className="mb-0"
                            action={
                                <a
                                    href={url('/reports/export/inventory')}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Export CSV
                                </a>
                            }
                        />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <Package className="h-10 w-10 mb-3 opacity-40" />
                                <p className="text-sm">No products found</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Stock
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Threshold
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Last Restocked
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {products.map((product) => {
                                        const badge = STATUS_BADGE[product.stock_status] || {
                                            color: 'gray',
                                            label: product.stock_status || '—',
                                        };
                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                                    {product.type && (
                                                        <p className="text-xs text-gray-400 capitalize">{product.type}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                                    {product.category || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                    {product.stock_qty ?? '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm text-gray-500">
                                                    {product.low_stock_threshold ?? '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Badge color={badge.color}>{badge.label}</Badge>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(product.last_restocked_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            )}

            {/* Slow-Moving Stock Tab */}
            {activeTab === 'slow' && (
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader
                            title="Slow-Moving Stock"
                            subtitle={`Products with no orders in the last ${slowDays} days`}
                            className="mb-0"
                        />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {slowMoving.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                                <CheckCircle className="h-10 w-10 mb-3 opacity-40" />
                                <p className="text-sm">No slow-moving products in the last {slowDays} days</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Product
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Stock
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Last Ordered
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Days Since Order
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Flag
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {slowMoving.map((product) => {
                                        const days = product.days_since ?? 0;
                                        const flagColor = days > 60 ? 'danger' : 'warning';
                                        const flagLabel = days > 60 ? `${days}d — Critical` : `${days}d — Slow`;
                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-600">
                                                    {product.category || '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                    {product.stock_qty ?? '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-sm text-gray-500">
                                                    {product.last_ordered ? formatDate(product.last_ordered) : (
                                                        <span className="text-gray-400 italic">Never</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm text-gray-700 font-medium">
                                                    {product.days_since != null ? product.days_since : '—'}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Badge color={flagColor}>{flagLabel}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            )}
        </VendorLayout>
    );
}
