import { useMemo } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader } from '@/Components/Card';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import { ArrowLeft } from 'lucide-react';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const GST_PRESETS = [0, 5, 12, 18, 28];

export default function PurchaseForm({ purchase }) {
    const url = useStorePath();
    const isEdit = !!purchase;
    const today = new Date().toISOString().split('T')[0];

    const { data, setData, post, put, processing, errors } = useForm(isEdit ? {
        supplier: purchase.supplier || '',
        product_name: purchase.product_name,
        qty: purchase.qty,
        cost: purchase.cost,
        gst_percent: purchase.gst_percent,
        purchase_date: purchase.purchase_date ? new Date(purchase.purchase_date).toISOString().split('T')[0] : today,
        notes: purchase.notes || '',
    } : {
        supplier: '',
        product_name: '',
        qty: 1,
        cost: '',
        gst_percent: 0,
        purchase_date: today,
        notes: '',
    });

    // Live total preview (server recomputes for trust, but show vendor what they're saving)
    const computed = useMemo(() => {
        const qty = Number(data.qty) || 0;
        const cost = Number(data.cost) || 0;
        const gstPct = Number(data.gst_percent) || 0;
        const subtotal = qty * cost;
        const gstAmt = subtotal * gstPct / 100;
        return { subtotal, gstAmt, total: subtotal + gstAmt };
    }, [data.qty, data.cost, data.gst_percent]);

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) put(url(`/purchases/${purchase.id}`));
        else post(url('/purchases'));
    };

    return (
        <VendorLayout title={isEdit ? 'Edit Purchase' : 'Add Purchase'}>
            <Head title={isEdit ? 'Edit Purchase' : 'Add Purchase'} />

            <div className="max-w-2xl">
                <Link href={url('/purchases')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back to Purchases
                </Link>

                <Card>
                    <CardHeader title={isEdit ? 'Edit Purchase' : 'New Purchase'} />

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <Label required>Product / Item Name</Label>
                            <TextInput
                                value={data.product_name}
                                onChange={(e) => setData('product_name', e.target.value)}
                                placeholder="e.g. Cotton fabric, Boxes, Stationery"
                                error={errors.product_name}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Supplier</Label>
                                <TextInput
                                    value={data.supplier}
                                    onChange={(e) => setData('supplier', e.target.value)}
                                    placeholder="Optional"
                                    error={errors.supplier}
                                />
                            </div>
                            <div>
                                <Label required>Date</Label>
                                <TextInput
                                    type="date"
                                    value={data.purchase_date}
                                    onChange={(e) => setData('purchase_date', e.target.value)}
                                    error={errors.purchase_date}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label required>Qty</Label>
                                <TextInput
                                    type="number"
                                    min="1"
                                    value={data.qty}
                                    onChange={(e) => setData('qty', e.target.value)}
                                    error={errors.qty}
                                />
                            </div>
                            <div>
                                <Label required>Cost / unit (₹)</Label>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.cost}
                                    onChange={(e) => setData('cost', e.target.value)}
                                    error={errors.cost}
                                />
                            </div>
                            <div>
                                <Label>GST (%)</Label>
                                <select
                                    value={data.gst_percent}
                                    onChange={(e) => setData('gst_percent', e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                                >
                                    {GST_PRESETS.map(p => <option key={p} value={p}>{p}%</option>)}
                                </select>
                                {errors.gst_percent && <p className="mt-1 text-xs text-red-600">{errors.gst_percent}</p>}
                            </div>
                        </div>

                        {/* Live total preview */}
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-1.5">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal ({data.qty || 0} × {inr(data.cost)})</span>
                                <span className="text-gray-900">{inr(computed.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">GST {Number(data.gst_percent) || 0}%</span>
                                <span className="text-gray-900">{inr(computed.gstAmt)}</span>
                            </div>
                            <div className="flex justify-between text-base font-semibold pt-1.5 border-t border-gray-200">
                                <span>Total</span>
                                <span className="text-primary-700">{inr(computed.total)}</span>
                            </div>
                        </div>

                        <div>
                            <Label>Notes</Label>
                            <textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={2}
                                placeholder="Invoice number, batch, anything to remember"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                            />
                            {errors.notes && <p className="mt-1 text-xs text-red-600">{errors.notes}</p>}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            <Button type="submit" loading={processing}>{isEdit ? 'Save changes' : 'Record purchase'}</Button>
                            <Link href={url('/purchases')}>
                                <Button variant="outline" type="button">Cancel</Button>
                            </Link>
                        </div>
                    </form>
                </Card>
            </div>
        </VendorLayout>
    );
}
