import React, { useMemo, useState } from 'react';
import {
    FaUserTie, FaPlus, FaSearch, FaUsers, FaUserCheck, FaUserClock, FaRedo, FaFileAlt,
    FaRegCommentDots, FaExternalLinkAlt, FaFolderOpen, FaCalendarAlt,
} from 'react-icons/fa';
import { hrService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { formatNumber, percent } from '../utils/format';
import { PageHeader, EmptyState, Loader, Ring, StatCard, Switch } from './UI';
import CreateHRModal from './CreateHRModal';
import HRDetail from './HRDetail';
import StaffingBar from './modules/StaffingBar';
import { useModuleRecords } from './modules/hooks';
import { matches } from './modules/moduleUtils';
import '../styles/modules.css';

const num = (v) => Number(v) || 0;

/*
 * HR & staffing register (sanctioned posts, filled, vacant). With `projectId` it shows one project,
 * without it every record across the user's projects. Pass `header` to render the page header.
 */
const HR = ({ projectId, header }) => {
    const { project } = useProject();
    const projectInfo = projectId && project && String(project.id) === String(projectId) ? project : null;
    const { records, projects, loading, error, failed, reload, upsert } = useModuleRecords(hrService.list, projectId, projectInfo);
    const isGlobal = !projectId;

    const [q, setQ] = useState('');
    const [position, setPosition] = useState('all');
    const [onlyVacant, setOnlyVacant] = useState(false);
    const [projectFilter, setProjectFilter] = useState('all');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedId, setSelectedId] = useState(null);

    const positions = useMemo(
        () => [...new Set(records.map((r) => (r.position || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
        [records],
    );

    const visible = useMemo(() => records
        .filter((r) => (projectFilter === 'all' || String(r.project) === String(projectFilter))
            && (position === 'all' || (r.position || '').trim() === position)
            && (!onlyVacant || num(r.vacancy) > 0)
            && matches(q, r.hr_name, r.position, r.ppps, r.filename, r._project?.name))
        .sort((a, b) => b.id - a.id), [records, projectFilter, position, onlyVacant, q]);

    const totals = useMemo(() => visible.reduce((acc, r) => ({
        posts: acc.posts + num(r.no_of_posts),
        filled: acc.filled + num(r.filled),
        vacant: acc.vacant + num(r.vacancy),
    }), { posts: 0, filled: 0, vacant: 0 }), [visible]);
    const fillRate = percent(totals.filled, totals.posts);

    const byPosition = useMemo(() => {
        const map = new Map();
        visible.forEach((r) => {
            const k = (r.position || 'Unspecified').trim() || 'Unspecified';
            const cur = map.get(k) || { name: k, posts: 0, filled: 0, vacant: 0 };
            cur.posts += num(r.no_of_posts); cur.filled += num(r.filled); cur.vacant += num(r.vacancy);
            map.set(k, cur);
        });
        return [...map.values()].filter((p) => p.posts || p.filled || p.vacant).sort((a, b) => b.vacant - a.vacant || b.posts - a.posts);
    }, [visible]);

    const selected = records.find((r) => r.id === selectedId) || null;
    const filtersActive = q || position !== 'all' || onlyVacant || projectFilter !== 'all';
    const clearFilters = () => { setQ(''); setPosition('all'); setOnlyVacant(false); setProjectFilter('all'); };

    const createButton = (
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} disabled={isGlobal && !projects.length}>
            <FaPlus size={12} /> New HR record
        </button>
    );

    let body;
    if (loading) {
        body = <Loader label="Loading staffing records…" />;
    } else if (error) {
        body = (
            <div className="alert alert-error">
                <div className="flex-1">Couldn&apos;t load HR records. {error?.message}</div>
                <button className="btn btn-secondary btn-sm" onClick={reload}><FaRedo size={11} /> Retry</button>
            </div>
        );
    } else if (isGlobal && !projects.length) {
        body = (
            <div className="card">
                <EmptyState icon={<FaFolderOpen />} title="No projects yet" description="Staffing records belong to a project. Join or create a project first." />
            </div>
        );
    } else if (!records.length) {
        body = (
            <div className="card">
                <EmptyState
                    icon={<FaUserTie />}
                    title="No staffing records yet"
                    description="Record sanctioned posts per cadre (position, pay scale, posts, filled and vacant) to track recruitment progress."
                    action={createButton}
                />
            </div>
        );
    } else {
        body = (
            <>
                <div className="stats-grid">
                    <StatCard icon={<FaUsers />} label="Sanctioned posts" value={formatNumber(totals.posts)} hint={`${visible.length} record${visible.length === 1 ? '' : 's'}`} tone="primary" />
                    <StatCard icon={<FaUserCheck />} label="Filled" value={formatNumber(totals.filled)} tone="success" />
                    <StatCard icon={<FaUserClock />} label="Vacant" value={formatNumber(totals.vacant)} hint={totals.vacant ? 'Open for recruitment' : 'Fully staffed'} tone="warning" />
                    <div className="stat-card mod-ring-card">
                        <Ring value={fillRate} size={64} tone={fillRate >= 85 ? 'success' : fillRate >= 60 ? 'primary' : 'warning'} />
                        <div className="flex-1">
                            <div className="stat-label">Fill rate</div>
                            <div className="stat-hint">{formatNumber(totals.filled)} of {formatNumber(totals.posts)} posts filled</div>
                        </div>
                    </div>
                </div>

                <div className="toolbar mod-toolbar">
                    <div className="form-input-icon mod-search">
                        <FaSearch size={13} />
                        <input
                            className="form-input"
                            type="search"
                            placeholder="Search title, position, pay scale…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            aria-label="Search HR records"
                        />
                    </div>
                    <select className="form-input mod-select" value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Position">
                        <option value="all">All positions</option>
                        {positions.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {isGlobal && projects.length > 1 && (
                        <select className="form-input mod-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} aria-label="Project">
                            <option value="all">All projects</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                    <Switch checked={onlyVacant} onChange={setOnlyVacant} label="Has vacancies" />
                    {filtersActive && <button className="btn btn-ghost btn-sm ml-auto" onClick={clearFilters}>Clear filters</button>}
                </div>

                {failed.length > 0 && (
                    <div className="alert alert-warning mb-4">
                        Couldn&apos;t load HR records for {failed.map((p) => p.name).join(', ')}.
                        <button className="btn btn-ghost btn-sm ml-auto" onClick={reload}><FaRedo size={11} /> Retry</button>
                    </div>
                )}

                {visible.length === 0 ? (
                    <div className="card">
                        <EmptyState
                            icon={<FaSearch />}
                            title="No records match"
                            description="Try a different search or filter."
                            action={<button className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>}
                        />
                    </div>
                ) : (
                    <div className="grid-main-side">
                        <div className="mod-hr-grid">
                            {visible.map((r) => <HRCard key={r.id} record={r} showProject={isGlobal} onOpen={setSelectedId} />)}
                        </div>
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">Vacancies by position</h3>
                            </div>
                            <div className="mod-legend mb-3">
                                <span><i className="mod-swatch is-filled" /> Filled</span>
                                <span><i className="mod-swatch is-vacant" /> Vacant</span>
                            </div>
                            {byPosition.length === 0 && <p className="text-sm text-muted">No sanctioned posts recorded in these records.</p>}
                            <div className="stack-sm">
                                {byPosition.map((p) => (
                                    <div key={p.name} className="mod-pos-row">
                                        <div className="row justify-between text-sm">
                                            <span className="font-semibold text-heading truncate">{p.name}</span>
                                            <span className="text-muted tabular nowrap">{p.filled}/{p.posts}{p.vacant ? ` · ${p.vacant} vacant` : ''}</span>
                                        </div>
                                        <StaffingBar posts={p.posts} filled={p.filled} vacant={p.vacant} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return (
        <div className="mod-page">
            {header ? (
                <PageHeader
                    icon={header.icon || <FaUserTie />}
                    title={header.title || 'HR & staffing'}
                    subtitle={header.subtitle}
                    actions={createButton}
                />
            ) : (
                <div className="section-header">
                    <h2 className="section-title"><FaUserTie /> HR &amp; staffing</h2>
                    {createButton}
                </div>
            )}

            {body}

            {showCreate && (
                <CreateHRModal
                    projectId={projectId}
                    projects={isGlobal ? projects : undefined}
                    defaultProjectId={projectFilter !== 'all' ? projectFilter : undefined}
                    positions={positions}
                    onClose={() => setShowCreate(false)}
                    onCreated={(rec) => {
                        setShowCreate(false);
                        if (rec) upsert(rec); else reload();
                    }}
                />
            )}

            <HRDetail
                hr={selected}
                isOpen={!!selected}
                showProject={isGlobal}
                onClose={() => setSelectedId(null)}
                onUpdated={upsert}
            />
        </div>
    );
};

const HRCard = ({ record: r, showProject, onOpen }) => {
    const rate = percent(r.filled, r.no_of_posts);
    const remarks = (r.hr_remarks || []).length;
    const open = () => onOpen(r.id);
    return (
        <div
            className="card card-clickable mod-card mod-hr-card"
            role="button"
            tabIndex={0}
            onClick={open}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
        >
            <div className="row justify-between items-start gap-2">
                <div className="flex-1">
                    <div className="mod-card-title">{r.hr_name || 'Untitled record'}</div>
                    <div className="text-sm text-secondary truncate">
                        {r.position || 'Position not set'}
                        {showProject && r._project?.name ? <span className="text-muted"> · {r._project.name}</span> : null}
                    </div>
                </div>
                {r.ppps && <span className="badge badge-primary mono">{r.ppps}</span>}
            </div>

            <div className="mod-hr-figures">
                <div><span className="mod-fig">{num(r.no_of_posts)}</span><span className="mod-fig-label">Posts</span></div>
                <div className="is-filled"><span className="mod-fig">{num(r.filled)}</span><span className="mod-fig-label">Filled</span></div>
                <div className="is-vacant"><span className="mod-fig">{num(r.vacancy)}</span><span className="mod-fig-label">Vacant</span></div>
                <div className="mod-hr-rate"><span className="mod-fig">{rate}%</span><span className="mod-fig-label">Fill rate</span></div>
            </div>
            <StaffingBar posts={r.no_of_posts} filled={r.filled} vacant={r.vacancy} />

            <div className="mod-card-foot">
                <span title="Period"><FaCalendarAlt size={11} /> {r.get_year_per_title || '—'}</span>
                {r.file_url ? (
                    <a href={r.file_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mod-doc-link">
                        <FaFileAlt size={11} /> Document <FaExternalLinkAlt size={9} />
                    </a>
                ) : (
                    <span className="text-muted" title={r.filename || undefined}><FaFileAlt size={11} /> No document</span>
                )}
                <span><FaRegCommentDots size={11} /> {remarks}</span>
            </div>
        </div>
    );
};

export default HR;
