import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    FaListUl, FaPlus, FaLayerGroup, FaFlagCheckered, FaGripVertical, FaArrowRight, FaTimes,
    FaChevronDown, FaChevronRight, FaInbox, FaFilter,
} from 'react-icons/fa';
import { userStoryService, milestoneService, resolverService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Button, EmptyState, Loader, StatusPill, TagList } from '../components/UI';
import FilterBar from '../components/FilterBar';
import UserStoryDetail from '../components/UserStoryDetail';
import TaskDetail from '../components/TaskDetail';
import CreateUserStoryModal from '../components/CreateUserStoryModal';
import BulkAddModal from '../components/planning/BulkAddModal';
import SprintFormModal from '../components/planning/SprintFormModal';
import SprintPanel from '../components/planning/SprintPanel';
import { AvatarStack, PointsBadge, BlockedBadge, EpicChips } from '../components/planning/Bits';
import {
    ALL, useRemote, useDebouncedValue, toParams, hasActiveValues, optionsFrom, storyPoints, sumPoints,
    fmtPoints, storyAssignees, dropPosition, isTypingTarget,
} from '../components/planning/utils';
import '../styles/planning.css';

const EMPTY_FILTERS = { status: [], assigned_to: [], tags: [], epic: [] };

const Backlog = () => {
    const { id: projectId } = useParams();
    const { project, reload } = useProject();
    const { canAdd, canModify } = usePermissions();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const [q, setQ] = useState('');
    const dq = useDebouncedValue(q, 300);
    const [values, setValues] = useState(EMPTY_FILTERS);
    const filterParams = useMemo(() => ({ ...toParams(values), ...(dq.trim() ? { q: dq.trim() } : {}) }), [values, dq]);
    const filtering = hasActiveValues(values) || !!dq.trim();

    // ---- data -------------------------------------------------------------------------
    const fetchBacklog = useCallback(
        () => userStoryService.list({ project: projectId, milestone: 'null', order_by: 'backlog_order', ...ALL, ...filterParams }).then((r) => r.data),
        [projectId, filterParams],
    );
    const backlog = useRemote(fetchBacklog);

    const fetchFilters = useCallback(
        () => userStoryService.getFiltersData(projectId, { milestone: 'null', ...filterParams }).then((r) => r.data),
        [projectId, filterParams],
    );
    const filtersData = useRemote(fetchFilters);

    const fetchSprints = useCallback(() => milestoneService.list({ project: projectId, closed: false, ...ALL }).then((r) => r.data), [projectId]);
    const sprints = useRemote(fetchSprints);

    const [showClosed, setShowClosed] = useState(false);
    const fetchClosed = useMemo(
        () => (showClosed ? () => milestoneService.list({ project: projectId, closed: true, ...ALL }).then((r) => r.data) : null),
        [showClosed, projectId],
    );
    const closedSprints = useRemote(fetchClosed);
    const [statsKey, setStatsKey] = useState(0);

    const refreshAll = useCallback(() => {
        backlog.refresh();
        filtersData.refresh();
        sprints.refresh();
        if (showClosed) closedSprints.refresh();
        setStatsKey((k) => k + 1);
    }, [backlog, filtersData, sprints, closedSprints, showClosed]);

    const stories = useMemo(() => backlog.data || [], [backlog.data]);
    const openSprints = useMemo(
        () => [...(sprints.data || [])].sort((a, b) => (a.estimated_start || '').localeCompare(b.estimated_start || '') || a.id - b.id),
        [sprints.data],
    );
    const points = project?.points || [];
    const members = project?.members || [];
    const canEdit = canModify('us');

    const [openItem, setOpenItem] = useState(null); // { type: 'story'|'task', id }
    const [modal, setModal] = useState(null); // 'story' | 'bulk' | 'sprint'

    // ---- selection --------------------------------------------------------------------
    const [selected, setSelected] = useState(() => new Set());
    const visibleSelected = stories.filter((s) => selected.has(s.id)).map((s) => s.id);
    const toggleSelect = (id) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const allSelected = stories.length > 0 && visibleSelected.length === stories.length;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(stories.map((s) => s.id)));

    // ---- moving stories ---------------------------------------------------------------
    const [busy, setBusy] = useState(false);
    const moveStories = useCallback(async (ids, target, neighbour, { quiet } = {}) => {
        if (!ids.length) return;
        const extra = {};
        if (target) extra.milestone_id = target;
        if (neighbour?.before) extra.before_userstory_id = neighbour.before;
        else if (neighbour?.after) extra.after_userstory_id = neighbour.after;

        // Optimistic reorder inside the backlog list
        if (!target) {
            backlog.setData((list) => {
                if (!list) return list;
                const moving = ids.map((id) => list.find((s) => s.id === id)).filter(Boolean);
                if (moving.length !== ids.length) return list;
                const rest = list.filter((s) => !ids.includes(s.id));
                let at = 0;
                if (neighbour?.before) at = rest.findIndex((s) => s.id === neighbour.before);
                else if (neighbour?.after) at = rest.findIndex((s) => s.id === neighbour.after) + 1;
                if (at < 0) at = rest.length;
                return [...rest.slice(0, at), ...moving, ...rest.slice(at)];
            });
        } else {
            backlog.setData((list) => (list ? list.filter((s) => !ids.includes(s.id)) : list));
        }
        setBusy(true);
        try {
            await userStoryService.bulkUpdateBacklogOrder(projectId, ids, extra);
            if (!quiet && target) {
                const name = [...openSprints, ...(closedSprints.data || [])].find((m) => m.id === target)?.name || 'sprint';
                toast.success(`Moved ${ids.length} ${ids.length === 1 ? 'story' : 'stories'} to ${name}`);
            }
            setSelected((prev) => {
                const next = new Set(prev);
                ids.forEach((id) => next.delete(id));
                return next;
            });
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
            refreshAll();
        }
    }, [backlog, projectId, openSprints, closedSprints.data, toast, refreshAll]);

    const moveToBacklog = (story) => moveStories([story.id], null, stories[0] ? { before: stories[0].id } : null, { quiet: true })
        .then(() => toast.success(`#${story.ref} moved back to the backlog`));

    const moveSelectedToSprint = (sprintId) => {
        const sprint = openSprints.find((m) => String(m.id) === String(sprintId));
        if (!sprint || !visibleSelected.length) return;
        const inSprint = [...(sprint.user_stories || [])].sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0));
        const last = inSprint[inSprint.length - 1];
        moveStories(visibleSelected, sprint.id, last ? { after: last.id } : null);
    };

    // ---- drag & drop ------------------------------------------------------------------
    const dragRef = useRef(null);
    const [dragging, setDragging] = useState([]);
    const [hint, setHint] = useState(null); // { container: null|'backlog'|sprintId, id, pos }

    const dnd = useMemo(() => ({
        dragging,
        hint,
        startDrag: (e, story, from) => {
            const ids = from === 'backlog' && selected.has(story.id) && visibleSelected.length > 1 ? visibleSelected : [story.id];
            dragRef.current = { ids, from };
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', ids.map(String).join(','));
            setDragging(ids);
        },
        overRow: (e, container, id, pos) => {
            if (!dragRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            if (dragRef.current.ids.includes(id)) {
                setHint((h) => (h?.container === container && !h.id ? h : { container, id: null }));
                return;
            }
            setHint((h) => (h?.container === container && h.id === id && h.pos === pos ? h : { container, id, pos }));
        },
        overContainer: (e, container) => {
            if (!dragRef.current) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setHint((h) => (h?.container === container ? h : { container, id: null }));
        },
        leave: (e, container) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setHint((h) => (h?.container === container ? null : h));
        },
        drop: (e, container, list) => {
            e.preventDefault();
            const drag = dragRef.current;
            const h = hint;
            dragRef.current = null;
            setDragging([]);
            setHint(null);
            if (!drag) return;
            const target = container === 'backlog' ? null : container;
            let neighbour = null;
            if (h?.container === container && h.id) {
                neighbour = h.pos === 'before' ? { before: h.id } : { after: h.id };
            } else {
                const rest = list.filter((s) => !drag.ids.includes(s.id));
                if (rest.length) neighbour = { after: rest[rest.length - 1].id };
            }
            // no-op: dropped onto its own position
            if (drag.from === container && drag.ids.length === 1 && neighbour) {
                const idx = list.findIndex((s) => s.id === drag.ids[0]);
                const prev = list[idx - 1]?.id;
                const next = list[idx + 1]?.id;
                if ((neighbour.after && neighbour.after === prev) || (neighbour.before && neighbour.before === next)) return;
            }
            moveStories(drag.ids, target, neighbour);
        },
        endDrag: () => {
            dragRef.current = null;
            setDragging([]);
            setHint(null);
        },
    }), [dragging, hint, selected, visibleSelected, moveStories]);

    // ---- keyboard on backlog rows -----------------------------------------------------
    const focusStory = (id) => requestAnimationFrame(() => document.querySelector(`[data-backlog-row="${id}"]`)?.focus());
    const onRowKey = (e, story, index) => {
        if (isTypingTarget(e.target) && e.target.type !== 'checkbox') return;
        if (e.key === 'Enter') { e.preventDefault(); setOpenItem({ type: 'story', id: story.id }); }
        else if (e.key === ' ' && e.target === e.currentTarget) { e.preventDefault(); toggleSelect(story.id); }
        else if (e.altKey && e.key === 'ArrowUp' && canEdit && index > 0) {
            e.preventDefault();
            moveStories([story.id], null, { before: stories[index - 1].id }).then(() => focusStory(story.id));
        } else if (e.altKey && e.key === 'ArrowDown' && canEdit && index < stories.length - 1) {
            e.preventDefault();
            moveStories([story.id], null, { after: stories[index + 1].id }).then(() => focusStory(story.id));
        } else if (!e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const next = stories[index + (e.key === 'ArrowDown' ? 1 : -1)];
            if (next) focusStory(next.id);
        }
    };

    // ---- drawers, modals, deep link ---------------------------------------------------
    const refParam = searchParams.get('ref');

    // ?ref=N may be a user story or a task: resolve it in one call
    const slug = project?.slug;
    useEffect(() => {
        if (!refParam || !slug) return undefined;
        let alive = true;
        resolverService.resolveRef(slug, refParam)
            .then((r) => {
                if (!alive) return;
                if (r.data.us) setOpenItem({ type: 'story', id: r.data.us });
                else if (r.data.task) setOpenItem({ type: 'task', id: r.data.task });
                else toast.error(`#${refParam} is not a user story or task`);
            })
            .catch(() => { if (alive) toast.error(`Nothing with reference #${refParam} in this project`); });
        return () => { alive = false; };
    }, [slug, refParam, toast]);

    const closeItem = () => {
        setOpenItem(null);
        if (refParam) {
            const next = new URLSearchParams(searchParams);
            next.delete('ref');
            setSearchParams(next, { replace: true });
        }
    };

    // ---- derived ------------------------------------------------------------------------
    const backlogPoints = sumPoints(stories, points);
    const plannedPoints = openSprints.reduce((acc, m) => acc + sumPoints(m.user_stories, points), 0);
    const fd = filtersData.data;
    const filterDefs = [
        { key: 'status', label: 'Status', options: optionsFrom.values(fd?.statuses) },
        { key: 'assigned_to', label: 'Assignee', options: optionsFrom.users(fd?.assigned_to) },
        { key: 'tags', label: 'Tags', options: optionsFrom.tags(fd?.tags) },
        ...(project?.is_epics_activated ? [{ key: 'epic', label: 'Epic', options: optionsFrom.epics(fd?.epics) }] : []),
    ];
    const lastFinish = openSprints.reduce((acc, m) => (m.estimated_finish && m.estimated_finish > acc ? m.estimated_finish : acc), '');
    const sprintCount = (project?.milestones || []).length;

    const backlogHint = hint?.container === 'backlog' ? hint : null;

    return (
        <div className="pl-page">
            <PageHeader
                icon={<FaListUl />}
                title="Backlog"
                subtitle="Prioritise the product backlog and plan stories into sprints."
                actions={(
                    <>
                        {canAdd('us') && <Button variant="secondary" icon={<FaLayerGroup />} onClick={() => setModal('bulk')}>Bulk add</Button>}
                        {canAdd('milestone') && <Button variant="secondary" icon={<FaFlagCheckered />} onClick={() => setModal('sprint')}>New sprint</Button>}
                        {canAdd('us') && <Button icon={<FaPlus />} onClick={() => setModal('story')}>New story</Button>}
                    </>
                )}
            />

            <div className="pl-kpis" aria-label="Backlog summary">
                <div className="pl-kpi"><span className="pl-kpi-value">{backlog.data ? stories.length : '–'}</span><span className="pl-kpi-label">{filtering ? 'Matching stories' : 'Stories in backlog'}</span></div>
                <div className="pl-kpi"><span className="pl-kpi-value">{fmtPoints(backlogPoints)}</span><span className="pl-kpi-label">Backlog points</span></div>
                <div className="pl-kpi"><span className="pl-kpi-value">{sprints.data ? openSprints.length : '–'}</span><span className="pl-kpi-label">Open sprints</span></div>
                <div className="pl-kpi"><span className="pl-kpi-value">{fmtPoints(plannedPoints)}</span><span className="pl-kpi-label">Points planned</span></div>
            </div>

            <FilterBar
                search={q}
                onSearchChange={setQ}
                searchPlaceholder="Search backlog…"
                filters={filterDefs}
                values={values}
                onChange={setValues}
                onClearAll={() => { setValues(EMPTY_FILTERS); setQ(''); }}
            />

            <div className="pl-backlog-layout">
                {/* ------------------------------ Product backlog ------------------------------ */}
                <section
                    className={`card flush pl-backlog ${backlogHint && !backlogHint.id ? 'is-drop-target' : ''}`}
                    aria-label="Product backlog"
                    onDragOver={canEdit ? (e) => dnd.overContainer(e, 'backlog') : undefined}
                    onDragLeave={canEdit ? (e) => dnd.leave(e, 'backlog') : undefined}
                    onDrop={canEdit ? (e) => dnd.drop(e, 'backlog', stories) : undefined}
                >
                    <div className="card-header pl-backlog-head">
                        <label className="pl-check" title="Select all">
                            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={!stories.length} aria-label="Select all stories" />
                        </label>
                        <h2 className="card-title">Product backlog</h2>
                        <span className="badge">{stories.length}</span>
                        <span className="text-sm text-muted ml-auto tabular">{fmtPoints(backlogPoints)} pts</span>
                        {(backlog.loading || busy) && backlog.data && <span className="spinner spinner-sm" aria-label="Updating" />}
                    </div>

                    {visibleSelected.length > 0 && (
                        <div className="pl-bulkbar" role="region" aria-label="Selection actions">
                            <span className="font-semibold">{visibleSelected.length} selected</span>
                            <span className="text-muted text-sm tabular">· {fmtPoints(sumPoints(stories.filter((s) => selected.has(s.id)), points))} pts</span>
                            <div className="row ml-auto">
                                {canEdit && openSprints.length > 0 && (
                                    <label className="row gap-2">
                                        <span className="sr-only">Move selected stories to sprint</span>
                                        <select
                                            className="form-input form-input-sm pl-move-select"
                                            value=""
                                            onChange={(e) => moveSelectedToSprint(e.target.value)}
                                            disabled={busy}
                                        >
                                            <option value="" disabled>Move to sprint…</option>
                                            {openSprints.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </label>
                                )}
                                <Button size="sm" variant="ghost" icon={<FaTimes />} onClick={() => setSelected(new Set())}>Clear</Button>
                            </div>
                        </div>
                    )}

                    {!backlog.data && !backlog.error && <Loader label="Loading backlog…" />}
                    {backlog.error && !backlog.data && (
                        <div className="card-body"><div className="alert alert-error">Could not load the backlog. <button type="button" className="btn btn-sm btn-secondary ml-auto" onClick={backlog.refresh}>Retry</button></div></div>
                    )}
                    {backlog.data && stories.length === 0 && (
                        filtering ? (
                            <EmptyState icon={<FaFilter />} title="No stories match these filters" description="Try another search or clear the filters." action={<Button variant="secondary" onClick={() => { setValues(EMPTY_FILTERS); setQ(''); }}>Clear filters</Button>} />
                        ) : (
                            <EmptyState
                                icon={<FaInbox />}
                                title="The backlog is empty"
                                description={openSprints.length ? 'Every story is planned into a sprint. Add new stories or drag stories back from a sprint.' : 'Capture the work to be done as user stories, then plan them into sprints.'}
                                action={canAdd('us') && (
                                    <div className="row">
                                        <Button icon={<FaPlus />} onClick={() => setModal('story')}>New story</Button>
                                        <Button variant="secondary" icon={<FaLayerGroup />} onClick={() => setModal('bulk')}>Bulk add</Button>
                                    </div>
                                )}
                            />
                        )
                    )}

                    {stories.length > 0 && (
                        <ul className="pl-story-list" aria-label="Backlog stories">
                            {stories.map((s, i) => {
                                const isSel = selected.has(s.id);
                                const rowHint = backlogHint?.id === s.id ? backlogHint.pos : null;
                                return (
                                    <li
                                        key={s.id}
                                        data-backlog-row={s.id}
                                        tabIndex={0}
                                        className={`pl-story ${isSel ? 'is-selected' : ''} ${dragging.includes(s.id) ? 'is-dragging' : ''} ${rowHint ? `drop-${rowHint}` : ''} ${s.is_blocked ? 'is-blocked' : ''}`}
                                        draggable={canEdit}
                                        onDragStart={(e) => dnd.startDrag(e, s, 'backlog')}
                                        onDragEnd={dnd.endDrag}
                                        onDragOver={canEdit ? (e) => dnd.overRow(e, 'backlog', s.id, dropPosition(e)) : undefined}
                                        onKeyDown={(e) => onRowKey(e, s, i)}
                                        aria-label={`#${s.ref} ${s.subject}`}
                                    >
                                        {canEdit && <span className="pl-grip" aria-hidden="true"><FaGripVertical size={11} /></span>}
                                        <label className="pl-check">
                                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(s.id)} aria-label={`Select #${s.ref}`} tabIndex={-1} />
                                        </label>
                                        <div className="pl-story-main">
                                            <button type="button" className="pl-story-title" onClick={() => setOpenItem({ type: 'story', id: s.id })} tabIndex={-1}>
                                                <span className="ref">#{s.ref}</span> {s.subject}
                                            </button>
                                            {(s.epics?.length > 0 || s.tags?.length > 0 || s.is_blocked) && (
                                                <div className="pl-story-sub">
                                                    {s.is_blocked && <BlockedBadge note={s.blocked_note} />}
                                                    <EpicChips epics={s.epics} />
                                                    <TagList tags={s.tags} tagsColors={project?.tags_colors} max={3} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pl-story-side">
                                            <StatusPill status={s.status_extra_info} className="pl-pill-sm" />
                                            <AvatarStack users={storyAssignees(s, members)} />
                                            <PointsBadge value={storyPoints(s, points)} />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {canEdit && stories.length > 0 && (
                        <div className="pl-list-foot text-xs text-muted">
                            Drag to reorder or onto a sprint · <span className="kbd">Alt</span>+<span className="kbd">↑</span>/<span className="kbd">↓</span> moves the focused story · <span className="kbd">Space</span> selects
                        </div>
                    )}
                </section>

                {/* ---------------------------------- Sprints ---------------------------------- */}
                <aside className="pl-sprints" aria-label="Sprints">
                    <div className="pl-sprints-head">
                        <h2 className="section-title"><FaFlagCheckered /> Sprints</h2>
                        {canAdd('milestone') && <Button size="sm" variant="secondary" icon={<FaPlus />} onClick={() => setModal('sprint')}>New sprint</Button>}
                    </div>
                    {!sprints.data && !sprints.error && <Loader label="Loading sprints…" />}
                    {sprints.error && !sprints.data && <div className="alert alert-error">Could not load sprints.</div>}
                    {sprints.data && openSprints.length === 0 && (
                        <div className="card">
                            <EmptyState
                                icon={<FaFlagCheckered />}
                                title="No open sprints"
                                description="Create a sprint, then drag stories from the backlog into it."
                                action={canAdd('milestone') && <Button icon={<FaPlus />} onClick={() => setModal('sprint')}>New sprint</Button>}
                            />
                        </div>
                    )}
                    {openSprints.map((m, idx) => (
                        <SprintPanel
                            key={m.id}
                            projectId={projectId}
                            sprint={m}
                            points={points}
                            refreshKey={statsKey}
                            defaultOpen={idx < 3}
                            canEdit={canEdit}
                            dnd={dnd}
                            onOpenStory={(s) => setOpenItem({ type: 'story', id: s.id })}
                            onMoveToBacklog={moveToBacklog}
                        />
                    ))}
                    {sprints.data && (
                        <button type="button" className="pl-closed-toggle" onClick={() => setShowClosed((v) => !v)} aria-expanded={showClosed}>
                            {showClosed ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                            Closed sprints {project ? `(${project.total_closed_milestones ?? 0})` : ''}
                        </button>
                    )}
                    {showClosed && !closedSprints.data && <Loader label="" />}
                    {showClosed && closedSprints.data?.length === 0 && <p className="text-sm text-muted">No closed sprints yet.</p>}
                    {showClosed && (closedSprints.data || []).map((m) => (
                        <SprintPanel
                            key={m.id}
                            projectId={projectId}
                            sprint={m}
                            points={points}
                            refreshKey={statsKey}
                            defaultOpen={false}
                            canEdit={canEdit}
                            dnd={dnd}
                            onOpenStory={(s) => setOpenItem({ type: 'story', id: s.id })}
                            onMoveToBacklog={moveToBacklog}
                        />
                    ))}
                </aside>
            </div>

            {openItem?.type === 'story' && (
                <UserStoryDetail
                    storyId={openItem.id}
                    projectId={projectId}
                    onClose={closeItem}
                    onUpdate={() => refreshAll()}
                    onDelete={() => { closeItem(); refreshAll(); reload(); }}
                />
            )}
            {openItem?.type === 'task' && (
                <TaskDetail
                    taskId={openItem.id}
                    projectId={projectId}
                    onClose={closeItem}
                    onUpdate={() => refreshAll()}
                    onDelete={() => { closeItem(); refreshAll(); }}
                />
            )}
            {modal === 'story' && (
                <CreateUserStoryModal
                    projectId={projectId}
                    onClose={() => setModal(null)}
                    onStoryCreated={() => { setModal(null); refreshAll(); reload(); }}
                />
            )}
            {modal === 'bulk' && (
                <BulkAddModal
                    title="Bulk add user stories"
                    itemLabel="stories"
                    hint="Stories are added to the top of the backlog with the default status."
                    onClose={() => setModal(null)}
                    onSubmit={(text) => userStoryService.bulkCreate(Number(projectId), text, project?.default_us_status ?? undefined).then(() => { refreshAll(); reload(); })}
                />
            )}
            {modal === 'sprint' && (
                <SprintFormModal
                    projectId={projectId}
                    lastFinish={lastFinish}
                    sprintCount={sprintCount}
                    onClose={() => setModal(null)}
                    onSaved={() => { sprints.refresh(); reload(); }}
                />
            )}
        </div>
    );
};

export default Backlog;
