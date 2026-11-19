import React, { useMemo, useRef, useState } from 'react';
import { FaPlus, FaBan, FaFlask, FaInbox } from 'react-icons/fa';
import { StatusPill, UserAvatar } from '../UI';
import { PointsBadge } from './Bits';
import { storyPoints, dropPosition } from './utils';

/*
 * TaskBoard — sprint taskboard. Rows = user stories in the sprint (+ "tasks without story"),
 * columns = project task statuses. Drag a task to change its status / story / position.
 *   onMove(task, statusId, storyId|null, neighbour { before|after }|null)
 */
const key = (storyId, statusId) => `${storyId ?? 'none'}:${statusId}`;

const TaskCard = ({ task, hint, dragging, canEdit, onOpen, onKeyDown, dragProps }) => (
    <article
        data-task={task.id}
        tabIndex={0}
        className={`pl-task ${task.is_closed ? 'is-closed' : ''} ${task.is_blocked ? 'is-blocked' : ''} ${dragging ? 'is-dragging' : ''} ${hint ? `drop-${hint}` : ''}`}
        draggable={canEdit}
        onClick={onOpen}
        onKeyDown={onKeyDown}
        aria-label={`Task #${task.ref} ${task.subject}`}
        {...dragProps}
    >
        <div className="pl-task-top">
            <span className="ref">#{task.ref}</span>
            {task.is_blocked && <span className="pl-kcard-blocked" title={task.blocked_note || 'Blocked'}><FaBan size={9} /></span>}
            {task.is_iocaine && <span className="pl-iocaine" title="Iocaine dose — harder than expected"><FaFlask size={9} /></span>}
            <span className="pl-kcard-spacer" />
            {task.assigned_to_extra_info && <UserAvatar user={task.assigned_to_extra_info} size="xs" />}
        </div>
        <div className="pl-task-title">{task.subject}</div>
    </article>
);

