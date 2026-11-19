import React, { useContext, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    FaPlus, FaFolderOpen, FaTasks, FaExclamationTriangle, FaCalendarAlt, FaSearch, FaListUl, FaBug,
    FaLock, FaGlobeAsia, FaUsers, FaHistory, FaArrowRight, FaClipboardCheck, FaTimes,
} from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    projectService, userStoryService, taskService, issueService, timelineService,
} from '../api/services';
import {
    PageHeader, StatCard, EmptyState, ProgressBar, UserAvatar, StatusPill,
} from '../components/UI';
import {
    ProjectLogo, DueChip, SocialToggle, ActivityItem, SkeletonRows, PeopleModal,
} from '../components/overview/OverviewParts';
import useAsync from '../components/overview/useAsync';
import { describeEvent } from '../components/overview/activity';
import { daysUntil, formatCompact, percent } from '../utils/format';
import '../styles/overview.css';

const SORTS = [
    { id: 'name', label: 'Name' },
    { id: 'due', label: 'Due date' },
    { id: 'recent', label: 'Recently active' },
];

const WORK_KINDS = {
    userstory: { label: 'Story', icon: <FaListUl />, tone: 'primary', path: 'backlog' },
    task: { label: 'Task', icon: <FaTasks />, tone: 'info', path: 'backlog' },
    issue: { label: 'Issue', icon: <FaBug />, tone: 'danger', path: 'issues' },
};

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
};

// Share of the schedule elapsed between project creation and its due date
const scheduleElapsed = (p) => {
    if (!p.due_date || !p.created_date) return null;
    const start = new Date(p.created_date).getTime();
    const end = new Date(p.due_date).getTime();
    if (!(end > start)) return null;
    return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
};

const loadProjects = async () => {
    const res = await projectService.listForUser();
    const list = Array.isArray(res.data) ? res.data : [];
    // The list endpoint omits this fork's fields (budget, PSDP, due date…) — enrich from the detail payload.
    const details = await Promise.allSettled(list.slice(0, 40).map((p) => projectService.get(p.id)));
    return list.map((p, i) => {
        const d = details[i]?.status === 'fulfilled' ? details[i].value.data : null;
        if (!d) return p;
        return {
            ...p,
            due_date: d.due_date,
            total_budget: d.total_budget,
            psdp: d.psdp,
            location: d.location,
            obj_of_proj: d.obj_of_proj,
            pc1_url: d.pc1_url,
            logo_small_url: d.logo_small_url || p.logo_small_url,
            member_list: d.members || [],
            milestones: d.milestones || [],
            is_fan: d.is_fan ?? p.is_fan,
            is_watcher: d.is_watcher ?? p.is_watcher,
            total_fans: d.total_fans ?? p.total_fans,
            total_watchers: d.total_watchers ?? p.total_watchers,
        };
    });
};

const loadMyWork = async (userId) => {
    const open = { status__is_closed: false, page_size: 100 };
    const [usAssignedTo, usAssignedUsers, tasks, issues] = await Promise.allSettled([
        userStoryService.list({ ...open, assigned_to: userId }),
        userStoryService.list({ ...open, assigned_users: userId }),
        taskService.list({ ...open, assigned_to: userId }),
        issueService.list({ ...open, assigned_to: userId }),
    ]);
    const val = (r) => (r.status === 'fulfilled' && Array.isArray(r.value.data) ? r.value.data : []);
    const stories = new Map();
    [...val(usAssignedTo), ...val(usAssignedUsers)].forEach((s) => stories.set(s.id, s));
    const tag = (kind) => (x) => ({ ...x, kind });
    return [
        ...[...stories.values()].map(tag('userstory')),
        ...val(tasks).map(tag('task')),
        ...val(issues).map(tag('issue')),
    ];
};

/* ---------------------------------------------------------------- */

