import React, { useMemo, useState } from 'react';
import {
    FaFileContract, FaPlus, FaSearch, FaTable, FaThLarge, FaRegCommentDots, FaCalendarAlt,
    FaRedo, FaHourglassHalf, FaPlayCircle, FaPauseCircle, FaCheckCircle, FaRegCircle, FaFolderOpen,
} from 'react-icons/fa';
import { tenderService, TENDER_STATUSES } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { formatDate, timeAgo } from '../utils/format';
import { PageHeader, EmptyState, Loader } from './UI';
import CreateTenderModal from './CreateTenderModal';
import TenderDetail from './TenderDetail';
import OpeningDate from './modules/OpeningDate';
import { TenderStatusPill } from './modules/TenderStatus';
import { useModuleRecords } from './modules/hooks';
import { lastActivity, matches, openingInfo, relativeDays, UPCOMING_WINDOW } from './modules/moduleUtils';
import '../styles/modules.css';

const STATUS_ICONS = {
    not_started: <FaRegCircle />,
    pending: <FaHourglassHalf />,
    in_progress: <FaPlayCircle />,
    on_hold: <FaPauseCircle />,
    completed: <FaCheckCircle />,
};

const initialView = () => (typeof window !== 'undefined' && window.innerWidth < 720 ? 'cards' : 'table');

/*
 * Tenders register. With `projectId` it shows one project's tenders, without it every tender
 * across the user's projects. Pass `header` ({ title, subtitle, icon }) to render the page header.
 */
