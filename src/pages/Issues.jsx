import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
    FaBug, FaPlus, FaLayerGroup, FaSort, FaSortUp, FaSortDown, FaEllipsisH, FaArrowUp, FaTrash,
    FaExternalLinkAlt, FaFilter, FaThumbsUp, FaCheckCircle, FaExclamationCircle,
} from 'react-icons/fa';
import { issueService, projectService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { PageHeader, Button, EmptyState, Loader, UserAvatar, Switch, Dropdown, DropdownItem, DropdownDivider } from '../components/UI';
import FilterBar from '../components/FilterBar';
import IssueDetail from '../components/IssueDetail';
import CreateIssueModal from '../components/CreateIssueModal';
import BulkAddModal from '../components/planning/BulkAddModal';
import { useRemote, useDebouncedValue, toParams, hasActiveValues, optionsFrom } from '../components/planning/utils';
import { timeAgo, formatDateTime, userName, byId, percent } from '../utils/format';
import '../styles/planning.css';

const EMPTY_FILTERS = { type: [], severity: [], priority: [], status: [], assigned_to: [], owner: [], tags: [] };
const PAGE = 50;

const COLUMNS = [
    { key: 'ref', label: 'Ref', sort: 'ref', className: 'pl-col-ref' },
    { key: 'type', label: 'Type', sort: 'type', className: 'pl-hide-sm' },
    { key: 'severity', label: 'Severity', sort: 'severity', className: 'pl-hide-sm' },
    { key: 'priority', label: 'Priority', sort: 'priority' },
    { key: 'subject', label: 'Subject', sort: 'subject', className: 'pl-col-subject' },
    { key: 'status', label: 'Status', sort: 'status' },
    { key: 'assigned_to', label: 'Assignee', sort: 'assigned_to', className: 'pl-hide-sm' },
    { key: 'votes', label: 'Votes', sort: 'total_voters', className: 'text-right pl-hide-sm' },
    { key: 'modified', label: 'Modified', sort: 'modified_date', className: 'pl-hide-sm' },
    { key: 'actions', label: '', className: 'cell-actions' },
];

/* Small colour-dotted select used for quick status / priority / severity edits. */
const InlineSelect = ({ value, options, onChange, label, disabled }) => {
    const current = byId(options, value);
    return (
        <span className="pl-inline-select" style={{ '--pill': current?.color || 'var(--neutral-400)' }} onClick={(e) => e.stopPropagation()}>
            <span className="pl-inline-dot" aria-hidden="true" />
            <select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} disabled={disabled}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
        </span>
    );
};

