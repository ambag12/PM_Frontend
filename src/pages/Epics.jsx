import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FaLayerGroup, FaPlus, FaChevronRight, FaChevronDown, FaFilter, FaToggleOn, FaBookOpen } from 'react-icons/fa';
import { epicService, userStoryService, projectService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Button, EmptyState, Loader, StatusPill, UserAvatar } from '../components/UI';
import FilterBar from '../components/FilterBar';
import EpicDetail from '../components/EpicDetail';
import UserStoryDetail from '../components/UserStoryDetail';
import CreateEpicModal from '../components/CreateEpicModal';
import CreateUserStoryModal from '../components/CreateUserStoryModal';
import { PointsBadge } from '../components/planning/Bits';
import { ALL, useRemote, useDebouncedValue, toParams, hasActiveValues, optionsFrom, storyPoints } from '../components/planning/utils';
import { userName } from '../utils/format';
import '../styles/planning.css';

const EMPTY_FILTERS = { status: [], assigned_to: [] };

/* Related user stories of one epic, loaded when its row is expanded. */
const EpicStories = ({ epic, projectId, points, refreshKey, canAddStory, onOpenStory, onAddStory }) => {
    const fetchStories = useCallback(
        () => userStoryService.list({ project: projectId, epic: epic.id, ...ALL }).then((r) => ({ items: r.data, refreshKey })),
        [projectId, epic.id, refreshKey],
    );
    const { data, error } = useRemote(fetchStories);
    if (error && !data) return <div className="alert alert-error">Could not load related stories.</div>;
    if (!data) return <div className="pl-epic-stories-loading"><span className="spinner spinner-sm" /> Loading stories…</div>;
    const stories = data.items;
    return (
        <div className="pl-epic-stories">
            {stories.length === 0 ? (
                <p className="text-sm text-muted">No user stories linked to this epic yet.</p>
            ) : (
                <ul className="pl-epic-story-list">
                    {stories.map((s) => (
                        <li key={s.id}>
                            <button type="button" className="pl-epic-story" onClick={() => onOpenStory(s.id)}>
                                <span className="ref">#{s.ref}</span>
                                <span className="pl-epic-story-subject">{s.subject}</span>
                                {s.milestone_name && <span className="badge pl-sprint-badge" title="Sprint">{s.milestone_name}</span>}
                                <StatusPill status={s.status_extra_info} className="pl-pill-sm" />
                                <PointsBadge value={storyPoints(s, points)} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {canAddStory && (
                <Button size="sm" variant="ghost" icon={<FaPlus />} onClick={() => onAddStory(epic)}>Add story to this epic</Button>
            )}
        </div>
    );
};

const Epics = () => {
    const { id: projectId } = useParams();
    const { project, reload } = useProject();
    const { canAdd, isAdmin, isOwner } = usePermissions();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [q, setQ] = useState('');
    const dq = useDebouncedValue(q, 300);
    const [values, setValues] = useState(EMPTY_FILTERS);
    const filterParams = useMemo(() => ({ ...toParams(values), ...(dq.trim() ? { q: dq.trim() } : {}) }), [values, dq]);
    const filtering = hasActiveValues(values) || !!dq.trim();
    const enabled = !!project?.is_epics_activated;

    const fetchEpics = useCallback(
        () => (enabled ? epicService.list({ project: projectId, ...ALL, ...filterParams }).then((r) => r.data) : Promise.resolve([])),
        [projectId, filterParams, enabled],
    );
    const epics = useRemote(fetchEpics);
    const fetchFilters = useCallback(
        () => (enabled ? epicService.getFiltersData(projectId, filterParams).then((r) => r.data) : Promise.resolve(null)),
        [projectId, filterParams, enabled],
    );
    const filtersData = useRemote(fetchFilters);

    const [expanded, setExpanded] = useState(() => new Set());
    const [storiesKey, setStoriesKey] = useState(0);
    const [open, setOpen] = useState(null); // { type: 'epic'|'story', id }
    const [modal, setModal] = useState(null); // { type: 'epic' } | { type: 'story', epic }
    const [enabling, setEnabling] = useState(false);

    const refreshAll = useCallback(() => {
        epics.refresh();
        filtersData.refresh();
        setStoriesKey((k) => k + 1);
    }, [epics, filtersData]);

    const toggle = (id) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    // ?ref=N deep link
    const refParam = searchParams.get('ref');
    useEffect(() => {
        if (!refParam) return undefined;
        let alive = true;
        epicService.getByRef(projectId, refParam)
            .then((r) => { if (alive) setOpen({ type: 'epic', id: r.data.id }); })
            .catch(() => { if (alive) toast.error(`Epic #${refParam} was not found in this project`); });
        return () => { alive = false; };
    }, [projectId, refParam, toast]);
    const closeDrawer = () => {
        setOpen(null);
        if (refParam) {
            const next = new URLSearchParams(searchParams);
            next.delete('ref');
            setSearchParams(next, { replace: true });
        }
    };

    const enableEpics = async () => {
        setEnabling(true);
        try {
            await projectService.update(projectId, { is_epics_activated: true });
            await reload();
            toast.success('Epics enabled for this project');
        } catch (err) {
            toast.error(err);
        } finally {
            setEnabling(false);
        }
    };

    const fd = filtersData.data;
    const filterDefs = [
        { key: 'status', label: 'Status', options: optionsFrom.values(fd?.statuses) },
        { key: 'assigned_to', label: 'Assignee', options: optionsFrom.users(fd?.assigned_to) },
    ];
    const list = epics.data || [];
    const points = project?.points || [];

    if (project && !enabled) {
        return (
            <div className="pl-page">
                <PageHeader icon={<FaLayerGroup />} title="Epics" subtitle="Group related user stories into larger bodies of work." />
                <div className="card">
                    <EmptyState
                        icon={<FaLayerGroup />}
                        title="Epics are turned off for this project"
                        description={isAdmin || isOwner
                            ? 'Enable epics to group user stories into larger deliverables and track their progress.'
                            : 'Ask a project administrator to enable epics in the project settings.'}
                        action={(isAdmin || isOwner) && <Button icon={<FaToggleOn />} onClick={enableEpics} loading={enabling}>Enable epics</Button>}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="pl-page">
            <PageHeader
                icon={<FaLayerGroup />}
                title="Epics"
                subtitle="Group related user stories into larger bodies of work and track their progress."
                actions={canAdd('epic') && <Button icon={<FaPlus />} onClick={() => setModal({ type: 'epic' })}>New epic</Button>}
            />

            <FilterBar
                search={q}
                onSearchChange={setQ}
                searchPlaceholder="Search epics…"
                filters={filterDefs}
                values={values}
                onChange={setValues}
                onClearAll={() => { setValues(EMPTY_FILTERS); setQ(''); }}
            >
                {epics.data && <span className="text-sm text-muted tabular">{list.length} {list.length === 1 ? 'epic' : 'epics'}</span>}
                {epics.loading && epics.data && <span className="spinner spinner-sm" aria-label="Updating" />}
            </FilterBar>

            {!project || (!epics.data && !epics.error) ? (
                <div className="card"><Loader label="Loading epics…" /></div>
            ) : epics.error && !epics.data ? (
                <div className="alert alert-error">Could not load epics. <button type="button" className="btn btn-sm btn-secondary ml-auto" onClick={epics.refresh}>Retry</button></div>
            ) : list.length === 0 ? (
                <div className="card">
                    {filtering ? (
                        <EmptyState icon={<FaFilter />} title="No epics match these filters" description="Try another search or clear the filters." action={<Button variant="secondary" onClick={() => { setValues(EMPTY_FILTERS); setQ(''); }}>Clear filters</Button>} />
                    ) : (
                        <EmptyState
                            icon={<FaLayerGroup />}
                            title="No epics yet"
                            description="Epics bundle user stories into larger deliverables, such as a works package or a procurement lot."
                            action={canAdd('epic') && <Button icon={<FaPlus />} onClick={() => setModal({ type: 'epic' })}>New epic</Button>}
                        />
                    )}
                </div>
            ) : (
                <div className="table-wrap pl-epics-table">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="pl-col-expand"><span className="sr-only">Expand</span></th>
                                <th>Epic</th>
                                <th>Status</th>
                                <th className="pl-hide-sm">Assignee</th>
                                <th className="pl-col-progress">Progress</th>
                                <th className="text-right">Stories</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((epic) => {
                                const counts = epic.user_stories_counts || { total: 0, progress: 0 };
                                const pct = counts.total ? Math.round(((counts.progress || 0) / counts.total) * 100) : 0;
                                const isOpen = expanded.has(epic.id);
                                return (
                                    <React.Fragment key={epic.id}>
                                        <tr className={`clickable pl-epic-row ${isOpen ? 'is-open' : ''} ${epic.is_closed ? 'pl-row-closed' : ''}`} style={{ '--epic': epic.color || 'var(--neutral-400)' }} onClick={() => setOpen({ type: 'epic', id: epic.id })}>
                                            <td className="pl-col-expand" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    onClick={() => toggle(epic.id)}
                                                    aria-expanded={isOpen}
                                                    aria-label={`${isOpen ? 'Hide' : 'Show'} stories of epic #${epic.ref}`}
                                                >
                                                    {isOpen ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
                                                </button>
                                            </td>
                                            <td>
                                                <button type="button" className="pl-epic-title" onClick={(e) => { e.stopPropagation(); setOpen({ type: 'epic', id: epic.id }); }}>
                                                    <span className="color-swatch" style={{ background: epic.color }} aria-hidden="true" />
                                                    <span className="ref">#{epic.ref}</span>
                                                    <span className="cell-title">{epic.subject}</span>
                                                </button>
                                            </td>
                                            <td><StatusPill status={epic.status_extra_info} /></td>
                                            <td className="pl-hide-sm">
                                                {epic.assigned_to_extra_info ? (
                                                    <span className="row gap-2 nowrap"><UserAvatar user={epic.assigned_to_extra_info} size="xs" /><span className="text-sm truncate pl-assignee-name">{userName(epic.assigned_to_extra_info)}</span></span>
                                                ) : <span className="text-sm text-muted">Unassigned</span>}
                                            </td>
                                            <td className="pl-col-progress">
                                                <div className="row gap-2">
                                                    <div className="progress progress-sm pl-epic-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Epic #${epic.ref} progress`}>
                                                        <div className="progress-bar" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-secondary tabular pl-pct">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="text-right"><span className="badge"><FaBookOpen size={9} /> {counts.total}</span></td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="pl-epic-expand">
                                                <td colSpan={6}>
                                                    <EpicStories
                                                        epic={epic}
                                                        projectId={projectId}
                                                        points={points}
                                                        refreshKey={storiesKey}
                                                        canAddStory={canAdd('us')}
                                                        onOpenStory={(id) => setOpen({ type: 'story', id })}
                                                        onAddStory={(ep) => setModal({ type: 'story', epic: ep })}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {open?.type === 'epic' && (
                <EpicDetail
                    epicId={open.id}
                    projectId={projectId}
                    onClose={closeDrawer}
                    onUpdate={refreshAll}
                    onDelete={() => { closeDrawer(); refreshAll(); }}
                />
            )}
            {open?.type === 'story' && (
                <UserStoryDetail
                    storyId={open.id}
                    projectId={projectId}
                    onClose={() => setOpen(null)}
                    onUpdate={refreshAll}
                    onDelete={() => { setOpen(null); refreshAll(); }}
                />
            )}
            {modal?.type === 'epic' && (
                <CreateEpicModal
                    projectId={projectId}
                    onClose={() => setModal(null)}
                    onCreated={() => { setModal(null); refreshAll(); }}
                />
            )}
            {modal?.type === 'story' && (
                <CreateUserStoryModal
                    projectId={projectId}
                    epicId={modal.epic.id}
                    onClose={() => setModal(null)}
                    onStoryCreated={() => {
                        setModal(null);
                        setExpanded((prev) => new Set(prev).add(modal.epic.id));
                        refreshAll();
                        reload();
                    }}
                />
            )}
        </div>
    );
};

export default Epics;
