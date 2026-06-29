import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { Layers, Plus, Edit2, Trash2, Search } from 'lucide-react';
import VendorLayout from '@/Layouts/VendorLayout';
import { useStorePath, useCan } from '@/lib/storePath';
import Badge from '@/Components/Badge';
import Button from '@/Components/Button';
import DataTable from '@/Components/DataTable';
import Modal from '@/Components/Modal';
import Label from '@/Components/Label';
import TextInput from '@/Components/TextInput';

export default function Index({ categories, filters }) {
    const url = useStorePath();
    const can = useCan();
    const data = categories?.data || [];

    const [search, setSearch] = useState(filters?.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const { data: form, setData: setForm, post, put, processing, errors, reset, clearErrors } = useForm({ name: '' });

    const canCreate = can('categories.create');
    const canUpdate = can('categories.update');
    const canDelete = can('categories.delete');

    function applySearch(e) {
        e.preventDefault();
        router.get(url('/categories'), { search }, { preserveState: true, replace: true });
    }

    function openCreate() {
        setEditing(null);
        clearErrors();
        reset();
        setModalOpen(true);
    }

    function openEdit(category) {
        setEditing(category);
        clearErrors();
        setForm('name', category.name);
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditing(null);
        reset();
    }

    function handleSubmit(e) {
        e.preventDefault();
        const opts = { preserveScroll: true, onSuccess: () => closeModal() };
        if (editing) {
            put(url(`/categories/${editing.id}`), opts);
        } else {
            post(url('/categories'), opts);
        }
    }

    function handleDelete(e, category) {
        e.stopPropagation();
        const count = category.products_count ?? 0;
        const warning = count > 0
            ? `Delete category "${category.name}"? ${count} product${count !== 1 ? 's' : ''} will be left uncategorised.`
            : `Delete category "${category.name}"?`;
        if (!window.confirm(warning)) return;
        router.delete(url(`/categories/${category.id}`), { preserveScroll: true });
    }

    const columns = [
        {
            key: 'name',
            label: 'Name',
            render: (row) => <span className="text-sm font-medium text-gray-900">{row.name}</span>,
        },
        {
            key: 'products_count',
            label: 'Products',
            render: (row) => <Badge color={row.products_count ? 'primary' : 'gray'}>{row.products_count ?? 0}</Badge>,
        },
    ];

    if (canUpdate || canDelete) {
        columns.push({
            key: 'actions',
            label: 'Actions',
            align: 'right',
            sortable: false,
            render: (row) => (
                <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {canUpdate && (
                        <Button variant="ghost" size="xs" onClick={() => openEdit(row)}>
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                    )}
                    {canDelete && (
                        <Button variant="ghost" size="xs" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={(e) => handleDelete(e, row)}>
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                    )}
                </div>
            ),
        });
    }

    return (
        <VendorLayout title="Categories">
            <Head title="Categories" />

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <form onSubmit={applySearch} className="relative max-w-xs flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search categories..."
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                    />
                </form>
                {canCreate && (
                    <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" /> Add Category</Button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={data}
                pagination={categories}
                filterUrl={url('/categories')}
                filters={{ search }}
                emptyIcon={Layers}
                emptyTitle="No categories yet"
                emptyDescription={canCreate ? 'Add your first category to organise products.' : 'No categories have been created.'}
            />

            <Modal show={modalOpen} onClose={closeModal} title={editing ? 'Edit Category' : 'Add Category'} maxWidth="md">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <Label required>Category Name</Label>
                        <TextInput
                            value={form.name}
                            onChange={(e) => setForm('name', e.target.value)}
                            placeholder="e.g. Beverages"
                            error={errors.name}
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
                        <Button type="submit" loading={processing}>{editing ? 'Save Changes' : 'Add Category'}</Button>
                    </div>
                </form>
            </Modal>
        </VendorLayout>
    );
}
