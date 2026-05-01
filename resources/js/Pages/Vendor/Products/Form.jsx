import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import Button from '@/Components/Button';
import Label from '@/Components/Label';
import TextInput from '@/Components/TextInput';
import SearchableSelect from '@/Components/SearchableSelect';

function VariantRow({ variant, index, onChange, onRemove }) {
    function updateField(field, value) {
        onChange(index, { ...variant, [field]: value });
    }

    function updateAttribute(attrIndex, part, value) {
        const attrs = [...(variant.attributes || [])];
        if (!attrs[attrIndex]) attrs[attrIndex] = { key: '', value: '' };
        attrs[attrIndex] = { ...attrs[attrIndex], [part]: value };
        onChange(index, { ...variant, attributes: attrs });
    }

    function addAttribute() {
        onChange(index, {
            ...variant,
            attributes: [...(variant.attributes || []), { key: '', value: '' }],
        });
    }

    function removeAttribute(attrIndex) {
        const attrs = [...(variant.attributes || [])];
        attrs.splice(attrIndex, 1);
        onChange(index, { ...variant, attributes: attrs });
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Variant {index + 1}</span>
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="text-red-400 hover:text-red-600 transition"
                    title="Remove variant"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Attributes */}
            <div className="space-y-2">
                <Label>Attributes</Label>
                {(variant.attributes || []).map((attr, attrIdx) => (
                    <div key={attrIdx} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={attr.key}
                            onChange={(e) => updateAttribute(attrIdx, 'key', e.target.value)}
                            placeholder="Name (e.g. Color)"
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                        />
                        <input
                            type="text"
                            value={attr.value}
                            onChange={(e) => updateAttribute(attrIdx, 'value', e.target.value)}
                            placeholder="Value (e.g. Red)"
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                        />
                        <button
                            type="button"
                            onClick={() => removeAttribute(attrIdx)}
                            className="text-gray-400 hover:text-red-500 transition"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addAttribute}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                    + Add attribute
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <Label>SKU</Label>
                    <TextInput
                        value={variant.sku || ''}
                        onChange={(e) => updateField('sku', e.target.value)}
                        placeholder="VAR-001"
                    />
                </div>
                <div>
                    <Label>Price (₹)</Label>
                    <TextInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={variant.price || ''}
                        onChange={(e) => updateField('price', e.target.value)}
                        placeholder="0.00"
                    />
                </div>
                <div>
                    <Label>Stock Qty</Label>
                    <TextInput
                        type="number"
                        min="0"
                        value={variant.stock_qty || ''}
                        onChange={(e) => updateField('stock_qty', e.target.value)}
                        placeholder="0"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    id={`default-${index}`}
                    type="checkbox"
                    checked={!!variant.is_default}
                    onChange={(e) => updateField('is_default', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor={`default-${index}`} className="text-sm text-gray-600">
                    Default variant
                </label>
            </div>
        </div>
    );
}

export default function Form({ product, categories = [] }) {
    const url = useStorePath();
    const isEditing = !!product;

    const initialVariants = product?.variants?.map((v) => ({
        id: v.id,
        sku: v.sku || '',
        price: v.price || '',
        stock_qty: v.stock_qty ?? '',
        is_default: !!v.is_default,
        attributes: Array.isArray(v.attributes)
            ? v.attributes
            : Object.entries(v.attributes || {}).map(([key, value]) => ({ key, value })),
    })) || [];

    const { data, setData, post, put, processing, errors } = useForm({
        name: product?.name || '',
        sku: product?.sku || '',
        type: product?.type || 'simple',
        category_id: product?.category_id || '',
        description: product?.description || '',
        cost_price: product?.cost_price || '',
        selling_price: product?.selling_price || '',
        stock_qty: product?.stock_qty ?? '',
        low_stock_threshold: product?.low_stock_threshold ?? 5,
        status: product?.status || 'active',
        variants: initialVariants,
    });

    const categoryOptions = [
        ...categories.map((c) => ({ value: c.id, label: c.name })),
        { value: '__new__', label: '+ Add New Category' },
    ];

    const selectedCategory = categoryOptions.find((o) => String(o.value) === String(data.category_id)) || null;

    function handleCategoryChange(option) {
        if (!option) {
            setData('category_id', '');
            return;
        }
        if (option.value === '__new__') {
            const name = window.prompt('New category name:');
            if (!name) return;
            router.post(
                url('/categories'),
                { name },
                {
                    preserveState: true,
                    onSuccess: (page) => {
                        const created = page.props.newCategory;
                        if (created) setData('category_id', created.id);
                    },
                }
            );
            return;
        }
        setData('category_id', option.value);
    }

    function addVariant() {
        setData('variants', [
            ...data.variants,
            { sku: '', price: '', stock_qty: '', is_default: false, attributes: [{ key: '', value: '' }] },
        ]);
    }

    function updateVariant(index, updated) {
        const variants = [...data.variants];
        variants[index] = updated;
        setData('variants', variants);
    }

    function removeVariant(index) {
        const variants = [...data.variants];
        variants.splice(index, 1);
        setData('variants', variants);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (isEditing) {
            put(url(`/products/${product.id}`));
        } else {
            post(url('/products'));
        }
    }

    return (
        <VendorLayout title={isEditing ? 'Edit Product' : 'Add Product'}>
            <Head title={isEditing ? 'Edit Product' : 'Add Product'} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                {/* Basic info */}
                <Card>
                    <CardHeader title="Basic Information" />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label required>Product Name</Label>
                            <TextInput
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Cotton T-Shirt"
                                error={errors.name}
                            />
                        </div>

                        <div>
                            <Label>SKU</Label>
                            <TextInput
                                value={data.sku}
                                onChange={(e) => setData('sku', e.target.value)}
                                placeholder="e.g. TSHIRT-001"
                                error={errors.sku}
                            />
                        </div>

                        <div>
                            <Label>Category</Label>
                            <SearchableSelect
                                options={categoryOptions}
                                value={selectedCategory}
                                onChange={handleCategoryChange}
                                placeholder="Select category..."
                                isClearable
                                error={errors.category_id}
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <Label>Description</Label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                rows={3}
                                placeholder="Describe the product..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition resize-none"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-danger-500">{errors.description}</p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Type */}
                <Card>
                    <CardHeader title="Product Type" />
                    <div className="flex gap-6">
                        {['simple', 'variable'].map((t) => (
                            <label key={t} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    value={t}
                                    checked={data.type === t}
                                    onChange={() => setData('type', t)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-gray-700 capitalize">{t}</span>
                            </label>
                        ))}
                    </div>
                </Card>

                {/* Pricing & stock — simple */}
                {data.type === 'simple' && (
                    <Card>
                        <CardHeader title="Pricing & Stock" />
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <Label required>Selling Price (₹)</Label>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.selling_price}
                                    onChange={(e) => setData('selling_price', e.target.value)}
                                    placeholder="0.00"
                                    error={errors.selling_price}
                                />
                            </div>

                            <div>
                                <Label>Cost Price (₹)</Label>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.cost_price}
                                    onChange={(e) => setData('cost_price', e.target.value)}
                                    placeholder="0.00"
                                    error={errors.cost_price}
                                />
                            </div>

                            <div>
                                <Label required>Stock Quantity</Label>
                                <TextInput
                                    type="number"
                                    min="0"
                                    value={data.stock_qty}
                                    onChange={(e) => setData('stock_qty', e.target.value)}
                                    placeholder="0"
                                    error={errors.stock_qty}
                                />
                            </div>

                            <div>
                                <Label>Low Stock Threshold</Label>
                                <TextInput
                                    type="number"
                                    min="0"
                                    value={data.low_stock_threshold}
                                    onChange={(e) => setData('low_stock_threshold', e.target.value)}
                                    placeholder="5"
                                    error={errors.low_stock_threshold}
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Variants — variable */}
                {data.type === 'variable' && (
                    <Card>
                        <CardHeader
                            title="Variants"
                            action={
                                <Button type="button" size="sm" variant="outline" onClick={addVariant}>
                                    <Plus className="h-4 w-4" />
                                    Add Variant
                                </Button>
                            }
                        />

                        {data.variants.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-6">
                                No variants yet. Click "Add Variant" to get started.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {data.variants.map((variant, i) => (
                                    <VariantRow
                                        key={i}
                                        variant={variant}
                                        index={i}
                                        onChange={updateVariant}
                                        onRemove={removeVariant}
                                    />
                                ))}
                            </div>
                        )}

                        {errors.variants && (
                            <p className="mt-2 text-sm text-danger-500">{errors.variants}</p>
                        )}
                    </Card>
                )}

                {/* Status */}
                <Card>
                    <CardHeader title="Status" />
                    <div className="flex gap-6">
                        {['active', 'draft'].map((s) => (
                            <label key={s} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value={s}
                                    checked={data.status === s}
                                    onChange={() => setData('status', s)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                                />
                                <span className="text-sm font-medium text-gray-700 capitalize">{s}</span>
                            </label>
                        ))}
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button type="submit" loading={processing}>
                        {isEditing ? 'Save Changes' : 'Create Product'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        href={isEditing ? url(`/products/${product.id}`) : url('/products')}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </VendorLayout>
    );
}
