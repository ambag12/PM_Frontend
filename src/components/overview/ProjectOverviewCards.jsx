import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FaBullseye, FaHashtag, FaMapMarkerAlt, FaCoins, FaCalendarCheck, FaFilePdf, FaUserTie, FaCalendarPlus,
    FaExternalLinkAlt, FaFlagCheckered, FaBug, FaUsers, FaChartLine, FaArrowRight,
} from 'react-icons/fa';
import { milestoneService } from '../../api/services';
import { Ring, ProgressBar, UserAvatar, EmptyState } from '../UI';
import { SkeletonRows } from './OverviewParts';
import { countdownText } from './due';
import useAsync from './useAsync';
import { daysUntil, formatCompact, formatDate, formatNumber, percent, userName } from '../../utils/format';

/* ------------------------------------------------------------------ *
 * Project facts — this fork's custom fields
 * ------------------------------------------------------------------ */
const Fact = ({ icon, label, children, sub, empty, className = '' }) => (
    <div className={`ov-fact ${className}`}>
        <div className="ov-fact-label">{icon} {label}</div>
        <div className={`ov-fact-value ${empty ? 'is-empty' : ''}`}>{children}</div>
        {sub && <div className="ov-fact-sub">{sub}</div>}
    </div>
);

export const ProjectFactsCard = ({ project, canEdit }) => {
    const days = project.due_date ? daysUntil(project.due_date) : null;
    return (
        <section className="card" aria-labelledby="facts-title">
            <div className="card-header">
                <div>
                    <h2 className="card-title" id="facts-title">Project facts</h2>
                    <div className="ov-card-sub">Approval, funding and scope</div>
                </div>
                {canEdit && <Link to={`/project/${project.id}/settings`} className="btn btn-ghost btn-sm">Edit details</Link>}
            </div>

            <div className="ov-facts">
                <div className="ov-fact span-all">
                    <div className="ov-fact-label"><FaBullseye /> Objective</div>
                    {project.obj_of_proj
                        ? <p className="ov-objective">{project.obj_of_proj}</p>
                        : <div className="ov-fact-value is-empty">No objective recorded</div>}
                </div>
                <Fact icon={<FaHashtag />} label="PSDP no." empty={!project.psdp}>
                    {project.psdp ? <span className="mono">{project.psdp}</span> : 'Not assigned'}
                </Fact>
                <Fact icon={<FaMapMarkerAlt />} label="Location" empty={!project.location}>
                    {project.location || 'Not specified'}
                </Fact>
                <Fact
                    icon={<FaCoins />}
                    label="Total budget"
                    empty={!project.total_budget}
                    sub={project.total_budget ? formatNumber(project.total_budget) : null}
                >
                    {project.total_budget ? formatCompact(project.total_budget) : 'Not set'}
                </Fact>
                <Fact
                    icon={<FaCalendarCheck />}
                    label="Due date"
                    empty={!project.due_date}
                    sub={project.due_date ? null : 'Set a due date in settings'}
                >
                    {project.due_date ? (
                        <span className="stack-sm" style={{ gap: '0.35rem' }}>
                            <span>{formatDate(project.due_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span><span className={`ov-chip tone-${days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success'}`}>{countdownText(days)}</span></span>
                        </span>
                    ) : 'No due date'}
                </Fact>
                <Fact icon={<FaFilePdf />} label="PC-1 document" empty={!project.pc1_url}>
                    {project.pc1_url ? (
                        <a href={project.pc1_url} target="_blank" rel="noreferrer" className="row" style={{ display: 'inline-flex' }}>
                            View PC-1 <FaExternalLinkAlt size={10} />
                        </a>
                    ) : 'Not uploaded'}
                </Fact>
                <Fact icon={<FaUserTie />} label="Owner">
                    <span className="row"><UserAvatar user={project.owner} size="xs" /> {userName(project.owner)}</span>
                </Fact>
                <Fact icon={<FaUsers />} label="Team" sub={`${(project.roles || []).length} roles`}>
                    {(project.members || []).length} member{(project.members || []).length === 1 ? '' : 's'}
                </Fact>
                <Fact icon={<FaCalendarPlus />} label="Created">
                    {formatDate(project.created_date)}
                </Fact>
            </div>
        </section>
    );
};

/* ------------------------------------------------------------------ *
 * Delivery progress — projects/:id/stats
 * ------------------------------------------------------------------ */
const scheduleElapsed = (p) => {
    if (!p.due_date || !p.created_date) return null;
    const start = new Date(p.created_date).getTime();
    const end = new Date(p.due_date).getTime();
    if (!(end > start)) return null;
    return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
};

export const ProgressCard = ({ project, stats, loading, error }) => {
    const totalPoints = Number(stats?.total_points) || 0;
    const closedPoints = Number(stats?.closed_points) || 0;
    const definedPoints = Number(stats?.defined_points) || 0;
    const sprints = project.milestones || [];
    const closedSprints = sprints.filter((m) => m.closed).length;
    const elapsed = scheduleElapsed(project);
    const pointsPct = totalPoints ? percent(closedPoints, totalPoints) : 0;
    const sprintPct = sprints.length ? percent(closedSprints, sprints.length) : 0;
    const overdue = project.due_date && daysUntil(project.due_date) < 0;

    return (
        <section className="card" aria-labelledby="progress-title">
            <div className="card-header">
                <div>
                    <h2 className="card-title" id="progress-title">Delivery progress</h2>
                    <div className="ov-card-sub">Scope completed against time elapsed</div>
                </div>
                <FaChartLine className="text-muted" aria-hidden="true" />
            </div>
            {loading && <SkeletonRows rows={3} height={56} />}
            {error && !stats && <div className="alert alert-error">Could not load project statistics.</div>}
            {!loading && (
                <>
                    <div className="ov-progress-grid">
                        <div className="ov-progress-tile">
                            <Ring value={pointsPct} size={64} tone="primary" label={totalPoints ? `${pointsPct}%` : '—'} />
                            <div className="flex-1">
                                <div className="ov-tile-title">Scope completed</div>
                                <div className="ov-tile-sub">{totalPoints ? `${formatNumber(closedPoints)} of ${formatNumber(totalPoints)} points` : 'No estimated points yet'}</div>
                            </div>
                        </div>
                        <div className="ov-progress-tile">
                            <Ring value={sprintPct} size={64} tone="success" label={sprints.length ? `${closedSprints}/${sprints.length}` : '—'} />
                            <div className="flex-1">
                                <div className="ov-tile-title">Sprints closed</div>
                                <div className="ov-tile-sub">{sprints.length ? `${sprints.length - closedSprints} still open` : 'No sprints planned'}</div>
                            </div>
                        </div>
                        <div className="ov-progress-tile">
                            <Ring value={elapsed ?? 0} size={64} tone={overdue ? 'danger' : elapsed > 85 ? 'warning' : 'accent'} label={elapsed === null ? '—' : `${Math.round(elapsed)}%`} />
                            <div className="flex-1">
                                <div className="ov-tile-title">Schedule elapsed</div>
                                <div className="ov-tile-sub">{project.due_date ? countdownText(daysUntil(project.due_date)) : 'Set a due date to track'}</div>
                            </div>
                        </div>
                    </div>
                    {totalPoints > 0 && elapsed !== null && (
                        <div className="mt-4">
                            <div className="row justify-between text-xs text-muted mb-1"><span>Scope</span><span>{pointsPct}%</span></div>
                            <ProgressBar value={pointsPct} />
                            <div className="row justify-between text-xs text-muted mb-1 mt-2"><span>Time</span><span>{Math.round(elapsed)}%</span></div>
                            <ProgressBar value={elapsed} tone={overdue ? 'danger' : 'accent'} />
                        </div>
                    )}
                    <div className="ov-mini-stats">
                        <div className="ov-mini-stat"><div className="ov-mini-stat-value">{formatNumber(totalPoints)}</div><div className="ov-mini-stat-label">Total points</div></div>
                        <div className="ov-mini-stat"><div className="ov-mini-stat-value">{formatNumber(definedPoints)}</div><div className="ov-mini-stat-label">Defined points</div></div>
                        <div className="ov-mini-stat"><div className="ov-mini-stat-value">{formatNumber(closedPoints)}</div><div className="ov-mini-stat-label">Closed points</div></div>
                        <div className="ov-mini-stat"><div className="ov-mini-stat-value">{formatNumber(Math.round((Number(stats?.speed) || 0) * 10) / 10)}</div><div className="ov-mini-stat-label">Velocity (pts/sprint)</div></div>
                    </div>
                </>
            )}
        </section>
    );
};

/* ------------------------------------------------------------------ *
 * Open sprints — milestones list + stats for the current one
 * ------------------------------------------------------------------ */
const pickCurrent = (list) => {
    const today = new Date().toISOString().slice(0, 10);
    return list.find((m) => m.estimated_start <= today && m.estimated_finish >= today)
        || list.find((m) => m.estimated_start > today)
        || list[list.length - 1]
        || null;
};

export const SprintsCard = ({ projectId, fallback = [] }) => {
    const listQ = useAsync(
        () => milestoneService.list({ project: projectId, closed: false }).then((r) => (Array.isArray(r.data) ? r.data : [])),
        [projectId],
    );
    const sprints = useMemo(
        () => [...(listQ.data || [])].sort((a, b) => String(a.estimated_start).localeCompare(String(b.estimated_start))),
        [listQ.data],
    );
    const current = pickCurrent(sprints);
    const statsQ = useAsync(
        () => (current ? milestoneService.getStats(current.id).then((r) => r.data) : Promise.resolve(null)),
        [current?.id],
    );
    const st = statsQ.data;

    return (
        <section className="card" aria-labelledby="sprints-title">
            <div className="card-header">
                <h2 className="card-title" id="sprints-title">Open sprints</h2>
                <Link to={`/project/${projectId}/milestones`} className="ov-card-link">All sprints <FaArrowRight size={10} /></Link>
            </div>
            {listQ.loading && <SkeletonRows rows={3} height={40} />}
            {listQ.error && !listQ.data && (
                fallback.filter((m) => !m.closed).length
                    ? fallback.filter((m) => !m.closed).map((m) => <div key={m.id} className="ov-sprint"><div className="ov-sprint-name">{m.name}</div></div>)
                    : <div className="alert alert-error">Could not load sprints.</div>
            )}
            {!listQ.loading && sprints.length === 0 && !listQ.error && (
                <EmptyState icon={<FaFlagCheckered />} title="No open sprints" description="Plan a sprint from the Sprints page to start tracking delivery." />
            )}
            {sprints.map((m) => {
                const isCurrent = current?.id === m.id;
                const days = daysUntil(m.estimated_finish);
                return (
                    <div key={m.id} className="ov-sprint">
                        <div className="ov-sprint-head">
                            <span className="ov-sprint-name" title={m.name}>{m.name}</span>
                            {isCurrent && <span className="badge badge-primary">Current</span>}
                        </div>
                        <div className="row justify-between flex-wrap">
                            <span className="ov-sprint-dates">{formatDate(m.estimated_start, { day: 'numeric', month: 'short' })} – {formatDate(m.estimated_finish, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            <span className={`ov-chip tone-${days < 0 ? 'danger' : days <= 3 ? 'warning' : 'neutral'}`}>{days < 0 ? `Ended ${Math.abs(days)}d ago` : days === 0 ? 'Ends today' : `${days}d left`}</span>
                        </div>
                        {isCurrent && statsQ.loading && <div className="mt-2"><SkeletonRows rows={1} height={8} /></div>}
                        {isCurrent && st && (
                            <>
                                <div className="mt-2">
                                    <ProgressBar value={percent(st.completed_tasks, st.total_tasks)} size="sm" tone="success" showLabel />
                                </div>
                                <div className="ov-sprint-stats">
                                    <span><strong>{st.completed_userstories}/{st.total_userstories}</strong> stories</span>
                                    <span><strong>{st.completed_tasks}/{st.total_tasks}</strong> tasks</span>
                                    {Number(st.iocaine_doses) > 0 && <span><strong>{st.iocaine_doses}</strong> iocaine</span>}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </section>
    );
};

/* ------------------------------------------------------------------ *
 * Issues breakdown — projects/:id/issues_stats
 * ------------------------------------------------------------------ */
const BREAKDOWNS = [
    { id: 'status', label: 'Status', key: 'issues_per_status' },
    { id: 'priority', label: 'Priority', key: 'issues_per_priority' },
    { id: 'severity', label: 'Severity', key: 'issues_per_severity' },
    { id: 'type', label: 'Type', key: 'issues_per_type' },
];

export const IssuesBreakdownCard = ({ projectId, stats, loading, error }) => {
    const [by, setBy] = useState('status');
    const def = BREAKDOWNS.find((b) => b.id === by);
    const rows = Object.values(stats?.[def.key] || {}).sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...rows.map((r) => r.count));

    return (
        <section className="card" aria-labelledby="issues-title">
            <div className="card-header">
                <h2 className="card-title" id="issues-title">Issues</h2>
                <Link to={`/project/${projectId}/issues`} className="ov-card-link">Open tracker <FaArrowRight size={10} /></Link>
            </div>
            {loading && <SkeletonRows rows={4} />}
            {error && !stats && <div className="alert alert-error">Could not load issue statistics.</div>}
            {stats && (
                <>
                    <div className="ov-issue-summary">
                        <div><strong>{stats.total_issues}</strong>Total</div>
                        <div><strong className="text-warning">{stats.opened_issues}</strong>Open</div>
                        <div><strong className="text-success">{stats.closed_issues}</strong>Closed</div>
                    </div>
                    {stats.total_issues > 0 ? (
                        <>
                            <div className="segmented w-full mb-3" role="group" aria-label="Group issues by">
                                {BREAKDOWNS.map((b) => (
                                    <button key={b.id} type="button" className={by === b.id ? 'active' : ''} style={{ flex: 1, justifyContent: 'center' }} aria-pressed={by === b.id} onClick={() => setBy(b.id)}>{b.label}</button>
                                ))}
                            </div>
                            {rows.map((r) => (
                                <div key={r.id} className="bar-row" style={{ '--tone': r.color || 'var(--chart-1)' }}>
                                    <span className="ov-bar-swatch"><span className="color-swatch" style={{ background: r.color }} /><span>{r.name}</span></span>
                                    <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} /></div>
                                    <span className="bar-value">{r.count}</span>
                                </div>
                            ))}
                        </>
                    ) : (
                        <EmptyState icon={<FaBug />} title="No issues reported" description="Issues raised by the team will be summarised here." />
                    )}
                </>
            )}
        </section>
    );
};

/* ------------------------------------------------------------------ *
 * Team workload — open assigned items + projects/:id/member_stats
 * ------------------------------------------------------------------ */
export const TeamWorkloadCard = ({ project, memberStats, openItems, loading }) => {
    const members = project.members || [];
    const load = useMemo(() => {
        const counts = {};
        (openItems || []).forEach((it) => {
            const ids = new Set([it.assigned_to, ...(it.assigned_users || [])].filter(Boolean));
            ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
        });
        return counts;
    }, [openItems]);
    const max = Math.max(1, ...members.map((m) => load[m.id] || 0));
    const ms = memberStats || {};
    const sorted = [...members].sort((a, b) => (load[b.id] || 0) - (load[a.id] || 0));
    const unassigned = (openItems || []).filter((it) => !it.assigned_to && !(it.assigned_users || []).length).length;

    return (
        <section className="card" aria-labelledby="team-title">
            <div className="card-header">
                <div>
                    <h2 className="card-title" id="team-title">Team workload</h2>
                    <div className="ov-card-sub">Open items assigned per member</div>
                </div>
                <Link to={`/project/${project.id}/members`} className="ov-card-link">Team <FaArrowRight size={10} /></Link>
            </div>
            {loading && <SkeletonRows rows={3} height={32} />}
            {!loading && members.length === 0 && <p className="text-sm text-muted">No members yet.</p>}
            {!loading && sorted.map((m) => {
                const n = load[m.id] || 0;
                const extras = [
                    ms.closed_tasks?.[m.id] ? `${ms.closed_tasks[m.id]} tasks closed` : null,
                    ms.closed_bugs?.[m.id] ? `${ms.closed_bugs[m.id]} issues closed` : null,
                    ms.created_bugs?.[m.id] ? `${ms.created_bugs[m.id]} issues raised` : null,
                    ms.wiki_changes?.[m.id] ? `${ms.wiki_changes[m.id]} wiki edits` : null,
                ].filter(Boolean);
                return (
                    <div key={m.id} className="ov-member-row">
                        <UserAvatar user={m} size="md" />
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-heading truncate">{userName(m)}</div>
                            <div className="ov-member-meta">{m.role_name}{extras.length ? ` · ${extras.join(' · ')}` : ''}</div>
                        </div>
                        <div className="ov-member-load">
                            <div className="text-xs font-semibold text-secondary mb-1">{n} open</div>
                            <ProgressBar value={(n / max) * 100} size="sm" tone={n > 8 ? 'warning' : undefined} />
                        </div>
                    </div>
                );
            })}
            {!loading && unassigned > 0 && (
                <div className="ov-muted-box mt-3">{unassigned} open item{unassigned === 1 ? ' is' : 's are'} not assigned to anyone.</div>
            )}
        </section>
    );
};
