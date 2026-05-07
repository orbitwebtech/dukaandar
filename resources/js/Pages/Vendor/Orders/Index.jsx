import { Head, Link, router } from '@inertiajs/react';
import { ShoppingCart, Plus, Eye, Search } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import DataTable from '@/Components/DataTable';
import SearchableSelect from '@/Components/SearchableSelect';

const statusBadge = { confirmed: 'blue', delivered: 'success', cancelled: 'danger', draft: 'gray' };
const paymentBadge = { paid: 'success', pending: 'warning', partial: 'blue' };
const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];
const paymentOptions = [
    { value: '', label: 'All Payments' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
];

export default function Index({ orders, filters = {} }) {
    const url = useStorePath();
    const data = orders?.data || [];

    const handleFilter = (key, value) => {
        router.get(url('/orders'), { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    };

    const selectedStatus = statusOptions.find((o) => o.value === (filters.status || '')) || statusOptions[0];
    const selectedPayment = paymentOptions.find((o) => o.value === (filters.payment_status || '')) || paymentOptions[0];

    const columns = [
        {
            key: 'order_number',
            label: 'Order #',
            render: (row) => <span className="text-sm font-semibold text-primary-600">#{row.order_number}</span>,
        },
        {
            key: 'customer.name',
            label: 'Customer',
            render: (row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{row.customer?.name || '—'}</p>
                    {row.customer?.whatsapp && <p className="text-xs text-gray-400">{row.customer.whatsapp}</p>}
                </div>
            ),
        },
        {
            key: 'order_date',
            label: 'Date',
            hideOnMobile: true,
            render: (row) => <span className="text-sm text-gray-500">{formatDate(row.order_date)}</span>,
        },
        {
            key: 'total',
            label: 'Total',
            align: 'right',
            render: (row) => <span className="text-sm font-semibold text-gray-900">{formatCurrency(row.total)}</span>,
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge color={statusBadge[row.status] || 'gray'}>{capitalize(row.status)}</Badge>,
        },
        {
            key: 'payment_status',
            label: 'Payment',
            hideOnMobile: true,
            render: (row) => <Badge color={paymentBadge[row.payment_status] || 'gray'}>{capitalize(row.payment_status)}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            sortable: false,
            hideOnMobile: true,
            render: (row) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Link href={url(`/orders/${row.id}`)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition">
                        <Eye className="h-3.5 w-3.5" /> View
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <VendorLayout title="Orders">
            <Head title="Orders" />

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search order # or customer..."
                            defaultValue={filters.search || ''}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter('search', e.target.value)}
                            onBlur={(e) => handleFilter('search', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <SearchableSelect options={statusOptions} value={selectedStatus} onChange={(opt) => handleFilter('status', opt?.value)} isClearable={false} />
                    </div>
                    <div className="w-full sm:w-48">
                        <SearchableSelect options={paymentOptions} value={selectedPayment} onChange={(opt) => handleFilter('payment_status', opt?.value)} isClearable={false} />
                    </div>
                </div>
                <Button href={url('/orders/create')}>
                    <Plus className="h-4 w-4" /> New Order
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                pagination={orders}
                filterUrl={url('/orders')}
                filters={filters}
                onRowClick={(row) => router.visit(url(`/orders/${row.id}`))}
                emptyIcon={ShoppingCart}
                emptyTitle="No orders found"
                emptyDescription="Try adjusting your filters or create a new order."
            />
        </VendorLayout>
    );
}
