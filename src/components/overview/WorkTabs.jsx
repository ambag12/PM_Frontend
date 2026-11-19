import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaListUl, FaTasks, FaBug, FaPlus, FaSearch, FaLock, FaArrowRight } from 'react-icons/fa';
import { Tabs, StatusPill, UserAvatar, TagList, EmptyState } from '../UI';
import { SkeletonRows } from './OverviewParts';
import { byId, daysUntil, formatDate, userName } from '../../utils/format';

const WORK_TABS = [
    { id: 'userstories', label: 'User stories', single: 'story', icon: <FaListUl />, page: 'backlog', perm: 'us' },
    { id: 'tasks', label: 'Tasks', single: 'task', icon: <FaTasks />, page: 'backlog', perm: 'task' },
    { id: 'issues', label: 'Issues', single: 'issue', icon: <FaBug />, page: 'issues', perm: 'issue' },
];

const Assignees = ({ item, members }) => {
    const ids = [...new Set([item.assigned_to, ...(item.assigned_users || [])].filter(Boolean))];
    if (!ids.length) return <span className="text-muted text-sm">Unassigned</span>;
    const people = ids.map((id) => byId(members, id) || (item.assigned_to_extra_info?.id === id ? item.assigned_to_extra_info : { id, username: `#${id}` }));
    if (people.length === 1) {
        return <span className="row nowrap"><UserAvatar user={people[0]} size="xs" /> <span className="text-sm truncate" style={{ maxWidth: 140 }}>{userName(people[0])}</span></span>;
    }
    return (
        <span className="avatar-group" title={people.map(userName).join(', ')}>
            {people.slice(0, 4).map((p) => <UserAvatar key={p.id} user={p} size="xs" />)}
        </span>
    );
};

const Due = ({ item }) => {
    if (!item.due_date) return <span className="text-muted">—</span>;
    const d = daysUntil(item.due_date);
    const closed = item.is_closed || item.status_extra_info?.is_closed;
    const tone = closed ? 'neutral' : d < 0 ? 'danger' : d <= 7 ? 'warning' : 'neutral';
    return <span className={`ov-chip tone-${tone}`} title={closed ? undefined : d < 0 ? `${Math.abs(d)} days overdue` : `${d} days left`}>{formatDate(item.due_date, { day: 'numeric', month: 'short' })}</span>;
};

const ValueDot = ({ value }) => (value ? (
    <span className="row nowrap text-sm"><span className="dot" style={{ background: value.color }} /> {value.name}</span>
) : <span className="text-muted">—</span>);

const Subject = ({ item, tagsColors }) => (
    <div className="ov-subject">
        <span className="ref">#{item.ref}</span>
        <div className="flex-1" style={{ minWidth: 0 }}>
            <div className="cell-title" title={item.subject}>{item.subject}</div>
            {(item.tags || []).length > 0 && <div className="mt-1"><TagList tags={item.tags} tagsColors={tagsColors} max={3} /></div>}
        </div>
        {item.is_blocked && <FaLock className="ov-blocked" title={item.blocked_note || 'Blocked'} aria-label="Blocked" />}
    </div>
);

