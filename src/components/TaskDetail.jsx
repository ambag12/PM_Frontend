import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowUp, FaSkull } from 'react-icons/fa';
import { taskService, userStoryService } from '../api/services';
import { useConfirm } from '../context/ToastContext';
import WorkItemDrawer from './work/WorkItemDrawer';
import { SelectField, ToggleField } from './work/SideFields';

/* Parent user story picker (loads the project's stories once). */
const ParentStoryField = ({ item, projectId, disabled, onChange }) => {
    const [stories, setStories] = useState(null);
    useEffect(() => {
        let off = false;
        userStoryService.list({ project: projectId })
            .then((res) => { if (!off) setStories(res.data || []); })
            .catch(() => { if (!off) setStories([]); });
        return () => { off = true; };
    }, [projectId]);

    const current = item.user_story_extra_info;
    const options = (stories || []).map((s) => ({ value: s.id, label: `#${s.ref} ${s.subject}` }));
    if (current && !options.some((o) => String(o.value) === String(item.user_story))) {
        options.unshift({ value: item.user_story, label: `#${current.ref} ${current.subject}` });
    }
    return (
        <>
            <SelectField
                label="User story"
                value={item.user_story}
                options={options}
                noneLabel={stories ? 'No parent story' : 'Loading…'}
                disabled={disabled || !stories}
                onChange={onChange}
            />
            {current && (
                <Link className="text-sm parent-link" to={`/project/${projectId}/backlog?ref=${current.ref}`}>
                    Open story #{current.ref} →
                </Link>
            )}
        </>
    );
};

const PromoteButton = ({ item, projectId, toast, close, onDelete, canPromote }) => {
    const confirm = useConfirm();
    const [busy, setBusy] = useState(false);
    if (!canPromote) return null;
    const promote = async () => {
        const ok = await confirm({
            title: `Promote task #${item.ref} to a user story?`,
            message: 'A new user story is created from this task and the task itself is removed.',
            confirmText: 'Promote',
        });
        if (!ok) return;
        setBusy(true);
        try {
            const res = await taskService.promoteToUserStory(item.id, projectId);
            const refs = [].concat(res.data || []);
            toast.success(refs.length ? `Promoted to user story #${refs.join(', #')}` : 'Promoted to user story');
            onDelete?.(item.id);
            close();
        } catch (err) {
            toast.error(err);
            setBusy(false);
        }
    };
    return (
        <button type="button" className="btn btn-secondary btn-sm" onClick={promote} disabled={busy} title="Promote to user story">
            {busy ? <span className="spinner spinner-sm" /> : <FaArrowUp />} <span className="hide-sm">Promote</span>
        </button>
    );
};

/*
 * Task detail drawer.
 *   <TaskDetail taskId={id} projectId={pid} onClose onUpdate={(task) => …} onDelete={(id) => …} />
 */
const TaskDetail = ({ taskId, projectId, onClose, onUpdate, onDelete }) => (
    <WorkItemDrawer
        type="task"
        id={taskId}
        projectId={projectId}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        renderBadges={({ item }) => item.is_iocaine && (
            <span className="badge badge-warning" title="Iocaine: this task is especially hard / risky"><FaSkull size={9} /> Iocaine</span>
        )}
        renderActions={({ item, projectId: pid, toast, close, can }) => (
            <PromoteButton item={item} projectId={pid} toast={toast} close={close} onDelete={onDelete} canPromote={can('add_us') && can('delete_task')} />
        )}
        renderSideTop={({ item, projectId: pid, save, canModify }) => (
            <ParentStoryField item={item} projectId={pid} disabled={!canModify} onChange={(v) => save({ user_story: v })} />
        )}
        renderSideBottom={({ item, save, canModify }) => (
            <ToggleField
                label="Iocaine"
                hint="Flag a task that is unusually hard or risky."
                checked={item.is_iocaine}
                disabled={!canModify}
                onChange={(v) => save({ is_iocaine: v })}
            />
        )}
    />
);

export default TaskDetail;
