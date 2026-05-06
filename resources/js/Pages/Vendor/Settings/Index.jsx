import { useState, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import Label from '@/Components/Label';
import TextInput from '@/Components/TextInput';
import Button from '@/Components/Button';

const TABS = [
    { id: 'shop', label: 'Shop Profile' },
    { id: 'invoice', label: 'Invoice' },
    { id: 'review', label: 'Review' },
    { id: 'inventory', label: 'Inventory' },
];

function Field({ label, children, required }) {
    return (
        <div>
            <Label required={required}>{label}</Label>
            {children}
        </div>
    );
}

export default function Settings({ settings = {}, tenant = {} }) {
    const url = useStorePath();
    const [activeTab, setActiveTab] = useState('shop');

    const { data, setData, post, processing, errors } = useForm({
        shop_name: settings.shop_name || '',
        owner_name: settings.owner_name || '',
        whatsapp_number: settings.whatsapp_number || '',
        address: settings.address || '',
        city: settings.city || '',
        gst_number: settings.gst_number || '',
        prices_include_tax: settings.prices_include_tax === '1' || settings.prices_include_tax === true,
        google_review_link: settings.google_review_link || '',
        instagram_handle: settings.instagram_handle || '',
        invoice_prefix: settings.invoice_prefix || '',
        invoice_footer: settings.invoice_footer || '',
        whatsapp_template: settings.whatsapp_template || '',
        show_cost_price: settings.show_cost_price === '1' || settings.show_cost_price === true,
        review_text: settings.review_text || '',
        review_reprompt_interval: settings.review_reprompt_interval || '',
        slow_moving_days: settings.slow_moving_days || '',
    });

    // Logo upload — using router.post directly for reliable file upload
    const logoInputRef = useRef(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoError, setLogoError] = useState(null);

    function handleSubmit(e) {
        e.preventDefault();
        post(url('/settings'));
    }

    function handleLogoSubmit() {
        if (!logoFile) return;
        setLogoUploading(true);
        setLogoError(null);
        const fd = new FormData();
        fd.append('logo', logoFile);
        router.post(url('/settings/logo'), fd, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setLogoFile(null);
                if (logoInputRef.current) logoInputRef.current.value = '';
            },
            onError: (errors) => {
                setLogoError(errors.logo || 'Upload failed.');
            },
            onFinish: () => setLogoUploading(false),
        });
    }

    return (
        <VendorLayout title="Settings">
            <Head title="Settings" />

            {/* Tab Bar */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex gap-1 overflow-x-auto">
                    {TABS.map((tab) => (
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

            <form onSubmit={handleSubmit}>
                {/* Shop Profile Tab */}
                {activeTab === 'shop' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader title="Shop Profile" subtitle="Basic information about your shop" />
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <Field label="Shop Name" required>
                                    <TextInput
                                        value={data.shop_name}
                                        onChange={(e) => setData('shop_name', e.target.value)}
                                        placeholder="My Shop"
                                        error={errors.shop_name}
                                    />
                                </Field>
                                <Field label="Owner Name">
                                    <TextInput
                                        value={data.owner_name}
                                        onChange={(e) => setData('owner_name', e.target.value)}
                                        placeholder="John Doe"
                                        error={errors.owner_name}
                                    />
                                </Field>
                                <Field label="WhatsApp Number">
                                    <TextInput
                                        value={data.whatsapp_number}
                                        onChange={(e) => setData('whatsapp_number', e.target.value)}
                                        placeholder="+91 98765 43210"
                                        error={errors.whatsapp_number}
                                    />
                                </Field>
                                <Field label="City">
                                    <TextInput
                                        value={data.city}
                                        onChange={(e) => setData('city', e.target.value)}
                                        placeholder="Mumbai"
                                        error={errors.city}
                                    />
                                </Field>
                                <Field label="Address" required={false}>
                                    <TextInput
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        placeholder="123 Main Street"
                                        error={errors.address}
                                    />
                                </Field>
                                <Field label="GST Number">
                                    <TextInput
                                        value={data.gst_number}
                                        onChange={(e) => setData('gst_number', e.target.value)}
                                        placeholder="22AAAAA0000A1Z5"
                                        error={errors.gst_number}
                                    />
                                </Field>
                                <Field label="Product Prices Include GST">
                                    <label className="inline-flex items-center gap-2 mt-1">
                                        <input
                                            type="checkbox"
                                            checked={!!data.prices_include_tax}
                                            onChange={(e) => setData('prices_include_tax', e.target.checked)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            Yes — extract GST from the entered price
                                        </span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        When off, GST is added on top of the price you enter for each product.
                                    </p>
                                </Field>
                                <Field label="Google Review Link">
                                    <TextInput
                                        value={data.google_review_link}
                                        onChange={(e) => setData('google_review_link', e.target.value)}
                                        placeholder="https://g.page/r/..."
                                        error={errors.google_review_link}
                                    />
                                </Field>
                                <Field label="Instagram Handle">
                                    <TextInput
                                        value={data.instagram_handle}
                                        onChange={(e) => setData('instagram_handle', e.target.value)}
                                        placeholder="@myshop"
                                        error={errors.instagram_handle}
                                    />
                                </Field>
                            </div>
                        </Card>

                        {/* Logo Upload */}
                        <Card>
                            <CardHeader title="Shop Logo" subtitle="Upload your shop logo (PNG, JPG up to 2MB)" />
                            <div className="mb-4 flex items-center gap-4">
                                <div className="h-24 w-24 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                                    {logoFile ? (
                                        <img
                                            src={URL.createObjectURL(logoFile)}
                                            alt="New logo preview"
                                            className="h-full w-full object-contain p-1"
                                        />
                                    ) : settings.logo ? (
                                        <img
                                            src={`/storage/${settings.logo.replace(/^\/?(storage\/)?/, '')}?t=${settings.logo_updated_at || Date.now()}`}
                                            alt="Shop logo"
                                            className="h-full w-full object-contain p-1"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = '<span class=\'text-xs text-red-500 text-center px-1\'>Logo file missing</span>'; }}
                                        />
                                    ) : (
                                        <span className="text-xs text-gray-400 text-center px-2">No logo uploaded</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {logoFile && <p className="text-amber-600 font-medium">Preview only — click Upload Logo to save.</p>}
                                    {!logoFile && settings.logo && <p>Current logo. Choose a new file to replace.</p>}
                                    {!logoFile && !settings.logo && <p>Choose a PNG or JPG (max 2MB) to set your shop logo.</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={logoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    Choose File
                                </Button>
                                {logoFile && (
                                    <span className="text-sm text-gray-600 truncate max-w-xs">
                                        {logoFile.name}
                                    </span>
                                )}
                                <Button
                                    type="button"
                                    size="sm"
                                    loading={logoUploading}
                                    disabled={!logoFile}
                                    onClick={handleLogoSubmit}
                                >
                                    Upload Logo
                                </Button>
                            </div>
                            {logoError && (
                                <p className="mt-1 text-sm text-red-500">{logoError}</p>
                            )}
                        </Card>
                    </div>
                )}

                {/* Invoice Tab */}
                {activeTab === 'invoice' && (
                    <Card>
                        <CardHeader title="Invoice Settings" subtitle="Customize how your invoices look" />
                        <div className="space-y-5 max-w-xl">
                            <Field label="Invoice Prefix">
                                <TextInput
                                    value={data.invoice_prefix}
                                    onChange={(e) => setData('invoice_prefix', e.target.value)}
                                    placeholder="INV-"
                                    error={errors.invoice_prefix}
                                />
                            </Field>
                            <Field label="Invoice Footer">
                                <textarea
                                    value={data.invoice_footer}
                                    onChange={(e) => setData('invoice_footer', e.target.value)}
                                    rows={3}
                                    placeholder="Thank you for your business!"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                />
                                {errors.invoice_footer && (
                                    <p className="mt-1 text-sm text-red-500">{errors.invoice_footer}</p>
                                )}
                            </Field>
                            <Field label="WhatsApp Message Template">
                                <p className="text-xs text-gray-500 mb-1.5">
                                    Available variables: <code className="bg-gray-100 px-1 rounded">[CustomerName]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[OrderID]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[Total]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[ShopName]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[InvoiceLink]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[CouponCode]</code>
                                </p>
                                <p className="text-xs text-gray-400 mb-1.5">
                                    <code className="bg-gray-100 px-1 rounded">[CouponCode]</code> uses the customer's most recent unused coupon. If they don't have one, the entire line containing this variable is dropped — so put it on its own line.
                                </p>
                                <textarea
                                    value={data.whatsapp_template}
                                    onChange={(e) => setData('whatsapp_template', e.target.value)}
                                    rows={5}
                                    placeholder="Hi [CustomerName], your order [OrderID] for [Total] is confirmed. - [ShopName]"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                />
                                {errors.whatsapp_template && (
                                    <p className="mt-1 text-sm text-red-500">{errors.whatsapp_template}</p>
                                )}
                            </Field>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setData('show_cost_price', !data.show_cost_price)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                        data.show_cost_price ? 'bg-primary-500' : 'bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                                            data.show_cost_price ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                                <Label className="mb-0">Show Cost Price on Invoices</Label>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Review Tab */}
                {activeTab === 'review' && (
                    <Card>
                        <CardHeader title="Review Settings" subtitle="Configure how you request reviews from customers" />
                        <div className="space-y-5 max-w-xl">
                            <Field label="Review Request Message">
                                <p className="text-xs text-gray-500 mb-1.5">
                                    Available variables: <code className="bg-gray-100 px-1 rounded">[CustomerName]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[ShopName]</code>{' '}
                                    <code className="bg-gray-100 px-1 rounded">[ReviewLink]</code>
                                </p>
                                <textarea
                                    value={data.review_text}
                                    onChange={(e) => setData('review_text', e.target.value)}
                                    rows={8}
                                    placeholder="Hi [CustomerName], please review us on Google: [ReviewLink]"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                                />
                                {errors.review_text && (
                                    <p className="mt-1 text-sm text-red-500">{errors.review_text}</p>
                                )}
                            </Field>
                            <Field label="Re-prompt Interval (days)">
                                <TextInput
                                    type="number"
                                    value={data.review_reprompt_interval}
                                    onChange={(e) => setData('review_reprompt_interval', e.target.value)}
                                    placeholder="30"
                                    min="1"
                                    error={errors.review_reprompt_interval}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Wait this many days before asking the same customer for a review again.
                                </p>
                            </Field>
                        </div>
                    </Card>
                )}


                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <Card>
                        <CardHeader title="Inventory Settings" subtitle="Configure inventory tracking behavior" />
                        <div className="max-w-xs">
                            <Field label="Slow-Moving Stock Threshold (days)">
                                <TextInput
                                    type="number"
                                    value={data.slow_moving_days}
                                    onChange={(e) => setData('slow_moving_days', e.target.value)}
                                    placeholder="60"
                                    min="1"
                                    error={errors.slow_moving_days}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Products with no orders in this many days will be flagged as slow-moving.
                                </p>
                            </Field>
                        </div>
                    </Card>
                )}

                {/* Save Button */}
                <div className="mt-6 flex justify-end">
                    <Button type="submit" loading={processing}>
                        Save Settings
                    </Button>
                </div>
            </form>
        </VendorLayout>
    );
}
