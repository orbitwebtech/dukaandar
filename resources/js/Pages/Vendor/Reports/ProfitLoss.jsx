import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Button from '@/Components/Button';
import {
    IndianRupee, TrendingUp, TrendingDown, Wallet, Package, Receipt, Percent, AlertTriangle,
} from 'lucide-react';
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
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

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

function PeriodSelector({ period, dateRange }) {
    const url = useStorePath();
    const [showCustom, setShowCustom] = useState(period === 'custom');
    const [customFrom, setCustomFrom] = useState(dateRange?.from || '');
    const [customTo, setCustomTo] = useState(dateRange?.to || '');

    function selectPeriod(p) {
        if (p === 'custom') { setShowCustom(true); return; }
        setShowCustom(false);
        router.get(url('/reports/profit-loss'), { period: p }, { preserveScroll: true });
    }

    function applyCustom() {
        if (!customFrom || !customTo) return;
        router.get(url('/reports/profit-loss'), { period: 'custom', from: customFrom, to: customTo }, { preserveScroll: true });
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

function Empty({ msg, height = 260 }) {
    return <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>{msg}</div>;
}

function pctChange(current, previous) {
    const c = Number(current || 0);
    const p = Number(previous || 0);
    if (p === 0) return c === 0 ? 0 : 100;
    return ((c - p) / Math.abs(p)) * 100;
}

function ChangePill({ value }) {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    const v = Number(value);
    const positive = v >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(v).toFixed(1)}%
        </span>
    );
}

function MarginTrendChart({ data }) {
    if (!data?.length) return <Empty msg="No data for this period" />;
    const chart = data.map(d => ({
        date: d.date,
        Revenue: Number(d.revenue),
        Cost: Number(d.cost),
        Margin: Number(d.margin),
    }));
    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chart} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
                <Line type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Cost" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Margin" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
}