const ProjectCard = ({ project: p, onToggle, busy, onShowPeople }) => {
    const elapsed = scheduleElapsed(p);
    const sprints = p.milestones || [];
    const closedSprints = sprints.filter((m) => m.closed).length;
    const members = p.member_list || [];
    const overdue = p.due_date && daysUntil(p.due_date) < 0;

    return (
        <article className="ov-pcard">
            <div className="ov-pcard-head">
                <ProjectLogo project={p} size={46} />
                <div className="flex-1">
                    <Link to={`/project/${p.id}`} className="ov-pcard-title">{p.name}</Link>
                    <div className="ov-pcard-meta">
                        {p.is_private
                            ? <span className="badge"><FaLock size={9} /> Private</span>
                            : <span className="badge badge-primary"><FaGlobeAsia size={10} /> Public</span>}
                        {p.i_am_owner && <span className="badge badge-accent">Owner</span>}
                        {!p.i_am_owner && p.i_am_admin && <span className="badge badge-info">Admin</span>}
                    </div>
                </div>
            </div>

            <p className="ov-pcard-desc">{p.description || <span className="text-muted">No description provided.</span>}</p>

            <div className="ov-pcard-figures">
                <div className="ov-figure">
                    <div className="ov-figure-label">Budget</div>
                    <div className={`ov-figure-value ${p.total_budget ? '' : 'is-empty'}`} title={p.total_budget ? Number(p.total_budget).toLocaleString() : undefined}>
                        {p.total_budget ? formatCompact(p.total_budget) : 'Not set'}
                    </div>
                </div>
                <div className="ov-figure">
                    <div className="ov-figure-label">PSDP</div>
                    <div className={`ov-figure-value ${p.psdp ? '' : 'is-empty'}`} title={p.psdp || undefined}>{p.psdp || 'Not set'}</div>
                </div>
                <div className="ov-figure">
                    <div className="ov-figure-label">Location</div>
                    <div className={`ov-figure-value ${p.location ? '' : 'is-empty'}`} title={p.location || undefined}>{p.location || 'Not set'}</div>
                </div>
            </div>

            <div className="ov-pcard-progress">
                <div className="row justify-between flex-wrap">
                    <DueChip date={p.due_date} />
                </div>
                {elapsed !== null && (
                    <>
                        <div className="ov-pcard-progress-row"><span>Schedule elapsed</span><span>{Math.round(elapsed)}%</span></div>
                        <ProgressBar value={elapsed} size="sm" tone={overdue ? 'danger' : elapsed > 85 ? 'warning' : undefined} />
                    </>
                )}
                {sprints.length > 0 && (
                    <>
                        <div className="ov-pcard-progress-row"><span>Sprints closed</span><span>{closedSprints} / {sprints.length}</span></div>
                        <ProgressBar value={percent(closedSprints, sprints.length)} size="sm" tone="success" />
                    </>
                )}
            </div>

            <div className="ov-pcard-foot">
                <span className="ov-pcard-members" title={`${members.length || (p.members || []).length} members`}>
                    {members.length > 0 ? (
                        <span className="avatar-group">
                            {members.slice(0, 4).map((m) => <UserAvatar key={m.id} user={m} size="xs" />)}
                        </span>
                    ) : <FaUsers />}
                    {members.length || (p.members || []).length}
                </span>
                <SocialToggle
                    kind="like"
                    size="sm"
                    active={p.is_fan}
                    count={p.total_fans}
                    busy={busy}
                    onToggle={() => onToggle(p, 'like')}
                    onShowPeople={p.total_fans ? () => onShowPeople(p, 'fans') : undefined}
                />
                <SocialToggle
                    kind="watch"
                    size="sm"
                    active={p.is_watcher}
                    count={p.total_watchers}
                    busy={busy}
                    onToggle={() => onToggle(p, 'watch')}
                    onShowPeople={p.total_watchers ? () => onShowPeople(p, 'watchers') : undefined}
                />
            </div>
        </article>
    );
};

const ProjectCardSkeleton = () => (
    <div className="ov-pcard" aria-hidden="true">
        <div className="ov-pcard-head">
            <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 12 }} />
            <div className="flex-1 stack-sm"><div className="skeleton" style={{ height: 16, width: '70%' }} /><div className="skeleton" style={{ height: 12, width: '30%' }} /></div>
        </div>
        <SkeletonRows rows={3} height={12} />
        <div className="skeleton" style={{ height: 52 }} />
    </div>
);

