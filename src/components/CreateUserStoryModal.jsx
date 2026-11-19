import React, { useEffect, useId, useRef, useState } from 'react';
import { epicService, userStoryService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal, Field, Loader } from './UI';
import TagEditor from './work/TagEditor';
import { CreateFooter, CreatedNote, PeoplePicker } from './work/FormBits';
import { useProjectData } from './work/useWorkItem';
import { statusOptions } from './work/workTypes';

const emptyForm = (project, { statusId, milestoneId, epicId }) => ({
    subject: '',
    description: '',
    status: statusId ?? project.default_us_status ?? project.us_statuses?.[0]?.id ?? '',
    assigned_users: [],
    tags: [],
    milestone: milestoneId ?? '',
    epic: epicId ?? '',
    points: {},
});

const StoryForm = ({ project, projectId, formId, setBusy, onStoryCreated, onClose, milestoneId, statusId, epicId }) => {
    const toast = useToast();
    const subjectRef = useRef(null);
    const ids = useId();
    const [form, setForm] = useState(() => emptyForm(project, { statusId, milestoneId, epicId }));
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [created, setCreated] = useState('');
    const [showPoints, setShowPoints] = useState(false);
    const [epics, setEpics] = useState([]);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    useEffect(() => {
        if (project.is_epics_activated === false) return undefined;
        let off = false;
        epicService.list({ project: projectId }).then((res) => { if (!off) setEpics(res.data || []); }).catch(() => {});
        return () => { off = true; };
    }, [projectId, project.is_epics_activated]);

    const roles = (project.roles || []).filter((r) => r.computable);
    const points = [...(project.points || [])].sort((a, b) => a.order - b.order);
    const sprints = (project.milestones || []).filter((m) => !m.closed || String(m.id) === String(form.milestone));

    const submit = async (e) => {
        e.preventDefault();
        const another = e.nativeEvent?.submitter?.value === 'another';
        const subject = form.subject.trim();
        if (!subject) {
            setErrors({ subject: 'Give the story a subject.' });
            subjectRef.current?.focus();
            return;
        }
        setErrors({});
        setApiError('');
        setBusy(true);
        try {
            const payload = {
                project: Number(projectId),
                subject,
                description: form.description,
                status: form.status ? Number(form.status) : undefined,
                tags: form.tags,
                assigned_users: form.assigned_users,
                assigned_to: form.assigned_users[0] ?? null,
                milestone: form.milestone ? Number(form.milestone) : null,
            };
            const pts = Object.fromEntries(Object.entries(form.points).filter(([, v]) => v));
            if (Object.keys(pts).length) payload.points = pts;
            const res = await userStoryService.create(payload);
            let story = res.data;
            if (form.epic) {
                try {
                    await epicService.addRelated(Number(form.epic), story.id);
                    story = (await userStoryService.get(story.id)).data;
                } catch (err) {
                    toast.warning(`Story created, but linking it to the epic failed: ${getErrorMessage(err)}`);
                }
            }
            onStoryCreated?.(story);
            if (another) {
                setForm((f) => ({ ...f, subject: '', description: '', points: {} }));
                setCreated(`User story #${story.ref} created. Add the next one.`);
                subjectRef.current?.focus();
            } else {
                toast.success(`User story #${story.ref} created`);
                onClose();
            }
        } catch (err) {
            setApiError(getErrorMessage(err, 'Could not create the user story.'));
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
                    placeholder="e.g. Prepare BOQ for civil works"
                    aria-invalid={!!errors.subject}
                    maxLength={500}
                    autoFocus
                />
            </Field>
            <Field label="Description" optional hint="Markdown is supported.">
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} aria-label="Description" />
            </Field>
            <div className="form-grid">
                <Field label="Status">
                    <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
                        {statusOptions(project.us_statuses).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Sprint" optional>
                    <select className="form-input" value={form.milestone} onChange={(e) => set('milestone', e.target.value)} aria-label="Sprint">
                        <option value="">Backlog (no sprint)</option>
                        {sprints.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </Field>
                {project.is_epics_activated !== false && (
                    <Field label="Epic" optional className="span-2">
                        <select className="form-input" value={form.epic} onChange={(e) => set('epic', e.target.value)} aria-label="Epic">
                            <option value="">No epic</option>
                            {epics.map((ep) => <option key={ep.id} value={ep.id}>#{ep.ref} {ep.subject}</option>)}
                        </select>
                    </Field>
                )}
                <div className="form-group span-2">
                    <label className="form-label" htmlFor={`${ids}-people`}>Assigned users <span className="optional">(optional)</span></label>
                    <PeoplePicker id={`${ids}-people`} value={form.assigned_users} members={project.members} onChange={(v) => set('assigned_users', v)} />
                </div>
                <div className="form-group span-2">
                    <span className="form-label">Tags <span className="optional">(optional)</span></span>
                    <TagEditor value={form.tags} tagsColors={project.tags_colors} onChange={(v) => set('tags', v)} />
                </div>
            </div>
            {roles.length > 0 && (
                <div className="form-group">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPoints((s) => !s)} aria-expanded={showPoints}>
                        {showPoints ? '− Hide' : '+ Estimate'} points per role
                    </button>
                    {showPoints && (
                        <div className="points-grid points-grid-form mt-2">
                            {roles.map((r) => (
                                <label key={r.id} className="points-cell">
                                    <span className="points-role">{r.name}</span>
                                    <select className="form-input form-input-sm" value={form.points[r.id] || ''} onChange={(e) => set('points', { ...form.points, [r.id]: e.target.value ? Number(e.target.value) : '' })}>
                                        <option value="">—</option>
                                        {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </form>
    );
};

/*
 * Create a user story.
 *   <CreateUserStoryModal projectId onClose onStoryCreated={(story) => …} milestoneId? statusId? epicId? />
 */
const CreateUserStoryModal = ({ projectId, onClose, onStoryCreated, milestoneId, statusId, epicId }) => {
    const { project } = useProjectData(projectId);
    const [busy, setBusy] = useState(false);
    const formId = `create-us-${useId().replace(/:/g, '')}`;
    return (
        <Modal
            isOpen
            onClose={busy ? () => {} : onClose}
            title="New user story"
            size="lg"
            footer={<CreateFooter formId={formId} busy={busy || !project} onCancel={onClose} label="Create story" />}
        >
            {project ? (
                <StoryForm
                    project={project}
                    projectId={projectId}
                    formId={formId}
                    setBusy={setBusy}
                    onStoryCreated={onStoryCreated}
                    onClose={onClose}
                    milestoneId={milestoneId}
                    statusId={statusId}
                    epicId={epicId}
                />
            ) : <Loader label="Loading project…" />}
        </Modal>
    );
};

export default CreateUserStoryModal;
