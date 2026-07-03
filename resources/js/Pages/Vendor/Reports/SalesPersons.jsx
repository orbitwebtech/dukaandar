import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Button from '@/Components/Button';
import Badge from '@/Components/Badge';
import { ShoppingCart, IndianRupee, Users, Crown, Download, UserCog } from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip,
} from 'recharts';

const formatCurrency = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const PERIODS = [
    { value: 'today', label: 'Today' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom' },
];

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

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
        router.get(url('/reports/sales-persons'), { period: p }, { preserveScroll: true });
    }

    function applyCustom() {
        if (!customFrom || !customTo) return;
        router.get(url('/reports/sales-persons'), { period: 'custom', from: customFrom, to: customTo }, { preserveScroll: true });
    }

    const isCustomActive = period === 'custom' || showCustom;

    return (
        <div className="flex flex-wrap items-center gap-2">
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

const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="bg-gray-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg">
            <p className="font-medium">{p.name}</p>
            <p>{formatCurrency(p.total_amount)}</p>
            <p>{p.order_count} order{p.order_count !== 1 ? 's' : ''}</p>
        </div>
    );
};

function RevenueChart({ rows }) {
    const data = rows.filter((r) => r.total_amount > 0);
    if (!data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                <UserCog className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No sales in this period</p>
            </div>
        );
    }
    return (
        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => '₹' + Number(v).toLocaleString('en-IN')} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip content={renderTooltip} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="total_amount" radius={[0, 6, 6, 0]} barSize={22}>
                    {data.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

export default function SalesPersons({ rows = [], stats = {}, period = 'this_month', dateRange }) {
    const url = useStorePath();

    const exportUrl = () => {
        const params = new URLSearchParams({ period });
        if (period === 'custom' && dateRange) {
            params.set('from', dateRange.from);
            params.set('to', dateRange.to);
        }
        return url(`/reports/export/salespersons?${params.toString()}`);
    };

    const totalRevenue = Number(stats.totalRevenue || 0);

    return (
        <VendorLayout title="Salesperson Report">
            <Head title="Salesperson Report" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <PeriodSelector period={period} dateRange={dateRange} />
                <a href={exportUrl()}>
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </a>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
                <StatCard title="Total Orders" value={Number(stats.totalOrders || 0).toLocaleString('en-IN')} icon={ShoppingCart} color="primary" />
                <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee} color="success" />
                <StatCard title="Active Salespeople" value={Number(stats.activeSalespeople || 0).toLocaleString('en-IN')} icon={Users} color="blue" />
                <StatCard title="Top Performer" value={stats.topPerformer || '—'} icon={Crown} color="warning" />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                {/* Chart */}
                <div className="xl:col-span-2">
                    <Card>
                        <CardHeader title="Revenue by Salesperson" subtitle="Within selected period" />
                        <RevenueChart rows={rows} />
                    </Card>
                </div>

                {/* Table */}
                <div className="xl:col-span-3">
                    <Card padding={false}>
                        <CardHeader title="Breakdown" subtitle={`${rows.length} ${rows.length === 1 ? 'person' : 'people'}`} className="px-6 pt-6 pb-0 mb-4" />
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Salesperson</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Order</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                                                No salespeople found.
                                            </td>
                                        </tr>
                                    ) : (
                                        rows.map((r, i) => {
                                            const share = totalRevenue > 0 ? (Number(r.total_amount) / totalRevenue) * 100 : 0;
                                            return (
                                                <tr key={r.sales_user_id ?? `row-${i}`} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900">{r.name}</span>
                                                            {r.is_owner && <Badge color="warning">Owner</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm text-gray-700">
                                                        {Number(r.order_count).toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                        {formatCurrency(r.total_amount)}
                                                    </td>
                                                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm text-gray-600">
                                                        {formatCurrency(r.avg_order_value)}
                                                    </td>
                                                    <td className="px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-1.5 w-24 rounded-full bg-gray-100 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full bg-brand-gradient"
                                                                    style={{ width: `${Math.min(100, share)}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-400 tabular-nums">{share.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </VendorLayout>
    );
}
