import { useState } from 'react';
import { Head, useForm, Link, router, usePage } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import Badge from '@/Components/Badge';
import { CheckCircle, Calendar, AlertCircle } from 'lucide-react';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function OrganizationForm({ organization }) {
    const isEdit = !!organization;
    const { flash } = usePage().props;

    const { data, setData, post, put, processing, errors } = useForm(isEdit ? {
        name: organization.name,
        status: organization.status,
        max_stores: organization.max_stores ?? 1,
    } : {
        organization_name: '',
        store_name: '',
        status: 'trial',
        trial_days: 14,
        max_stores: 1,
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        owner_password: '',
    });

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) put(`/admin/organizations/${organization.id}`);
        else post('/admin/organizations');
    };

    const recordPayment = (cycle) => {
        const label = cycle === 'yearly' ? 'yearly (₹38,500 — 12 months access)' : 'monthly (₹3,500 — 1 month access)';
        if (!confirm(`Record ${label} payment for ${organization.name}?`)) return;
        router.post(`/admin/organizations/${organization.id}/record-payment`, { cycle }, { preserveScroll: true });
    };

    const setEndDate = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        router.post(`/admin/organizations/${organization.id}/subscription-end`, {
            subscription_ends_at: fd.get('subscription_ends_at'),
        }, { preserveScroll: true });
    };

    const extendTrial = (days) => {
        if (!confirm(`Extend trial by ${days} days?`)) return;
        router.post(`/admin/organizations/${organization.id}/trial`, { extend_days: days }, { preserveScroll: true });
    };

    const setTrialDate = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        router.post(`/admin/organizations/${organization.id}/trial`, {
            trial_ends_at: fd.get('trial_ends_at') || null,
        }, { preserveScroll: true });
    };

    const trialActive = isEdit && organization.trial_ends_at && new Date(organization.trial_ends_at) > new Date();
    const trialDaysLeft = trialActive
        ? Math.ceil((new Date(organization.trial_ends_at) - new Date()) / 86400000)
        : null;

    const subActive = isEdit && organization.subscription_ends_at && new Date(organization.subscription_ends_at) > new Date();

    return (
        <AdminLayout title={isEdit ? 'Edit Organization' : 'New Organization'}>
            <Head title={isEdit ? 'Edit Organization' : 'New Organization'} />

            <div className="max-w-2xl space-y-5">
                {flash?.success && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {/* Subscription card (edit only) */}
                {isEdit && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900">Subscription</h3>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Status</p>
                                <Badge color={organization.status === 'active' ? 'success' : organization.status === 'trial' ? 'blue' : 'danger'}>
                                    {organization.status}
                                </Badge>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Cycle</p>
                                <p className="text-sm font-semibold text-gray-900 capitalize">{organization.billing_cycle || '—'}</p>
                            </div>
                            <div className="rounded-lg bg-gray-50 p-3">
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Active Until</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDate(organization.subscription_ends_at)}</p>
                                {subActive && (
                                    <p className="text-[10px] text-emerald-600 mt-0.5">{Math.ceil((new Date(organization.subscription_ends_at) - new Date()) / 86400000)} days left</p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Record manual payment</p>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => recordPayment('monthly')} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition">
                                    <CheckCircle className="h-4 w-4" /> Mark Monthly Paid (₹3,500)
                                </button>
                                <button onClick={() => recordPayment('yearly')} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 transition">
                                    <CheckCircle className="h-4 w-4" /> Mark Yearly Paid (₹38,500)
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2">
                                Payments extend the subscription from today (or current end date if still in the future). Yearly = 12 months access for the price of 11 (1 month free).
                            </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Override end date</p>
                            <form onSubmit={setEndDate} className="flex items-center gap-2">
                                <input
                                    type="date"
                                    name="subscription_ends_at"
                                    defaultValue={organization.subscription_ends_at ? new Date(organization.subscription_ends_at).toISOString().split('T')[0] : ''}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                                <Button type="submit" size="sm" variant="outline">Save Date</Button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Trial card */}
                {isEdit && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" /> Free Trial
                        </h3>

                        <div className="rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-gray-400">Trial ends on</p>
                                <p className="text-sm font-semibold text-gray-900">{formatDate(organization.trial_ends_at)}</p>
                            </div>
                            {trialActive ? (
                                <Badge color={trialDaysLeft <= 3 ? 'warning' : 'blue'}>
                                    {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} left
                                </Badge>
                            ) : organization.trial_ends_at ? (
                                <Badge color="danger">Expired</Badge>
                            ) : (
                                <Badge color="gray">No trial</Badge>
                            )}
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Quick extend</p>
                            <div className="flex flex-wrap gap-2">
                                {[7, 14, 30, 60].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => extendTrial(d)}
                                        className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition"
                                    >
                                        +{d} days
                                    </button>
                                ))}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-2">
                                Extends from today (or current trial end if still in the future). Default trial on signup is 14 days.
                            </p>
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Set exact date</p>
                            <form onSubmit={setTrialDate} className="flex items-center gap-2">
                                <input
                                    type="date"
                                    name="trial_ends_at"
                                    defaultValue={organization.trial_ends_at ? new Date(organization.trial_ends_at).toISOString().split('T')[0] : ''}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                                <Button type="submit" size="sm" variant="outline">Save Trial Date</Button>
                                <button
                                    type="button"
                                    onClick={() => { if (confirm('End the trial now?')) router.post(`/admin/organizations/${organization.id}/trial`, { trial_ends_at: '' }, { preserveScroll: true }); }}
                                    className="text-xs text-red-600 hover:text-red-800 ml-auto"
                                >
                                    End trial
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                    {isEdit ? (
                        <>
                            <h3 className="font-semibold text-gray-900">Organization Details</h3>
                            <div>
                                <Label required>Name</Label>
                                <TextInput value={data.name} onChange={e => setData('name', e.target.value)} error={errors.name} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label required>Status</Label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                                        <option value="active">Active</option>
                                        <option value="trial">Trial</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500">Suspended blocks logins.</p>
                                </div>
                                <div>
                                    <Label required>Max Stores Allowed</Label>
                                    <TextInput
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={data.max_stores}
                                        onChange={e => setData('max_stores', e.target.value)}
                                        error={errors.max_stores}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Currently using {organization.stores_count} of {data.max_stores} stores.
                                    </p>
                                </div>
                            </div>
                            {organization.owner && (
                                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                                    <p className="font-medium text-gray-700 mb-1">Owner</p>
                                    {organization.owner.name} · {organization.owner.email} · {organization.owner.phone}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div>
                                <Label required>Organization Name</Label>
                                <TextInput value={data.organization_name} onChange={e => setData('organization_name', e.target.value)} error={errors.organization_name} />
                            </div>
                            <div>
                                <Label required>First Store Name</Label>
                                <TextInput value={data.store_name} onChange={e => setData('store_name', e.target.value)} error={errors.store_name} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label required>Initial Status</Label>
                                    <select value={data.status} onChange={e => setData('status', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                                        <option value="trial">Trial</option>
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </div>
                                <div>
                                    <Label required>Max Stores</Label>
                                    <TextInput
                                        type="number"
                                        min="1"
                                        max="1000"
                                        value={data.max_stores}
                                        onChange={e => setData('max_stores', e.target.value)}
                                        error={errors.max_stores}
                                    />
                                    <p className="mt-1 text-xs text-gray-400">Default 1.</p>
                                </div>
                                {data.status === 'trial' && (
                                    <div>
                                        <Label>Trial Length (days)</Label>
                                        <TextInput
                                            type="number"
                                            min="1"
                                            max="365"
                                            value={data.trial_days}
                                            onChange={e => setData('trial_days', e.target.value)}
                                            error={errors.trial_days}
                                        />
                                        <p className="mt-1 text-xs text-gray-400">Default 14 days.</p>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-gray-500">After creation, use the subscription panel on the edit page to record paid subscriptions or extend trial.</p>
                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <h3 className="font-semibold text-gray-900 mb-3">Owner Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label required>Owner Name</Label>
                                        <TextInput value={data.owner_name} onChange={e => setData('owner_name', e.target.value)} error={errors.owner_name} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label required>Email</Label>
                                            <TextInput type="email" value={data.owner_email} onChange={e => setData('owner_email', e.target.value)} error={errors.owner_email} />
                                        </div>
                                        <div>
                                            <Label required>Phone</Label>
                                            <TextInput value={data.owner_phone} onChange={e => setData('owner_phone', e.target.value)} error={errors.owner_phone} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label required>Password</Label>
                                        <TextInput type="password" value={data.owner_password} onChange={e => setData('owner_password', e.target.value)} error={errors.owner_password} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button type="submit" loading={processing}>{isEdit ? 'Save' : 'Create'}</Button>
                        <Link href="/admin/organizations">
                            <Button variant="outline" type="button">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
