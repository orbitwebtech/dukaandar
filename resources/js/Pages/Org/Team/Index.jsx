import { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import DataTable from '@/Components/DataTable';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import { Plus, Trash2, Crown, Pencil, Users } from 'lucide-react';

const ROLES = ['manager', 'employee', 'sales'];

const ROLE_BADGE = { manager: 'blue', employee: 'gray', sales: 'primary', owner: 'warning' };

export default function TeamIndex({ owner, members, stores, permissionsCatalog, roleDefaults }) {
    const [addOpen, setAddOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);

    const columns = [
        {
            key: 'name',
            label: 'Member',
            render: (m) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand-gradient shadow-brand text-white flex items-center justify-center font-semibold text-sm shrink-0">
                        {m.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{m.name}</p>
                        <p className="text-xs text-gray-500 truncate">{m.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'stores',
            label: 'Stores & Roles',
            sortable: false,
            render: (m) => (
                <div className="flex flex-wrap gap-1 max-w-md">
                    {m.stores.length ? (
                        m.stores.map((s) => (
                            <Badge key={s.id} color={ROLE_BADGE[s.role] || 'gray'}>
                                {s.name}: <span className="capitalize">{s.role}</span>
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400">No stores assigned</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            label: '',
            sortable: false,
            align: 'right',
            render: (m) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={() => setEditingMember(m)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition"
                        title="Edit"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => confirm(`Remove ${m.name}?`) && router.delete(`/org/team/members/${m.id}`)}
                        className="rounded-lg p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                        title="Remove"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <VendorLayout title="Team">
            <Head title="Team" />

            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-500">Manage members across all stores in your organization.</p>
                <Button onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" /> Add Member
                </Button>
            </div>

            {/* Owner */}
            {owner && (
                <div className="bg-white rounded-2xl border border-gray-200/70 shadow-card overflow-hidden mb-6">
                    <div className="px-5 py-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Crown className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">
                                {owner.name} <span className="text-xs font-normal text-gray-400">· Owner</span>
                            </p>
                            <p className="text-xs text-gray-500 truncate">{owner.email}</p>
                        </div>
                        <Badge color="warning">Full Access</Badge>
                    </div>
                </div>
            )}

            {/* Members */}
            <DataTable
                columns={columns}
                data={members}
                searchable
                searchPlaceholder="Search members by name or email…"
                emptyIcon={Users}
                emptyTitle="No team members yet"
                emptyDescription="Add your first member to get started."
            />

            <AddMemberModal
                show={addOpen}
                onClose={() => setAddOpen(false)}
                stores={stores}
                permissionsCatalog={permissionsCatalog}
                roleDefaults={roleDefaults}
            />

            {editingMember && (
                <EditMemberModal
                    member={editingMember}
                    stores={stores}
                    permissionsCatalog={permissionsCatalog}
                    roleDefaults={roleDefaults}
                    onClose={() => setEditingMember(null)}
                />
            )}
        </VendorLayout>
    );
}

function RolePicker({ value, onChange }) {
    return (
        <div className="flex gap-2">
            {ROLES.map((r) => (
                <button
                    key={r}
                    type="button"
                    onClick={() => onChange(r)}
                    className={`flex-1 capitalize px-3 py-2 rounded-lg border text-sm font-medium transition ${
                        value === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    {r}
                </button>
            ))}
        </div>
    );
}

function StoreCheckboxes({ selected, onToggle, stores, error }) {
    return (
        <div>
            <div className="space-y-1">
                {stores.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={selected.includes(s.id)}
                            onChange={(e) => onToggle(s.id, e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        {s.name}
                    </label>
                ))}
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}

function AddMemberModal({ show, onClose, stores, permissionsCatalog, roleDefaults }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'employee',
        store_ids: [],
        permissions: roleDefaults.employee,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/org/team/members', {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    const setRole = (role) => setData((d) => ({ ...d, role, permissions: roleDefaults[role] }));

    const toggleStore = (id, checked) => {
        setData('store_ids', checked ? [...data.store_ids, id] : data.store_ids.filter((x) => x !== id));
    };

    return (
        <Modal show={show} onClose={onClose} title="Add Team Member" maxWidth="2xl">
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label required>Name</Label>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} autoFocus />
                    </div>
                    <div>
                        <Label required>Email (login ID)</Label>
                        <TextInput type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <Label required>Password</Label>
                        <TextInput type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} />
                    </div>
                    <div>
                        <Label required>Confirm Password</Label>
                        <TextInput type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} />
                    </div>
                </div>
                <p className="-mt-2 text-xs text-gray-400">Share these credentials with the member — they can sign in right away and change their password later.</p>

                <div>
                    <Label required>Role</Label>
                    <RolePicker value={data.role} onChange={setRole} />
                </div>

                <div>
                    <Label required>Stores</Label>
                    <StoreCheckboxes selected={data.store_ids} onToggle={toggleStore} stores={stores} error={errors.store_ids} />
                </div>

                <div>
                    <Label>Permissions</Label>
                    <PermissionsGrid catalog={permissionsCatalog} selected={data.permissions} onChange={(perms) => setData('permissions', perms)} />
                </div>

                <div className="flex gap-2 pt-2">
                    <Button type="submit" loading={processing}>Add Member</Button>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </form>
        </Modal>
    );
}

function EditMemberModal({ member, stores, permissionsCatalog, roleDefaults, onClose }) {
    const initial = stores.map((s) => {
        const existing = member.stores.find((ms) => ms.id === s.id);
        const role = existing?.role ?? 'employee';
        return {
            store_id: s.id,
            store_name: s.name,
            enabled: !!existing,
            role,
            permissions: existing?.permissions ?? roleDefaults[role] ?? roleDefaults.employee,
        };
    });

    const [memberships, setMemberships] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const patch = (i, changes) =>
        setMemberships((ms) => ms.map((mm, idx) => (idx === i ? { ...mm, ...changes } : mm)));

    const enabledCount = memberships.filter((m) => m.enabled).length;

    const submit = () => {
        setSaving(true);
        setError('');
        router.put(`/org/team/members/${member.id}`, {
            memberships: memberships.filter((m) => m.enabled).map((m) => ({
                store_id: m.store_id,
                role: m.role,
                permissions: m.permissions,
            })),
        }, {
            onSuccess: onClose,
            onError: (errs) => setError(Object.values(errs)[0] || 'Could not save changes. Please check the fields and try again.'),
            onFinish: () => setSaving(false),
        });
    };

    return (
        <Modal show onClose={onClose} title={`Edit ${member.name}`} maxWidth="2xl">
            <div className="space-y-3">
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                        {error}
                    </div>
                )}
                {enabledCount === 0 && (
                    <p className="text-xs text-amber-600">Enable at least one store to keep this member.</p>
                )}
                {memberships.map((m, i) => (
                    <div key={m.store_id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={m.enabled}
                                    onChange={(e) => patch(i, { enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                                />
                                <span className="font-medium text-sm">{m.store_name}</span>
                            </label>
                            {m.enabled && (
                                <select
                                    value={m.role}
                                    onChange={(e) => patch(i, { role: e.target.value, permissions: roleDefaults[e.target.value] })}
                                    className="text-xs rounded-lg border border-gray-200 px-2 py-1 capitalize"
                                >
                                    {ROLES.map((r) => (
                                        <option key={r} value={r} className="capitalize">{r}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        {m.enabled && (
                            <PermissionsGrid
                                catalog={permissionsCatalog}
                                selected={m.permissions}
                                onChange={(perms) => patch(i, { permissions: perms })}
                            />
                        )}
                    </div>
                ))}
                <div className="flex gap-2 pt-2">
                    <Button onClick={submit} loading={saving} disabled={saving || enabledCount === 0}>Save Changes</Button>
                    <Button onClick={onClose} variant="outline">Cancel</Button>
                </div>
            </div>
        </Modal>
    );
}

function PermissionsGrid({ catalog, selected, onChange }) {
    const toggle = (perm) => {
        const next = selected.includes(perm) ? selected.filter((p) => p !== perm) : [...selected, perm];
        onChange(next);
    };

    return (
        <div className="grid grid-cols-2 gap-3 mt-1 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {Object.entries(catalog).map(([resource, perms]) => (
                <div key={resource}>
                    <p className="text-xs font-semibold text-gray-700 capitalize mb-1">{resource}</p>
                    <div className="space-y-0.5">
                        {perms.map((p) => (
                            <label key={p} className="flex items-center gap-1.5 text-xs">
                                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)} />
                                <span className="text-gray-600">{p.split('.')[1]}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
