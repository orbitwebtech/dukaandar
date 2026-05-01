import { Head, useForm } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import Button from '@/Components/Button';
import Label from '@/Components/Label';
import TextInput from '@/Components/TextInput';
import SearchableSelect from '@/Components/SearchableSelect';

const discountTypeOptions = [
    { value: 'flat', label: 'Flat (₹ off)' },
    { value: 'percent', label: 'Percent (% off)' },
];

function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function ToggleSwitch({ checked, onChange, id }) {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={onChange}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                checked ? 'bg-primary-500' : 'bg-gray-200'
            }`}
        >
            <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export default function Form({ coupon }) {
    const url = useStorePath();
    const isEditing = !!coupon;

    const { data, setData, post, put, processing, errors } = useForm({
        name: coupon?.name || '',
        code: coupon?.code || '',
        discount_type: coupon?.discount_type || 'flat',
        discount_value: coupon?.discount_value || '',
        min_order_value: coupon?.min_order_value || '',
        valid_days: coupon?.valid_days || '',
        auto_send_threshold: coupon?.auto_send_threshold || '',
        active: coupon?.active ?? true,
    });

    const selectedDiscountType =
        discountTypeOptions.find((o) => o.value === data.discount_type) || discountTypeOptions[0];

    function handleDiscountTypeChange(option) {
        setData('discount_type', option ? option.value : 'flat');
    }

    function handleAutoGenerateCode() {
        setData('code', generateCode());
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (isEditing) {
            put(url(`/coupons/${coupon.id}`));
        } else {
            post(url('/coupons'));
        }
    }

    return (
        <VendorLayout title={isEditing ? 'Edit Coupon' : 'Create Coupon'}>
            <Head title={isEditing ? 'Edit Coupon' : 'Create Coupon'} />

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                {/* Basic Details */}
                <Card>
                    <CardHeader title="Coupon Details" />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Name */}
                        <div className="sm:col-span-2">
                            <Label required>Coupon Name</Label>
                            <TextInput
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Welcome Offer"
                                error={errors.name}
                            />
                        </div>

                        {/* Code */}
                        <div className="sm:col-span-2">
                            <Label required>Coupon Code</Label>
                            <div className="flex gap-2">
                                <TextInput
                                    value={data.code}
                                    onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                    placeholder="e.g. WELCOME20"
                                    error={errors.code}
                                    className="flex-1 font-mono tracking-wider"
                                />
                                <button
                                    type="button"
                                    onClick={handleAutoGenerateCode}
                                    title="Auto-generate code"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 whitespace-nowrap"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Discount */}
                <Card>
                    <CardHeader title="Discount Settings" />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Discount Type */}
                        <div>
                            <Label required>Discount Type</Label>
                            <SearchableSelect
                                options={discountTypeOptions}
                                value={selectedDiscountType}
                                onChange={handleDiscountTypeChange}
                                placeholder="Select type..."
                                isClearable={false}
                                error={errors.discount_type}
                            />
                        </div>

                        {/* Discount Value */}
                        <div>
                            <Label required>
                                Discount Value{' '}
                                <span className="text-gray-400 font-normal">
                                    ({data.discount_type === 'flat' ? '₹' : '%'})
                                </span>
                            </Label>
                            <TextInput
                                type="number"
                                min="0"
                                step={data.discount_type === 'flat' ? '1' : '0.01'}
                                max={data.discount_type === 'percent' ? '100' : undefined}
                                value={data.discount_value}
                                onChange={(e) => setData('discount_value', e.target.value)}
                                placeholder={data.discount_type === 'flat' ? '50' : '10'}
                                error={errors.discount_value}
                            />
                        </div>

                        {/* Min Order Value */}
                        <div>
                            <Label>Minimum Order Value (₹)</Label>
                            <TextInput
                                type="number"
                                min="0"
                                step="1"
                                value={data.min_order_value}
                                onChange={(e) => setData('min_order_value', e.target.value)}
                                placeholder="e.g. 500"
                                error={errors.min_order_value}
                            />
                        </div>

                        {/* Valid Days */}
                        <div>
                            <Label>Valid for (days)</Label>
                            <TextInput
                                type="number"
                                min="1"
                                value={data.valid_days}
                                onChange={(e) => setData('valid_days', e.target.value)}
                                placeholder="e.g. 30"
                                error={errors.valid_days}
                            />
                            <p className="mt-1 text-xs text-gray-400">Days from issue date until expiry</p>
                        </div>
                    </div>
                </Card>

                {/* Auto-send */}
                <Card>
                    <CardHeader
                        title="Auto-Send"
                        subtitle="Automatically send this coupon when a customer's order value crosses the threshold."
                    />
                    <div>
                        <Label>Auto-Send Threshold (₹)</Label>
                        <TextInput
                            type="number"
                            min="0"
                            step="1"
                            value={data.auto_send_threshold}
                            onChange={(e) => setData('auto_send_threshold', e.target.value)}
                            placeholder="e.g. 1000"
                            error={errors.auto_send_threshold}
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Leave blank to disable auto-send
                        </p>
                    </div>
                </Card>

                {/* Active */}
                <Card>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">Active</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Inactive coupons cannot be redeemed or auto-sent
                            </p>
                        </div>
                        <ToggleSwitch
                            id="active-toggle"
                            checked={!!data.active}
                            onChange={() => setData('active', !data.active)}
                        />
                    </div>
                </Card>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <Button type="submit" loading={processing}>
                        {isEditing ? 'Save Changes' : 'Create Coupon'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        href={isEditing ? url(`/coupons/${coupon.id}/edit`) : url('/coupons')}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </VendorLayout>
    );
}