const WorkRow = ({ item }) => {
    const kind = WORK_KINDS[item.kind];
    const pid = item.project;
    const due = item.due_date ? daysUntil(item.due_date) : null;
    return (
        <Link to={`/project/${pid}/${kind.path}?ref=${item.ref}`} className="ov-work-row">
            <span className={`ov-work-icon tone-${kind.tone}`} title={kind.label}>{kind.icon}</span>
            <span className="ov-work-main">
                <span className="ov-work-title block">{item.subject}</span>
                <span className="ov-work-sub">
                    <span className="ref">#{item.ref}</span>
                    <span className="truncate">{item.project_extra_info?.name}</span>
                </span>
            </span>
            <span className="ov-work-side">
                <StatusPill status={item.status_extra_info} />
                {item.due_date && (
                    <span className={`ov-chip tone-${due < 0 ? 'danger' : due <= 7 ? 'warning' : 'neutral'}`}>
                        {due < 0 ? `${Math.abs(due)}d overdue` : due === 0 ? 'Due today' : `Due in ${due}d`}
                    </span>
                )}
            </span>
        </Link>
    );
};

/* ---------------------------------------------------------------- */

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const toast = useToast();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '';
    const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'recent';
    const [workFilter, setWorkFilter] = useState('all');
    const [showAllWork, setShowAllWork] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [people, setPeople] = useState(null);

    const projectsQ = useAsync(loadProjects, []);
    const workQ = useAsync(() => loadMyWork(user.id), [user?.id]);
    const activityQ = useAsync(() => timelineService.getUser(user.id, { page: 1 }).then((r) => (Array.isArray(r.data) ? r.data : [])), [user?.id]);

    const projects = useMemo(() => projectsQ.data || [], [projectsQ.data]);
    const work = useMemo(() => workQ.data || [], [workQ.data]);

    const updateParam = (key, value, defaultValue = '') => {
        const next = new URLSearchParams(params);
        if (!value || value === defaultValue) next.delete(key); else next.set(key, value);
        setParams(next, { replace: true });
    };

    const visibleProjects = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const list = needle
            ? projects.filter((p) => [p.name, p.description, p.psdp, p.location, p.obj_of_proj]
                .some((v) => v && String(v).toLowerCase().includes(needle)))
            : [...projects];
        if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        if (sort === 'due') {
            list.sort((a, b) => {
                if (!a.due_date && !b.due_date) return a.name.localeCompare(b.name);
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            });
        }
        if (sort === 'recent') {
            list.sort((a, b) => new Date(b.totals_updated_datetime || b.modified_date) - new Date(a.totals_updated_datetime || a.modified_date));
        }
        return list;
    }, [projects, q, sort]);

    const stats = useMemo(() => {
        const overdueItems = work.filter((w) => w.due_date && daysUntil(w.due_date) < 0).length;
        const overdueProjects = projects.filter((p) => p.due_date && daysUntil(p.due_date) < 0).length;
        const soonItems = work.filter((w) => { const d = daysUntil(w.due_date); return w.due_date && d >= 0 && d <= 14; }).length;
        const soonProjects = projects.filter((p) => { const d = daysUntil(p.due_date); return p.due_date && d >= 0 && d <= 14; }).length;
        return {
            privateCount: projects.filter((p) => p.is_private).length,
            stories: work.filter((w) => w.kind === 'userstory').length,
            tasks: work.filter((w) => w.kind === 'task').length,
            issues: work.filter((w) => w.kind === 'issue').length,
            overdueItems, overdueProjects, soonItems, soonProjects,
        };
    }, [work, projects]);

    const sortedWork = useMemo(() => {
        const list = workFilter === 'all' ? [...work] : work.filter((w) => w.kind === workFilter);
        return list.sort((a, b) => {
            if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
            if (a.due_date) return -1;
            if (b.due_date) return 1;
            return new Date(b.modified_date) - new Date(a.modified_date);
        });
    }, [work, workFilter]);

    const toggleSocial = async (p, kind) => {
        const on = kind === 'like' ? p.is_fan : p.is_watcher;
        const flag = kind === 'like' ? 'is_fan' : 'is_watcher';
        const counter = kind === 'like' ? 'total_fans' : 'total_watchers';
        const apply = (value) => projectsQ.setData((list) => (list || []).map((x) => (x.id === p.id
            ? { ...x, [flag]: value, [counter]: Math.max(0, (x[counter] || 0) + (value ? 1 : -1)) }
            : x)));
        setBusyId(p.id);
        apply(!on);
        try {
            if (kind === 'like') await (on ? projectService.unlike(p.id) : projectService.like(p.id));
            else await (on ? projectService.unwatch(p.id) : projectService.watch(p.id));
        } catch (err) {
            apply(on);
            toast.error(err);
        } finally {
            setBusyId(null);
        }
    };

    const firstName = (user?.full_name || user?.full_name_display || user?.username || '').split(' ')[0];
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const loadingAll = projectsQ.loading;
    const activity = (activityQ.data || []).slice(0, 8).map(describeEvent);

    return (
        <>
            <PageHeader
                eyebrow={<span className="ov-greeting-date"><FaCalendarAlt size={10} /> {today}</span>}
                title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
                subtitle={loadingAll
                    ? 'Loading your workspace…'
                    : `Here’s what’s happening across your ${projects.length} project${projects.length === 1 ? '' : 's'}.`}
                actions={(
                    <>
                        <Link to="/notifications" className="btn btn-secondary">Notifications</Link>
                        <Link to="/create-project" className="btn btn-primary"><FaPlus size={12} /> New project</Link>
                    </>
                )}
            />

            <div className="stats-grid">
                <StatCard
                    icon={<FaFolderOpen />}
                    tone="primary"
                    label="Projects"
                    value={loadingAll ? '—' : projects.length}
                    hint={loadingAll ? ' ' : `${projects.length - stats.privateCount} public · ${stats.privateCount} private`}
                />
                <StatCard
                    icon={<FaClipboardCheck />}
                    tone="info"
                    label="Open work assigned to me"
                    value={workQ.loading ? '—' : work.length}
                    hint={workQ.loading ? ' ' : `${plural(stats.stories, 'story', 'stories')} · ${plural(stats.tasks, 'task')} · ${plural(stats.issues, 'issue')}`}
                />
                <StatCard
                    icon={<FaExclamationTriangle />}
                    tone={stats.overdueItems + stats.overdueProjects > 0 ? 'danger' : 'success'}
                    label="Overdue"
                    value={workQ.loading || loadingAll ? '—' : stats.overdueItems + stats.overdueProjects}
                    hint={`${stats.overdueItems} work item${stats.overdueItems === 1 ? '' : 's'} · ${stats.overdueProjects} project${stats.overdueProjects === 1 ? '' : 's'}`}
                />
                <StatCard
                    icon={<FaCalendarAlt />}
                    tone="accent"
                    label="Due in the next 14 days"
                    value={workQ.loading || loadingAll ? '—' : stats.soonItems + stats.soonProjects}
                    hint={`${stats.soonItems} work item${stats.soonItems === 1 ? '' : 's'} · ${stats.soonProjects} project${stats.soonProjects === 1 ? '' : 's'}`}
                />
            </div>

            <div className="grid-main-side">
                {/* ---------------- Projects ---------------- */}
                <section aria-labelledby="dash-projects">
                    <div className="section-header">
                        <h2 className="section-title" id="dash-projects"><FaFolderOpen /> My projects</h2>
                    </div>

                    {projectsQ.error && !projectsQ.data && (
                        <div className="alert alert-error mb-4">
                            <span className="flex-1">Could not load your projects.</span>
                            <button className="btn btn-sm btn-secondary" onClick={projectsQ.reload}>Retry</button>
                        </div>
                    )}

                    {(loadingAll || projects.length > 0) && (
                        <div className="ov-toolbar">
                            <div className="form-input-icon ov-search">
                                <FaSearch size={13} />
                                <input
                                    className="form-input"
                                    type="search"
                                    value={q}
                                    onChange={(e) => updateParam('q', e.target.value)}
                                    placeholder="Filter by name, PSDP, location…"
                                    aria-label="Filter projects"
                                />
                            </div>
                            <div className="segmented" role="group" aria-label="Sort projects">
                                {SORTS.map((s) => (
                                    <button key={s.id} type="button" className={sort === s.id ? 'active' : ''} aria-pressed={sort === s.id} onClick={() => updateParam('sort', s.id, 'recent')}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loadingAll && (
                        <div className="ov-project-grid">
                            <ProjectCardSkeleton /><ProjectCardSkeleton />
                        </div>
                    )}

                    {!loadingAll && projects.length === 0 && !projectsQ.error && (
                        <div className="card">
                            <EmptyState
                                icon={<FaFolderOpen />}
                                title="No projects yet"
                                description="Create your first project to start tracking budgets, sprints, tenders and staffing — or ask a project admin to invite you."
                                action={<button className="btn btn-primary" onClick={() => navigate('/create-project')}><FaPlus size={12} /> Create a project</button>}
                            />
                        </div>
                    )}

                    {!loadingAll && projects.length > 0 && visibleProjects.length === 0 && (
                        <div className="card">
                            <EmptyState
                                icon={<FaSearch />}
                                title="No matching projects"
                                description={`Nothing matches “${q}”. Try a different name, PSDP number or location.`}
                                action={<button className="btn btn-secondary" onClick={() => updateParam('q', '')}><FaTimes size={11} /> Clear filter</button>}
                            />
                        </div>
                    )}

                    {!loadingAll && visibleProjects.length > 0 && (
                        <div className="ov-project-grid">
                            {visibleProjects.map((p) => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    busy={busyId === p.id}
                                    onToggle={toggleSocial}
                                    onShowPeople={(proj, which) => setPeople({ project: proj, which })}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* ---------------- Side: my work + activity ---------------- */}
                <div className="stack">
                    <section className="card flush" aria-labelledby="dash-work">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title" id="dash-work">My work</h2>
                                <div className="ov-card-sub">Open items assigned to you</div>
                            </div>
                            <span className="badge badge-primary">{workQ.loading ? '…' : work.length}</span>
                        </div>
                        <div className="p-3" style={{ paddingBottom: 0 }}>
                            <div className="segmented w-full" role="group" aria-label="Filter my work">
                                {[
                                    { id: 'all', label: 'All', n: work.length },
                                    { id: 'userstory', label: 'Stories', n: stats.stories },
                                    { id: 'task', label: 'Tasks', n: stats.tasks },
                                    { id: 'issue', label: 'Issues', n: stats.issues },
                                ].map((f) => (
                                    <button key={f.id} type="button" className={workFilter === f.id ? 'active' : ''} style={{ flex: 1, justifyContent: 'center' }} aria-pressed={workFilter === f.id} onClick={() => { setWorkFilter(f.id); setShowAllWork(false); }}>
                                        {f.label} <span className="text-muted">{f.n}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3">
                            {workQ.loading && <SkeletonRows rows={4} height={34} />}
                            {workQ.error && !workQ.data && <div className="alert alert-error">Could not load your assigned work.</div>}
                            {!workQ.loading && sortedWork.length === 0 && (
                                <EmptyState icon={<FaClipboardCheck />} title="Nothing assigned" description="Open stories, tasks and issues assigned to you will appear here." />
                            )}
                            {(showAllWork ? sortedWork : sortedWork.slice(0, 7)).map((w) => <WorkRow key={`${w.kind}-${w.id}`} item={w} />)}
                            {sortedWork.length > 7 && (
                                <button type="button" className="btn btn-ghost btn-sm w-full mt-2" onClick={() => setShowAllWork((s) => !s)}>
                                    {showAllWork ? 'Show less' : `Show all ${sortedWork.length}`}
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="card" aria-labelledby="dash-activity">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title" id="dash-activity">Recent activity</h2>
                                <div className="ov-card-sub">Your latest actions across projects</div>
                            </div>
                            <FaHistory className="text-muted" aria-hidden="true" />
                        </div>
                        {activityQ.loading && <SkeletonRows rows={5} />}
                        {activityQ.error && !activityQ.data && <div className="alert alert-error">Could not load activity.</div>}
                        {!activityQ.loading && activity.length === 0 && !activityQ.error && (
                            <p className="text-sm text-muted">No recent activity yet.</p>
                        )}
                        {activity.length > 0 && (
                            <div className="timeline ov-feed">
                                {activity.map((ev) => <ActivityItem key={ev.id} ev={ev} showProject showDetails={false} />)}
                            </div>
                        )}
                        {projects[0] && activity.length > 0 && (
                            <div className="mt-4 text-right">
                                <Link to={`/project/${activity[0].projectId || projects[0].id}/activity`} className="ov-card-link">Project activity <FaArrowRight size={10} /></Link>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {people && (
                <PeopleModal
                    title={`${people.which === 'fans' ? 'Fans' : 'Watchers'} of ${people.project.name}`}
                    loader={() => (people.which === 'fans' ? projectService.getFans(people.project.id) : projectService.getWatchers(people.project.id))}
                    members={people.project.member_list}
                    onClose={() => setPeople(null)}
                />
            )}
        </>
    );
};

export default Dashboard;
