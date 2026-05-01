import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Check, IndianRupee, CreditCard, Calendar } from 'lucide-react';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Plans({ plan = {}, subscriptions = {} }) {
    const features = [
        'Unlimited stores',
        'Unlimited team members',
        'Unlimited products & orders',
        'WhatsApp invoice + review messages',
        'Coupon engine with auto-issue',
        'Sales & inventory reports with CSV export',
        'Bulk product import',
        'All future features included',
    ];

    return (
        <AdminLayout title="Plans & Billing">
            <Head title="Plans & Billing" />

            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Single Plan, All Features</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        One subscription tier. Pay manually offline; subscriptions are activated and extended from each organization's edit page.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
                    {/* Monthly card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-7">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Monthly</p>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-gray-900">{inr(plan.monthly_price)}</span>
                            <span className="text-sm text-gray-500">/month</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Billed every month</p>
                        <div className="mt-5 rounded-lg bg-gray-50 px-4 py-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">Active monthly subscribers</span>
                            <span className="text-xl font-bold text-gray-900">{subscriptions.monthly ?? 0}</span>
                        </div>
                    </div>

                    {/* Yearly card */}
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/30 p-7 relative">
                        <div className="absolute -top-3 right-4 inline-flex items-center rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-sm">
                            {plan.yearly_discount_label || '1 month free'}
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Yearly</p>
                        <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-4xl font-extrabold text-gray-900">{inr(plan.yearly_price)}</span>
                            <span className="text-sm text-gray-500">/year</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-2">
                            Pay for 11 months, get 12 months access. Saves {inr((plan.monthly_price || 0) * 12 - (plan.yearly_price || 0))} vs monthly.
                        </p>
                        <div className="mt-5 rounded-lg bg-white px-4 py-3 flex items-center justify-between border border-amber-200">
                            <span className="text-sm text-gray-600">Active yearly subscribers</span>
                            <span className="text-xl font-bold text-gray-900">{subscriptions.yearly ?? 0}</span>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">What's included</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {features.map((f, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MRR snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className="rounded-xl bg-white border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-gray-500">Monthly Recurring Revenue</p>
                            <IndianRupee className="h-5 w-5 text-primary-500" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{inr(subscriptions.monthly_mrr)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">From monthly subscribers (recognised this month)</p>
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-gray-500">Yearly contribution / month</p>
                            <Calendar className="h-5 w-5 text-amber-500" />
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{inr(subscriptions.yearly_arr_monthly)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Yearly subscribers × ₹38,500 ÷ 12 (recognised monthly)</p>
                    </div>
                </div>

                {/* Process */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-gray-900">How payment works</h3>
                            <p className="text-sm text-gray-700 mt-1">
                                Vendors pay you directly (UPI, bank transfer, cash, etc.) — outside the app. Once payment is received, open the organization in <strong>Organizations</strong>, choose <strong>Mark Monthly Paid</strong> or <strong>Mark Yearly Paid</strong>, and the subscription is extended automatically. Vendors don't enter any card details inside the app.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
