import { Head, Link, router } from '@inertiajs/react';
import { Edit2, ArrowLeft, Minus, Plus } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';

function StockBar({ qty, threshold = 5 }) {
    if (qty <= 0) {
        return (
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-sm font-medium text-red-600">Out of stock (0)</span>
            </div>
        );
    }
    if (qty <= threshold) {
        return (
            <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-600">Low stock ({qty})</span>
            </div>
        );
    }
    return (
        <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-sm font-medium text-emerald-600">In stock ({qty})</span>
        </div>
    );
}

function AdjustStockButton({ productId, variantId, delta }) {
    const url = useStorePath();
    function adjust() {
        router.post(url(`/products/${productId}/adjust-stock`), {
            variant_id: variantId,
            adjustment: delta,
        });
    }

    return (
        <button
            type="button"
            onClick={adjust}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition"
            title={delta > 0 ? 'Increase stock' : 'Decrease stock'}
        >
            {delta > 0 ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
        </button>
    );
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAttributes(attributes) {
    if (!attributes) return '—';
    if (typeof attributes === 'string') {
        try {
            attributes = JSON.parse(attributes);
        } catch {
            return attributes;
        }
    }
    if (Array.isArray(attributes)) {
        return attributes.map((a) => `${a.key}: ${a.value}`).join(', ');
    }
    return Object.entries(attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
}

export default function Show({ product }) {
    const url = useStorePath();
    const isVariable = product.type === 'variable';

    return (
        <VendorLayout title={product.name}>
            <Head title={product.name} />

            {/* Top actions */}
            <div className="mb-6 flex items-center justify-between">
                <Link
                    href={url('/products')}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Products
                </Link>

                <Button href={url(`/products/${product.id}/edit`)} size="sm" variant="outline">
                    <Edit2 className="h-4 w-4" />
                    Edit Product
                </Button>
            </div>

            <div className="space-y-6 max-w-4xl">
                {/* Info card */}
                <Card>
                    <CardHeader title="Product Information" />
                    <div className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Name</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{product.name}</p>
                        </div>

                        {product.sku && (
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">SKU</p>
                                <p className="mt-1 text-sm font-mono text-gray-700">{product.sku}</p>
                            </div>
                        )}

                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Category</p>
                            <div className="mt-1">
                                {product.category ? (
                                    <Badge color="primary">{product.category.name}</Badge>
                                ) : (
                                    <span className="text-sm text-gray-400">Uncategorized</span>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Type</p>
                            <div className="mt-1">
                                <Badge color={isVariable ? 'blue' : 'gray'}>
                                    {isVariable ? 'Variable' : 'Simple'}
                                </Badge>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</p>
                            <div className="mt-1">
                                <Badge color={product.status === 'active' ? 'success' : 'gray'}>
                                    {product.status === 'active' ? 'Active' : 'Draft'}
                                </Badge>
                            </div>
                        </div>

                        {product.description && (
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Description
                                </p>
                                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                                    {product.description}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Simple: pricing & stock */}
                {!isVariable && (
                    <Card>
                        <CardHeader title="Pricing & Stock" />
                        <div className="grid grid-cols-1 gap-y-4 gap-x-8 sm:grid-cols-3">
                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Selling Price
                                </p>
                                <p className="mt-1 text-xl font-bold text-gray-900">
                                    ₹{Number(product.selling_price).toLocaleString('en-IN')}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Cost Price
                                </p>
                                <p className="mt-1 text-sm font-semibold text-gray-700">
                                    {product.cost_price
                                        ? `₹${Number(product.cost_price).toLocaleString('en-IN')}`
                                        : '—'}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                                    Stock
                                </p>
                                <StockBar
                                    qty={product.stock_qty ?? 0}
                                    threshold={product.low_stock_threshold ?? 5}
                                />
                                {product.low_stock_threshold != null && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        Low stock alert at {product.low_stock_threshold} units
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Variable: variants table */}
                {isVariable && product.variants?.length > 0 && (
                    <Card padding={false}>
                        <div className="p-6 pb-0">
                            <CardHeader title="Variants" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Attributes
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            SKU
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Price
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Stock
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Adjust
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {product.variants.map((variant) => (
                                        <tr key={variant.id} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-3 text-sm text-gray-700">
                                                {formatAttributes(variant.attributes)}
                                                {variant.is_default && (
                                                    <span className="ml-2">
                                                        <Badge color="primary">Default</Badge>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-mono text-gray-500">
                                                {variant.sku || '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                                                {variant.price != null
                                                    ? `₹${Number(variant.price).toLocaleString('en-IN')}`
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-3">
                                                <StockBar qty={variant.stock_qty ?? 0} threshold={5} />
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <AdjustStockButton
                                                        productId={product.id}
                                                        variantId={variant.id}
                                                        delta={-1}
                                                    />
                                                    <span className="w-8 text-center text-sm font-medium text-gray-700">
                                                        {variant.stock_qty ?? 0}
                                                    </span>
                                                    <AdjustStockButton
                                                        productId={product.id}
                                                        variantId={variant.id}
                                                        delta={1}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Order history */}
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Order History" />
                    </div>

                    {!product.order_items?.length ? (
                        <div className="px-6 pb-6">
                            <p className="text-sm text-gray-400 text-center py-6">
                                This product has not appeared in any orders yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Order #
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Qty
                                        </th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Price
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {product.order_items.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-3">
                                                {item.order ? (
                                                    <Link
                                                        href={url(`/orders/${item.order.id}`)}
                                                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                                    >
                                                        #{item.order.order_number ?? item.order.id}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-600">
                                                {formatDate(item.order?.order_date)}
                                            </td>
                                            <td className="px-5 py-3 text-sm text-gray-700">
                                                {item.order?.customer
                                                    ? item.order.customer.name
                                                    : '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-medium text-gray-900">
                                                {item.qty ?? '—'}
                                            </td>
                                            <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                                                {item.unit_price != null
                                                    ? `₹${Number(item.unit_price).toLocaleString('en-IN')}`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </VendorLayout>
    );
}
