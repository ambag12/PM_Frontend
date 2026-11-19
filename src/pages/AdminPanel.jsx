import React, { useContext, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaUserCog, FaUsers, FaFolderOpen, FaFileAlt, FaSearch, FaCoins, FaExclamationCircle, FaFileContract, FaUserTie, FaCog, FaLock } from 'react-icons/fa';
import { userService, projectService } from '../api/services';
import { AuthContext } from '../context/AuthContext';
import { PageHeader, StatCard, Tabs, Loader, EmptyState, UserAvatar } from '../components/UI';
import { useAsyncData } from '../components/settings/hooks';
import AdminTemplates from '../components/settings/AdminTemplates';
import { formatCompact, formatDate, daysUntil, initials, formatNumber } from '../utils/format';
import '../styles/settings.css';

// list_project_for_user returns the light serializer (no due date / budget) → fetch details per project.
const loadProjects = async () => {
    const light = (await projectService.listForUser()).data || [];
    const details = await Promise.allSettled(light.map((p) => projectService.get(p.id)));
    return light.map((p, i) => (details[i].status === 'fulfilled' ? { ...p, ...details[i].value.data } : p));
};

const DueBadge = ({ date }) => {
    if (!date) return <span className="text-muted">—</span>;
    const d = daysUntil(date);
    return (
        <div>
            <div className="nowrap">{formatDate(date)}</div>
            <span className={`badge ${d < 0 ? 'badge-error' : d <= 30 ? 'badge-warning' : ''}`} style={{ marginTop: 2 }}>
                {d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : `${d}d left`}
            </span>
        </div>
    );
};

