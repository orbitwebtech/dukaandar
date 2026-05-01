import { Head, Link, router } from '@inertiajs/react';
import { Package, Plus, Eye, Pencil, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import DataTable from '@/Components/DataTable';
import SearchableSelect from '@/Components/SearchableSelect';

const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

function StockBadge({ qty, threshold }) {
    if (qty <= 0) return <Badge color="danger">Out of Stock</Badge>;
    if (threshold && qty <= threshold) return <Badge color="warning">Low ({qty})</Badge>;
    return <Badge color="success">In Stock ({qty})</Badge>;
}

export default function Index({ products, categories = [], filters = {} }) {
    const url = useStorePath();
    const [search, setSearch] = useState(filters.search || '');

    const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));
    const selectedCategory = categoryOptions.find((o) => String(o.value) === String(filters.category_id)) || null;

    function applyFilters(overrides = {}) {
        router.get(url('/products'), { search, status: filters.status || '', category_id: filters.category_id || '', ...overrides }, { preserveState: true, replace: true });
    }

    function handleDelete(e, product) {
        e.stopPropagation();
        if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
        router.delete(url(`/products/${product.id}`));
    }

    const columns = [
        {
            key: 'name',
            label: 'Product',
            render: (row) => (
                <div>
                    <Link href={url(`/products/${row.id}`)} className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition">
                        {row.name}
                    </Link>
                    {row.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {row.sku}</p>}
                </div>
            ),
        },
        {
            key: 'category.name',
            label: 'Category',
            render: (row) => row.category ? <Badge color="primary">{row.category.name}</Badge> : <span className="text-gray-400">—</span>,
        },
        {
            key: 'type',
            label: 'Type',
            render: (row) => (
                <Badge color={row.type === 'variable' ? 'blue' : 'gray'}>
                    {row.type === 'variable' ? 'Variable' : 'Simple'}
                </Badge>
            ),
        },
        {
            key: 'selling_price',
            label: 'Price',
            align: 'right',
            render: (row) => {
                if (row.type === 'variable') {
                    const prices = row.variants?.map((v) => Number(v.price)) || [];
                    if (prices.length === 0) return <span className="text-gray-400">—</span>;
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    return <span className="text-sm font-semibold text-gray-900">{min === max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`}</span>;
                }
                return <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.selling_price)}</span>;
            },
        },
        {
            key: 'stock_qty',
            label: 'Stock',
            align: 'center',
            render: (row) => {
                if (row.type === 'variable') {
                    const totalStock = row.variants?.reduce((sum, v) => sum + (v.stock_qty || 0), 0) || 0;
                    const variantCount = row.variants?.length || 0;
                    return (
                        <div>
                            <StockBadge qty={totalStock} threshold={row.low_stock_threshold} />
                            <p className="text-xs text-gray-400 mt-0.5">{variantCount} variant{variantCount !== 1 ? 's' : ''}</p>
                        </div>
                    );
                }
                return <StockBadge qty={row.stock_qty || 0} threshold={row.low_stock_threshold} />;
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge color={row.status === 'active' ? 'success' : 'gray'}>{row.status === 'active' ? 'Active' : 'Draft'}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link href={url(`/products/${row.id}`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition" title="View">
                        <Eye className="h-4 w-4" />
                    </Link>
                    <Link href={url(`/products/${row.id}/edit`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition" title="Edit">
                        <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={(e) => handleDelete(e, row)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <VendorLayout title="Products">
            <Head title="Products" />

            {/* Filter bar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                            onBlur={() => applyFilters({ search })}
                            placeholder="Search products..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition sm:w-56"
                        />
                    </div>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => applyFilters({ status: e.target.value })}
                        className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                    </select>
                    <div className="w-full sm:w-48">
                        <SearchableSelect
                            options={categoryOptions}
                            value={selectedCategory}
                            onChange={(opt) => applyFilters({ category_id: opt ? opt.value : '' })}
                            placeholder="All Categories"
                            isClearable
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button href={url('/products/import')} size="sm" variant="outline">
                        <Upload className="h-4 w-4" />
                        Import CSV
                    </Button>
                    <Button href={url('/products/create')} size="sm">
                        <Plus className="h-4 w-4" />
                        Add Product
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={products?.data || []}
                pagination={products}
                filterUrl={url('/products')}
                filters={filters}
                onRowClick={(row) => router.visit(url(`/products/${row.id}`))}
                emptyIcon={Package}
                emptyTitle="No products yet"
                emptyDescription="Add your first product to start selling."
            />
        </VendorLayout>
    );
}
