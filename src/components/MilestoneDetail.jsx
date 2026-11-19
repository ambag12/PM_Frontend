import React, { useCallback, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FaCalendarAlt, FaEdit, FaTrash, FaEye, FaEyeSlash, FaLock, FaLockOpen, FaColumns, FaChartLine,
    FaTasks, FaBookOpen, FaBullseye, FaFlask,
} from 'react-icons/fa';
import { milestoneService, taskService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast, useConfirm } from '../context/ToastContext';
import { AuthContext } from '../context/AuthContext';
import { Button, Loader, Ring, EmptyState } from './UI';
import TaskDetail from './TaskDetail';
import UserStoryDetail from './UserStoryDetail';
import CreateTaskModal from './CreateTaskModal';
import BurndownChart from './planning/BurndownChart';
import TaskBoard from './planning/TaskBoard';
import { ALL, useRemote, sumDict, fmtPoints, dateRange, sprintState } from './planning/utils';
import { percent } from '../utils/format';
import '../styles/planning.css';

/*
 * MilestoneDetail — one sprint: header + actions, KPIs, burndown and the taskboard.
 *   <MilestoneDetail projectId sprintId refreshKey? onEdit(sprint) onChanged(sprint) onDeleted() />
 */
const MilestoneDetail = ({ projectId, sprintId, refreshKey = 0, onEdit, onChanged, onDeleted }) => {
    const { project } = useProject();
    const { canModify, canDelete, canAdd } = usePermissions();
    const { user } = useContext(AuthContext) || {};
    const toast = useToast();
    const confirm = useConfirm();

    const fetchSprint = useCallback(() => milestoneService.get(sprintId).then((r) => ({ ...r.data, refreshKey })), [sprintId, refreshKey]);
    const sprintR = useRemote(fetchSprint);
    const fetchStats = useCallback(() => milestoneService.getStats(sprintId).then((r) => ({ ...r.data, refreshKey })), [sprintId, refreshKey]);
    const statsR = useRemote(fetchStats);
    const fetchTasks = useCallback(() => taskService.list({ project: projectId, milestone: sprintId, ...ALL }).then((r) => r.data), [projectId, sprintId]);
    const tasksR = useRemote(fetchTasks);
    const fetchWatchers = useCallback(() => milestoneService.getWatchers(sprintId).then((r) => r.data), [sprintId]);
    const watchersR = useRemote(fetchWatchers);

    const [openItem, setOpenItem] = useState(null); // { type, id }
    const [addTaskFor, setAddTaskFor] = useState(undefined); // story | null (no story) | undefined (closed)
    const [busy, setBusy] = useState('');

    const sprint = sprintR.data;
    const stats = statsR.data;
    const tasks = tasksR.data || [];
    const statuses = [...(project?.task_statuses || [])].sort((a, b) => a.order - b.order);
    const stories = [...(sprint?.user_stories || [])].sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0));
    const watchers = watchersR.data || [];
    const isWatching = !!user && watchers.some((w) => (w.id ?? w) === user.id);

    const refreshBoard = useCallback(() => {
        sprintR.refresh();
        statsR.refresh();
        tasksR.refresh();
    }, [sprintR, statsR, tasksR]);

    const moveTask = async (task, statusId, storyId, neighbour) => {
        // optimistic: compute the new arrangement from the current list
        const moved = { ...task, status: statusId, user_story: storyId };
        const sorted = (tasksR.data || [])
            .filter((t) => t.id !== task.id)
            .sort((a, b) => (a.taskboard_order ?? 0) - (b.taskboard_order ?? 0) || a.id - b.id);
        let at = sorted.length;
        if (neighbour?.before) at = sorted.findIndex((t) => t.id === neighbour.before);
        else if (neighbour?.after) at = sorted.findIndex((t) => t.id === neighbour.after) + 1;
        if (at < 0) at = sorted.length;
        const nextList = [...sorted.slice(0, at), moved, ...sorted.slice(at)].map((t, i) => ({ ...t, taskboard_order: i + 1 }));
        tasksR.setData(nextList);
        try {
            const changed = task.status !== statusId || (task.user_story ?? null) !== (storyId ?? null);
            if (changed) {
                await taskService.update(task.id, { status: statusId, user_story: storyId, version: task.version });
                const st = statuses.find((s) => s.id === statusId);
                toast.success(`Task #${task.ref} → ${st?.name || 'moved'}`);
            }
            if (neighbour) {
                const cell = nextList.filter((t) => t.status === statusId && (t.user_story ?? null) === (storyId ?? null));
                await taskService.bulkUpdateTaskboardOrder(Number(projectId), cell.map((t, i) => ({ task_id: t.id, order: i + 1 })), { status_id: statusId, milestone_id: Number(sprintId) });
            }
        } catch (err) {
            toast.error(err);
        } finally {
            refreshBoard();
        }
    };

    const toggleWatch = async () => {
        setBusy('watch');
        try {
            if (isWatching) await milestoneService.unwatch(sprintId); else await milestoneService.watch(sprintId);
            toast.success(isWatching ? 'You stopped watching this sprint' : 'You are now watching this sprint');
            watchersR.refresh();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const toggleClosed = async () => {
        const closing = !sprint.closed;
        if (closing && !(await confirm({
            title: 'Close sprint?',
            message: `“${sprint.name}” will move to closed sprints. Open stories stay in it until you move them.`,
            confirmText: 'Close sprint',
        }))) return;
        setBusy('close');
        try {
            const res = await milestoneService.update(sprint.id, { closed: closing });
            toast.success(closing ? 'Sprint closed' : 'Sprint reopened');
            sprintR.refresh();
            onChanged?.(res.data);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy('');
        }
    };

    const remove = async () => {
        if (!(await confirm({
            title: 'Delete sprint?',
            message: `“${sprint.name}” will be deleted. Its ${stories.length} stories return to the backlog. This cannot be undone.`,
            confirmText: 'Delete sprint',
            danger: true,
        }))) return;
        setBusy('delete');
        try {
            await milestoneService.delete(sprint.id);
            toast.success('Sprint deleted');
            onDeleted?.(sprint);
        } catch (err) {
            toast.error(err);
            setBusy('');
        }
    };

    if (sprintR.error && !sprint) {
        return <EmptyState title="Sprint not found" description="It may have been deleted." />;
    }
    if (!sprint) return <Loader label="Loading sprint…" />;

    const totalPts = stats ? sumDict(stats.total_points) : 0;
    const donePts = stats ? sumDict(stats.completed_points) : 0;
    const progress = totalPts > 0 ? percent(donePts, totalPts) : percent(stats?.completed_tasks, stats?.total_tasks);
    const state = sprintState(sprint);
    const canEdit = canModify('milestone');

    return (
        <div className="pl-sprint-detail stack">
            <section className="card pl-sd-head">
                <div className="pl-sd-title-row">
                    <div className="flex-1">
                        <div className="row gap-2 flex-wrap">
                            <h2 className="pl-sd-title">{sprint.name}</h2>
                            <span className={`badge tone-${state.tone} pl-tone-badge`}>{state.label}</span>
                        </div>
                        <div className="pl-sd-dates"><FaCalendarAlt size={11} /> {dateRange(sprint.estimated_start, sprint.estimated_finish)}</div>
                    </div>
                    <div className="pl-sd-actions">
                        <Button size="sm" variant="secondary" className={isWatching ? 'is-on' : ''} icon={isWatching ? <FaEyeSlash /> : <FaEye />} onClick={toggleWatch} loading={busy === 'watch'} aria-pressed={isWatching}>
                            {isWatching ? 'Unwatch' : 'Watch'}{watchers.length ? ` · ${watchers.length}` : ''}
                        </Button>
                        {canEdit && <Button size="sm" variant="secondary" icon={<FaEdit />} onClick={() => onEdit?.(sprint)}>Edit</Button>}
                        {canEdit && (
                            <Button size="sm" variant="secondary" icon={sprint.closed ? <FaLockOpen /> : <FaLock />} onClick={toggleClosed} loading={busy === 'close'}>
                                {sprint.closed ? 'Reopen' : 'Close sprint'}
                            </Button>
                        )}
                        {canDelete('milestone') && <Button size="sm" variant="danger-ghost" icon={<FaTrash />} onClick={remove} loading={busy === 'delete'} aria-label="Delete sprint" />}
                    </div>
                </div>
                <div className="pl-sd-kpis">
                    <div className="pl-sd-ring tone-success">
                        <Ring value={progress} size={64} tone="success" />
                        <div>
                            <div className="pl-kpi-label">Completed</div>
                            <div className="text-xs text-muted">{totalPts > 0 ? 'by points' : 'by tasks'}</div>
                        </div>
                    </div>
                    <div className="pl-sd-kpi"><FaBullseye className="pl-sd-kpi-icon tone-primary" /><div><div className="pl-kpi-value">{fmtPoints(donePts)}<span className="pl-kpi-of">/{fmtPoints(totalPts)}</span></div><div className="pl-kpi-label">Points done</div></div></div>
                    <div className="pl-sd-kpi"><FaBookOpen className="pl-sd-kpi-icon tone-info" /><div><div className="pl-kpi-value">{stats?.completed_userstories ?? '–'}<span className="pl-kpi-of">/{stats?.total_userstories ?? stories.length}</span></div><div className="pl-kpi-label">Stories closed</div></div></div>
                    <div className="pl-sd-kpi"><FaTasks className="pl-sd-kpi-icon tone-accent" /><div><div className="pl-kpi-value">{stats?.completed_tasks ?? '–'}<span className="pl-kpi-of">/{stats?.total_tasks ?? tasks.length}</span></div><div className="pl-kpi-label">Tasks closed</div></div></div>
                    <div className="pl-sd-kpi"><FaFlask className="pl-sd-kpi-icon tone-warning" /><div><div className="pl-kpi-value">{stats?.iocaine_doses ?? 0}</div><div className="pl-kpi-label">Iocaine doses</div></div></div>
                </div>
            </section>

            <section className="card">
                <div className="card-header">
                    <h3 className="card-title row gap-2"><FaChartLine className="text-primary-color" /> Burndown</h3>
                    {stats && <span className="text-sm text-muted tabular">{fmtPoints(totalPts - donePts)} of {fmtPoints(totalPts)} pts open</span>}
                </div>
                {!stats ? <Loader label="" /> : <BurndownChart days={stats.days || []} />}
            </section>

            <section className="card flush">
                <div className="card-header">
                    <h3 className="card-title row gap-2"><FaColumns className="text-primary-color" /> Taskboard</h3>
                    <div className="row">
                        {tasksR.loading && tasksR.data && <span className="spinner spinner-sm" aria-label="Updating" />}
                        <Link className="btn btn-ghost btn-sm" to={`/project/${projectId}/backlog`}>Plan in backlog</Link>
                        {canAdd('task') && <Button size="sm" icon={<FaTasks />} onClick={() => setAddTaskFor(stories[0] || null)}>New task</Button>}
                    </div>
                </div>
                {!tasksR.data && !tasksR.error ? (
                    <Loader label="Loading tasks…" />
                ) : stories.length === 0 && tasks.length === 0 ? (
                    <EmptyState
                        icon={<FaColumns />}
                        title="Nothing planned yet"
                        description="Drag user stories into this sprint from the backlog, then break them down into tasks here."
                        action={<Link className="btn btn-primary" to={`/project/${projectId}/backlog`}>Open backlog</Link>}
                    />
                ) : (
                    <div className="pl-tb-scroll">
                        <TaskBoard
                            statuses={statuses}
                            stories={stories}
                            tasks={tasks}
                            points={project?.points || []}
                            canEdit={canModify('task')}
                            canAdd={canAdd('task') && !sprint.closed}
                            onOpenTask={(t) => setOpenItem({ type: 'task', id: t.id })}
                            onOpenStory={(s) => setOpenItem({ type: 'story', id: s.id })}
                            onAddTask={(story) => setAddTaskFor(story)}
                            onMove={moveTask}
                        />
                    </div>
                )}
                {canModify('task') && tasks.length > 0 && (
                    <div className="pl-list-foot text-xs text-muted">Drag tasks between columns · focus a task and press <span className="kbd">Alt</span>+<span className="kbd">←</span>/<span className="kbd">→</span> to change its status</div>
                )}
            </section>

            {openItem?.type === 'task' && (
                <TaskDetail
                    taskId={openItem.id}
                    projectId={projectId}
                    onClose={() => setOpenItem(null)}
                    onUpdate={refreshBoard}
                    onDelete={() => { setOpenItem(null); refreshBoard(); }}
                />
            )}
            {openItem?.type === 'story' && (
                <UserStoryDetail
                    storyId={openItem.id}
                    projectId={projectId}
                    onClose={() => setOpenItem(null)}
                    onUpdate={refreshBoard}
                    onDelete={() => { setOpenItem(null); refreshBoard(); }}
                />
            )}
            {addTaskFor !== undefined && (
                <CreateTaskModal
                    projectId={projectId}
                    userStoryId={addTaskFor?.id ?? undefined}
                    milestoneId={Number(sprintId)}
                    onClose={() => setAddTaskFor(undefined)}
                    onTaskCreated={() => { setAddTaskFor(undefined); refreshBoard(); }}
                />
            )}
        </div>
    );
};

export default MilestoneDetail;