const ProjectsOverview = () => {
    const { data, loading, error } = useAsyncData(loadProjects, []);
    const [q, setQ] = useState('');
    const projects = useMemo(() => (data || []).filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())), [data, q]);
    const all = data || [];
    const totalBudget = all.reduce((s, p) => s + (Number(p.total_budget) || 0), 0);
    const overdue = all.filter((p) => p.due_date && daysUntil(p.due_date) < 0).length;
    const people = new Set(all.flatMap((p) => (p.members || []).map((m) => (typeof m === 'object' ? m.id : m)))).size;

    if (loading) return <Loader label="Loading projects…" />;
    if (error) return <div className="alert alert-error">Could not load your projects.</div>;

    return (
        <>
            <div className="stats-grid">
                <StatCard icon={<FaFolderOpen />} label="Projects" value={all.length} tone="primary" />
                <StatCard icon={<FaCoins />} label="Combined budget" value={formatCompact(totalBudget)} hint={formatNumber(totalBudget)} tone="accent" />
                <StatCard icon={<FaUsers />} label="People involved" value={people} tone="info" />
                <StatCard icon={<FaExclamationCircle />} label="Overdue projects" value={overdue} tone={overdue ? 'danger' : 'success'} />
            </div>
            <div className="toolbar">
                <div className="form-input-icon" style={{ flex: '1 1 220px', maxWidth: 340 }}>
                    <FaSearch />
                    <input className="form-input" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
                </div>
            </div>
            {projects.length === 0 ? (
                <div className="card"><EmptyState icon={<FaFolderOpen />} title={all.length ? 'No matching projects' : 'No projects yet'} description={all.length ? 'Try another search.' : 'Create a project to see it here.'} /></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr><th>Project</th><th>Your role</th><th className="text-right">Members</th><th>Due date</th><th className="text-right">Budget</th><th>PSDP / Location</th><th className="text-right">Open</th></tr>
                        </thead>
                        <tbody>
                            {projects.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <Link to={`/project/${p.id}`} className="row" style={{ minWidth: 200 }}>
                                            <span className="logo-preview" style={{ width: 32, height: 32, fontSize: '0.75rem', borderRadius: 8 }}>
                                                {p.logo_small_url ? <img src={p.logo_small_url} alt="" /> : initials(p.name)}
                                            </span>
                                            <span className="cell-title">{p.name}</span>
                                            {p.is_private && <FaLock className="icon-muted" size={11} title="Private" />}
                                        </Link>
                                    </td>
                                    <td>{p.i_am_owner ? <span className="badge badge-accent">Owner</span> : p.i_am_admin ? <span className="badge badge-primary">Admin</span> : <span className="badge">Member</span>}</td>
                                    <td className="text-right tabular">{p.total_memberships ?? (p.members || []).length}</td>
                                    <td><DueBadge date={p.due_date} /></td>
                                    <td className="text-right tabular" title={formatNumber(p.total_budget)}>{p.total_budget ? formatCompact(p.total_budget) : '—'}</td>
                                    <td>
                                        <div className="text-sm">{p.psdp || '—'}</div>
                                        <div className="text-xs text-muted">{p.location || ''}</div>
                                    </td>
                                    <td className="cell-actions">
                                        <Link className="btn btn-ghost btn-sm" to={`/project/${p.id}/tenders`} aria-label={`${p.name} tenders`}><FaFileContract /> Tenders</Link>
                                        <Link className="btn btn-ghost btn-sm" to={`/project/${p.id}/hr`} aria-label={`${p.name} HR`}><FaUserTie /> HR</Link>
                                        {(p.i_am_admin || p.i_am_owner) && <Link className="btn btn-ghost btn-sm btn-icon" to={`/project/${p.id}/settings`} aria-label={`${p.name} settings`} title="Settings"><FaCog /></Link>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

const UsersDirectory = () => {
    const { data, loading, error } = useAsyncData(() => userService.list().then((r) => r.data), []);
    const [q, setQ] = useState('');
    const users = useMemo(() => {
        const s = q.trim().toLowerCase();
        return (data || []).filter((u) => !s || [u.full_name_display, u.username, u.email, ...(u.roles || [])].some((x) => x?.toLowerCase().includes(s)));
    }, [data, q]);

    if (loading) return <Loader label="Loading users…" />;
    if (error) return <div className="alert alert-error">Could not load users.</div>;

    return (
        <>
            <div className="toolbar">
                <div className="form-input-icon" style={{ flex: '1 1 220px', maxWidth: 340 }}>
                    <FaSearch />
                    <input className="form-input" placeholder="Search by name, username or role" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
                </div>
                <span className="text-sm text-muted ml-auto">{users.length} of {(data || []).length} users</span>
            </div>
            {users.length === 0 ? (
                <div className="card"><EmptyState icon={<FaUsers />} title="No users found" description={q ? 'Try a different search.' : 'You have no visible users yet.'} /></div>
            ) : (
                <div className="table-wrap">
                    <table className="data-table">
                        <thead><tr><th>User</th><th>Username</th><th>Roles</th><th>Bio</th><th>Status</th></tr></thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>
                                        <div className="row">
                                            <UserAvatar user={u} size="md" />
                                            <span className="cell-title">{u.full_name_display || u.username}</span>
                                        </div>
                                    </td>
                                    <td className="mono">@{u.username}</td>
                                    <td><div className="tag-list">{(u.roles || []).map((r) => <span key={r} className="badge badge-outline">{r}</span>)}</div></td>
                                    <td className="text-sm text-secondary" style={{ maxWidth: 280 }}><span className="truncate block">{u.bio || '—'}</span></td>
                                    <td>{u.is_active === false ? <span className="badge badge-error">Inactive</span> : <span className="badge badge-success">Active</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
};

const TABS = [
    { id: 'projects', label: 'Projects overview', icon: <FaFolderOpen /> },
    { id: 'users', label: 'Users', icon: <FaUsers /> },
    { id: 'templates', label: 'Project templates', icon: <FaFileAlt /> },
];

const AdminPanel = () => {
    const { user } = useContext(AuthContext);
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'projects';

    return (
        <div>
            <PageHeader
                icon={<FaUserCog />}
                title="Administration"
                subtitle="A cross-project view of your portfolio, the people you work with and the templates new projects start from."
                actions={<Link className="btn btn-primary" to="/create-project">New project</Link>}
            />
            <Tabs tabs={TABS} activeTab={tab} onChange={(id) => setParams(id === 'projects' ? {} : { tab: id }, { replace: true })} />
            {tab === 'projects' && <ProjectsOverview />}
            {tab === 'users' && <UsersDirectory />}
            {tab === 'templates' && <AdminTemplates isSuperuser={!!user?.is_superuser} />}
        </div>
    );
};

export default AdminPanel;
