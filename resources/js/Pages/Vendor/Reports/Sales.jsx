import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Button from '@/Components/Button';
import {
    IndianRupee,
    ShoppingCart,
    TrendingUp,
    UserPlus,
    RefreshCw,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const formatCurrency = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Custom' },
];

function PeriodSelector({ period, dateRange }) {
    const url = useStorePath();
    const [showCustom, setShowCustom] = useState(period === 'custom');
    const [customFrom, setCustomFrom] = useState(dateRange?.from || '');
    const [customTo, setCustomTo] = useState(dateRange?.to || '');

    function selectPeriod(p) {
        if (p === 'custom') {
            setShowCustom(true);
            return;
        }
        setShowCustom(false);
        router.get(url('/reports/sales'), { period: p }, { preserveScroll: true });
    }

    function applyCustom() {
        if (!customFrom || !customTo) return;
        router.get(url('/reports/sales'), { period: 'custom', from: customFrom, to: customTo }, { preserveScroll: true });
    }

    const isCustomActive = period === 'custom' || showCustom;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-6">
            {PERIODS.map((p) => {
                const active = p.value === 'custom' ? isCustomActive : period === p.value && !showCustom;
                return (
                    <button
                        key={p.value}
                        onClick={() => selectPeriod(p.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            active
                                ? 'bg-primary-500 text-white'
                                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {p.label}
                    </button>
                );
            })}
            {isCustomActive && (
                <div className="flex items-center gap-2 ml-2">
                    <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        max={customTo || undefined}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                    <span className="text-gray-400 text-sm">to</span>
                    <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        min={customFrom || undefined}
                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                    <Button size="sm" onClick={applyCustom} disabled={!customFrom || !customTo}>
                        Apply
                    </Button>
                </div>
            )}
        </div>
    );
}

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];
const STATUS_COLORS = { confirmed: '#3b82f6', delivered: '#10b981', cancelled: '#ef4444', draft: '#9ca3af' };
const TYPE_COLORS = { vip: '#f59e0b', regular: '#3b82f6', new: '#9ca3af' };

const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="bg-gray-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg">
            <p className="font-medium capitalize">{p.name || p.label}</p>
            {p.revenue !== undefined && <p>{formatCurrency(p.revenue)}</p>}
            {p.total !== undefined && p.revenue === undefined && <p>{formatCurrency(p.total)}</p>}
            {p.count !== undefined && <p>{p.count} order{p.count !== 1 ? 's' : ''}</p>}
        </div>
    );
};