function CategoryDonut({ data, dataKey = 'margin' }) {
    if (!data?.length) return <Empty msg="No category data" />;
    const chart = data.map(d => ({ name: d.name, value: Number(d[dataKey]) }));
    return (
        <ResponsiveContainer width="100%" height={260}>
            <PieChart>
                <Pie data={chart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {chart.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
            </PieChart>
        </ResponsiveContainer>
    );
}

function RevenueBars({ data }) {
    if (!data?.length) return <Empty msg="No revenue data" />;
    const chart = data.map(d => ({
        date: d.date,
        revenue: Number(d.revenue),
    }));
    return (
        <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)} />
                <Tooltip formatter={(v) => formatCurrency(v)} labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function TableHeader({ cols }) {
    return (
        <thead>
            <tr className="bg-gray-50/60">
                {cols.map((col, i) => (
                    <th
                        key={i}
                        className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.right ? 'text-right' : 'text-left'}`}
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
        ? (dateRange.from === dateRange.to ? fmt(dateRange.from) : `${fmt(dateRange.from)} – ${fmt(dateRange.to)}`)
        : '';
    return range ? `${base} (${range})` : base;
};

function MarginTab({ margin, period, dateRange, exportUrl }) {
    const totals = margin?.totals || {};
    const hasMissing = (totals.missing_cost_count || 0) > 0;
    return (
        <>
            {hasMissing && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                        <strong>{totals.missing_cost_count}</strong> order line{totals.missing_cost_count === 1 ? '' : 's'} ha{totals.missing_cost_count === 1 ? 's' : 've'} no cost price on the product or variant.
                        Margin is understated for these items — set the cost on the product to fix.
                    </span>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
                <StatCard title="Revenue" value={formatCurrency(totals.revenue)} icon={IndianRupee} color="primary" />
                <StatCard title="Cost of Goods" value={formatCurrency(totals.cogs)} icon={Package} color="warning" />
                <StatCard title="Gross Margin" value={formatCurrency(totals.gross_margin)} icon={Wallet} color="success" />
                <StatCard title="Margin %" value={(totals.margin_pct || 0).toFixed(1) + '%'} icon={Percent} color="blue" />
            </div>

            <Card className="mb-6">
                <CardHeader
                    title="Daily Margin Trend"
                    subtitle="Revenue, cost, and gross margin per day"
                    action={
                        <a href={exportUrl('margin')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Export CSV
                        </a>
                    }
                />
                <MarginTrendChart data={margin?.daily} />
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-6">
                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Top 10 Most Profitable Products" subtitle="By gross margin" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {!margin?.top_products?.length ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No product data</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader cols={[
                                    { label: 'Product' },
                                    { label: 'Qty', right: true },
                                    { label: 'Revenue', right: true },
                                    { label: 'Margin', right: true },
                                    { label: '%', right: true },
                                ]} />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {margin.top_products.map((p, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.qty}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-emerald-600 text-right whitespace-nowrap">{formatCurrency(p.margin)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.margin_pct}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>

                <Card padding={false}>
                    <div className="p-6 pb-0">
                        <CardHeader title="Bottom 10 Products" subtitle="By gross margin (loss-makers first)" className="mb-0" />
                    </div>
                    <div className="overflow-x-auto mt-4">
                        {!margin?.bottom_products?.length ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No product data</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader cols={[
                                    { label: 'Product' },
                                    { label: 'Qty', right: true },
                                    { label: 'Revenue', right: true },
                                    { label: 'Margin', right: true },
                                    { label: '%', right: true },
                                ]} />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {margin.bottom_products.map((p, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.qty}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatCurrency(p.revenue)}</td>
                                            <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${Number(p.margin) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                                {formatCurrency(p.margin)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.margin_pct}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>

            <Card padding={false}>
                <div className="p-6 pb-0">
                    <CardHeader title="Margin by Category" className="mb-0" />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="p-4">
                        <CategoryDonut data={margin?.by_category} dataKey="margin" />
                    </div>
                    <div className="overflow-x-auto">
                        {!margin?.by_category?.length ? (
                            <p className="px-6 py-8 text-center text-sm text-gray-400">No category data</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <TableHeader cols={[
                                    { label: 'Category' },
                                    { label: 'Revenue', right: true },
                                    { label: 'Cost', right: true },
                                    { label: 'Margin', right: true },
                                    { label: '%', right: true },
                                ]} />
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {margin.by_category.map((c, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">{formatCurrency(c.revenue)}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right whitespace-nowrap">{formatCurrency(c.cost)}</td>
                                            <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${Number(c.margin) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(c.margin)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 text-right">{c.margin_pct}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Card>
        </>
    );
}

function ProfitTab({ profit, period, dateRange, previousRange, exportUrl }) {
    const totals = profit?.totals || {};
    const prev = profit?.previous || {};
    const revenueChange = pctChange(totals.revenue, prev.revenue);
    const cogsChange = pctChange(totals.cogs, prev.cogs);
    const opexChange = pctChange(totals.opex, prev.opex);
    const netChange = pctChange(totals.net_profit, prev.net_profit);

    const fmtPrev = (v) => formatCurrency(v) + ' last period';

    return (
        <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.revenue)}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <ChangePill value={revenueChange} />
                                <span className="text-[11px] text-gray-400">vs {fmtPrev(prev.revenue)}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-primary-50 p-2">
                            <IndianRupee className="h-5 w-5 text-primary-600" />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">COGS (Purchases)</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.cogs)}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <ChangePill value={cogsChange} />
                                <span className="text-[11px] text-gray-400">vs {fmtPrev(prev.cogs)}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-2">
                            <Package className="h-5 w-5 text-amber-600" />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Operating Expenses</p>
                            <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totals.opex)}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <ChangePill value={opexChange} />
                                <span className="text-[11px] text-gray-400">vs {fmtPrev(prev.opex)}</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-rose-50 p-2">
                            <Receipt className="h-5 w-5 text-rose-600" />
                        </div>
                    </div>
                </Card>
                <Card>
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Profit</p>
                            <p className={`text-xl font-bold mt-1 ${Number(totals.net_profit) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {formatCurrency(totals.net_profit)}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <ChangePill value={netChange} />
                                <span className="text-[11px] text-gray-400">{(totals.net_margin_pct || 0).toFixed(1)}% margin</span>
                            </div>
                        </div>
                        <div className="rounded-lg bg-emerald-50 p-2">
                            <Wallet className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="mb-6">
                <CardHeader
                    title="P&L Statement"
                    subtitle="Cash basis — revenue from confirmed/delivered orders, COGS from purchases, opex from expenses"
                    action={
                        <a href={exportUrl('profit')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Export CSV
                        </a>
                    }
                />
                <table className="min-w-full">
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="py-2 text-sm text-gray-700">Revenue</td>
                            <td className="py-2 text-sm text-right font-semibold text-gray-900">{formatCurrency(totals.revenue)}</td>
                        </tr>
                        <tr>
                            <td className="py-2 pl-4 text-sm text-gray-600">− Cost of Goods Sold (Purchases)</td>
                            <td className="py-2 text-sm text-right text-gray-700">{formatCurrency(totals.cogs)}</td>
                        </tr>
                        <tr className="bg-gray-50/60">
                            <td className="py-2 text-sm font-semibold text-gray-800">Gross Profit</td>
                            <td className={`py-2 text-sm text-right font-bold ${Number(totals.gross_profit) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatCurrency(totals.gross_profit)}
                            </td>
                        </tr>
                        <tr>
                            <td className="py-2 pl-4 text-sm text-gray-600">− Operating Expenses</td>
                            <td className="py-2 text-sm text-right text-gray-700">{formatCurrency(totals.opex)}</td>
                        </tr>
                        <tr className="bg-emerald-50/60">
                            <td className="py-3 text-base font-bold text-gray-900">Net Profit</td>
                            <td className={`py-3 text-base text-right font-bold ${Number(totals.net_profit) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                {formatCurrency(totals.net_profit)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
                <Card>
                    <CardHeader title="Daily Revenue" subtitle="Confirmed + delivered orders" />
                    <RevenueBars data={profit?.revenue_by_day} />
                </Card>
                <Card>
                    <CardHeader title="Expenses by Category" subtitle="Where the money goes" />
                    {!profit?.expenses_by_category?.length ? (
                        <Empty msg="No expenses logged" />
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={profit.expenses_by_category.map(e => ({ name: e.category, value: Number(e.total) }))}
                                    dataKey="value" nameKey="name"
                                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}
                                >
                                    {profit.expenses_by_category.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                </Pie>
                                <Tooltip formatter={(v) => formatCurrency(v)} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>

            <Card padding={false}>
                <div className="p-6 pb-0">
                    <CardHeader title="Top Suppliers" subtitle="By purchase total" className="mb-0" />
                </div>
                <div className="overflow-x-auto mt-4">
                    {!profit?.top_suppliers?.length ? (
                        <p className="px-6 py-8 text-center text-sm text-gray-400">No purchase data</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-100">
                            <TableHeader cols={[
                                { label: 'Supplier' },
                                { label: 'Purchases', right: true },
                                { label: 'Total', right: true },
                            ]} />
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {profit.top_suppliers.map((s, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.supplier}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{s.count}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">{formatCurrency(s.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </>
    );
}

export default function ProfitLoss({
    period = 'this_month',
    dateRange = {},
    previousRange = {},
    margin = {},
    profit = {},
}) {
    const url = useStorePath();
    const [tab, setTab] = useState('margin');
    const rangeLabel = formatRangeLabel(period, dateRange);

    const exportUrl = (type) => {
        const params = new URLSearchParams({ period });
        if (period === 'custom') {
            if (dateRange?.from) params.set('from', dateRange.from);
            if (dateRange?.to) params.set('to', dateRange.to);
        }
        return url(`/reports/export/${type}?${params.toString()}`);
    };

    return (
        <VendorLayout title="Profit & Loss">
            <Head title="Profit & Loss" />

            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Profit & Loss</h1>
                <p className="text-sm text-gray-500 mt-0.5">{rangeLabel}</p>
            </div>

            <PeriodSelector period={period} dateRange={dateRange} />

            <div className="mb-6 border-b border-gray-200">
                <nav className="flex gap-6 -mb-px">
                    <button
                        onClick={() => setTab('margin')}
                        className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                            tab === 'margin'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Product Margin
                    </button>
                    <button
                        onClick={() => setTab('profit')}
                        className={`border-b-2 px-1 pb-3 text-sm font-medium transition ${
                            tab === 'profit'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Cash P&L
                    </button>
                </nav>
            </div>

            {tab === 'margin' && (
                <MarginTab margin={margin} period={period} dateRange={dateRange} exportUrl={exportUrl} />
            )}
            {tab === 'profit' && (
                <ProfitTab profit={profit} period={period} dateRange={dateRange} previousRange={previousRange} exportUrl={exportUrl} />
            )}
        </VendorLayout>
    );
}
