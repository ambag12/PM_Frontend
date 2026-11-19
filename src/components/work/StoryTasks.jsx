import React, { useCallback, useEffect, useState } from 'react';
import { FaTasks, FaPlus } from 'react-icons/fa';
import { taskService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { byId } from '../../utils/format';
import { ProgressBar, UserAvatar } from '../UI';
import { isVersionConflict } from './workTypes';
import Layer from './Layer';
import CreateTaskModal from '../CreateTaskModal';
import TaskDetail from '../TaskDetail';

/*
 * Tasks inside a user story: progress, quick close/reopen toggle, inline status change,
 * add task (CreateTaskModal with userStoryId) and open a task in a stacked drawer.
 */
const StoryTasks = ({ story, project, projectId, canModify, canAdd }) => {
    const toast = useToast();
    const [data, setData] = useState({ id: null, list: [], error: null });
    const [busyId, setBusyId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [openTask, setOpenTask] = useState(null);
    const statuses = [...(project.task_statuses || [])].sort((a, b) => a.order - b.order);

    const load = useCallback(async () => {
        try {
            const res = await taskService.list({ project: projectId, user_story: story.id });
            const list = [...(res.data || [])].sort((a, b) => (a.us_order ?? 0) - (b.us_order ?? 0) || a.ref - b.ref);
            setData({ id: story.id, list, error: null });
        } catch (err) {
            setData({ id: story.id, list: [], error: err });
        }
    }, [projectId, story.id]);

    useEffect(() => { load(); }, [load]);

    const setStatus = async (task, statusId) => {
        setBusyId(task.id);
        try {
            await taskService.update(task.id, { status: statusId, version: task.version });
        } catch (err) {
            if (isVersionConflict(err)) {
                const fresh = await taskService.get(task.id);
                await taskService.update(task.id, { status: statusId, version: fresh.data.version }).catch((e) => toast.error(e));
            } else {
                toast.error(err);
            }
        } finally {
            await load();
            setBusyId(null);
        }
    };

    const toggle = (task) => {
        const closed = byId(statuses, task.status)?.is_closed ?? task.is_closed;
        const target = closed ? statuses.find((s) => !s.is_closed) : statuses.find((s) => s.is_closed);
        if (target) setStatus(task, target.id);
    };

    const loading = String(data.id) !== String(story.id);
    const total = data.list.length;
    const done = data.list.filter((t) => t.is_closed).length;

    return (
        <section className="work-section" aria-labelledby={`tasks-${story.id}`}>
            <div className="work-section-head">
                <h3 className="work-section-title" id={`tasks-${story.id}`}>
                    <FaTasks /> Tasks {!loading && <span className="count-chip">{done}/{total}</span>}
                </h3>
                {canAdd && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
                        <FaPlus size={10} /> Add task
                    </button>
                )}
            </div>
            {loading ? (
                <div className="skeleton" style={{ height: 44 }} />
            ) : data.error ? (
                <div className="alert alert-error">Could not load tasks. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
            ) : total === 0 ? (
                <p className="text-sm text-muted">No tasks yet.{canAdd ? ' Break this story down into tasks.' : ''}</p>
            ) : (
                <>
                    <div className="mb-2"><ProgressBar value={(done / total) * 100} size="sm" tone="success" showLabel /></div>
                    <ul className="work-rows">
                        {data.list.map((t) => {
                            const st = byId(statuses, t.status);
                            return (
                                <li key={t.id} className={`work-row ${t.is_closed ? 'is-done' : ''}`}>
                                    <input
                                        type="checkbox"
                                        className="work-check"
                                        checked={!!t.is_closed}
                                        disabled={!canModify || busyId === t.id}
                                        onChange={() => toggle(t)}
                                        aria-label={t.is_closed ? `Reopen task #${t.ref}` : `Close task #${t.ref}`}
                                    />
                                    <span className="ref">#{t.ref}</span>
                                    <button type="button" className="work-row-title" onClick={() => setOpenTask(t.id)}>{t.subject}</button>
                                    {t.is_blocked && <span className="badge badge-error">Blocked</span>}
                                    {busyId === t.id && <span className="spinner spinner-sm" />}
                                    <select
                                        className="form-input form-input-sm work-row-status"
                                        value={t.status}
                                        disabled={!canModify || busyId === t.id}
                                        onChange={(e) => setStatus(t, Number(e.target.value))}
                                        aria-label={`Status of task #${t.ref}`}
                                        style={st?.color ? { '--swatch': st.color } : undefined}
                                    >
                                        {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {t.assigned_to_extra_info
                                        ? <UserAvatar user={t.assigned_to_extra_info} size="xs" />
                                        : <span className="avatar avatar-xs avatar-empty" title="Unassigned" aria-label="Unassigned" />}
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {adding && (
                <Layer>
                    <CreateTaskModal
                        projectId={projectId}
                        userStoryId={story.id}
                        milestoneId={story.milestone}
                        onClose={() => setAdding(false)}
                        onTaskCreated={() => load()}
                    />
                </Layer>
            )}
            {openTask && (
                <Layer>
                    <TaskDetail
                        taskId={openTask}
                        projectId={projectId}
                        onClose={() => setOpenTask(null)}
                        onUpdate={() => load()}
                        onDelete={() => { setOpenTask(null); load(); }}
                    />
                </Layer>
            )}
        </section>
    );
};

export default StoryTasks;
