import { Head, Link } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Card, { CardHeader, StatCard } from '@/Components/Card';
import Badge from '@/Components/Badge';
import {
    IndianRupee,
    ShoppingCart,
    Users,
    Clock,
    TrendingUp,
    Package,
} from 'lucide-react';

const formatCurrency = (amount) =>
    '₹' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const statusBadgeColor = {
    confirmed: 'blue',
    delivered: 'success',
    cancelled: 'danger',
    draft: 'gray',
};

const paymentBadgeColor = {
    paid: 'success',
    pending: 'warning',
    partial: 'blue',
};

const customerTypeBadgeColor = {
    wholesale: 'blue',
    retail: 'gray',
    vip: 'warning',
};

export default function Dashboard({ stats = {}, recentOrders = [], lowStockProducts = [], topCustomers = [] }) {
    const url = useStorePath();
    return (
        <VendorLayout title="Dashboard">
            <Head title="Dashboard" />

            {/* Stats Grid */}
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
                    title="Total Customers"
                    value={Number(stats.totalCustomers || 0).toLocaleString('en-IN')}
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Pending Payments"
                    value={formatCurrency(stats.pendingPayments)}
                    icon={Clock}
                    color="warning"
                />
                <StatCard
                    title="Avg Order Value"
                    value={formatCurrency(stats.avgOrderValue)}
                    icon={TrendingUp}
                    color="primary"
                />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

                {/* Recent Orders — takes 2 columns on xl */}
                <div className="xl:col-span-2">
                    <Card padding={false}>
                        <div className="p-6 pb-0">
                            <CardHeader
                                title="Recent Orders"
                                subtitle="Latest orders across all customers"
                                className="mb-0"
                                action={
                                    <Link
                                        href={url('/orders')}
                                        className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                    >
                                        View all
                                    </Link>
                                }
                            />
                        </div>

                        {recentOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                                <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                                <p className="text-sm">No orders yet</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto mt-4">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="bg-gray-50/60">
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Order #
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Payment
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {recentOrders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => (window.location.href = url(`/orders/${order.id}`))}
                                            >
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Link
                                                        href={url(`/orders/${order.id}`)}
                                                        className="text-sm font-semibold text-primary-600 hover:text-primary-700"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        #{order.order_number}
                                                    </Link>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {order.order_date
                                                            ? new Date(order.order_date).toLocaleDateString('en-IN', {
                                                                  day: 'numeric',
                                                                  month: 'short',
                                                              })
                                                            : '—'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {order.customer?.name || '—'}
                                                    </p>
                                                    {order.customer?.whatsapp && (
                                                        <p className="text-xs text-gray-400">
                                                            {order.customer.whatsapp}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                                    <span className="text-sm font-semibold text-gray-900">
                                                        {formatCurrency(order.total)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Badge
                                                        color={statusBadgeColor[order.status] || 'gray'}
                                                    >
                                                        {order.status
                                                            ? order.status.charAt(0).toUpperCase() + order.status.slice(1)
                                                            : '—'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-3.5 whitespace-nowrap">
                                                    <Badge
                                                        color={paymentBadgeColor[order.payment_status] || 'gray'}
                                                    >
                                                        {order.payment_status
                                                            ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)
                                                            : '—'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right column */}
                <div className="flex flex-col gap-6">

                    {/* Low Stock Alerts */}
                    <Card>
                        <CardHeader
                            title="Low Stock Alerts"
                            subtitle="Products running low"
                            action={
                                <Link
                                    href={url('/products')}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                >
                                    View all
                                </Link>
                            }
                        />

                        {lowStockProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Package className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">All stock levels are healthy</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {lowStockProducts.map((product) => (
                                    <li
                                        key={product.id}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                                                <Package className="h-4 w-4 text-red-400" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-800 truncate">
                                                {product.name}
                                            </span>
                                        </div>
                                        <span className="flex-shrink-0 inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200">
                                            {product.stock_qty} left
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Top Customers */}
                    <Card>
                        <CardHeader
                            title="Top Customers"
                            subtitle="By total spend"
                            action={
                                <Link
                                    href={url('/customers')}
                                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                >
                                    View all
                                </Link>
                            }
                        />

                        {topCustomers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Users className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">No customer data yet</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {topCustomers.map((customer, index) => (
                                    <li key={customer.id}>
                                        <Link
                                            href={url(`/customers/${customer.id}`)}
                                            className="flex items-center gap-3 group"
                                        >
                                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary-50 flex items-center justify-center text-sm font-bold text-primary-600">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                                                        {customer.name}
                                                    </span>
                                                    {customer.type && (
                                                        <Badge color={customerTypeBadgeColor[customer.type] || 'gray'}>
                                                            {customer.type.charAt(0).toUpperCase() + customer.type.slice(1)}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">
                                                    {customer.total_orders} order{customer.total_orders !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <span className="flex-shrink-0 text-sm font-semibold text-gray-700">
                                                {formatCurrency(customer.total_spent)}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </VendorLayout>
    );
}
