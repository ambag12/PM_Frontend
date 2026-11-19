import React, { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaUserPlus, FaUserShield, FaEnvelopeOpenText, FaIdBadge, FaSearch, FaThLarge, FaList, FaTrash, FaPaperPlane } from 'react-icons/fa';
import { membershipService, projectService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { AuthContext } from '../context/AuthContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { PageHeader, StatCard, Loader, EmptyState, Switch, UserAvatar } from '../components/UI';
import { useAsyncData } from '../components/settings/hooks';
import MemberCard from '../components/settings/MemberCard';
import InviteMembersModal from '../components/settings/InviteMembersModal';
import { formatDate } from '../utils/format';
import '../styles/settings.css';

const displayName = (m) => m.full_name || m.user_email || m.email || 'Invited user';

const Members = () => {
    const { project, loading: projectLoading, reload: reloadProject } = useProject();
    const { isAdmin, isOwner } = usePermissions();
    const { user } = useContext(AuthContext);
    const toast = useToast();
    const confirm = useConfirm();
    const projectId = project?.id;

    const membersQ = useAsyncData(
        () => (projectId ? membershipService.list({ project: projectId }).then((r) => r.data) : Promise.resolve([])),
        [projectId],
    );
    const statsQ = useAsyncData(
        () => (projectId ? projectService.getMemberStats(projectId).then((r) => r.data) : Promise.resolve(null)),
        [projectId],
    );

    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [view, setView] = useState('grid');
    const [inviting, setInviting] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const canManage = !!(isAdmin || isOwner);
    const roles = project?.roles || [];
    const members = useMemo(() => membersQ.data || [], [membersQ.data]);

    const statsFor = (userId) => {
        const s = statsQ.data;
        if (!s || !userId) return null;
        return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v?.[userId] ?? 0]));
    };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return members
            .filter((m) => !roleFilter || String(m.role) === roleFilter)
            .filter((m) => !q || [m.full_name, m.user_email, m.email, m.role_name].some((x) => x?.toLowerCase().includes(q)))
            .sort((a, b) => Number(!a.user) - Number(!b.user) || Number(b.is_owner) - Number(a.is_owner) || Number(b.is_admin) - Number(a.is_admin) || displayName(a).localeCompare(displayName(b)));
    }, [members, query, roleFilter]);

    const counts = {
        active: members.filter((m) => m.user).length,
        admins: members.filter((m) => m.is_admin).length,
        pending: members.filter((m) => !m.user).length,
    };

    const refresh = () => {
        membersQ.reload();
        reloadProject();
    };

    const patchMember = async (m, fields, msg) => {
        setBusyId(m.id);
        const prev = members;
        membersQ.setData((list) => list.map((x) => (x.id === m.id ? { ...x, ...fields } : x)));
        try {
            await membershipService.update(m.id, fields);
            toast.success(msg);
            refresh();
        } catch (err) {
            membersQ.setData(prev);
            toast.error(err);
        } finally {
            setBusyId(null);
        }
    };

    const changeRole = (m, roleId) => {
        const role = roles.find((r) => r.id === roleId);
        patchMember(m, { role: roleId, role_name: role?.name }, `${displayName(m)} is now ${role?.name || 'updated'}`);
    };

    const toggleAdmin = (m, value) => patchMember(m, { is_admin: value }, `${displayName(m)} ${value ? 'is now an admin' : 'is no longer an admin'}`);

    const remove = async (m) => {
        const pending = !m.user;
        const ok = await confirm({
            title: pending ? 'Revoke invitation?' : `Remove ${displayName(m)}?`,
            message: pending ? `The invitation sent to ${m.email || m.user_email} will stop working.` : 'They lose access to this project. Items they created or were assigned stay in place.',
            confirmText: pending ? 'Revoke' : 'Remove member',
            danger: true,
        });
        if (!ok) return;
        setBusyId(m.id);
        try {
            await membershipService.delete(m.id);
            toast.success(pending ? 'Invitation revoked' : `${displayName(m)} removed from the project`);
            refresh();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusyId(null);
        }
    };

    const resend = async (m) => {
        setBusyId(m.id);
        try {
            await membershipService.resendInvitation(m.id);
            toast.success(`Invitation re-sent to ${m.email || m.user_email}`);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusyId(null);
        }
    };

    if (projectLoading && !project) return <Loader label="Loading team…" />;
    if (!project) return <EmptyState icon={<FaUsers />} title="Project unavailable" description="This project could not be loaded." action={<Link className="btn btn-primary" to="/">Back to dashboard</Link>} />;

    const cardProps = (m) => ({
        m,
        roles,
        stats: statsFor(m.user),
        canManage,
        isMe: m.user === user?.id,
        busy: busyId === m.id,
        onRole: changeRole,
        onAdmin: toggleAdmin,
        onRemove: remove,
        onResend: resend,
    });

    return (
        <div>
            <PageHeader
                icon={<FaUsers />}
                eyebrow={project.name}
                title="Team"
                subtitle="Everyone working on this project, their role and what they’ve been up to."
                actions={(
                    <>
                        {canManage && <Link className="btn btn-secondary" to={`/project/${project.id}/settings?section=roles`}><FaUserShield /> Roles</Link>}
                        {canManage && <button className="btn btn-primary" onClick={() => setInviting(true)}><FaUserPlus /> Invite people</button>}
                    </>
                )}
            />

            <div className="stats-grid">
                <StatCard icon={<FaUsers />} label="Active members" value={counts.active} tone="primary" />
                <StatCard icon={<FaUserShield />} label="Admins" value={counts.admins} tone="accent" />
                <StatCard icon={<FaEnvelopeOpenText />} label="Pending invitations" value={counts.pending} tone={counts.pending ? 'warning' : 'neutral'} />
                <StatCard icon={<FaIdBadge />} label="Roles" value={roles.length} tone="info" />
            </div>

            {!canManage && (
                <div className="alert mb-4">Only project administrators can invite people or change roles.</div>
            )}

            <div className="toolbar">
                <div className="form-input-icon" style={{ flex: '1 1 220px', maxWidth: 340 }}>
                    <FaSearch />
                    <input className="form-input" placeholder="Search by name, email or role" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
                </div>
                <select className="form-input" style={{ width: 'auto', minWidth: 160 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
                    <option value="">All roles</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="segmented ml-auto" role="group" aria-label="View">
                    <button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'}><FaThLarge /> Cards</button>
                    <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}><FaList /> Table</button>
                </div>
            </div>

            {membersQ.loading ? <Loader label="Loading members…" /> : membersQ.error ? (
                <div className="alert alert-error">Could not load the member list.</div>
            ) : filtered.length === 0 ? (
                <div className="card"><EmptyState icon={<FaUsers />} title={members.length ? 'No members match' : 'No members yet'} description={members.length ? 'Try a different search or role filter.' : 'Invite people to start collaborating.'} /></div>
            ) : view === 'grid' ? (
                <div className="member-grid">
                    {filtered.map((m) => <MemberCard key={m.id} {...cardProps(m)} />)}
                </div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr><th>Member</th><th>Role</th><th>Admin</th><th>Status</th><th className="text-right">Closed tasks</th><th className="text-right">Issues closed</th><th className="text-right">Issues filed</th>{canManage && <th />}</tr>
                        </thead>
                        <tbody>
                            {filtered.map((m) => {
                                const s = statsFor(m.user) || {};
                                const pending = !m.user;
                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <div className="row">
                                                <UserAvatar user={{ full_name_display: displayName(m), photo: m.photo }} size="sm" />
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="cell-title truncate">{displayName(m)}</div>
                                                    <div className="text-xs text-muted truncate">{m.user_email || m.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {canManage ? (
                                                <select className="form-input form-input-sm" value={m.role} onChange={(e) => changeRole(m, Number(e.target.value))} disabled={busyId === m.id} aria-label={`Role for ${displayName(m)}`}>
                                                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            ) : m.role_name}
                                        </td>
                                        <td><Switch checked={m.is_admin} disabled={!canManage || m.is_owner || busyId === m.id} onChange={(v) => toggleAdmin(m, v)} label={<span className="sr-only">Admin</span>} /></td>
                                        <td>{pending ? <span className="badge badge-warning">Pending · {formatDate(m.created_at)}</span> : m.is_owner ? <span className="badge badge-accent">Owner</span> : <span className="badge badge-success">Active</span>}</td>
                                        <td className="text-right tabular">{pending ? '—' : s.closed_tasks ?? 0}</td>
                                        <td className="text-right tabular">{pending ? '—' : s.closed_bugs ?? 0}</td>
                                        <td className="text-right tabular">{pending ? '—' : s.created_bugs ?? 0}</td>
                                        {canManage && (
                                            <td className="cell-actions">
                                                {pending && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => resend(m)} aria-label="Resend invitation" title="Resend invitation"><FaPaperPlane /></button>}
                                                <button className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(m)} disabled={m.is_owner} aria-label={`Remove ${displayName(m)}`} title="Remove"><FaTrash /></button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {inviting && <InviteMembersModal project={project} roles={roles} onClose={() => setInviting(false)} onInvited={refresh} />}
        </div>
    );
};

export default Members;
