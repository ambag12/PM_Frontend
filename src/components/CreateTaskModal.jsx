import React, { useEffect, useId, useRef, useState } from 'react';
import { taskService, userStoryService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal, Field, Loader } from './UI';
import TagEditor from './work/TagEditor';
import { CreateFooter, CreatedNote } from './work/FormBits';
import { useProjectData } from './work/useWorkItem';
import { memberOptions, statusOptions } from './work/workTypes';

const TaskForm = ({ project, projectId, formId, setBusy, onTaskCreated, onClose, userStoryId, milestoneId, statusId }) => {
    const toast = useToast();
    const subjectRef = useRef(null);
    const [form, setForm] = useState(() => ({
        subject: '',
        description: '',
        status: statusId ?? project.default_task_status ?? project.task_statuses?.[0]?.id ?? '',
        user_story: userStoryId ?? '',
        milestone: milestoneId ?? '',
        assigned_to: '',
        tags: [],
        is_iocaine: false,
    }));
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [created, setCreated] = useState('');
    const [stories, setStories] = useState(null);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    useEffect(() => {
        let off = false;
        userStoryService.list({ project: projectId })
            .then((res) => { if (!off) setStories(res.data || []); })
            .catch(() => { if (!off) setStories([]); });
        return () => { off = true; };
    }, [projectId]);

    const sprints = (project.milestones || []).filter((m) => !m.closed || String(m.id) === String(form.milestone));

    // Picking a story moves the task into that story's sprint (the usual Taiga behaviour).
    const pickStory = (value) => {
        const s = (stories || []).find((x) => String(x.id) === String(value));
        setForm((f) => ({ ...f, user_story: value, milestone: s ? (s.milestone ?? '') : f.milestone }));
    };

    const submit = async (e) => {
        e.preventDefault();
        const another = e.nativeEvent?.submitter?.value === 'another';
        const subject = form.subject.trim();
        if (!subject) {
            setErrors({ subject: 'Give the task a subject.' });
            subjectRef.current?.focus();
            return;
        }
        setErrors({});
        setApiError('');
        setBusy(true);
        try {
            const res = await taskService.create({
                project: Number(projectId),
                subject,
                description: form.description,
                status: form.status ? Number(form.status) : undefined,
                user_story: form.user_story ? Number(form.user_story) : null,
                milestone: form.milestone ? Number(form.milestone) : null,
                assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
                tags: form.tags,
                is_iocaine: form.is_iocaine,
            });
            onTaskCreated?.(res.data);
            if (another) {
                setForm((f) => ({ ...f, subject: '', description: '' }));
                setCreated(`Task #${res.data.ref} created. Add the next one.`);
                subjectRef.current?.focus();
            } else {
                toast.success(`Task #${res.data.ref} created`);
                onClose();
            }
        } catch (err) {
            setApiError(getErrorMessage(err, 'Could not create the task.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form id={formId} onSubmit={submit} noValidate>
            {created && <CreatedNote text={created} onDismiss={() => setCreated('')} />}
            {apiError && <div className="alert alert-error mb-4" role="alert">{apiError}</div>}
            <Field label="Subject" error={errors.subject}>
                <input
                    ref={subjectRef}
                    className="form-input"
                    value={form.subject}
                    onChange={(e) => set('subject', e.target.value)}
                    placeholder="e.g. Collect quotations from vendors"
                    aria-invalid={!!errors.subject}
                    maxLength={500}
                    autoFocus
                />
            </Field>
            <Field label="Description" optional hint="Markdown is supported.">
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} aria-label="Description" />
            </Field>
            <div className="form-grid">
                <Field label="User story" optional className="span-2">
                    <select className="form-input" value={form.user_story} onChange={(e) => pickStory(e.target.value)} disabled={!stories} aria-label="User story">
                        <option value="">{stories ? 'No user story' : 'Loading stories…'}</option>
                        {(stories || []).map((s) => <option key={s.id} value={s.id}>#{s.ref} {s.subject}</option>)}
                    </select>
                </Field>
                <Field label="Status">
                    <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
                        {statusOptions(project.task_statuses).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Sprint" optional>
                    <select className="form-input" value={form.milestone} onChange={(e) => set('milestone', e.target.value)} aria-label="Sprint">
                        <option value="">No sprint</option>
                        {sprints.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </Field>
                <Field label="Assigned to" optional>
                    <select className="form-input" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} aria-label="Assigned to">
                        <option value="">Unassigned</option>
                        {memberOptions(project.members).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <div className="form-group create-switch">
                    <label className="switch">
                        <input type="checkbox" checked={form.is_iocaine} onChange={(e) => set('is_iocaine', e.target.checked)} />
                        <span className="switch-track" />
                        <span>Iocaine (hard / risky)</span>
                    </label>
                </div>
                <div className="form-group span-2">
                    <span className="form-label">Tags <span className="optional">(optional)</span></span>
                    <TagEditor value={form.tags} tagsColors={project.tags_colors} onChange={(v) => set('tags', v)} />
                </div>
            </div>
        </form>
    );
};

/*
 * Create a task.
 *   <CreateTaskModal projectId onClose onTaskCreated={(task) => …} userStoryId? milestoneId? statusId? />
 */
const CreateTaskModal = ({ projectId, onClose, onTaskCreated, userStoryId, milestoneId, statusId }) => {
    const { project } = useProjectData(projectId);
    const [busy, setBusy] = useState(false);
    const formId = `create-task-${useId().replace(/:/g, '')}`;
    return (
        <Modal
            isOpen
            onClose={busy ? () => {} : onClose}
            title="New task"
            size="lg"
            footer={<CreateFooter formId={formId} busy={busy || !project} onCancel={onClose} label="Create task" />}
        >
            {project ? (
                <TaskForm
                    project={project}
                    projectId={projectId}
                    formId={formId}
                    setBusy={setBusy}
                    onTaskCreated={onTaskCreated}
                    onClose={onClose}
                    userStoryId={userStoryId}
                    milestoneId={milestoneId}
                    statusId={statusId}
                />
            ) : <Loader label="Loading project…" />}
        </Modal>
    );
};

export default CreateTaskModal;
