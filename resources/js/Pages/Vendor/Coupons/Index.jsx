import { Head, router } from '@inertiajs/react';
import { Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath } from '@/lib/storePath';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import DataTable from '@/Components/DataTable';

function ToggleSwitch({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${checked ? 'bg-primary-500' : 'bg-gray-200'}`}
        >
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
        </button>
    );
}

const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '—';

export default function Index({ coupons }) {
    const url = useStorePath();
    const data = coupons?.data || [];
    const meta = coupons?.meta || {};

    const handleToggle = (coupon) => router.post(url(`/coupons/${coupon.id}/toggle`), {}, { preserveScroll: true });
    const handleDelete = (e, coupon) => {
        e.stopPropagation();
        if (!window.confirm(`Delete coupon "${coupon.name}"?`)) return;
        router.delete(url(`/coupons/${coupon.id}`), { preserveScroll: true });
    };

    const columns = [
        {
            key: 'name',
            label: 'Name / Code',
            render: (row) => (
                <div>
                    <p className="text-sm font-medium text-gray-900">{row.name}</p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5 tracking-wider">{row.code}</p>
                </div>
            ),
        },
        {
            key: 'discount_value',
            label: 'Discount',
            render: (row) => (
                <Badge color={row.discount_type === 'flat' ? 'blue' : 'primary'}>
                    {row.discount_type === 'flat' ? `₹${Number(row.discount_value).toLocaleString('en-IN')} off` : `${row.discount_value}% off`}
                </Badge>
            ),
        },
        { key: 'min_order_value', label: 'Min Order', render: (row) => <span className="text-sm text-gray-700">{formatCurrency(row.min_order_value)}</span> },
        { key: 'valid_days', label: 'Valid Days', render: (row) => <span className="text-sm text-gray-700">{row.valid_days ? `${row.valid_days}d` : '—'}</span> },
        { key: 'auto_send_threshold', label: 'Auto-Send (≥)', render: (row) => <span className="text-sm text-gray-700">{formatCurrency(row.auto_send_threshold)}</span> },
        {
            key: 'active',
            label: 'Active',
            sortable: false,
            render: (row) => <ToggleSwitch checked={!!row.active} onChange={() => handleToggle(row)} />,
        },
        {
            key: 'times_issued',
            label: 'Issued / Redeemed',
            render: (row) => (
                <span className="text-sm">
                    <span className="font-medium text-gray-900">{row.times_issued ?? 0}</span>
                    <span className="text-gray-400 mx-1">/</span>
                    <span className="font-medium text-emerald-600">{row.times_redeemed ?? 0}</span>
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button href={url(`/coupons/${row.id}/edit`)} variant="ghost" size="xs"><Edit2 className="h-3.5 w-3.5" /> Edit</Button>
                    <Button variant="ghost" size="xs" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => handleDelete(e, row)}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <VendorLayout title="Coupons & Offers">
            <Head title="Coupons & Offers" />

            <div className="mb-5 flex items-center justify-between">
                <p className="text-sm text-gray-500">{meta?.total ?? data.length} coupon{(meta?.total ?? data.length) !== 1 ? 's' : ''}</p>
                <Button href={url('/coupons/create')} size="sm"><Plus className="h-4 w-4" /> Create Coupon</Button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                pagination={coupons}
                filterUrl={url('/coupons')}
                filters={{}}
                emptyIcon={Tag}
                emptyTitle="No coupons yet"
                emptyDescription="Create your first coupon to reward customers."
            />
        </VendorLayout>
    );
}
