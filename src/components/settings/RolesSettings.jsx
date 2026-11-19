import React, { useState } from 'react';
import { FaUserShield, FaPlus, FaTrash, FaGlobe } from 'react-icons/fa';
import { roleService, projectService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Loader, EmptyState, Switch } from '../UI';
import { SettingsSection, InlineText, MoveToModal } from './shared';
import { useAsyncData } from './hooks';
import { PERMISSION_GROUPS, PUBLIC_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from './permissionGroups';

const PermissionMatrix = ({ role, canEdit, onToggle }) => (
    <div className="perm-groups">
        {PERMISSION_GROUPS.map((g) => {
            const keys = g.perms.map(([k]) => k);
            const on = keys.filter((k) => role.permissions.includes(k)).length;
            return (
                <div key={g.id} className="perm-group">
                    <div className="perm-group-head">
                        <span className="perm-group-title">{g.label}</span>
                        <span className="row gap-2">
                            <span className="perm-group-count">{on}/{keys.length}</span>
                            <Switch
                                checked={on === keys.length}
                                disabled={!canEdit}
                                onChange={(v) => onToggle(keys, v, `${g.label}: all ${v ? 'granted' : 'revoked'}`)}
                                label={<span className="sr-only">All {g.label} permissions</span>}
                            />
                        </span>
                    </div>
                    <div className="perm-list">
                        {g.perms.map(([key, label]) => (
                            <Switch
                                key={key}
                                checked={role.permissions.includes(key)}
                                disabled={!canEdit}
                                label={label}
                                onChange={(v) => onToggle([key], v, `${g.label} › ${label} ${v ? 'granted' : 'revoked'}`)}
                            />
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
);

const PublicPermissions = ({ project, canEdit, onChanged, patchLocal }) => {
    const toast = useToast();
    const toggle = async (field, key, value) => {
        const current = project[field] || [];
        const next = value ? [...new Set([...current, key])] : current.filter((p) => p !== key);
        patchLocal?.({ [field]: next });
        try {
            await projectService.update(project.id, { [field]: next });
            toast.success(`${field === 'anon_permissions' ? 'Anonymous' : 'Registered non-member'} access updated`);
            onChanged?.();
        } catch (err) {
            patchLocal?.({ [field]: current });
            toast.error(err);
        }
    };
    return (
        <div className="table-wrap flush-table">
            <table className="data-table">
                <thead>
                    <tr><th>Permission</th><th className="text-center">Registered users</th><th className="text-center">Anonymous visitors</th></tr>
                </thead>
                <tbody>
                    {PUBLIC_PERMISSIONS.map(([key, label]) => (
                        <tr key={key}>
                            <td>{label}</td>
                            <td className="text-center">
                                <Switch checked={(project.public_permissions || []).includes(key)} disabled={!canEdit} onChange={(v) => toggle('public_permissions', key, v)} label={<span className="sr-only">{label} for registered users</span>} />
                            </td>
                            <td className="text-center">
                                <Switch checked={(project.anon_permissions || []).includes(key)} disabled={!canEdit} onChange={(v) => toggle('anon_permissions', key, v)} label={<span className="sr-only">{label} for anonymous visitors</span>} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const RolesSettings = ({ project, canEdit, onChanged, patchLocal }) => {
    const toast = useToast();
    const { data, loading, error, reload, setData } = useAsyncData(
        () => roleService.list({ project: project.id }).then((r) => [...r.data].sort((a, b) => a.order - b.order)),
        [project.id],
    );
    const roles = data || [];
    const [activeId, setActiveId] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const role = roles.find((r) => r.id === activeId) || roles[0];
    const memberCount = (id) => (project.members || []).filter((m) => m.role === id).length;

    const update = async (r, fields, msg) => {
        const prev = roles;
        setData((list) => list.map((x) => (x.id === r.id ? { ...x, ...fields } : x)));
        try {
            await roleService.update(r.id, fields);
            toast.success(msg);
            onChanged?.();
            return true;
        } catch (err) {
            setData(prev);
            toast.error(err);
            return false;
        }
    };

    const togglePerms = (keys, value, msg) => {
        const next = value ? [...new Set([...role.permissions, ...keys])] : role.permissions.filter((p) => !keys.includes(p));
        update(role, { permissions: next }, msg);
    };

    const create = async (e) => {
        e.preventDefault();
        const name = newRole.trim();
        if (!name) return;
        setCreating(true);
        try {
            const res = await roleService.create({ project: project.id, name, permissions: DEFAULT_ROLE_PERMISSIONS, computable: true, order: (roles[roles.length - 1]?.order ?? 0) + 10 });
            toast.success(`Role “${name}” created`);
            setNewRole('');
            setActiveId(res.data?.id ?? null);
            reload();
            onChanged?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setCreating(false);
        }
    };

    const confirmDelete = async (moveTo) => {
        try {
            await roleService.deleteMoveTo(deleting.id, moveTo);
            toast.success(`Role “${deleting.name}” deleted`);
            setDeleting(null);
            setActiveId(null);
            reload();
            onChanged?.();
        } catch (err) {
            toast.error(err);
        }
    };

    return (
        <>
            <SettingsSection icon={<FaUserShield />} title="Roles & permissions" description="Each member has one role; a role decides what its members can see and change.">
                {loading ? <Loader label="Loading roles…" /> : error ? (
                    <div className="alert alert-error">Could not load roles.</div>
                ) : roles.length === 0 ? (
                    <EmptyState icon={<FaUserShield />} title="No roles" description="Create the first role below." />
                ) : (
                    <div className="roles-layout">
                        <div>
                            <div className="role-list" role="tablist" aria-label="Roles">
                                {roles.map((r) => (
                                    <button key={r.id} role="tab" aria-selected={role?.id === r.id} className={`role-item ${role?.id === r.id ? 'active' : ''}`} onClick={() => setActiveId(r.id)}>
                                        <span className="truncate">{r.name}</span>
                                        <span className="badge">{memberCount(r.id)}</span>
                                    </button>
                                ))}
                            </div>
                            {canEdit && (
                                <form className="stack-sm mt-3" onSubmit={create}>
                                    <input className="form-input form-input-sm" placeholder="New role name" value={newRole} onChange={(e) => setNewRole(e.target.value)} aria-label="New role name" />
                                    <button className="btn btn-secondary btn-sm" type="submit" disabled={creating || !newRole.trim()}>
                                        {creating ? <span className="spinner spinner-sm" /> : <><FaPlus /> Add role</>}
                                    </button>
                                </form>
                            )}
                        </div>
                        {role && (
                            <div className="stack" style={{ minWidth: 0 }}>
                                <div className="row flex-wrap gap-3">
                                    <div className="flex-1" style={{ minWidth: 200 }}>
                                        <InlineText key={role.id + role.name} value={role.name} ariaLabel="Role name" disabled={!canEdit} className="text-lg" onSave={(v) => update(role, { name: v }, 'Role renamed')} />
                                        <div className="text-xs text-muted" style={{ paddingLeft: '0.8rem' }}>
                                            {memberCount(role.id)} member{memberCount(role.id) === 1 ? '' : 's'} · {role.permissions.length} permissions
                                        </div>
                                    </div>
                                    <Switch
                                        checked={role.computable}
                                        disabled={!canEdit}
                                        label="Estimates points"
                                        onChange={(v) => update(role, { computable: v }, v ? 'Role now estimates story points' : 'Role no longer estimates points')}
                                    />
                                    {canEdit && (
                                        <button className="btn btn-danger-ghost btn-sm" onClick={() => setDeleting(role)} disabled={roles.length < 2}>
                                            <FaTrash /> Delete role
                                        </button>
                                    )}
                                </div>
                                <PermissionMatrix role={role} canEdit={canEdit} onToggle={togglePerms} />
                            </div>
                        )}
                    </div>
                )}
            </SettingsSection>

            {!project.is_private && (
                <SettingsSection icon={<FaGlobe />} title="Public access" description="What people who are not members can see in this public project." flush>
                    <PublicPermissions project={project} canEdit={canEdit} onChanged={onChanged} patchLocal={patchLocal} />
                </SettingsSection>
            )}

            <MoveToModal
                key={deleting?.id ?? 'none'}
                item={deleting}
                noun="members"
                options={roles.filter((r) => r.id !== deleting?.id)}
                onConfirm={confirmDelete}
                onClose={() => setDeleting(null)}
            />
        </>
    );
};

export default RolesSettings;
