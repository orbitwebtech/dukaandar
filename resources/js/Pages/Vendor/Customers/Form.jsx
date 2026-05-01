import { Head, router, useForm } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Label from '@/Components/Label';
import TextInput from '@/Components/TextInput';
import Button from '@/Components/Button';
import SearchableSelect from '@/Components/SearchableSelect';

const SIZE_OPTIONS = [
    { value: 'S', label: 'S' },
    { value: 'M', label: 'M' },
    { value: 'L', label: 'L' },
    { value: 'XL', label: 'XL' },
    { value: 'XXL', label: 'XXL' },
    { value: 'Custom', label: 'Custom' },
];

export default function CustomerForm({ customer = null }) {
    const url = useStorePath();
    const isEdit = !!customer;
    const title = isEdit ? 'Edit Customer' : 'Add Customer';

    const { data, setData, post, put, processing, errors } = useForm({
        name: customer?.name || '',
        whatsapp: customer?.whatsapp || '',
        city: customer?.city || '',
        address: customer?.address || '',
        size_pref: customer?.size_pref || [],
        notes: customer?.notes || '',
    });

    const selectedSizes = SIZE_OPTIONS.filter((o) => data.size_pref.includes(o.value));

    const handleSizeChange = (selected) => {
        setData('size_pref', selected ? selected.map((s) => s.value) : []);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(url(`/customers/${customer.id}`));
        } else {
            post(url('/customers'));
        }
    };

    return (
        <VendorLayout title={title}>
            <Head title={title} />

            <div className="max-w-2xl">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name */}
                        <div>
                            <Label htmlFor="name" required>Name</Label>
                            <TextInput
                                id="name"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Customer name"
                                error={errors.name}
                                autoFocus
                            />
                        </div>

                        {/* WhatsApp */}
                        <div>
                            <Label htmlFor="whatsapp">WhatsApp Number</Label>
                            <TextInput
                                id="whatsapp"
                                type="text"
                                value={data.whatsapp}
                                onChange={(e) => setData('whatsapp', e.target.value)}
                                placeholder="+91 98765 43210"
                                error={errors.whatsapp}
                            />
                        </div>

                        {/* City */}
                        <div>
                            <Label htmlFor="city">City</Label>
                            <TextInput
                                id="city"
                                type="text"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                placeholder="e.g. Mumbai"
                                error={errors.city}
                            />
                        </div>

                        {/* Address */}
                        <div>
                            <Label htmlFor="address">Address</Label>
                            <textarea
                                id="address"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                rows={2}
                                placeholder="Flat / building / street, area"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                            />
                            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
                            <p className="mt-1 text-xs text-gray-400">Used on delivery labels and invoices.</p>
                        </div>

                        {/* Size Preference */}
                        <div>
                            <Label>Size Preferences</Label>
                            <SearchableSelect
                                options={SIZE_OPTIONS}
                                value={selectedSizes}
                                onChange={handleSizeChange}
                                placeholder="Select sizes…"
                                isMulti
                                isClearable
                                error={errors.size_pref}
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <Label htmlFor="notes">Notes</Label>
                            <textarea
                                id="notes"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                placeholder="Any notes about this customer…"
                                rows={3}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition resize-none ${
                                    errors.notes ? 'border-danger-500' : 'border-gray-300'
                                }`}
                            />
                            {errors.notes && (
                                <p className="mt-1 text-sm text-danger-500">{errors.notes}</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button type="submit" variant="primary" loading={processing} disabled={processing}>
                                {isEdit ? 'Save Changes' : 'Add Customer'}
                            </Button>
                            <Button href={url('/customers')} variant="outline" type="button">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </VendorLayout>
    );
}
