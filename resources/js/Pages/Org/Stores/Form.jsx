import { Head, useForm, Link } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';

export default function StoreForm({ store }) {
    const isEdit = !!store;
    const { data, setData, post, put, processing, errors } = useForm({
        name: store?.name ?? '',
        phone: store?.phone ?? '',
        address: store?.address ?? '',
        status: store?.status ?? 'active',
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) put(`/org/stores/${store.slug}`);
        else post('/org/stores');
    };

    return (
        <VendorLayout title={isEdit ? 'Edit Store' : 'Add Store'}>
            <Head title={isEdit ? 'Edit Store' : 'Add Store'} />

            <form onSubmit={submit} className="max-w-xl bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                    <Label required>Store Name</Label>
                    <TextInput
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        error={errors.name}
                    />
                </div>
                <div>
                    <Label>Phone</Label>
                    <TextInput
                        value={data.phone}
                        onChange={e => setData('phone', e.target.value)}
                        error={errors.phone}
                    />
                </div>
                <div>
                    <Label>Address</Label>
                    <TextInput
                        value={data.address}
                        onChange={e => setData('address', e.target.value)}
                        error={errors.address}
                    />
                </div>
                {isEdit && (
                    <div>
                        <Label>Status</Label>
                        <select
                            value={data.status}
                            onChange={e => setData('status', e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <Button type="submit" loading={processing}>{isEdit ? 'Save' : 'Create Store'}</Button>
                    <Link href="/org/stores">
                        <Button variant="outline" type="button">Cancel</Button>
                    </Link>
                </div>
            </form>
        </VendorLayout>
    );
}
