import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Search, Plus, Download, Pencil, Trash2, Users, Printer } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import DataTable from '@/Components/DataTable';
import SearchableSelect from '@/Components/SearchableSelect';

const TYPE_BADGE = { new: 'gray', regular: 'blue', vip: 'warning' };
const TYPE_LABELS = { new: 'New', regular: 'Regular', vip: 'VIP' };
const TYPE_OPTIONS = [
    { value: 'new', label: 'New' },
    { value: 'regular', label: 'Regular' },
    { value: 'vip', label: 'VIP' },
];

const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function CustomersIndex({ customers, filters = {}, cities = [] }) {
    const url = useStorePath();
    const [search, setSearch] = useState(filters.search || '');

    const cityOptions = cities.map((c) => ({ value: c, label: c }));
    const selectedType = TYPE_OPTIONS.find((o) => o.value === filters.type) || null;
    const selectedCity = cityOptions.find((o) => o.value === filters.city) || null;

    const applyFilters = (overrides = {}) => {
        router.get(url('/customers'), { search, type: filters.type || '', city: filters.city || '', ...overrides }, { preserveState: true, replace: true });
    };

    const handleDelete = (e, customer) => {
        e.stopPropagation();
        if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
        router.delete(url(`/customers/${customer.id}`), { preserveState: true });
    };

    const columns = [
        {
            key: 'name',
            label: 'Name',
            render: (row) => (
                <Link href={url(`/customers/${row.id}`)} className="text-sm font-medium text-gray-900 hover:text-primary-600 transition">
                    {row.name}
                </Link>
            ),
        },
        { key: 'whatsapp', label: 'WhatsApp', render: (row) => <span className="text-sm text-gray-600">{row.whatsapp || '—'}</span> },
        { key: 'city', label: 'City', hideOnMobile: true, render: (row) => <span className="text-sm text-gray-600">{row.city || '—'}</span> },
        {
            key: 'type',
            label: 'Type',
            hideOnMobile: true,
            render: (row) => <Badge color={TYPE_BADGE[row.type] || 'gray'}>{TYPE_LABELS[row.type] || row.type || '—'}</Badge>,
        },
        { key: 'total_orders', label: 'Orders', align: 'right', hideOnMobile: true, render: (row) => <span className="text-sm text-gray-700">{row.total_orders ?? 0}</span> },
        { key: 'total_spent', label: 'Total Spent', align: 'right', render: (row) => <span className="text-sm font-medium text-gray-900">{formatCurrency(row.total_spent)}</span> },
        { key: 'last_order_date', label: 'Last Order', hideOnMobile: true, render: (row) => <span className="text-sm text-gray-500">{formatDate(row.last_order_date)}</span> },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            sortable: false,
            hideOnMobile: true,
            render: (row) => (
                <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <a
                        href={url(`/customers/${row.id}/label`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                        title="Print delivery label"
                    >
                        <Printer className="h-4 w-4" />
                    </a>
                    <Link href={url(`/customers/${row.id}/edit`)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition" title="Edit">
                        <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={(e) => handleDelete(e, row)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <VendorLayout title="Customers">
            <Head title="Customers" />

            {/* Filter bar */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                            onBlur={() => applyFilters({ search })}
                            placeholder="Search name, number, city…"
                            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                        />
                    </div>
                    <div className="w-40">
                        <SearchableSelect options={TYPE_OPTIONS} value={selectedType} onChange={(opt) => applyFilters({ type: opt ? opt.value : '' })} placeholder="Type" isClearable />
                    </div>
                    <div className="w-44">
                        <SearchableSelect options={cityOptions} value={selectedCity} onChange={(opt) => applyFilters({ city: opt ? opt.value : '' })} placeholder="City" isClearable />
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <a href={url('/customers-export')} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                        <Download className="h-4 w-4" /> Export CSV
                    </a>
                    <Button href={url('/customers/create')} variant="primary">
                        <Plus className="h-4 w-4" /> Add Customer
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={customers?.data || []}
                pagination={customers}
                filterUrl={url('/customers')}
                filters={filters}
                onRowClick={(row) => router.visit(url(`/customers/${row.id}`))}
                emptyIcon={Users}
                emptyTitle="No customers yet"
                emptyDescription="Add your first customer to get started."
            />
        </VendorLayout>
    );
}
