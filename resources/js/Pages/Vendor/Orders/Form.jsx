import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import { useState, useMemo, useEffect, useRef } from 'react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import SearchableSelect from '@/Components/SearchableSelect';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import { Plus, Trash2, UserPlus, ShoppingCart, X, Camera } from 'lucide-react';
import BarcodeScannerModal from '@/Components/BarcodeScannerModal';

const formatCurrency = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const calcLineTotal = (qty, unitPrice, discountType, discountValue) => {
    const base = Number(qty || 0) * Number(unitPrice || 0);
    if (!base) return 0;
    if (discountType === 'flat') return Math.max(0, base - Number(discountValue || 0));
    if (discountType === 'percent') return Math.max(0, base * (1 - Number(discountValue || 0) / 100));
    return base;
};

const calcGrandTotal = (subtotal, discountType, discountValue) => {
    if (discountType === 'flat') return Math.max(0, subtotal - Number(discountValue || 0));
    if (discountType === 'percent') return Math.max(0, subtotal * (1 - Number(discountValue || 0) / 100));
    return subtotal;
};

let itemKeyCounter = 0;
const makeKey = () => `item_${++itemKeyCounter}_${Date.now()}`;

const emptyItem = () => ({
    _key: makeKey(),
    product_id: null,
    variant_id: null,
    qty: 1,
    unit_price: '',
    line_discount_type: 'flat',
    line_discount_value: 0,
});