const TaskBoard = ({ statuses, stories, tasks, points, canEdit, canAdd, onOpenTask, onOpenStory, onAddTask, onMove }) => {
    const rows = useMemo(() => [
        ...stories.map((s) => ({ id: s.id, story: s })),
        { id: null, story: null },
    ], [stories]);
    const cells = useMemo(() => {
        const map = {};
        const storyIds = new Set(stories.map((s) => s.id));
        [...tasks]
            .sort((a, b) => (a.taskboard_order ?? 0) - (b.taskboard_order ?? 0) || a.id - b.id)
            .forEach((t) => {
                const sid = storyIds.has(t.user_story) ? t.user_story : null;
                const k = key(sid, t.status);
                (map[k] = map[k] || []).push(t);
            });
        return map;
    }, [tasks, stories]);

    const dragRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);
    const [hint, setHint] = useState(null);

    const endDrag = () => { dragRef.current = null; setDraggingId(null); setHint(null); };
    const onDrop = (e, storyId, statusId) => {
        e.preventDefault();
        const drag = dragRef.current;
        const k = key(storyId, statusId);
        const h = hint;
        endDrag();
        if (!drag) return;
        const list = (cells[k] || []).filter((t) => t.id !== drag.id);
        let neighbour = null;
        if (h?.key === k && h.id) neighbour = h.pos === 'before' ? { before: h.id } : { after: h.id };
        else if (list.length) neighbour = { after: list[list.length - 1].id };
        const task = tasks.find((t) => t.id === drag.id);
        if (!task) return;
        const sameCell = task.status === statusId && (stories.some((s) => s.id === task.user_story) ? task.user_story : null) === storyId;
        if (sameCell) {
            const full = cells[k] || [];
            const idx = full.findIndex((t) => t.id === drag.id);
            if (!neighbour || (neighbour.after && full[idx - 1]?.id === neighbour.after) || (neighbour.before && full[idx + 1]?.id === neighbour.before)) return;
        }
        onMove(task, statusId, storyId, neighbour);
    };

    const focusTask = (id) => requestAnimationFrame(() => document.querySelector(`[data-task="${id}"]`)?.focus());
    const onTaskKey = (e, task, storyId) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTask(task); return; }
        if (!canEdit || !e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
        e.preventDefault();
        const idx = statuses.findIndex((s) => s.id === task.status);
        const target = statuses[idx + (e.key === 'ArrowRight' ? 1 : -1)];
        if (!target) return;
        const list = cells[key(storyId, target.id)] || [];
        Promise.resolve(onMove(task, target.id, storyId, list.length ? { after: list[list.length - 1].id } : null)).then(() => focusTask(task.id));
    };

    return (
        <div className="pl-taskboard" style={{ '--cols': statuses.length }} role="grid" aria-label="Sprint taskboard">
            <div className="pl-tb-row pl-tb-headrow" role="row">
                <div className="pl-tb-rowhead pl-tb-corner" role="columnheader">User story</div>
                {statuses.map((s) => {
                    const count = tasks.filter((t) => t.status === s.id).length;
                    return (
                        <div key={s.id} className="pl-tb-colhead" role="columnheader" style={{ '--status': s.color }}>
                            <span className="pl-status-dot" />
                            <span className="truncate">{s.name}</span>
                            <span className="pl-wip">{count}</span>
                        </div>
                    );
                })}
            </div>
            {rows.map(({ id: storyId, story }) => {
                const rowTasks = tasks.filter((t) => (story ? t.user_story === story.id : !stories.some((s) => s.id === t.user_story)));
                if (!story && rowTasks.length === 0 && !canAdd) return null;
                const done = rowTasks.filter((t) => t.is_closed).length;
                return (
                    <div key={storyId ?? 'none'} className={`pl-tb-row ${story?.is_closed ? 'is-closed' : ''}`} role="row">
                        <div className="pl-tb-rowhead" role="rowheader">
                            {story ? (
                                <>
                                    <button type="button" className="pl-tb-story" onClick={() => onOpenStory(story)}>
                                        <span className="ref">#{story.ref}</span> {story.subject}
                                    </button>
                                    <div className="pl-tb-story-meta">
                                        <StatusPill status={story.status_extra_info} className="pl-pill-sm" />
                                        <PointsBadge value={storyPoints(story, points)} />
                                    </div>
                                </>
                            ) : (
                                <div className="pl-tb-story is-none"><FaInbox size={11} /> Tasks without a story</div>
                            )}
                            <div className="pl-tb-story-foot">
                                <span className="text-xs text-muted tabular">{done}/{rowTasks.length} tasks done</span>
                                {canAdd && (
                                    <button type="button" className="btn btn-ghost btn-sm pl-tb-add" onClick={() => onAddTask(story)} aria-label={story ? `Add task to #${story.ref}` : 'Add task without story'}>
                                        <FaPlus size={9} /> Task
                                    </button>
                                )}
                            </div>
                            {rowTasks.length > 0 && (
                                <div className="progress progress-sm tone-success" aria-hidden="true"><div className="progress-bar" style={{ width: `${(done / rowTasks.length) * 100}%` }} /></div>
                            )}
                        </div>
                        {statuses.map((s) => {
                            const k = key(storyId, s.id);
                            const list = cells[k] || [];
                            const cellHint = hint?.key === k ? hint : null;
                            return (
                                <div
                                    key={s.id}
                                    role="gridcell"
                                    aria-label={`${s.name}: ${list.length} tasks`}
                                    className={`pl-tb-cell ${cellHint ? 'is-drop-target' : ''}`}
                                    onDragOver={canEdit ? (e) => {
                                        if (!dragRef.current) return;
                                        e.preventDefault();
                                        setHint((h) => (h?.key === k ? h : { key: k, id: null }));
                                    } : undefined}
                                    onDragLeave={canEdit ? (e) => {
                                        if (e.currentTarget.contains(e.relatedTarget)) return;
                                        setHint((h) => (h?.key === k ? null : h));
                                    } : undefined}
                                    onDrop={canEdit ? (e) => onDrop(e, storyId, s.id) : undefined}
                                >
                                    {list.map((t) => (
                                        <TaskCard
                                            key={t.id}
                                            task={t}
                                            hint={cellHint?.id === t.id ? cellHint.pos : null}
                                            dragging={draggingId === t.id}
                                            canEdit={canEdit}
                                            onOpen={() => onOpenTask(t)}
                                            onKeyDown={(e) => onTaskKey(e, t, storyId)}
                                            dragProps={{
                                                onDragStart: (e) => {
                                                    dragRef.current = { id: t.id };
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    e.dataTransfer.setData('text/plain', String(t.id));
                                                    setDraggingId(t.id);
                                                },
                                                onDragEnd: endDrag,
                                                onDragOver: canEdit ? (e) => {
                                                    if (!dragRef.current) return;
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (dragRef.current.id === t.id) { setHint((h) => (h?.key === k && !h.id ? h : { key: k, id: null })); return; }
                                                    const pos = dropPosition(e);
                                                    setHint((h) => (h?.key === k && h.id === t.id && h.pos === pos ? h : { key: k, id: t.id, pos }));
                                                } : undefined,
                                            }}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default TaskBoard;