const columnsFor = (tab, project) => {
    const members = project.members || [];
    const common = {
        subject: { label: 'Subject', render: (it) => <Subject item={it} tagsColors={project.tags_colors} /> },
        status: { label: 'Status', render: (it) => <StatusPill status={it.status_extra_info} /> },
        assignee: { label: 'Assigned', render: (it) => <Assignees item={it} members={members} /> },
        due: { label: 'Due', render: (it) => <Due item={it} /> },
    };
    if (tab === 'userstories') {
        return [
            common.subject,
            common.status,
            { label: 'Sprint', render: (it) => (it.milestone_name ? <span className="text-sm nowrap">{it.milestone_name}</span> : <span className="text-muted text-sm">Backlog</span>) },
            { label: 'Points', render: (it) => <span className="tabular">{it.total_points ?? '—'}</span> },
            common.assignee,
            common.due,
        ];
    }
    if (tab === 'tasks') {
        return [
            common.subject,
            common.status,
            { label: 'Story', render: (it) => (it.user_story_extra_info ? <span className="text-sm truncate block" style={{ maxWidth: 220 }} title={it.user_story_extra_info.subject}><span className="ref">#{it.user_story_extra_info.ref}</span> {it.user_story_extra_info.subject}</span> : <span className="text-muted text-sm">Unlinked</span>) },
            common.assignee,
            common.due,
        ];
    }
    return [
        common.subject,
        { label: 'Type', render: (it) => <ValueDot value={byId(project.issue_types, it.type)} /> },
        { label: 'Severity', render: (it) => <ValueDot value={byId(project.severities, it.severity)} /> },
        { label: 'Priority', render: (it) => <ValueDot value={byId(project.priorities, it.priority)} /> },
        common.status,
        common.assignee,
    ];
};

/*
 * Tabbed compact tables of user stories / tasks / issues.
 * lists: { userstories: { items, total }, tasks: …, issues: … }
 */
const WorkTabs = ({ project, enabled = {}, tab, onTab, scope, onScope, lists, loading, error, onRetry, onOpen, onCreate, canAdd }) => {
    const [filter, setFilter] = useState('');
    const tabs = WORK_TABS.filter((t) => enabled[t.id] !== false);
    const def = tabs.find((t) => t.id === tab) || tabs[0] || WORK_TABS[0];
    const current = lists?.[def.id];
    const cols = columnsFor(def.id, project);

    const rows = useMemo(() => {
        const needle = filter.trim().toLowerCase();
        const items = current?.items || [];
        if (!needle) return items;
        return items.filter((it) => String(it.ref).includes(needle.replace('#', '')) || (it.subject || '').toLowerCase().includes(needle));
    }, [current, filter]);

    return (
        <section className="card flush ov-tabs-card" aria-label="Work items">
            <Tabs
                tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: t.icon, badge: lists?.[t.id] ? lists[t.id].total : undefined }))}
                activeTab={def.id}
                onChange={(id) => { onTab(id); setFilter(''); }}
            />
            <div className="ov-tabs-toolbar">
                <div className="form-input-icon ov-search">
                    <FaSearch size={12} />
                    <input
                        className="form-input form-input-sm"
                        type="search"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder={`Filter ${def.label.toLowerCase()}…`}
                        aria-label={`Filter ${def.label.toLowerCase()}`}
                    />
                </div>
                <div className="segmented" role="group" aria-label="Show">
                    <button type="button" className={scope === 'open' ? 'active' : ''} aria-pressed={scope === 'open'} onClick={() => onScope('open')}>Open</button>
                    <button type="button" className={scope === 'all' ? 'active' : ''} aria-pressed={scope === 'all'} onClick={() => onScope('all')}>All</button>
                </div>
                <span className="flex-1" />
                {canAdd(def.perm) && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => onCreate(def.id)}>
                        <FaPlus size={10} /> New {def.single}
                    </button>
                )}
            </div>

            {loading && <div className="p-4"><SkeletonRows rows={5} height={22} /></div>}
            {error && !current && (
                <div className="p-4">
                    <div className="alert alert-error"><span className="flex-1">Could not load {def.label.toLowerCase()}.</span><button className="btn btn-sm btn-secondary" onClick={onRetry}>Retry</button></div>
                </div>
            )}
            {!loading && current && rows.length === 0 && (
                <EmptyState
                    icon={def.icon}
                    title={filter ? 'No matches' : `No ${scope === 'open' ? 'open ' : ''}${def.label.toLowerCase()}`}
                    description={filter ? `Nothing matches “${filter}”.` : `${def.label} for this project will appear here.`}
                    action={!filter && canAdd(def.perm) ? <button className="btn btn-secondary btn-sm" onClick={() => onCreate(def.id)}><FaPlus size={10} /> New {def.single}</button> : null}
                />
            )}
            {!loading && rows.length > 0 && (
                <div className="ov-table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>{cols.map((c) => <th key={c.label} scope="col">{c.label}</th>)}</tr>
                        </thead>
                        <tbody>
                            {rows.map((it) => (
                                <tr
                                    key={it.id}
                                    className="clickable"
                                    tabIndex={0}
                                    onClick={() => onOpen(def.id, it.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(def.id, it.id); } }}
                                    aria-label={`Open ${def.single} #${it.ref} ${it.subject}`}
                                >
                                    {cols.map((c) => <td key={c.label}>{c.render(it)}</td>)}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && current && (
                <div className="ov-table-foot">
                    <span>Showing {rows.length} of {current.total} {scope === 'open' ? 'open ' : ''}{def.label.toLowerCase()}</span>
                    <Link to={`/project/${project.id}/${def.page}`} className="ov-card-link">Open {def.page === 'backlog' ? 'backlog' : 'issue tracker'} <FaArrowRight size={10} /></Link>
                </div>
            )}
        </section>
    );
};

export default WorkTabs;