export default function Form({ customers = [], products = [], nextOrderNumber, settings, order }) {
    const url = useStorePath();
    const isEdit = Boolean(order);

    const buildInitialItems = () => {
        if (isEdit && order.items?.length) {
            return order.items.map((item) => ({
                _key: makeKey(),
                product_id: item.product_id,
                variant_id: item.variant_id || null,
                qty: item.qty,
                unit_price: item.unit_price,
                line_discount_type: item.line_discount_type || 'flat',
                line_discount_value: item.line_discount_value || 0,
            }));
        }
        return [emptyItem()];
    };

    const { data, setData, post, put, processing, errors } = useForm({
        customer_id: order?.customer_id || null,
        new_customer: { name: '', whatsapp: '' },
        order_date: order?.order_date
            ? new Date(order.order_date).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        items: buildInitialItems(),
        discount_type: order?.discount_type || 'flat',
        discount_value: order?.discount_value || 0,
        payment_method: order?.payment_method || 'cash',
        payment_status: order?.payment_status || 'paid',
        coupon_code: order?.coupon_code || '',
        notes: order?.notes || '',
        status: order?.status || 'delivered',
    });

    const [showNewCustomer, setShowNewCustomer] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [scanInput, setScanInput] = useState('');
    const [scanFeedback, setScanFeedback] = useState(null);
    const [scanLooking, setScanLooking] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const scanInputRef = useRef(null);
    const [couponState, setCouponState] = useState({ status: 'idle', message: '' });
    const [couponChecking, setCouponChecking] = useState(false);
    const pageErrors = usePage().props.errors || {};
    const allErrors = { ...pageErrors, ...errors };

    // Reset coupon validation if code or customer changes
    useEffect(() => {
        setCouponState({ status: 'idle', message: '' });
    }, [data.coupon_code, data.customer_id, showNewCustomer]);

    // ---- Customer options ----
    const customerOptions = useMemo(() =>
        customers.map((c) => ({
            value: c.id,
            label: `${c.name} · ${c.whatsapp}`,
            customer: c,
        })),
    [customers]);

    // Custom filter: match anywhere in name OR whatsapp (not just label start)
    const filterCustomers = (option, inputValue) => {
        if (!inputValue) return true;
        const q = inputValue.toLowerCase();
        const c = option.data.customer;
        return (
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.whatsapp && c.whatsapp.includes(q))
        );
    };

    // ---- Product options ----
    const productOptions = useMemo(() =>
        products.map((p) => {
            const totalStock = p.type === 'variable'
                ? (p.variants || []).reduce((s, v) => s + (Number(v.stock_qty) || 0), 0)
                : Number(p.stock_qty) || 0;
            const isOut = totalStock <= 0;
            return {
                value: p.id,
                label: `${p.name}${p.sku ? ` (${p.sku})` : ''}${isOut ? ' — OUT OF STOCK' : ''}`,
                product: p,
                isDisabled: isOut,
            };
        }),
    [products]);

    // ---- Item helpers (using direct value, NOT callback) ----
    const updateItem = (key, patch) => {
        const newItems = data.items.map((item) =>
            item._key === key ? { ...item, ...patch } : item
        );
        setData('items', newItems);
    };

    const addItem = () => {
        setData('items', [...data.items, emptyItem()]);
    };

    // ---- Barcode scan: look up product/variant and add to items (or bump qty) ----
    const handleScannedCode = async (raw) => {
        const code = String(raw || '').trim();
        if (!code) return;
        setScanLooking(true);
        setScanFeedback(null);
        try {
            const res = await fetch(url(`/products/lookup?code=${encodeURIComponent(code)}`), {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (!res.ok) {
                setScanFeedback({ type: 'error', text: `Lookup HTTP ${res.status}` });
                return;
            }
            const json = await res.json();
            if (!json.found) {
                setScanFeedback({ type: 'error', text: json.message || 'No match' });
                return;
            }

            // Use the FUNCTIONAL form so we always update the latest state, not a stale closure
            // captured when the modal opened.
            setData((prev) => {
                const items = Array.isArray(prev.items) ? prev.items : [];
                const existing = items.find(it =>
                    it.product_id === json.product_id &&
                    (it.variant_id ?? null) === (json.variant_id ?? null)
                );
                if (existing) {
                    return {
                        ...prev,
                        items: items.map(it =>
                            it._key === existing._key
                                ? { ...it, qty: (parseInt(it.qty) || 0) + 1 }
                                : it
                        ),
                    };
                }
                const lastEmptyIdx = items.findIndex(it => !it.product_id);
                const newRow = {
                    ...emptyItem(),
                    product_id: json.product_id,
                    variant_id: json.variant_id ?? null,
                    qty: 1,
                    unit_price: json.price ?? 0,
                };
                let nextItems;
                if (lastEmptyIdx >= 0) {
                    nextItems = [...items];
                    nextItems[lastEmptyIdx] = { ...nextItems[lastEmptyIdx], ...newRow, _key: nextItems[lastEmptyIdx]._key };
                } else {
                    nextItems = [...items, newRow];
                }
                return { ...prev, items: nextItems };
            });

            const label = json.variant_label ? `${json.product_name} (${json.variant_label})` : json.product_name;
            setScanFeedback({ type: 'success', text: `Added: ${label} @ ₹${json.price}` });
        } catch (err) {
            console.error('Scan handler error:', err);
            setScanFeedback({ type: 'error', text: 'Lookup failed: ' + (err?.message || 'unknown') });
        } finally {
            setScanLooking(false);
            setScanInput('');
            setTimeout(() => { try { scanInputRef.current?.focus(); } catch {} }, 50);
            setTimeout(() => setScanFeedback(null), 4000);
        }
    };

    const onScanKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleScannedCode(scanInput);
        }
    };

    const removeItem = (key) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((i) => i._key !== key));
    };

    const handleProductChange = (key, opt) => {
        if (!opt) {
            updateItem(key, { product_id: null, variant_id: null, unit_price: '', line_discount_type: 'flat', line_discount_value: 0 });
            return;
        }
        const product = opt.product;
        // For simple products, auto-fill selling_price
        const price = product.type === 'simple' ? (product.selling_price || '') : '';
        updateItem(key, { product_id: opt.value, variant_id: null, unit_price: price });
    };

    const handleVariantChange = (key, opt, productId) => {
        if (!opt) {
            updateItem(key, { variant_id: null });
            return;
        }
        const product = products.find((p) => p.id === productId);
        const variant = product?.variants?.find((v) => v.id === opt.value);
        updateItem(key, { variant_id: opt.value, unit_price: variant?.price || '' });
    };

    // ---- Customer quick-add toggle ----
    const startNewCustomer = (inputValue) => {
        setShowNewCustomer(true);
        setData('customer_id', null);
        // If input looks like a phone number, pre-fill whatsapp; otherwise pre-fill name
        const isPhone = /^\+?\d[\d\s-]{5,}$/.test(inputValue?.trim() || '');
        setData('new_customer', {
            name: isPhone ? '' : (inputValue || ''),
            whatsapp: isPhone ? (inputValue || '') : '',
        });
    };

    const cancelNewCustomer = () => {
        setShowNewCustomer(false);
        setData('new_customer', { name: '', whatsapp: '' });
    };

    // ---- Totals ----
    const subtotal = data.items.reduce((sum, item) => {
        return sum + calcLineTotal(item.qty, item.unit_price, item.line_discount_type, item.line_discount_value);
    }, 0);

    const grandTotal = calcGrandTotal(subtotal, data.discount_type, data.discount_value);

    // ---- Coupon validation ----
    const canCheckCoupon = !!data.coupon_code && !!data.customer_id && !showNewCustomer && subtotal > 0;
    const handleCheckCoupon = async () => {
        if (!canCheckCoupon || couponChecking) return;
        setCouponChecking(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
                || decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || '');
            const res = await fetch(url('/coupons/validate'), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    code: data.coupon_code,
                    customer_id: data.customer_id,
                    subtotal,
                }),
            });
            const json = await res.json();
            setCouponState({
                status: json.valid ? 'valid' : 'invalid',
                message: json.message || (json.valid ? 'Coupon is valid.' : 'Invalid coupon.'),
            });
            if (json.valid) {
                // Override the manual discount with the coupon's so the totals reflect it
                setData((d) => ({
                    ...d,
                    discount_type: json.discount_type,
                    discount_value: json.discount_value,
                }));
            }
        } catch (err) {
            setCouponState({ status: 'invalid', message: 'Could not verify coupon — try again.' });
        } finally {
            setCouponChecking(false);
        }
    };

    // ---- Submit ----
    const handleSubmit = (e) => {
        e.preventDefault();

        // Clean items: strip _key, ensure proper types for backend
        const cleanedItems = data.items.map((item) => ({
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            qty: parseInt(item.qty) || 1,
            unit_price: parseFloat(item.unit_price) || 0,
            line_discount_type: item.line_discount_value > 0 ? item.line_discount_type : null,
            line_discount_value: parseFloat(item.line_discount_value) || 0,
        }));

        const payload = {
            customer_id: showNewCustomer ? null : data.customer_id,
            new_customer: showNewCustomer ? data.new_customer : undefined,
            order_date: data.order_date,
            items: cleanedItems,
            discount_type: data.discount_value > 0 ? data.discount_type : null,
            discount_value: parseFloat(data.discount_value) || 0,
            payment_method: data.payment_method,
            payment_status: data.payment_status,
            notes: data.notes || null,
            coupon_code: data.coupon_code || null,
            status: data.status || 'confirmed',
        };

        const target = isEdit ? url(`/orders/${order.id}`) : url('/orders');
        const method = isEdit ? 'put' : 'post';

        setSubmitting(true);
        router[method](target, payload, {
            onFinish: () => setSubmitting(false),
        });
    };

    // ---- Custom "No options" message with Add button ----
    const CustomerNoOptionsMessage = ({ inputValue }) => (
        <div className="py-2 px-3 text-center">
            <p className="text-sm text-gray-500 mb-2">
                No customer found{inputValue ? ` for "${inputValue}"` : ''}
            </p>
            <button
                type="button"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    startNewCustomer(inputValue);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-600 transition"
            >
                <UserPlus className="h-3.5 w-3.5" />
                Add New Customer
            </button>
        </div>
    );

    return (
        <VendorLayout title={isEdit ? 'Edit Order' : 'New Order'}>
            <Head title={isEdit ? 'Edit Order' : 'New Order'} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">

                {/* ── Step 1: Customer ── */}
                <Card>
                    <CardHeader
                        title="Step 1 · Customer"
                        subtitle={`Order ${nextOrderNumber || ''}`}
                    />

                    {!showNewCustomer ? (
                        <div className="space-y-3">
                            <div>
                                <Label required>Customer</Label>
                                <SearchableSelect
                                    options={customerOptions}
                                    value={customerOptions.find((o) => o.value === data.customer_id) || null}
                                    onChange={(opt) => setData('customer_id', opt?.value || null)}
                                    placeholder="Search by name or WhatsApp number..."
                                    error={allErrors.customer_id}
                                    filterOption={filterCustomers}
                                    noOptionsMessage={CustomerNoOptionsMessage}
                                    onInputChange={(val) => setCustomerSearch(val)}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => startNewCustomer(customerSearch)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition"
                            >
                                <UserPlus className="h-4 w-4" />
                                Add New Customer
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50/40 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-semibold text-primary-700 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4" />
                                    New Customer (quick-add)
                                </p>
                                <button
                                    type="button"
                                    onClick={cancelNewCustomer}
                                    className="rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition"
                                    title="Cancel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label required>Name</Label>
                                    <TextInput
                                        value={data.new_customer.name}
                                        onChange={(e) => setData('new_customer', { ...data.new_customer, name: e.target.value })}
                                        placeholder="Customer name"
                                        error={allErrors['new_customer.name']}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <Label required>WhatsApp Number</Label>
                                    <TextInput
                                        value={data.new_customer.whatsapp}
                                        onChange={(e) => setData('new_customer', { ...data.new_customer, whatsapp: e.target.value })}
                                        placeholder="+919876543210"
                                        error={allErrors['new_customer.whatsapp']}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={cancelNewCustomer}
                                className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                            >
                                Cancel — pick existing customer instead
                            </button>
                        </div>
                    )}
                </Card>

                {/* ── Step 2: Line Items ── */}
                <Card>
                    <CardHeader
                        title="Step 2 · Products"
                        subtitle="Add products to this order"
                    />

                    {/* Barcode scan bar */}
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                        <div className="flex items-center gap-2">
                            <input
                                ref={scanInputRef}
                                type="text"
                                value={scanInput}
                                onChange={(e) => setScanInput(e.target.value)}
                                onKeyDown={onScanKeyDown}
                                placeholder="Scan or type barcode / SKU and press Enter"
                                autoFocus
                                className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setScannerOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                                title="Open camera scanner (mobile/tablet)"
                            >
                                <Camera className="h-4 w-4" /> Camera
                            </button>
                        </div>
                        {scanLooking && <p className="mt-2 text-xs text-gray-500">Looking up…</p>}
                        {scanFeedback?.type === 'success' && (
                            <p className="mt-2 text-xs font-medium text-emerald-700">✓ {scanFeedback.text}</p>
                        )}
                        {scanFeedback?.type === 'error' && (
                            <p className="mt-2 text-xs font-medium text-red-600">✗ {scanFeedback.text}</p>
                        )}
                        <p className="mt-1.5 text-[11px] text-gray-500">USB scanner: just scan — it'll type the code and submit automatically. Tablet: tap Camera.</p>
                    </div>

                    <div className="space-y-4">
                        {data.items.map((item, idx) => {
                            const selectedProduct = products.find((p) => p.id === item.product_id);
                            const isVariable = selectedProduct?.type === 'variable' && selectedProduct?.variants?.length > 0;
                            // Variants picked by OTHER rows for the same product — exclude them from this row's dropdown
                            const usedVariantIds = data.items
                                .filter(other => other._key !== item._key && other.product_id === item.product_id && other.variant_id)
                                .map(other => other.variant_id);
                            const variantOptions = isVariable
                                ? selectedProduct.variants
                                    .filter(v => v.id === item.variant_id || !usedVariantIds.includes(v.id))
                                    .map((v) => ({
                                        value: v.id,
                                        label: v.attributes
                                            ? (typeof v.attributes === 'object'
                                                ? Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ')
                                                : String(v.attributes))
                                            : `Variant ${v.id}`,
                                    }))
                                : [];

                            const lineTotal = calcLineTotal(item.qty, item.unit_price, item.line_discount_type, item.line_discount_value);

                            // Available stock for this item (factor in this order's existing qty if editing a delivered order)
                            const existingItem = isEdit && order.status === 'delivered'
                                ? order.items?.find(oi =>
                                    oi.product_id === item.product_id &&
                                    (oi.variant_id ?? null) === (item.variant_id ?? null))
                                : null;
                            const reservedQty = existingItem ? Number(existingItem.qty) || 0 : 0;
                            let availableStock = null;
                            if (selectedProduct && selectedProduct.type === 'simple') {
                                availableStock = (Number(selectedProduct.stock_qty) || 0) + reservedQty;
                            } else if (item.variant_id && selectedProduct?.variants?.length) {
                                const v = selectedProduct.variants.find(x => x.id === item.variant_id);
                                if (v) availableStock = (Number(v.stock_qty) || 0) + reservedQty;
                            }
                            const overStock = availableStock !== null && Number(item.qty) > availableStock;
                            const outOfStock = availableStock !== null && availableStock <= 0;

                            return (
                                <div
                                    key={item._key}
                                    className="rounded-lg border border-gray-200 bg-gray-50/40 p-4 space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            Item {idx + 1}
                                        </span>
                                        {data.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item._key)}
                                                className="rounded-lg p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Product select */}
                                    <div>
                                        <Label required>Product</Label>
                                        <SearchableSelect
                                            options={productOptions}
                                            value={productOptions.find((o) => o.value === item.product_id) || null}
                                            onChange={(opt) => handleProductChange(item._key, opt)}
                                            placeholder="Search product..."
                                            error={allErrors[`items.${idx}.product_id`]}
                                        />
                                    </div>

                                    {/* Variant select (only for variable products) */}
                                    {isVariable && (
                                        <div>
                                            <Label required>Variant</Label>
                                            <SearchableSelect
                                                options={variantOptions}
                                                value={variantOptions.find((o) => o.value === item.variant_id) || null}
                                                onChange={(opt) => handleVariantChange(item._key, opt, item.product_id)}
                                                placeholder="Select variant..."
                                                error={allErrors[`items.${idx}.variant_id`]}
                                            />
                                        </div>
                                    )}

                                    {/* Qty + Price + Discount */}
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div>
                                            <Label required>
                                                Qty
                                                {availableStock !== null && (
                                                    <span className={`ml-1 text-[10px] font-normal ${outOfStock ? 'text-red-600' : overStock ? 'text-amber-600' : 'text-gray-400'}`}>
                                                        {outOfStock ? '(out of stock)' : `(${availableStock} available)`}
                                                    </span>
                                                )}
                                            </Label>
                                            <TextInput
                                                type="number"
                                                min="1"
                                                max={availableStock !== null ? availableStock : undefined}
                                                value={item.qty}
                                                onChange={(e) => updateItem(item._key, { qty: parseInt(e.target.value) || 1 })}
                                                error={allErrors[`items.${idx}.qty`] || (overStock ? `Only ${availableStock} in stock` : null)}
                                            />
                                        </div>
                                        <div>
                                            <Label required>Unit Price (₹)</Label>
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(item._key, { unit_price: e.target.value })}
                                                error={allErrors[`items.${idx}.unit_price`]}
                                            />
                                        </div>
                                        <div>
                                            <Label>Discount</Label>
                                            <select
                                                value={item.line_discount_type}
                                                onChange={(e) => updateItem(item._key, { line_discount_type: e.target.value })}
                                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                            >
                                                <option value="flat">Flat (₹)</option>
                                                <option value="percent">Percent (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <Label>Value</Label>
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.line_discount_value}
                                                onChange={(e) => updateItem(item._key, { line_discount_value: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <span className="text-sm font-semibold text-gray-700">
                                            Line Total: <span className="text-primary-700">{formatCurrency(lineTotal)}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={addItem}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-primary-300 px-4 py-2.5 text-sm font-medium text-primary-600 hover:bg-primary-50 transition w-full justify-center"
                    >
                        <Plus className="h-4 w-4" />
                        Add Another Product
                    </button>
                </Card>

                {/* ── Step 3: Order Summary ── */}
                <Card>
                    <CardHeader
                        title="Step 3 · Summary & Payment"
                        subtitle="Apply discounts and set payment details"
                    />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                            {/* Order date */}
                            <div>
                                <Label required>Order Date</Label>
                                <TextInput
                                    type="date"
                                    value={data.order_date}
                                    onChange={(e) => setData('order_date', e.target.value)}
                                    error={allErrors.order_date}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>Order Discount</Label>
                                    <select
                                        value={data.discount_type}
                                        onChange={(e) => setData('discount_type', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                    >
                                        <option value="flat">Flat (₹)</option>
                                        <option value="percent">Percent (%)</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Discount Value</Label>
                                    <TextInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={data.discount_value}
                                        onChange={(e) => setData('discount_value', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <Label>Order Status</Label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="delivered">Delivered</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Payment Method</Label>
                                    <select
                                        value={data.payment_method}
                                        onChange={(e) => setData('payment_method', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="card">Card</option>
                                    </select>
                                </div>
                                <div>
                                    <Label>Payment Status</Label>
                                    <select
                                        value={data.payment_status}
                                        onChange={(e) => setData('payment_status', e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                    >
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="partial">Partial</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <Label>Coupon Code</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <TextInput
                                            value={data.coupon_code}
                                            onChange={(e) => setData('coupon_code', e.target.value.toUpperCase())}
                                            placeholder="Optional coupon code"
                                            error={allErrors.coupon_code}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCheckCoupon}
                                        disabled={!canCheckCoupon || couponChecking}
                                        className="rounded-lg border border-primary-500 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                    >
                                        {couponChecking ? 'Checking…' : 'Apply'}
                                    </button>
                                </div>
                                {!canCheckCoupon && data.coupon_code && (
                                    <p className="mt-1 text-xs text-gray-400">
                                        {showNewCustomer ? 'Coupons require an existing customer.' :
                                         !data.customer_id ? 'Pick a customer first to verify the coupon.' :
                                         subtotal === 0 ? 'Add at least one item to verify.' : ''}
                                    </p>
                                )}
                                {couponState.status === 'valid' && (
                                    <p className="mt-1 text-xs text-emerald-600 font-medium">✓ {couponState.message}</p>
                                )}
                                {couponState.status === 'invalid' && (
                                    <p className="mt-1 text-xs text-red-600">✗ {couponState.message}</p>
                                )}
                            </div>

                            <div>
                                <Label>Notes</Label>
                                <textarea
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    rows={3}
                                    placeholder="Internal notes (not shown on invoice)..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Right — totals */}
                        <div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-3 sticky top-24">
                                <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Total</h3>

                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Subtotal ({data.items.length} item{data.items.length !== 1 ? 's' : ''})</span>
                                    <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                                </div>

                                {Number(data.discount_value) > 0 && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>
                                            Discount
                                            {data.discount_type === 'percent' ? ` (${data.discount_value}%)` : ''}
                                        </span>
                                        <span className="font-medium text-red-600">
                                            - {data.discount_type === 'flat'
                                                ? formatCurrency(data.discount_value)
                                                : formatCurrency(subtotal * (Number(data.discount_value) / 100))}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 pt-3 flex justify-between">
                                    <span className="font-semibold text-gray-900">Grand Total</span>
                                    <span className="text-lg font-bold text-primary-700">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ── Actions ── */}
                <div className="flex items-center justify-end gap-3">
                    <Link
                        href={url('/orders')}
                        className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </Link>
                    <Button type="submit" loading={submitting} disabled={submitting}>
                        <ShoppingCart className="h-4 w-4" />
                        {isEdit ? 'Update Order' : 'Create Order'}
                    </Button>
                </div>
            </form>

            <BarcodeScannerModal
                show={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleScannedCode}
            />
        </VendorLayout>
    );
}
