import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Card, { CardHeader } from '@/Components/Card';
import { ShoppingCart } from 'lucide-react';

export default function Analytics({
    monthlySignups = [],
    featureUsage = {},
}) {
    const maxCount = Math.max(...monthlySignups.map((m) => m.count), 1);

    return (
        <AdminLayout title="Platform Analytics">
            <Head title="Platform Analytics" />

            {/* Feature Usage Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Orders This Month</p>
                            <p className="mt-1 text-3xl font-bold text-gray-900">
                                {Number(featureUsage.orders || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">Across all tenants</p>
                        </div>
                        <div className="rounded-xl p-3 bg-primary-50 text-primary-500">
                            <ShoppingCart className="h-6 w-6" />
                        </div>
                    </div>
                </div>

            </div>

            {/* Monthly Signups Bar Chart */}
            <Card>
                <CardHeader
                    title="Monthly Signups"
                    subtitle="New tenants registered per month"
                />

                {monthlySignups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <p className="text-sm">No signup data available yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[480px]">
                            {/* Y-axis labels + bars */}
                            <div className="flex items-end gap-2 h-48">
                                {monthlySignups.map((item, index) => {
                                    const heightPct = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                    return (
                                        <div
                                            key={index}
                                            className="flex flex-1 flex-col items-center gap-1 group"
                                        >
                                            {/* Count label on hover */}
                                            <span className="text-xs font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {item.count}
                                            </span>
                                            {/* Bar */}
                                            <div className="w-full rounded-t-md bg-primary-100 group-hover:bg-primary-400 transition-colors relative"
                                                style={{ height: `${Math.max(heightPct, 2)}%` }}
                                            >
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 rounded-t-md bg-primary-500 group-hover:bg-primary-600 transition-colors"
                                                    style={{ height: '100%' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Baseline */}
                            <div className="border-t border-gray-200 mt-0" />

                            {/* Month labels */}
                            <div className="flex gap-2 mt-2">
                                {monthlySignups.map((item, index) => (
                                    <div key={index} className="flex-1 text-center">
                                        <span className="text-xs text-gray-500 font-medium">
                                            {item.month}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </AdminLayout>
    );
}
