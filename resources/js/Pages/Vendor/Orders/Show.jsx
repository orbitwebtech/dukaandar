import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import { waLink, normalizePhone } from '@/lib/whatsapp';
import Card, { CardHeader } from '@/Components/Card';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import Modal from '@/Components/Modal';
import {
    MessageCircle, Star, ExternalLink, Phone, User,
    FileText, ChevronDown, Download, Send, ArrowLeft, CheckCircle, Pencil,
} from 'lucide-react';

const statusBadgeColor = { confirmed: 'blue', delivered: 'success', cancelled: 'danger', draft: 'gray' };
const paymentBadgeColor = { paid: 'success', pending: 'warning', partial: 'blue' };
const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
const cleanPhone = normalizePhone;

export default function Show({ order, settings = {}, invoiceLink = '', activeCoupons = [] }) {
    const url = useStorePath();
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showInvoicePanel, setShowInvoicePanel] = useState(false);

    const subtotal = Number(order.subtotal || 0);
    const discountAmount = Number(order.discount_amount || 0);
    const grandTotal = Number(order.total || 0);

    // ---- WhatsApp message builder ----
    const firstCouponCode = activeCoupons[0]?.code || '';
    const buildInvoiceMessage = () => {
        let template = settings.whatsapp_template ||
            'Hello [CustomerName],\n\nThank you for your purchase from [ShopName].\n\nYou can find your Invoice on below Link: [InvoiceLink]';

        // If no coupon is available, drop any line that references [CouponCode]
        if (!firstCouponCode) {
            template = template
                .split('\n')
                .filter((line) => !line.includes('[CouponCode]'))
                .join('\n');
        }

        return template
            .replace(/\[CustomerName\]/g, order.customer?.name || '')
            .replace(/\[OrderID\]/g, `#${order.order_number}`)
            .replace(/\[Total\]/g, formatCurrency(grandTotal))
            .replace(/\[ShopName\]/g, settings.shop_name || '')
            .replace(/\[InvoiceLink\]/g, invoiceLink || '')
            .replace(/\[CouponCode\]/g, firstCouponCode);
    };

    const buildCouponMessage = (coupon) => {
        const expiresFmt = coupon.expires_at
            ? new Date(coupon.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
        const lines = [
            `Hi ${order.customer?.name || ''}, here's a coupon for you from ${settings.shop_name || ''}!`,
            ``,
            `Code: ${coupon.code}`,
            `${coupon.discount} off${coupon.name ? ` (${coupon.name})` : ''}`,
        ];
        if (expiresFmt) lines.push(`Valid until ${expiresFmt}`);
        return lines.join('\n');
    };

    const sendCouponWhatsApp = (coupon) => {
        if (!order.customer?.whatsapp) return;
        window.open(waLink(order.customer.whatsapp, buildCouponMessage(coupon)), '_blank');
    };

    // ---- Step 1: Download PDF ----
    const handleDownloadPdf = () => {
        window.open(url(`/orders/${order.id}/invoice-pdf?download=1`), '_blank');
    };

    // ---- Step 2: Send message on WhatsApp ----
    const handleSendWhatsApp = () => {
        if (!order.customer?.whatsapp) return;
        window.open(waLink(order.customer.whatsapp, buildInvoiceMessage()), '_blank');

        // Mark as sent
        router.post(url(`/orders/${order.id}/send-invoice`), {}, {
            preserveState: true,
            onFinish: () => {
                if (settings.google_review_link) {
                    setShowReviewModal(true);
                }
            },
        });
    };

    // ---- Send via WhatsApp ----
    // On mobile (Android/iOS) where WhatsApp is in the share sheet, use Web Share with the PDF.
    // On desktop, go straight to wa.me — the message includes [InvoiceLink] so customer gets the PDF link.
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const handleSharePdf = async () => {
        if (!isMobile) {
            handleSendWhatsApp();
            return;
        }
        try {
            const response = await fetch(url(`/orders/${order.id}/invoice-pdf?download=1`));
            const blob = await response.blob();
            const file = new File([blob], `Invoice-${order.order_number}.pdf`, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: `Invoice ${order.order_number}`,
                    text: buildInvoiceMessage(),
                    files: [file],
                });
                router.post(url(`/orders/${order.id}/send-invoice`), {}, {
                    preserveState: true,
                    onFinish: () => {
                        if (settings.google_review_link) setShowReviewModal(true);
                    },
                });
            } else {
                handleSendWhatsApp();
            }
        } catch (err) {
            handleSendWhatsApp();
        }
    };

    // ---- Google review ----
    const buildReviewMessage = () => {
        const link = settings.google_review_link || '';
        const tpl = settings.review_text;
        if (!tpl) return link;
        return tpl
            .replace(/\[CustomerName\]/g, order.customer?.name || '')
            .replace(/\[ShopName\]/g, settings.shop_name || '')
            .replace(/\[ReviewLink\]/g, link);
    };

    const sendReview = (withText) => {
        if (!order.customer?.whatsapp || !settings.google_review_link) return;
        const msg = withText ? buildReviewMessage() : settings.google_review_link;
        window.open(waLink(order.customer.whatsapp, msg), '_blank');
        setShowReviewModal(false);
    };

    // ---- Status updates ----
    const handleStatusChange = (newStatus) => {
        router.patch(url(`/orders/${order.id}/quick`), {
            status: newStatus, payment_status: order.payment_status,
            payment_method: order.payment_method, notes: order.notes,
        }, { preserveState: true });
    };

    const handlePaymentStatusChange = (val) => {
        router.patch(url(`/orders/${order.id}/quick`), {
            status: order.status, payment_status: val,
            payment_method: order.payment_method, notes: order.notes,
        }, { preserveState: true });
    };

    const variantLabel = (item) => {
        if (!item.variant?.attributes) return null;
        const a = item.variant.attributes;
        return typeof a === 'object' ? Object.entries(a).map(([k, v]) => `${k}: ${v}`).join(', ') : String(a);
    };

    return (
        <VendorLayout title={`Order #${order.order_number}`}>
            <Head title={`Order #${order.order_number}`} />

            <div className="max-w-4xl space-y-5">

                {/* ── Back link ── */}
                <Link href={url('/orders')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
                    <ArrowLeft className="h-4 w-4" /> Back to Orders
                </Link>

                {/* ── Status bar ── */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <select value={order.status} onChange={(e) => handleStatusChange(e.target.value)}
                            className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition cursor-pointer">
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <div className="relative">
                        <select value={order.payment_status} onChange={(e) => handlePaymentStatusChange(e.target.value)}
                            className="appearance-none rounded-lg border border-gray-300 bg-white pl-3 pr-8 py-2.5 text-sm font-medium text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition cursor-pointer">
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    {order.invoice_sent && <Badge color="success"><CheckCircle className="h-3 w-3 mr-1" /> Invoice Sent</Badge>}

                    <Link
                        href={url(`/orders/${order.id}/edit`)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        <Pencil className="h-4 w-4" /> Edit Order
                    </Link>
                </div>

                {/* ── Invoice & WhatsApp Section ── */}
                <Card className="border-emerald-200 bg-emerald-50/30">
                    <CardHeader
                        title="Invoice & WhatsApp"
                        subtitle="Download the invoice PDF and send it to the customer via WhatsApp"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Download PDF */}
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition text-left"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                                <FileText className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Download PDF</p>
                                <p className="text-xs text-gray-400">Save invoice to device</p>
                            </div>
                        </button>

                        {/* View in browser */}
                        <a
                            href={url(`/orders/${order.id}/invoice-pdf`)}
                            target="_blank"
                            className="flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-primary-300 hover:shadow-sm transition text-left"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                <ExternalLink className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">View Invoice</p>
                                <p className="text-xs text-gray-400">Open in browser</p>
                            </div>
                        </a>

                        {/* Share on WhatsApp (with PDF on mobile) */}
                        <button
                            type="button"
                            onClick={handleSharePdf}
                            disabled={!order.customer?.whatsapp}
                            className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 hover:border-emerald-400 hover:shadow-sm transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Send className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-800">Send on WhatsApp</p>
                                <p className="text-xs text-emerald-600">{isMobile ? 'Share PDF + message' : 'Opens WhatsApp with message + invoice link'}</p>
                            </div>
                        </button>
                    </div>

                    {/* WhatsApp message preview */}
                    <div className="mt-4 rounded-lg bg-white border border-gray-200 p-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">WhatsApp Message Preview</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{buildInvoiceMessage()}</p>
                    </div>
                </Card>

                {/* ── Review Reminder ── */}
                {order.status === 'delivered' && settings.google_review_link && !order.customer?.reviewed_at && (
                    <Card className="border-amber-200 bg-amber-50/40">
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                <Star className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm">Ask {order.customer?.name || 'this customer'} for a Google review</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Send the review link via WhatsApp, then tap "Mark as reviewed" once they've left a review.</p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    <button
                                        onClick={() => sendReview(true)}
                                        disabled={!order.customer?.whatsapp}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-4 w-4" /> Send review request on WhatsApp
                                    </button>
                                    <button
                                        onClick={() => router.post(url(`/customers/${order.customer.id}/toggle-reviewed`), {}, { preserveScroll: true })}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <CheckCircle className="h-4 w-4" /> Mark as reviewed
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* ── Active Coupons for Customer (for FUTURE orders) ── */}
                {activeCoupons.length > 0 && (
                    <Card>
                        <CardHeader
                            title="Coupons issued to this customer"
                            subtitle={`For ${order.customer?.name || 'this customer'}'s next order — not applied to this one. To apply a coupon to the current order, enter the code when creating the order.`}
                        />
                        <div className="space-y-2">
                            {activeCoupons.map((c) => {
                                const minVal = Number(c.min_order_value || 0);
                                const meetsMin = grandTotal >= minVal;
                                return (
                                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3">
                                        <div className="flex-1">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <span className="font-mono font-semibold text-amber-800 text-base">{c.code}</span>
                                                <span className="text-sm text-gray-700">{c.discount} off</span>
                                                {c.name && <span className="text-xs text-gray-500">— {c.name}</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {minVal > 0 && (
                                                    <span className={meetsMin ? 'text-emerald-700' : 'text-gray-500'}>
                                                        Min order {formatCurrency(minVal)}
                                                        {!meetsMin && ` (needs ${formatCurrency(minVal - grandTotal)} more)`}
                                                    </span>
                                                )}
                                                {minVal > 0 && ' · '}
                                                Expires {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => sendCouponWhatsApp(c)}
                                            disabled={!order.customer?.whatsapp}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send className="h-4 w-4" /> Send on WhatsApp
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                )}

                {/* ── Order Info ── */}
                <Card>
                    <CardHeader title="Order Details" />
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Order #</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">#{order.order_number}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date</p>
                            <p className="mt-1 text-sm text-gray-900">
                                {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                            <div className="mt-1"><Badge color={statusBadgeColor[order.status] || 'gray'}>{capitalize(order.status)}</Badge></div>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payment</p>
                            <div className="mt-1 flex items-center gap-2">
                                <Badge color={paymentBadgeColor[order.payment_status] || 'gray'}>{capitalize(order.payment_status)}</Badge>
                                <span className="text-xs text-gray-400">via {capitalize(order.payment_method)}</span>
                            </div>
                        </div>
                        {order.coupon_code && (
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coupon</p>
                                <p className="mt-1 text-sm font-mono font-semibold text-primary-700">{order.coupon_code}</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* ── Customer ── */}
                <Card>
                    <CardHeader title="Customer" />
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{order.customer?.name || '—'}</p>
                            {order.customer?.whatsapp && (
                                <div className="mt-1 flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm text-gray-600">{order.customer.whatsapp}</span>
                                    <a href={waLink(order.customer.whatsapp)} target="_blank" rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition">
                                        <MessageCircle className="h-3 w-3" /> Open WhatsApp
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* ── Items ── */}
                <Card padding={false}>
                    <div className="p-6 pb-4">
                        <CardHeader title="Order Items" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr className="bg-gray-50/60">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Discount</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {(order.items || []).map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <p className="text-sm font-medium text-gray-900">{item.product?.name || '—'}</p>
                                            {variantLabel(item) && <p className="text-xs text-gray-400 mt-0.5">{variantLabel(item)}</p>}
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-sm text-gray-700">{item.qty}</td>
                                        <td className="px-6 py-3.5 text-right text-sm text-gray-700">{formatCurrency(item.unit_price)}</td>
                                        <td className="px-6 py-3.5 text-right text-sm text-gray-500">
                                            {Number(item.line_discount_amount) > 0 ? <>-{formatCurrency(item.line_discount_amount)}</> : '—'}
                                        </td>
                                        <td className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.line_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-gray-100 px-6 py-4">
                        <div className="ml-auto max-w-xs space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Discount{order.discount_type === 'percent' ? ` (${order.discount_value}%)` : ''}</span>
                                    <span className="font-medium text-red-600">- {formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            <div className="border-t border-gray-200 pt-2 flex justify-between">
                                <span className="font-semibold text-gray-900">Grand Total</span>
                                <span className="text-lg font-bold text-primary-700">{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* ── Notes ── */}
                {order.notes && (
                    <Card>
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-gray-700 mb-1">Notes</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* ── Google Review Modal ── */}
            <Modal show={showReviewModal} onClose={() => setShowReviewModal(false)} title="Google review moklava chhe?" maxWidth="sm">
                <div className="space-y-3 pt-1">
                    <p className="text-sm text-gray-500">
                        Share a Google review link with <span className="font-medium text-gray-700">{order.customer?.name || 'the customer'}</span> on WhatsApp.
                    </p>
                    <button type="button" onClick={() => sendReview(false)} className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 transition">
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center"><ExternalLink className="h-4 w-4 text-blue-500" /></div>
                        <div><p className="text-sm font-medium text-gray-900">Share review link</p><p className="text-xs text-gray-400">Send only the Google review URL</p></div>
                    </button>
                    <button type="button" onClick={() => sendReview(true)} className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 transition">
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="h-4 w-4 text-amber-500" /></div>
                        <div><p className="text-sm font-medium text-gray-900">Share link + review text</p><p className="text-xs text-gray-400">Send with a pre-written review message</p></div>
                    </button>
                    <button type="button" onClick={() => setShowReviewModal(false)} className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                        Not now
                    </button>
                </div>
            </Modal>
        </VendorLayout>
    );
}