const Tenders = ({ projectId, header }) => {
    const { project } = useProject();
    const projectInfo = projectId && project && String(project.id) === String(projectId) ? project : null;
    const { records, projects, loading, error, failed, reload, upsert } = useModuleRecords(tenderService.list, projectId, projectInfo);
    const isGlobal = !projectId;

    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const [projectFilter, setProjectFilter] = useState('all');
    const [view, setView] = useState(initialView);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    // Records after project + search filters (status counts are computed from these).
    const scoped = useMemo(() => records.filter((t) =>
        (projectFilter === 'all' || String(t.project) === String(projectFilter))
        && matches(q, t.name_of_tenders, t._project?.name, t.tech_opeining, t.financial_opening)), [records, projectFilter, q]);

    const counts = useMemo(() => {
        const c = Object.fromEntries(TENDER_STATUSES.map((s) => [s.value, 0]));
        scoped.forEach((t) => { c[t.status || 'not_started'] = (c[t.status || 'not_started'] || 0) + 1; });
        return c;
    }, [scoped]);

    const visible = useMemo(() => scoped
        .filter((t) => status === 'all' || (t.status || 'not_started') === status)
        .sort((a, b) => new Date(lastActivity(b, b.tender_remarks)) - new Date(lastActivity(a, a.tender_remarks))), [scoped, status]);

    // Openings in the next 14 days (and today) for tenders that are not completed.
    const upcoming = useMemo(() => scoped
        .filter((t) => t.status !== 'completed')
        .flatMap((t) => [
            { t, kind: 'Technical', info: openingInfo(t.tech_opeining) },
            { t, kind: 'Financial', info: openingInfo(t.financial_opening) },
        ])
        .filter((e) => e.info.state === 'soon' || e.info.state === 'today')
        .sort((a, b) => a.info.days - b.info.days), [scoped]);

    const selected = records.find((t) => t.id === selectedId) || null;
    const filtersActive = q || status !== 'all' || projectFilter !== 'all';
    const clearFilters = () => { setQ(''); setStatus('all'); setProjectFilter('all'); };

    const createButton = (
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={isGlobal && !projects.length}>
            <FaPlus size={12} /> New tender
        </button>
    );

    const subtitle = header?.subtitle ?? (isGlobal ? 'Procurement packages across all your projects' : 'Procurement packages for this project');

    let body;
    if (loading) {
        body = <Loader label="Loading tenders…" />;
    } else if (error) {
        body = (
            <div className="alert alert-error">
                <div className="flex-1">Couldn&apos;t load tenders. {error?.message}</div>
                <button className="btn btn-secondary btn-sm" onClick={reload}><FaRedo size={11} /> Retry</button>
            </div>
        );
    } else if (isGlobal && !projects.length) {
        body = (
            <div className="card">
                <EmptyState icon={<FaFolderOpen />} title="No projects yet" description="Tenders belong to a project. Join or create a project to start tracking procurement." />
            </div>
        );
    } else if (!records.length) {
        body = (
            <div className="card">
                <EmptyState
                    icon={<FaFileContract />}
                    title="No tenders yet"
                    description="Track each procurement package from advertisement through technical and financial bid openings to award."
                    action={createButton}
                />
            </div>
        );
    } else {
        body = (
            <>
                <div className="mod-stats" role="group" aria-label="Filter by status">
                    {TENDER_STATUSES.map((s) => (
                        <button
                            key={s.value}
                            type="button"
                            className={`stat-card mod-stat tone-${s.tone} ${status === s.value ? 'is-active' : ''}`}
                            onClick={() => setStatus(status === s.value ? 'all' : s.value)}
                            aria-pressed={status === s.value}
                        >
                            <span className="stat-icon">{STATUS_ICONS[s.value]}</span>
                            <span className="flex-1">
                                <span className="stat-value">{counts[s.value] || 0}</span>
                                <span className="stat-label">{s.label}</span>
                            </span>
                        </button>
                    ))}
                </div>

                <UpcomingOpenings events={upcoming} onOpen={setSelectedId} showProject={isGlobal} />

                <div className="toolbar mod-toolbar">
                    <div className="form-input-icon mod-search">
                        <FaSearch size={13} />
                        <input
                            className="form-input"
                            type="search"
                            placeholder="Search tenders…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            aria-label="Search tenders"
                        />
                    </div>
                    {isGlobal && projects.length > 1 && (
                        <select className="form-input mod-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Project">
                            <option value="all">All projects</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                    <div className="segmented mod-segmented" role="group" aria-label="Status">
                        <button type="button" className={status === 'all' ? 'active' : ''} onClick={() => setStatus('all')}>
                            All <span className="mod-count">{scoped.length}</span>
                        </button>
                        {TENDER_STATUSES.map((s) => (
                            <button key={s.value} type="button" className={status === s.value ? 'active' : ''} onClick={() => setStatus(s.value)}>
                                <span className={`dot tone-${s.tone}`} />{s.label}
                                <span className="mod-count">{counts[s.value] || 0}</span>
                            </button>
                        ))}
                    </div>
                    <div className="segmented ml-auto" role="group" aria-label="View">
                        <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label="Table view" title="Table view"><FaTable /></button>
                        <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-label="Card view" title="Card view"><FaThLarge /></button>
                    </div>
                </div>

                {failed.length > 0 && (
                    <div className="alert alert-warning mb-4">
                        Couldn&apos;t load tenders for {failed.map((p) => p.name).join(', ')}.
                        <button className="btn btn-ghost btn-sm ml-auto" onClick={reload}><FaRedo size={11} /> Retry</button>
                    </div>
                )}

                {visible.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            icon={<FaSearch />}
                            title="No tenders match"
                            description="Try a different search or status."
                            action={filtersActive ? <button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button> : null}
                        />
                    </div>
                ) : view === 'table' ? (
                    <TenderTable rows={visible} showProject={isGlobal} onOpen={setSelectedId} />
                ) : (
                    <div className="grid-auto">
                        {visible.map((t) => <TenderCard key={t.id} tender={t} showProject={isGlobal} onOpen={setSelectedId} />)}
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="mod-page">
            {header ? (
                <PageHeader
                    icon={header.icon || <FaFileContract />}
                    title={header.title || 'Tenders'}
                    subtitle={subtitle}
                    actions={createButton}
                />
            ) : (
                <div className="section-header">
                    <h2 className="section-title"><FaFileContract /> Tenders</h2>
                    {createButton}
                </div>
            )}

            {body}

            {showCreate && (
                <CreateTenderModal
                    projectId={projectId}
                    projects={isGlobal ? projects : undefined}
                    defaultProjectId={projectFilter !== 'all' ? projectFilter : undefined}
                    onClose={() => setShowCreate(false)}
                    onCreated={(t) => {
                        setShowCreate(false);
                        if (t) { upsert(t); setSelectedId(t.id); } else reload();
                    }}
                />
            )}

            <TenderDetail
                tender={selected}
                isOpen={!!selected}
                showProject={isGlobal}
                onClose={() => setSelectedId(null)}
                onUpdated={upsert}
            />
        </div>
    );
};

const remarkCount = (t) => (t.tender_remarks || []).length;
const onKeyOpen = (fn) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
};

const TenderTable = ({ rows, showProject, onOpen }) => (
    <div className="table-wrap">
        <table className="data-table mod-table">
            <thead>
                <tr>
                    <th>Tender</th>
                    {showProject && <th>Project</th>}
                    <th>Status</th>
                    <th>Technical opening</th>
                    <th>Financial opening</th>
                    <th className="text-center">Remarks</th>
                    <th>Updated</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((t) => (
                    <tr key={t.id} className="clickable" tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={onKeyOpen(() => onOpen(t.id))}>
                        <td>
                            <div className="cell-title">{t.name_of_tenders || 'Untitled tender'}</div>
                            <div className="ref">TND-{String(t.id).padStart(3, '0')}</div>
                        </td>
                        {showProject && <td className="text-secondary">{t._project?.name || `Project #${t.project}`}</td>}
                        <td><TenderStatusPill status={t.status} /></td>
                        <td><OpeningDate value={t.tech_opeining} done={t.status === 'completed'} /></td>
                        <td><OpeningDate value={t.financial_opening} done={t.status === 'completed'} /></td>
                        <td className="text-center">
                            {remarkCount(t) ? (
                                <span className="mod-remarks-count"><FaRegCommentDots size={12} /> {remarkCount(t)}</span>
                            ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="text-secondary nowrap" title={formatDate(lastActivity(t, t.tender_remarks))}>
                            {timeAgo(lastActivity(t, t.tender_remarks))}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const TenderCard = ({ tender: t, showProject, onOpen }) => (
    <div className="card card-clickable mod-card" role="button" tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={onKeyOpen(() => onOpen(t.id))}>
        <div className="row justify-between items-start mb-2">
            <span className="ref">TND-{String(t.id).padStart(3, '0')}</span>
            <TenderStatusPill status={t.status} />
        </div>
        <div className="mod-card-title">{t.name_of_tenders || 'Untitled tender'}</div>
        {showProject && <div className="text-sm text-muted truncate">{t._project?.name}</div>}
        <dl className="mod-dl">
            <div><dt>Technical opening</dt><dd><OpeningDate value={t.tech_opeining} done={t.status === 'completed'} /></dd></div>
            <div><dt>Financial opening</dt><dd><OpeningDate value={t.financial_opening} done={t.status === 'completed'} /></dd></div>
        </dl>
        <div className="mod-card-foot">
            <span><FaRegCommentDots size={12} /> {remarkCount(t)} remark{remarkCount(t) === 1 ? '' : 's'}</span>
            <span>Updated {timeAgo(lastActivity(t, t.tender_remarks))}</span>
        </div>
    </div>
);

const UpcomingOpenings = ({ events, onOpen, showProject }) => (
    <div className="card flush mod-upcoming mb-4">
        <div className="card-header">
            <div className="row">
                <FaCalendarAlt className="text-warning" aria-hidden="true" />
                <h3 className="card-title">Upcoming bid openings</h3>
                <span className="badge">{events.length}</span>
            </div>
            <span className="text-xs text-muted">Next {UPCOMING_WINDOW} days</span>
        </div>
        {events.length === 0 ? (
            <p className="mod-upcoming-empty">No technical or financial openings scheduled in the next {UPCOMING_WINDOW} days.</p>
        ) : (
            <div className="mod-upcoming-list">
                {events.map((e) => (
                    <button type="button" key={`${e.t.id}-${e.kind}`} className={`mod-event is-${e.info.state}`} onClick={() => onOpen(e.t.id)}>
                        <span className="mod-event-date">
                            <span className="mod-event-day">{e.info.date.getDate()}</span>
                            <span className="mod-event-month">{e.info.date.toLocaleDateString(undefined, { month: 'short' })}</span>
                        </span>
                        <span className="mod-event-main">
                            <span className="mod-event-title">{e.t.name_of_tenders || 'Untitled tender'}</span>
                            <span className="mod-event-sub">
                                {e.kind} opening · {relativeDays(e.info.days)}
                                {showProject && e.t._project?.name ? ` · ${e.t._project.name}` : ''}
                            </span>
                        </span>
                    </button>
                ))}
            </div>
        )}
    </div>
);

export default Tenders;
