import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FaColumns, FaPlus, FaCompressAlt, FaExpandAlt, FaChevronDown, FaChevronRight, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
import { userStoryService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../context/ToastContext';
import { PageHeader, Button, Loader, EmptyState } from '../components/UI';
import FilterBar from '../components/FilterBar';
import UserStoryDetail from '../components/UserStoryDetail';
import CreateUserStoryModal from '../components/CreateUserStoryModal';
import KanbanCard from '../components/planning/KanbanCard';
import {
    ALL, useRemote, useDebouncedValue, usePersistentState, toParams, hasActiveValues, optionsFrom,
    storyPoints, storyAssignees, dropPosition,
} from '../components/planning/utils';
import '../styles/planning.css';

const EMPTY_FILTERS = { assigned_to: [], tags: [], epic: [] };
const cellKey = (laneId, statusId) => `${laneId ?? 'none'}:${statusId}`;

const Kanban = () => {
    const { id: projectId } = useParams();
    const { project, reload } = useProject();
    const { canAdd, canModify } = usePermissions();
    const toast = useToast();
    const canEdit = canModify('us');

    const [q, setQ] = useState('');
    const dq = useDebouncedValue(q, 300);
    const [values, setValues] = useState(EMPTY_FILTERS);
    const filterParams = useMemo(() => ({ ...toParams(values), ...(dq.trim() ? { q: dq.trim() } : {}) }), [values, dq]);
    const filtering = hasActiveValues(values) || !!dq.trim();

    const fetchStories = useCallback(
        () => userStoryService.list({ project: projectId, order_by: 'kanban_order', include_tasks: 1, ...ALL, ...filterParams }).then((r) => r.data),
        [projectId, filterParams],
    );
    const remote = useRemote(fetchStories);
    const fetchFilters = useCallback(() => userStoryService.getFiltersData(projectId, filterParams).then((r) => r.data), [projectId, filterParams]);
    const filtersData = useRemote(fetchFilters);

    const [zoom, setZoom] = usePersistentState('pm.kanban.zoom', 'detailed');
    const [collapsedPref, setCollapsedPref] = usePersistentState(`pm.kanban.collapsed.${projectId}`, null);
    const [collapsedLanes, setCollapsedLanes] = useState(() => new Set());
    const [openStory, setOpenStory] = useState(null);
    const [createIn, setCreateIn] = useState(null); // status id

    const statuses = useMemo(() => [...(project?.us_statuses || [])].sort((a, b) => a.order - b.order), [project]);
    const collapsed = useMemo(
        () => new Set(collapsedPref ?? statuses.filter((s) => s.is_archived).map((s) => s.id)),
        [collapsedPref, statuses],
    );
    const toggleColumn = (id) => {
        const next = new Set(collapsed);
        if (next.has(id)) next.delete(id); else next.add(id);
        setCollapsedPref([...next]);
    };

    const swimlanes = useMemo(() => [...(project?.swimlanes || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [project]);
    const lanes = useMemo(() => (swimlanes.length
        ? [...swimlanes.map((s) => ({ id: s.id, name: s.name })), { id: null, name: 'Unclassified' }]
        : [{ id: null, name: null }]), [swimlanes]);

    const stories = useMemo(() => remote.data || [], [remote.data]);
    const laneOf = useCallback((s) => (swimlanes.length && swimlanes.some((l) => l.id === s.swimlane) ? s.swimlane : null), [swimlanes]);
    const cells = useMemo(() => {
        const map = {};
        stories.forEach((s) => {
            const k = cellKey(laneOf(s), s.status);
            (map[k] = map[k] || []).push(s);
        });
        return map;
    }, [stories, laneOf]);
    const columnCount = useMemo(() => {
        const c = {};
        stories.forEach((s) => { c[s.status] = (c[s.status] || 0) + 1; });
        return c;
    }, [stories]);

    const points = project?.points || [];
    const members = project?.members || [];

    // ---- moving ------------------------------------------------------------------------
    const moveStory = useCallback(async (storyId, statusId, laneId, neighbour) => {
        const story = stories.find((s) => s.id === storyId);
        if (!story) return;
        const extra = {};
        if (laneId !== null && laneId !== undefined) extra.swimlane_id = laneId;
        if (neighbour?.before) extra.before_userstory_id = neighbour.before;
        else if (neighbour?.after) extra.after_userstory_id = neighbour.after;
        const status = statuses.find((s) => s.id === statusId);

        remote.setData((list) => {
            if (!list) return list;
            const moved = { ...story, status: statusId, swimlane: laneId ?? null, status_extra_info: status ? { name: status.name, color: status.color, is_closed: status.is_closed } : story.status_extra_info };
            const rest = list.filter((s) => s.id !== storyId);
            let at = rest.length;
            if (neighbour?.before) at = rest.findIndex((s) => s.id === neighbour.before);
            else if (neighbour?.after) at = rest.findIndex((s) => s.id === neighbour.after) + 1;
            else {
                const first = rest.findIndex((s) => s.status === statusId && laneOf(s) === (laneId ?? null));
                if (first >= 0) at = first;
            }
            if (at < 0) at = rest.length;
            return [...rest.slice(0, at), moved, ...rest.slice(at)];
        });
        try {
            await userStoryService.bulkUpdateKanbanOrder(Number(projectId), statusId, [storyId], extra);
            if (story.status !== statusId && status) toast.success(`#${story.ref} moved to ${status.name}`);
        } catch (err) {
            toast.error(err);
        } finally {
            remote.refresh();
            filtersData.refresh();
        }
    }, [stories, statuses, remote, filtersData, projectId, toast, laneOf]);

    // ---- drag & drop -------------------------------------------------------------------
    const dragRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [hint, setHint] = useState(null); // { key, id, pos }

    const onCardDragStart = (e, story) => {
        dragRef.current = { id: story.id };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(story.id));
        setDraggingId(story.id);
    };
    const onDragEnd = () => { dragRef.current = null; setDraggingId(null); setHint(null); };
    const onCardDragOver = (e, key, story) => {
        if (!dragRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        if (story.id === dragRef.current.id) { setHint((h) => (h?.key === key && !h.id ? h : { key, id: null })); return; }
        const pos = dropPosition(e);
        setHint((h) => (h?.key === key && h.id === story.id && h.pos === pos ? h : { key, id: story.id, pos }));
    };
    const onCellDragOver = (e, key) => {
        if (!dragRef.current) return;
        e.preventDefault();
        setHint((h) => (h?.key === key ? h : { key, id: null }));
    };
    const onCellDragLeave = (e, key) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setHint((h) => (h?.key === key ? null : h));
    };
    const onCellDrop = (e, laneId, statusId) => {
        e.preventDefault();
        const drag = dragRef.current;
        const key = cellKey(laneId, statusId);
        const h = hint;
        onDragEnd();
        if (!drag) return;
        const list = (cells[key] || []).filter((s) => s.id !== drag.id);
        let neighbour = null;
        if (h?.key === key && h.id) neighbour = h.pos === 'before' ? { before: h.id } : { after: h.id };
        else if (list.length) neighbour = { after: list[list.length - 1].id };
        const story = stories.find((s) => s.id === drag.id);
        if (story && story.status === statusId && laneOf(story) === laneId) {
            const full = cells[key] || [];
            const idx = full.findIndex((s) => s.id === drag.id);
            if ((neighbour?.after && full[idx - 1]?.id === neighbour.after) || (neighbour?.before && full[idx + 1]?.id === neighbour.before)) return;
        }
        moveStory(drag.id, statusId, laneId, neighbour);
    };

    // ---- keyboard ----------------------------------------------------------------------
    const focusCard = (id) => requestAnimationFrame(() => document.querySelector(`[data-kcard="${id}"]`)?.focus());
    const onCardKey = (e, story, laneId) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenStory(story.id); return; }
        if (!canEdit || !e.altKey) return;
        const visible = statuses.filter((s) => !collapsed.has(s.id));
        const idx = visible.findIndex((s) => s.id === story.status);
        const list = cells[cellKey(laneId, story.status)] || [];
        const pos = list.findIndex((s) => s.id === story.id);
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const target = visible[idx + (e.key === 'ArrowRight' ? 1 : -1)];
            if (!target) return;
            const targetList = cells[cellKey(laneId, target.id)] || [];
            moveStory(story.id, target.id, laneId, targetList.length ? { after: targetList[targetList.length - 1].id } : null).then(() => focusCard(story.id));
        } else if (e.key === 'ArrowUp' && pos > 0) {
            e.preventDefault();
            moveStory(story.id, story.status, laneId, { before: list[pos - 1].id }).then(() => focusCard(story.id));
        } else if (e.key === 'ArrowDown' && pos < list.length - 1) {
            e.preventDefault();
            moveStory(story.id, story.status, laneId, { after: list[pos + 1].id }).then(() => focusCard(story.id));
        }
    };

    const fd = filtersData.data;
    const filterDefs = [
        { key: 'assigned_to', label: 'Assignee', options: optionsFrom.users(fd?.assigned_to) },
        { key: 'tags', label: 'Tags', options: optionsFrom.tags(fd?.tags) },
        ...(project?.is_epics_activated ? [{ key: 'epic', label: 'Epic', options: optionsFrom.epics(fd?.epics) }] : []),
    ];

    const toggleLane = (id) => setCollapsedLanes((prev) => {
        const next = new Set(prev);
        const k = id ?? 'none';
        if (next.has(k)) next.delete(k); else next.add(k);
        return next;
    });

    const renderCell = (lane, status) => {
        const key = cellKey(lane.id, status.id);
        const list = cells[key] || [];
        const isCollapsed = collapsed.has(status.id);
        const cellHint = hint?.key === key ? hint : null;
        return (
            <div
                key={key}
                className={`pl-kcell ${isCollapsed ? 'is-collapsed' : ''} ${cellHint ? 'is-drop-target' : ''} ${lanes.length === 1 ? 'is-tall' : ''}`}
                onDragOver={canEdit ? (e) => onCellDragOver(e, key) : undefined}
                onDragLeave={canEdit ? (e) => onCellDragLeave(e, key) : undefined}
                onDrop={canEdit ? (e) => onCellDrop(e, lane.id, status.id) : undefined}
                aria-label={`${status.name}${lane.name ? ` · ${lane.name}` : ''}: ${list.length} stories`}
                role="list"
            >
                {isCollapsed ? (
                    <button type="button" className="pl-kcell-collapsed" onClick={() => toggleColumn(status.id)} title={`Expand ${status.name}`} aria-label={`Expand ${status.name} (${list.length})`}>
                        <span className="pl-kcell-collapsed-name">{status.name}</span>
                        <span className="pl-kcell-collapsed-count">{list.length}</span>
                    </button>
                ) : (
                    <>
                        {list.map((s) => (
                            <div role="listitem" key={s.id} className="pl-kcard-slot">
                                <KanbanCard
                                    story={s}
                                    zoom={zoom}
                                    points={storyPoints(s, points)}
                                    assignees={storyAssignees(s, members)}
                                    tagsColors={project?.tags_colors}
                                    hint={cellHint?.id === s.id ? cellHint.pos : null}
                                    dragging={draggingId === s.id}
                                    canEdit={canEdit}
                                    onOpen={() => setOpenStory(s.id)}
                                    onKeyDown={(e) => onCardKey(e, s, lane.id)}
                                    dragProps={{
                                        onDragStart: (e) => onCardDragStart(e, s),
                                        onDragEnd,
                                        onDragOver: canEdit ? (e) => onCardDragOver(e, key, s) : undefined,
                                    }}
                                />
                            </div>
                        ))}
                        {list.length === 0 && <div className={`pl-kcell-empty ${cellHint ? 'is-hint' : ''}`}>{canEdit ? 'Drop stories here' : 'No stories'}</div>}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="pl-page">
            <PageHeader
                icon={<FaColumns />}
                title="Kanban"
                subtitle="User stories flowing through the workflow. Drag cards to change status or priority."
                actions={(
                    <>
                        <div className="segmented" role="group" aria-label="Card size">
                            <button type="button" className={zoom === 'compact' ? 'active' : ''} aria-pressed={zoom === 'compact'} onClick={() => setZoom('compact')}><FaCompressAlt size={11} /> Compact</button>
                            <button type="button" className={zoom === 'detailed' ? 'active' : ''} aria-pressed={zoom === 'detailed'} onClick={() => setZoom('detailed')}><FaExpandAlt size={11} /> Detailed</button>
                        </div>
                        {canAdd('us') && statuses[0] && <Button icon={<FaPlus />} onClick={() => setCreateIn(project?.default_us_status || statuses[0].id)}>New story</Button>}
                    </>
                )}
            />

            <FilterBar
                search={q}
                onSearchChange={setQ}
                searchPlaceholder="Search cards…"
                filters={filterDefs}
                values={values}
                onChange={setValues}
                onClearAll={() => { setValues(EMPTY_FILTERS); setQ(''); }}
            >
                {remote.data && <span className="text-sm text-muted tabular">{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>}
                {remote.loading && remote.data && <span className="spinner spinner-sm" aria-label="Updating" />}
            </FilterBar>

            {!project || (!remote.data && !remote.error) ? (
                <Loader label="Loading board…" />
            ) : remote.error && !remote.data ? (
                <div className="alert alert-error">Could not load the board. <button type="button" className="btn btn-sm btn-secondary ml-auto" onClick={remote.refresh}>Retry</button></div>
            ) : statuses.length === 0 ? (
                <EmptyState title="No user story statuses" description="Add statuses in project settings to use the Kanban board." />
            ) : (
                <>
                    {filtering && stories.length === 0 && (
                        <div className="alert mb-4"><FaFilter /> No stories match the current filters.</div>
                    )}
                    <div className={`pl-board ${zoom === 'compact' ? 'is-compact' : ''}`}>
                        <div className="pl-board-inner">
                            <div className="pl-board-headrow">
                                {statuses.map((s) => {
                                    const count = columnCount[s.id] || 0;
                                    const over = s.wip_limit && count > s.wip_limit;
                                    const isCollapsed = collapsed.has(s.id);
                                    return (
                                        <div key={s.id} className={`pl-khead ${isCollapsed ? 'is-collapsed' : ''} ${over ? 'is-over' : ''}`} style={{ '--status': s.color }}>
                                            <button
                                                type="button"
                                                className="pl-khead-title"
                                                onClick={() => toggleColumn(s.id)}
                                                aria-expanded={!isCollapsed}
                                                title={isCollapsed ? `Expand ${s.name}` : `Collapse ${s.name}`}
                                            >
                                                <span className="pl-status-dot" />
                                                {!isCollapsed && <span className="pl-khead-name">{s.name}</span>}
                                                {s.is_archived && !isCollapsed && <span className="badge pl-archived-badge">Archived</span>}
                                            </button>
                                            {!isCollapsed && (
                                                <div className="pl-khead-side">
                                                    <span className={`pl-wip ${over ? 'is-over' : ''}`} title={s.wip_limit ? `WIP limit ${s.wip_limit}` : 'No WIP limit'}>
                                                        {over && <FaExclamationTriangle size={9} />}
                                                        {count}{s.wip_limit ? <span className="pl-wip-limit">/{s.wip_limit}</span> : null}
                                                    </span>
                                                    {canAdd('us') && (
                                                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setCreateIn(s.id)} aria-label={`Add story to ${s.name}`} title={`Add story to ${s.name}`}>
                                                            <FaPlus size={10} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {lanes.map((lane) => {
                                const laneCollapsed = collapsedLanes.has(lane.id ?? 'none');
                                const laneCount = stories.filter((s) => laneOf(s) === lane.id).length;
                                return (
                                    <div key={lane.id ?? 'none'} className="pl-lane">
                                        {lane.name && (
                                            <button type="button" className="pl-lane-head" onClick={() => toggleLane(lane.id)} aria-expanded={!laneCollapsed}>
                                                {laneCollapsed ? <FaChevronRight size={10} /> : <FaChevronDown size={10} />}
                                                <span>{lane.name}</span>
                                                <span className="badge">{laneCount}</span>
                                            </button>
                                        )}
                                        {!laneCollapsed && <div className="pl-lane-row">{statuses.map((s) => renderCell(lane, s))}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {canEdit && (
                        <p className="text-xs text-muted mt-2">
                            Tip: focus a card and press <span className="kbd">Alt</span>+<span className="kbd">←</span>/<span className="kbd">→</span> to change its status, <span className="kbd">Alt</span>+<span className="kbd">↑</span>/<span className="kbd">↓</span> to reorder, <span className="kbd">Enter</span> to open.
                        </p>
                    )}
                </>
            )}

            {openStory && (
                <UserStoryDetail
                    storyId={openStory}
                    projectId={projectId}
                    onClose={() => setOpenStory(null)}
                    onUpdate={() => { remote.refresh(); filtersData.refresh(); }}
                    onDelete={() => { setOpenStory(null); remote.refresh(); filtersData.refresh(); reload(); }}
                />
            )}
            {createIn && (
                <CreateUserStoryModal
                    projectId={projectId}
                    statusId={createIn}
                    onClose={() => setCreateIn(null)}
                    onStoryCreated={() => { setCreateIn(null); remote.refresh(); filtersData.refresh(); reload(); }}
                />
            )}
        </div>
    );
};

export default Kanban;
