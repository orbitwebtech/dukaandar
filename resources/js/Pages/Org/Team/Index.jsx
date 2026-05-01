import { useState } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import VendorLayout from '@/Layouts/VendorLayout';
import TextInput from '@/Components/TextInput';
import Label from '@/Components/Label';
import Button from '@/Components/Button';
import Badge from '@/Components/Badge';
import Modal from '@/Components/Modal';
import { Plus, Trash2, Mail, Crown, Edit } from 'lucide-react';

export default function TeamIndex({ owner, members, invitations, stores, permissionsCatalog, roleDefaults }) {
    const [inviteOpen, setInviteOpen] = useState(false);

    return (
        <VendorLayout title="Team">
            <Head title="Team" />

            <div className="flex justify-between items-center mb-6">
                <p className="text-sm text-gray-500">Manage members across all stores in your organization.</p>
                <Button onClick={() => setInviteOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Invite Member
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Owner</h3>
                </div>
                {owner && (
                    <div className="px-5 py-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Crown className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium text-gray-900">{owner.name}</p>
                            <p className="text-xs text-gray-500">{owner.email}</p>
                        </div>
                        <Badge color="success">Full Access</Badge>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm">Members ({members.length})</h3>
                </div>
                {members.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-gray-400">No team members yet. Invite one above.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {members.map(m => <MemberRow key={m.id} member={m} stores={stores} permissionsCatalog={permissionsCatalog} roleDefaults={roleDefaults} />)}
                    </div>
                )}
            </div>

            {invitations.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-900 text-sm">Pending Invitations</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {invitations.map(inv => (
                            <div key={inv.id} className="px-5 py-3 flex items-center gap-3">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                                    <p className="text-xs text-gray-500 capitalize">{inv.role} · {inv.stores.map(s => s.name).join(', ')}</p>
                                </div>
                                <button
                                    onClick={() => router.delete(`/org/team/invitations/${inv.id}`)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Revoke"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <InviteModal
                show={inviteOpen}
                onClose={() => setInviteOpen(false)}
                stores={stores}
                permissionsCatalog={permissionsCatalog}
                roleDefaults={roleDefaults}
            />
        </VendorLayout>
    );
}

function MemberRow({ member, stores, permissionsCatalog, roleDefaults }) {
    const [editing, setEditing] = useState(false);

    return (
        <div className="px-5 py-4">
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                    {member.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex flex-wrap gap-1 max-w-xs">
                    {member.stores.map(s => (
                        <Badge key={s.id} color="gray" className="text-xs">
                            {s.name}: <span className="capitalize">{s.role}</span>
                        </Badge>
                    ))}
                </div>
                <button onClick={() => setEditing(!editing)} className="text-gray-500 hover:text-gray-900" title="Edit">
                    <Edit className="h-4 w-4" />
                </button>
                <button
                    onClick={() => confirm(`Remove ${member.name}?`) && router.delete(`/org/team/members/${member.id}`)}
                    className="text-red-500 hover:text-red-700"
                    title="Remove"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
            {editing && <EditMemberPanel member={member} stores={stores} permissionsCatalog={permissionsCatalog} roleDefaults={roleDefaults} onClose={() => setEditing(false)} />}
        </div>
    );
}

function EditMemberPanel({ member, stores, permissionsCatalog, roleDefaults, onClose }) {
    const initial = stores.map(s => {
        const existing = member.stores.find(ms => ms.id === s.id);
        return {
            store_id: s.id,
            store_name: s.name,
            enabled: !!existing,
            role: existing?.role ?? 'employee',
            permissions: existing?.permissions ?? roleDefaults.employee,
        };
    });

    const [memberships, setMemberships] = useState(initial);

    const submit = () => {
        router.put(`/org/team/members/${member.id}`, {
            memberships: memberships.filter(m => m.enabled).map(m => ({
                store_id: m.store_id,
                role: m.role,
                permissions: m.permissions,
            })),
        }, { onSuccess: onClose });
    };

    return (
        <div className="mt-4 ml-13 p-4 bg-gray-50 rounded-lg space-y-3">
            {memberships.map((m, i) => (
                <div key={m.store_id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={m.enabled}
                                onChange={e => setMemberships(ms => ms.map((mm, idx) => idx === i ? { ...mm, enabled: e.target.checked } : mm))}
                            />
                            <span className="font-medium text-sm">{m.store_name}</span>
                        </label>
                        {m.enabled && (
                            <select
                                value={m.role}
                                onChange={e => setMemberships(ms => ms.map((mm, idx) => idx === i ? { ...mm, role: e.target.value, permissions: roleDefaults[e.target.value] } : mm))}
                                className="text-xs rounded border border-gray-200 px-2 py-1"
                            >
                                <option value="manager">Manager</option>
                                <option value="employee">Employee</option>
                            </select>
                        )}
                    </div>
                    {m.enabled && <PermissionsGrid catalog={permissionsCatalog} selected={m.permissions} onChange={(perms) => setMemberships(ms => ms.map((mm, idx) => idx === i ? { ...mm, permissions: perms } : mm))} />}
                </div>
            ))}
            <div className="flex gap-2">
                <Button onClick={submit} className="text-sm">Save</Button>
                <Button onClick={onClose} variant="outline" className="text-sm">Cancel</Button>
            </div>
        </div>
    );
}

function InviteModal({ show, onClose, stores, permissionsCatalog, roleDefaults }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        role: 'employee',
        store_ids: [],
        permissions: roleDefaults.employee,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/org/team/invite', {
            onSuccess: () => { reset(); onClose(); },
        });
    };

    const setRole = (role) => setData(d => ({ ...d, role, permissions: roleDefaults[role] }));

    return (
        <Modal show={show} onClose={onClose} title="Invite Team Member">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <Label required>Email</Label>
                    <TextInput type="email" value={data.email} onChange={e => setData('email', e.target.value)} error={errors.email} />
                </div>
                <div>
                    <Label required>Role</Label>
                    <div className="flex gap-2">
                        {['manager', 'employee'].map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                className={`flex-1 capitalize px-3 py-2 rounded-lg border text-sm font-medium ${data.role === r ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200'}`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <Label required>Stores</Label>
                    <div className="space-y-1">
                        {stores.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.store_ids.includes(s.id)}
                                    onChange={e => {
                                        const next = e.target.checked
                                            ? [...data.store_ids, s.id]
                                            : data.store_ids.filter(x => x !== s.id);
                                        setData('store_ids', next);
                                    }}
                                />
                                {s.name}
                            </label>
                        ))}
                    </div>
                    {errors.store_ids && <p className="mt-1 text-xs text-red-600">{errors.store_ids}</p>}
                </div>
                <div>
                    <Label>Permissions</Label>
                    <PermissionsGrid
                        catalog={permissionsCatalog}
                        selected={data.permissions}
                        onChange={(perms) => setData('permissions', perms)}
                    />
                </div>
                <div className="flex gap-2 pt-2">
                    <Button type="submit" loading={processing}>Send Invitation</Button>
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </form>
        </Modal>
    );
}

function PermissionsGrid({ catalog, selected, onChange }) {
    const toggle = (perm) => {
        const next = selected.includes(perm) ? selected.filter(p => p !== perm) : [...selected, perm];
        onChange(next);
    };

    return (
        <div className="grid grid-cols-2 gap-3 mt-1 max-h-64 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {Object.entries(catalog).map(([resource, perms]) => (
                <div key={resource}>
                    <p className="text-xs font-semibold text-gray-700 capitalize mb-1">{resource}</p>
                    <div className="space-y-0.5">
                        {perms.map(p => (
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
