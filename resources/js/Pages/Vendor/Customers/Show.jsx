import { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Phone, MapPin, StickyNote, ShoppingBag, IndianRupee,
    CalendarDays, UserCheck, Pencil, MessageCircle, Tag, Plus, Printer, Home, Star
} from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath, useCan } from '@/lib/storePath';
import { waLink } from '@/lib/whatsapp';
import Badge from '@/Components/Badge';
import Card, { CardHeader } from '@/Components/Card';
import Button from '@/Components/Button';
import Modal from '@/Components/Modal';
import Label from '@/Components/Label';

const TYPE_BADGE = {
    new: 'gray',
    regular: 'blue',
    vip: 'warning',
};

const TYPE_LABELS = {
    new: 'New',
    regular: 'Regular',
    vip: 'VIP',
};

const STATUS_BADGE = {
    confirmed: 'blue',
    delivered: 'success',
    cancelled: 'danger',
    draft: 'gray',
    pending: 'warning',
};

const PAYMENT_BADGE = {
    paid: 'success',
    pending: 'warning',
    partial: 'blue',
};

const formatCurrency = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const COUPON_STATE_BADGE = { active: 'success', used: 'gray', expired: 'danger' };

export default function CustomerShow({ customer, issuances = [], availableCoupons = [] }) {
    const url = useStorePath();
    const can = useCan();
    const [issueOpen, setIssueOpen] = useState(false);
    const orders = customer.orders || [];
    const totalSpent = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const lastOrderDate = orders.length
        ? orders.reduce((latest, o) => {
              const d = new Date(o.created_at);
              return d > latest ? d : latest;
          }, new Date(0))
        : null;

    const sizePref = Array.isArray(customer.size_pref) ? customer.size_pref : [];

    return (
        <VendorLayout title={customer.name}>
            <Head title={customer.name} />

            {/* Header actions */}
            <div className="mb-6 flex items-center justify-between">
                <Link
                    href={url('/customers')}
                    className="text-sm text-gray-500 hover:text-gray-700 transition"
                >
                    ← Back to Customers
                </Link>
                <div className="flex items-center gap-2">
                    {customer.whatsapp && (
                        <a
                            href={waLink(customer.whatsapp)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Send WhatsApp
                        </a>
                    )}
                    <button
                        type="button"
                        onClick={() => router.post(url(`/customers/${customer.id}/toggle-reviewed`), {}, { preserveScroll: true })}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            customer.reviewed_at
                                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        title={customer.reviewed_at ? 'Click to unmark' : 'Mark this customer as having left a review'}
                    >
                        <Star className="h-4 w-4" />
                        {customer.reviewed_at ? 'Reviewed' : 'Mark as Reviewed'}
                    </button>
                    <a
                        href={url(`/customers/${customer.id}/label`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        <Printer className="h-4 w-4" />
                        Print Label
                    </a>
                    <Button href={url(`/customers/${customer.id}/edit`)} variant="outline">
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Button>
                </div>
            </div>

            {/* Customer info card */}
            <Card className="mb-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: identity */}
                    <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="text-xl font-bold text-primary-700">
                                {customer.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                                <Badge color={TYPE_BADGE[customer.type] || 'gray'}>
                                    {TYPE_LABELS[customer.type] || customer.type || '—'}
                                </Badge>
                                {customer.reviewed_at && (
                                    <Badge color="success">★ Reviewed</Badge>
                                )}
                            </div>

                            <div className="mt-2 space-y-1.5">
                                {customer.whatsapp && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                                        {customer.whatsapp}
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                                        <Home className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="whitespace-pre-wrap">{customer.address}</span>
                                    </div>
                                )}
                                {customer.city && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                                        {customer.city}
                                    </div>
                                )}
                                {sizePref.length > 0 && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <span className="text-gray-400 text-xs font-medium">Sizes:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {sizePref.map((s) => (
                                                <span
                                                    key={s}
                                                    className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {customer.notes && (
                                    <div className="flex items-start gap-1.5 text-sm text-gray-600">
                                        <StickyNote className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                                        <span className="text-gray-500 italic">{customer.notes}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: stats */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 shrink-0">
                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                                <ShoppingBag className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Orders</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                                <IndianRupee className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Spent</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalSpent)}</p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                                <CalendarDays className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Last Order</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                                {lastOrderDate && lastOrderDate.getTime() > 0
                                    ? formatDate(lastOrderDate)
                                    : '—'}
                            </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                                <UserCheck className="h-4 w-4" />
                                <span className="text-xs font-medium uppercase tracking-wide">Member Since</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{formatDate(customer.created_at)}</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Coupons */}
            <Card padding={false} className="mb-6">
                <div className="px-6 pt-6 pb-0 mb-4 flex items-center justify-between">
                    <CardHeader
                        title="Coupons"
                        subtitle={`${issuances.filter(i => i.state === 'active').length} active · ${issuances.length} total`}
                        className="mb-0"
                    />
                    {can('coupons.update') && availableCoupons.length > 0 && (
                        <Button onClick={() => setIssueOpen(true)} size="sm">
                            <Plus className="h-4 w-4" /> Issue Coupon
                        </Button>
                    )}
                </div>
                {issuances.length === 0 ? (
                    <p className="px-6 pb-6 text-sm text-gray-400">No coupons issued yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Discount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Min Order</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issued</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expires</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {issuances.map(i => (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">{i.coupon.code}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {i.coupon.discount_type === 'percent'
                                                ? `${i.coupon.discount_value}%`
                                                : formatCurrency(i.coupon.discount_value)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatCurrency(i.coupon.min_order_value)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(i.issued_at)}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(i.expires_at)}</td>
                                        <td className="px-4 py-3">
                                            <Badge color={COUPON_STATE_BADGE[i.state] || 'gray'}>
                                                {i.state.charAt(0).toUpperCase() + i.state.slice(1)}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <IssueCouponModal
                show={issueOpen}
                onClose={() => setIssueOpen(false)}
                customerId={customer.id}
                availableCoupons={availableCoupons}
                url={url}
            />

            {/* Order history */}
            <Card padding={false}>
                <CardHeader
                    title="Order History"
                    subtitle={`${orders.length} order${orders.length !== 1 ? 's' : ''}`}
                    className="px-6 pt-6 pb-0 mb-4"
                />
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Products</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                                        No orders yet.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const products = (order.items || [])
                                        .map((item) => item.product?.name)
                                        .filter(Boolean)
                                        .join(', ') || '—';

                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={url(`/orders/${order.id}`)}
                                                    className="text-sm font-medium text-primary-600 hover:text-primary-700 transition"
                                                >
                                                    #{order.order_number || order.id}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {formatDate(order.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                                                {products}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                {formatCurrency(order.total)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge color={STATUS_BADGE[order.status] || 'gray'}>
                                                    {order.status
                                                        ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                                                        : '—'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge color={PAYMENT_BADGE[order.payment_status] || 'gray'}>
                                                    {order.payment_status
                                                        ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)
                                                        : '—'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </VendorLayout>
    );
}

function IssueCouponModal({ show, onClose, customerId, availableCoupons, url }) {
    const { data, setData, post, processing, errors, reset } = useForm({ coupon_id: '' });

    const submit = (e) => {
        e.preventDefault();
        post(url(`/customers/${customerId}/issue-coupon`), {
            preserveScroll: true,
            onSuccess: () => { reset(); onClose(); },
        });
    };

    return (
        <Modal show={show} onClose={onClose} title="Issue Coupon">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Label required>Coupon</Label>
                    <select
                        value={data.coupon_id}
                        onChange={(e) => setData('coupon_id', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    >
                        <option value="">— Select a coupon —</option>
                        {availableCoupons.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.code} — {c.name} ({c.discount_type === 'percent' ? `${c.discount_value}%` : `₹${c.discount_value}`} off, valid {c.valid_days}d)
                            </option>
                        ))}
                    </select>
                    {errors.coupon_id && <p className="mt-1 text-xs text-red-600">{errors.coupon_id}</p>}
                </div>
                <div className="flex gap-2 pt-2">
                    <Button type="submit" loading={processing} disabled={!data.coupon_id}>Issue</Button>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </form>
        </Modal>
    );
}