const Issues = () => {
    const { id: projectId } = useParams();
    const { project, reload } = useProject();
    const { canAdd, canModify, canDelete } = usePermissions();
    const toast = useToast();
    const confirm = useConfirm();
    const [searchParams, setSearchParams] = useSearchParams();

    const [q, setQ] = useState('');
    const dq = useDebouncedValue(q, 300);
    const [values, setValues] = useState(EMPTY_FILTERS);
    const [showClosed, setShowClosed] = useState(false);
    const [orderBy, setOrderBy] = useState('-modified_date');
    const [pages, setPages] = useState(1);
    const [statsKey, setStatsKey] = useState(0);
    const filtering = hasActiveValues(values) || !!dq.trim();

    const filterParams = useMemo(() => ({
        ...toParams(values),
        ...(dq.trim() ? { q: dq.trim() } : {}),
        ...(showClosed ? {} : { status__is_closed: false }),
    }), [values, dq, showClosed]);

    const fetchIssues = useCallback(
        () => issueService.list({ project: projectId, order_by: orderBy, page_size: Math.min(PAGE * pages, 1000), ...filterParams })
            .then((r) => ({ items: r.data, total: Number(r.headers?.['x-pagination-count'] ?? r.data.length) })),
        [projectId, orderBy, pages, filterParams],
    );
    const issues = useRemote(fetchIssues);
    // filters_data 500s on status__is_closed, so exclude closed statuses by id instead
    const closedStatusIds = useMemo(() => (project?.issue_statuses || []).filter((st) => st.is_closed).map((st) => st.id), [project]);
    const fetchFilters = useCallback(() => {
        const { status__is_closed: hideClosed, ...rest } = filterParams;
        const params = hideClosed === false && closedStatusIds.length ? { ...rest, exclude_status: closedStatusIds.join(',') } : rest;
        return issueService.getFiltersData(projectId, params).then((r) => r.data);
    }, [projectId, filterParams, closedStatusIds]);
    const filtersData = useRemote(fetchFilters);
    const fetchStats = useCallback(() => projectService.getIssuesStats(projectId).then((r) => ({ ...r.data, statsKey })), [projectId, statsKey]);
    const stats = useRemote(fetchStats);

    const refreshAll = useCallback(() => {
        issues.refresh();
        filtersData.refresh();
        setStatsKey((k) => k + 1);
    }, [issues, filtersData]);

    // filters / sorting reset paging
    const changeValues = (v) => { setValues(v); setPages(1); };
    const changeSearch = (v) => { setQ(v); setPages(1); };
    const toggleSort = (field) => {
        setPages(1);
        setOrderBy((cur) => (cur === field ? `-${field}` : cur === `-${field}` ? field : (field === 'modified_date' || field === 'total_voters' ? `-${field}` : field)));
    };

    // ---- drawer / deep link -------------------------------------------------------------
    const [openId, setOpenId] = useState(null);
    const [modal, setModal] = useState(null); // 'new' | 'bulk'
    const refParam = searchParams.get('ref');
    useEffect(() => {
        if (!refParam) return undefined;
        let alive = true;
        issueService.getByRef(projectId, refParam)
            .then((r) => { if (alive) setOpenId(r.data.id); })
            .catch(() => { if (alive) toast.error(`Issue #${refParam} was not found in this project`); });
        return () => { alive = false; };
    }, [projectId, refParam, toast]);
    const closeDrawer = () => {
        setOpenId(null);
        if (refParam) {
            const next = new URLSearchParams(searchParams);
            next.delete('ref');
            setSearchParams(next, { replace: true });
        }
    };

    // ---- row actions ----------------------------------------------------------------------
    const [savingId, setSavingId] = useState(null);
    const patchIssue = async (issue, field, value, label) => {
        if (issue[field] === value) return;
        setSavingId(issue.id);
        try {
            const res = await issueService.update(issue.id, { [field]: value, version: issue.version });
            issues.setData((d) => (d ? { ...d, items: d.items.map((i) => (i.id === issue.id ? { ...i, ...res.data } : i)) } : d));
            toast.success(`#${issue.ref} ${label} updated`);
            filtersData.refresh();
            setStatsKey((k) => k + 1);
            if (!showClosed && field === 'status' && byId(project?.issue_statuses, value)?.is_closed) issues.refresh();
        } catch (err) {
            toast.error(err);
            issues.refresh();
        } finally {
            setSavingId(null);
        }
    };

    const promote = async (issue) => {
        if (!(await confirm({
            title: 'Promote to user story?',
            message: `A new user story will be created from issue #${issue.ref} “${issue.subject}”. The issue stays open and links to it.`,
            confirmText: 'Promote',
        }))) return;
        try {
            const res = await issueService.promoteToUserStory(issue.id, Number(projectId));
            const ref = Array.isArray(res.data) ? res.data[0] : null;
            toast.success(ref ? `Created user story #${ref}` : 'User story created');
            refreshAll();
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const remove = async (issue) => {
        if (!(await confirm({ title: 'Delete issue?', message: `Issue #${issue.ref} “${issue.subject}” will be permanently deleted.`, confirmText: 'Delete', danger: true }))) return;
        try {
            await issueService.delete(issue.id);
            toast.success(`Issue #${issue.ref} deleted`);
            refreshAll();
        } catch (err) {
            toast.error(err);
        }
    };

    // ---- derived --------------------------------------------------------------------------
    const fd = filtersData.data;
    const filterDefs = [
        { key: 'type', label: 'Type', options: optionsFrom.values(fd?.types) },
        { key: 'severity', label: 'Severity', options: optionsFrom.values(fd?.severities) },
        { key: 'priority', label: 'Priority', options: optionsFrom.values(fd?.priorities) },
        { key: 'status', label: 'Status', options: optionsFrom.values(showClosed ? fd?.statuses : fd?.statuses?.filter((st) => !closedStatusIds.includes(st.id))) },
        { key: 'assigned_to', label: 'Assignee', options: optionsFrom.users(fd?.assigned_to) },
        { key: 'owner', label: 'Created by', options: optionsFrom.users(fd?.owners, 'Unknown') },
        { key: 'tags', label: 'Tags', options: optionsFrom.tags(fd?.tags) },
    ];
    const types = project?.issue_types || [];
    const severities = project?.severities || [];
    const priorities = [...(project?.priorities || [])].sort((a, b) => a.order - b.order);
    const statuses = project?.issue_statuses || [];
    const items = issues.data?.items || [];
    const total = issues.data?.total ?? 0;
    const editable = canModify('issue');

    const s = stats.data;
    const prioritySegments = s ? Object.values(s.issues_per_priority || {}).filter((p) => p.count > 0) : [];
    const prioTotal = prioritySegments.reduce((a, p) => a + p.count, 0);

    const sortIcon = (field) => {
        if (!field) return null;
        if (orderBy === field) return <FaSortUp size={10} />;
        if (orderBy === `-${field}`) return <FaSortDown size={10} />;
        return <FaSort size={10} className="pl-sort-idle" />;
    };

    return (
        <div className="pl-page">
            <PageHeader
                icon={<FaBug />}
                title="Issues"
                subtitle="Bugs, questions and enhancements reported against this project."
                actions={canAdd('issue') && (
                    <>
                        <Button variant="secondary" icon={<FaLayerGroup />} onClick={() => setModal('bulk')}>Bulk add</Button>
                        <Button icon={<FaPlus />} onClick={() => setModal('new')}>New issue</Button>
                    </>
                )}
            />

            {/* ------------------------------- stats strip ------------------------------- */}
            <div className="pl-issue-stats">
                <div className="pl-kpi tone-warning">
                    <span className="pl-kpi-icon"><FaExclamationCircle /></span>
                    <span className="pl-kpi-value">{s ? s.opened_issues : '–'}</span>
                    <span className="pl-kpi-label">Open</span>
                </div>
                <div className="pl-kpi tone-success">
                    <span className="pl-kpi-icon"><FaCheckCircle /></span>
                    <span className="pl-kpi-value">{s ? s.closed_issues : '–'}</span>
                    <span className="pl-kpi-label">Closed {s && s.total_issues ? `· ${percent(s.closed_issues, s.total_issues)}%` : ''}</span>
                </div>
                <div className="pl-kpi pl-kpi-wide">
                    <span className="pl-kpi-label">By priority</span>
                    {s && prioTotal > 0 ? (
                        <>
                            <div className="progress-stack mt-1" role="img" aria-label={prioritySegments.map((p) => `${p.name}: ${p.count}`).join(', ')}>
                                {prioritySegments.map((p) => <span key={p.id} style={{ width: `${(p.count / prioTotal) * 100}%`, background: p.color }} title={`${p.name}: ${p.count}`} />)}
                            </div>
                            <div className="pl-legend">
                                {prioritySegments.map((p) => (
                                    <span key={p.id} className="pl-legend-item"><span className="dot" style={{ background: p.color }} />{p.name} <b className="tabular">{p.count}</b></span>
                                ))}
                            </div>
                        </>
                    ) : <span className="text-sm text-muted mt-1">{s ? 'No issues yet' : '…'}</span>}
                </div>
            </div>

            <FilterBar
                search={q}
                onSearchChange={changeSearch}
                searchPlaceholder="Search issues…"
                filters={filterDefs}
                values={values}
                onChange={changeValues}
                onClearAll={() => { changeValues(EMPTY_FILTERS); setQ(''); }}
            >
                <Switch checked={showClosed} onChange={(v) => { setShowClosed(v); setPages(1); }} label="Show closed" />
            </FilterBar>

            {/* ---------------------------------- table ---------------------------------- */}
            {!issues.data && !issues.error ? (
                <div className="card"><Loader label="Loading issues…" /></div>
            ) : issues.error && !issues.data ? (
                <div className="alert alert-error">Could not load issues. <button type="button" className="btn btn-sm btn-secondary ml-auto" onClick={issues.refresh}>Retry</button></div>
            ) : items.length === 0 ? (
                <div className="card">
                    {filtering || !showClosed ? (
                        <EmptyState
                            icon={<FaFilter />}
                            title={filtering ? 'No issues match these filters' : 'No open issues'}
                            description={filtering ? 'Try a different search or clear the filters.' : 'Everything reported so far is closed. Turn on “Show closed” to see them.'}
                            action={filtering
                                ? <Button variant="secondary" onClick={() => { changeValues(EMPTY_FILTERS); setQ(''); }}>Clear filters</Button>
                                : canAdd('issue') && <Button icon={<FaPlus />} onClick={() => setModal('new')}>New issue</Button>}
                        />
                    ) : (
                        <EmptyState icon={<FaBug />} title="No issues yet" description="Report bugs, questions and enhancement requests here." action={canAdd('issue') && <Button icon={<FaPlus />} onClick={() => setModal('new')}>New issue</Button>} />
                    )}
                </div>
            ) : (
                <>
                    <div className={`table-wrap pl-issues-table ${issues.loading ? 'is-loading' : ''}`}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {COLUMNS.map((c) => (
                                        <th
                                            key={c.key}
                                            className={c.className}
                                            aria-sort={c.sort ? (orderBy === c.sort ? 'ascending' : orderBy === `-${c.sort}` ? 'descending' : 'none') : undefined}
                                        >
                                            {c.sort ? (
                                                <button type="button" className="pl-sort" onClick={() => toggleSort(c.sort)}>
                                                    {c.label} {sortIcon(c.sort)}
                                                </button>
                                            ) : <span className="sr-only">Actions</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((issue) => {
                                    const type = byId(types, issue.type);
                                    const status = byId(statuses, issue.status);
                                    return (
                                        <tr
                                            key={issue.id}
                                            className={`clickable ${issue.is_closed ? 'pl-row-closed' : ''} ${savingId === issue.id ? 'pl-row-saving' : ''}`}
                                            onClick={() => setOpenId(issue.id)}
                                            tabIndex={0}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setOpenId(issue.id); }}
                                            aria-label={`Issue #${issue.ref} ${issue.subject}`}
                                        >
                                            <td className="pl-col-ref"><span className="ref">#{issue.ref}</span></td>
                                            <td className="pl-hide-sm">
                                                <span className="pl-type" title={type?.name}>
                                                    <span className="dot" style={{ background: type?.color }} />
                                                    <span className="pl-type-name">{type?.name || '—'}</span>
                                                </span>
                                            </td>
                                            <td className="pl-hide-sm">
                                                {editable ? <InlineSelect value={issue.severity} options={severities} label={`Severity of #${issue.ref}`} onChange={(v) => patchIssue(issue, 'severity', v, 'severity')} disabled={savingId === issue.id} />
                                                    : <span className="pl-type"><span className="dot" style={{ background: byId(severities, issue.severity)?.color }} />{byId(severities, issue.severity)?.name}</span>}
                                            </td>
                                            <td>
                                                {editable ? <InlineSelect value={issue.priority} options={priorities} label={`Priority of #${issue.ref}`} onChange={(v) => patchIssue(issue, 'priority', v, 'priority')} disabled={savingId === issue.id} />
                                                    : <span className="pl-type"><span className="dot" style={{ background: byId(priorities, issue.priority)?.color }} />{byId(priorities, issue.priority)?.name}</span>}
                                            </td>
                                            <td className="pl-col-subject">
                                                <span className="cell-title">{issue.subject}</span>
                                                {issue.is_blocked && <span className="badge badge-error pl-blocked pl-ml">Blocked</span>}
                                            </td>
                                            <td>
                                                {editable ? (
                                                    <span className="pl-status-select status-pill" style={{ '--pill': status?.color }} onClick={(e) => e.stopPropagation()}>
                                                        <select value={issue.status} onChange={(e) => patchIssue(issue, 'status', Number(e.target.value), 'status')} aria-label={`Status of #${issue.ref}`} disabled={savingId === issue.id}>
                                                            {statuses.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                                                        </select>
                                                    </span>
                                                ) : <span className="status-pill" style={{ '--pill': status?.color }}>{status?.name}</span>}
                                            </td>
                                            <td className="pl-hide-sm">
                                                {issue.assigned_to_extra_info ? (
                                                    <span className="row gap-2 nowrap"><UserAvatar user={issue.assigned_to_extra_info} size="xs" /><span className="text-sm truncate pl-assignee-name">{userName(issue.assigned_to_extra_info)}</span></span>
                                                ) : <span className="text-sm text-muted">Unassigned</span>}
                                            </td>
                                            <td className="text-right tabular pl-hide-sm">
                                                <span className={`pl-votes ${issue.is_voter ? 'is-on' : ''}`}><FaThumbsUp size={10} /> {issue.total_voters || 0}</span>
                                            </td>
                                            <td className="nowrap text-sm text-secondary pl-hide-sm" title={formatDateTime(issue.modified_date)}>{timeAgo(issue.modified_date)}</td>
                                            <td className="cell-actions" onClick={(e) => e.stopPropagation()}>
                                                <Dropdown trigger={<button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Actions for #${issue.ref}`}><FaEllipsisH size={12} /></button>}>
                                                    <DropdownItem icon={<FaExternalLinkAlt size={11} />} onClick={() => setOpenId(issue.id)}>Open details</DropdownItem>
                                                    {canAdd('us') && <DropdownItem icon={<FaArrowUp size={11} />} onClick={() => promote(issue)}>Promote to user story</DropdownItem>}
                                                    {canDelete('issue') && (
                                                        <>
                                                            <DropdownDivider />
                                                            <DropdownItem icon={<FaTrash size={11} />} danger onClick={() => remove(issue)}>Delete issue</DropdownItem>
                                                        </>
                                                    )}
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="pl-table-foot">
                        <span className="text-sm text-muted tabular">Showing {items.length} of {total} {showClosed ? '' : 'open '}issues</span>
                        {items.length < total && (
                            <Button variant="secondary" size="sm" onClick={() => setPages((p) => p + 1)} loading={issues.loading}>Load {Math.min(PAGE, total - items.length)} more</Button>
                        )}
                        {project?.is_backlog_activated && <Link to={`/project/${projectId}/backlog`} className="btn btn-ghost btn-sm ml-auto">Go to backlog</Link>}
                    </div>
                </>
            )}

            {openId && (
                <IssueDetail
                    issueId={openId}
                    projectId={projectId}
                    onClose={closeDrawer}
                    onUpdate={refreshAll}
                    onDelete={() => { closeDrawer(); refreshAll(); }}
                />
            )}
            {modal === 'new' && (
                <CreateIssueModal
                    projectId={projectId}
                    onClose={() => setModal(null)}
                    onIssueCreated={() => { setModal(null); refreshAll(); }}
                />
            )}
            {modal === 'bulk' && (
                <BulkAddModal
                    title="Bulk add issues"
                    itemLabel="issues"
                    hint="Issues are created with the project's default type, status, priority and severity."
                    onClose={() => setModal(null)}
                    onSubmit={(text) => issueService.bulkCreate(Number(projectId), text).then(refreshAll)}
                />
            )}
        </div>
    );
};

export default Issues;