function CategoryDonut({ data }) {
    if (!data?.length) return <Empty msg="No category data" />;
    const chartData = data.map(d => ({ name: d.name, revenue: Number(d.revenue), qty: Number(d.qty) }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie data={chartData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {chartData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function StatusDonut({ data }) {
    if (!data?.length) return <Empty msg="No order data" />;
    const chartData = data.map(d => ({ name: d.status, total: Number(d.total), count: Number(d.count) }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie data={chartData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {chartData.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.name] || PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px', textTransform: 'capitalize' }} iconSize={8} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function CustomerTypeDonut({ data }) {
    if (!data?.length) return <Empty msg="No customer data" />;
    const labels = { vip: 'VIP', regular: 'Regular', new: 'New' };
    const chartData = data.map(d => ({ name: labels[d.type] || d.type, total: Number(d.total), count: Number(d.count) }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie data={chartData} dataKey="total" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {chartData.map((d, i) => <Cell key={i} fill={TYPE_COLORS[d.name?.toLowerCase()] || PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={renderTooltip} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function HourOfDayBars({ data }) {
    if (!data?.length) return <Empty msg="No order data" />;
    // Fill missing hours with 0 so axis is consistent
    const byHour = Object.fromEntries(data.map(d => [Number(d.hour), { count: Number(d.count), total: Number(d.total) }]));
    const filled = Array.from({ length: 24 }, (_, h) => ({
        hour: h.toString().padStart(2, '0'),
        count: byHour[h]?.count || 0,
        total: byHour[h]?.total || 0,
        name: `${h.toString().padStart(2, '0')}:00`,
    }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filled} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function Empty({ msg }) {
    return <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">{msg}</div>;
}

function RevenueBarChart({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                No revenue data available
            </div>
        );
    }

    const maxRevenue = Math.max(...data.map((d) => Number(d.revenue || 0)), 1);

    return (
        <div className="mt-4">
            <div className="flex items-end gap-1 h-40 overflow-x-auto pb-6">
                {data.map((day, i) => {
                    const height = Math.max((Number(day.revenue || 0) / maxRevenue) * 100, 2);
                    return (
                        <div
                            key={i}
                            className="group relative flex-1 min-w-[8px] h-full flex flex-col items-center justify-end"
                            title={`${day.date}: ${formatCurrency(day.revenue)} (${day.count} orders)`}
                        >
                            <div
                                className="w-full rounded-t-sm bg-primary-400 group-hover:bg-primary-500 transition-colors cursor-pointer"
                                style={{ height: `${height}%` }}
                            />
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                                {day.date}
                                <br />
                                {formatCurrency(day.revenue)}
                                <br />
                                {day.count} order{day.count !== 1 ? 's' : ''}
                            </div>
                            {/* Date label every ~5 bars for readability */}
                            {(i === 0 || i === data.length - 1 || i % 7 === 0) && (
                                <span className="absolute -bottom-5 text-[9px] text-gray-400 whitespace-nowrap">
                                    {new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>₹0</span>
                <span>{formatCurrency(maxRevenue)}</span>
            </div>
        </div>
    );
}

function TableHeader({ cols }) {
    return (
        <thead>
            <tr className="bg-gray-50/60">
                {cols.map((col, i) => (
                    <th
                        key={i}
                        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                            col.right ? 'text-right' : 'text-left'
                        }`}
                    >
                        {col.label}
                    </th>
                ))}
            </tr>
        </thead>
    );
}

const PERIOD_LABELS = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range',
};

const formatRangeLabel = (period, dateRange) => {
    const fmt = (d) => {
        if (!d) return '';
        const date = new Date(d);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };
    const base = PERIOD_LABELS[period] || 'Selected Range';
    const range = dateRange?.from && dateRange?.to
        ? (dateRange.from === dateRange.to
            ? fmt(dateRange.from)
            : `${fmt(dateRange.from)} – ${fmt(dateRange.to)}`)
        : '';
    return range ? `${base} (${range})` : base;
};

export default function SalesReport({
    stats = {},
    revenueByDay = [],
    topProducts = [],
    topCustomers = [],
    paymentBreakdown = [],
    pendingPayments = [],
    salesByCategory = [],
    salesByStatus = [],
    customerTypeMix = [],
    hourOfDay = [],
    period = 'this_month',
    dateRange = {},
}) {
    const url = useStorePath();
    const rangeLabel = formatRangeLabel(period, dateRange);
    return (
        <VendorLayout title="Sales Reports">
            <Head title="Sales Reports" />

            {/* Period Selector */}
            <PeriodSelector period={period} dateRange={dateRange} />

            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-6">
                <StatCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    icon={IndianRupee}
                    color="success"
                />
                <StatCard
                    title="Total Orders"
                    value={Number(stats.totalOrders || 0).toLocaleString('en-IN')}
                    icon={ShoppingCart}
                    color="primary"
                />
                <StatCard
                    title="Avg Order Value"
                    value={formatCurrency(stats.avgOrderValue)}
                    icon={TrendingUp}
                    color="blue"
                />
                <StatCard
                    title="New Customers"
                    value={Number(stats.newCustomers || 0).toLocaleString('en-IN')}
                    icon={UserPlus}
                    color="primary"
                />
                <StatCard
                    title="Repeat Customers"
                    value={Number(stats.repeatCustomers || 0).toLocaleString('en-IN')}
                    icon={RefreshCw}
                    color="warning"
                />
            </div>

            {/* Revenue Chart */}
            <Card className="mb-6">
                <CardHeader
                    title={`Revenue — ${rangeLabel}`}
                    subtitle="Daily revenue trend"
                    action={
                        <a
                            href={url(`/reports/export/sales?period=${period}${period === 'custom' ? `&from=${dateRange?.from || ''}&to=${dateRange?.to || ''}` : ''}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Export CSV
                        </a>
                    }
                />
                <RevenueBarChart data={revenueByDay} />
            </Card>

            {/* 2x2 grid of analytical charts */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
                <Card>
                    <CardHeader title="Sales by Category" subtitle="Revenue split across product categories" />
                    <CategoryDonut data={salesByCategory} />
                </Card>
                <Card>
                    <CardHeader title="Sales by Order Status" subtitle="Order count by status" />
                    <StatusDonut data={salesByStatus} />
                </Card>
                <Card>
                    <CardHeader title="Customer Type Mix" subtitle="Revenue contribution by customer tier" />
                    <CustomerTypeDonut data={customerTypeMix} />
                </Card>
                <Card>
                    <CardHeader title="Orders by Hour" subtitle="When orders are created (24h)" />
                    <HourOfDayBars data={hourOfDay} />
                </Card>
            </div>

            {/* 2-column grid of detail cards */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

                {/* Top Products */}
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Top 10 Products" subtitle="By revenue" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {topProducts.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No product data available</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader
                                    cols={[
                                        { label: '#' },
                                        { label: 'Product' },
                                        { label: 'Revenue', right: true },
                                        { label: 'Qty', right: true },
                                    ]}
                                />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {topProducts.slice(0, 10).map((product, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-gray-400 w-8">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {product.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                                {formatCurrency(product.revenue)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                {Number(product.qty || 0).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

                {/* Top Customers */}
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Top 10 Customers" subtitle="By total spent" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {topCustomers.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No customer data available</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader
                                    cols={[
                                        { label: '#' },
                                        { label: 'Customer' },
                                        { label: 'Spent', right: true },
                                        { label: 'Orders', right: true },
                                    ]}
                                />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {topCustomers.slice(0, 10).map((customer, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-bold text-gray-400 w-8">
                                                {index + 1}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                                                {customer.whatsapp && (
                                                    <p className="text-xs text-gray-400">{customer.whatsapp}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                                {formatCurrency(customer.total_spent)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                                {Number(customer.order_count || 0).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

                {/* Payment Breakdown */}
                <Card>
                    <CardHeader title="Payment Breakdown" subtitle="By payment method" />
                    {paymentBreakdown.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-6">No payment data available</p>
                    ) : (
                        <ul className="space-y-3">
                            {paymentBreakdown.map((item, index) => (
                                <li key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2.5 w-2.5 rounded-full bg-primary-400 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-800 capitalize">
                                            {item.payment_method || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                        <span>{Number(item.count || 0).toLocaleString('en-IN')} orders</span>
                                        <span className="font-semibold text-gray-900 whitespace-nowrap">
                                            {formatCurrency(item.total)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Pending Payments */}
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Pending Payments" subtitle="Outstanding amounts" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {pendingPayments.length === 0 ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No pending payments</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader
                                    cols={[
                                        { label: 'Order #' },
                                        { label: 'Customer' },
                                        { label: 'Amount', right: true },
                                        { label: 'Overdue', right: true },
                                    ]}
                                />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {pendingPayments.map((order, index) => {
                                        const daysOverdue = order.days_overdue ?? (
                                            order.order_date
                                                ? Math.floor(
                                                      (Date.now() - new Date(order.order_date).getTime()) /
                                                          (1000 * 60 * 60 * 24)
                                                  )
                                                : 0
                                        );
                                        return (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="text-sm font-semibold text-primary-600">
                                                        #{order.order_number || order.id}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {order.customer?.name || '—'}
                                                    </p>
                                                    {order.customer?.whatsapp && (
                                                        <p className="text-xs text-gray-400">
                                                            {order.customer.whatsapp}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                                    {formatCurrency(order.balance_due ?? order.total)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span
                                                        className={`text-xs font-semibold ${
                                                            daysOverdue > 30
                                                                ? 'text-red-600'
                                                                : daysOverdue > 7
                                                                ? 'text-amber-600'
                                                                : 'text-gray-500'
                                                        }`}
                                                    >
                                                        {daysOverdue}d
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </VendorLayout>
    );
}
