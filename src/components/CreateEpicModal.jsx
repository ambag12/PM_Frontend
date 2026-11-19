import React, { useId, useRef, useState } from 'react';
import { epicService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal, Field, Loader } from './UI';
import TagEditor from './work/TagEditor';
import { CreateFooter, CreatedNote, SwatchInput } from './work/FormBits';
import { useProjectData } from './work/useWorkItem';
import { randomEpicColor, statusOptions } from './work/workTypes';

const EpicForm = ({ project, projectId, formId, setBusy, onCreated, onClose }) => {
    const toast = useToast();
    const ids = useId();
    const subjectRef = useRef(null);
    const [form, setForm] = useState(() => ({
        subject: '',
        description: '',
        color: randomEpicColor(),
        status: project.default_epic_status ?? project.epic_statuses?.[0]?.id ?? '',
        tags: [],
        client_requirement: false,
        team_requirement: false,
    }));
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [created, setCreated] = useState('');
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        const another = e.nativeEvent?.submitter?.value === 'another';
        const subject = form.subject.trim();
        if (!subject) {
            setErrors({ subject: 'Give the epic a name.' });
            subjectRef.current?.focus();
            return;
        }
        setErrors({});
        setApiError('');
        setBusy(true);
        try {
            const res = await epicService.create({
                project: Number(projectId),
                subject,
                description: form.description,
                color: form.color,
                status: form.status ? Number(form.status) : undefined,
                tags: form.tags,
                client_requirement: form.client_requirement,
                team_requirement: form.team_requirement,
            });
            onCreated?.(res.data);
            if (another) {
                setForm((f) => ({ ...f, subject: '', description: '', color: randomEpicColor() }));
                setCreated(`Epic #${res.data.ref} created. Add the next one.`);
                subjectRef.current?.focus();
            } else {
                toast.success(`Epic #${res.data.ref} created`);
                onClose();
            }
        } catch (err) {
            setApiError(getErrorMessage(err, 'Could not create the epic.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form id={formId} onSubmit={submit} noValidate>
            {created && <CreatedNote text={created} onDismiss={() => setCreated('')} />}
            {apiError && <div className="alert alert-error mb-4" role="alert">{apiError}</div>}
            <Field label="Name" error={errors.subject}>
                <div className="row">
                    <span className="epic-swatch epic-swatch-lg" style={{ '--epic': form.color }} aria-hidden="true" />
                    <input
                        ref={subjectRef}
                        className="form-input flex-1"
                        value={form.subject}
                        onChange={(e) => set('subject', e.target.value)}
                        placeholder="e.g. Civil Works Package"
                        aria-label="Epic name"
                        aria-invalid={!!errors.subject}
                        maxLength={500}
                        autoFocus
                    />
                </div>
            </Field>
            <Field label="Description" optional hint="Markdown is supported.">
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} aria-label="Description" />
            </Field>
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label" htmlFor={`${ids}-color`}>Colour</label>
                    <SwatchInput id={`${ids}-color`} value={form.color} onChange={(c) => set('color', c)} />
                </div>
                <Field label="Status">
                    <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)} aria-label="Status">
                        {statusOptions(project.epic_statuses).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <div className="form-group span-2">
                    <span className="form-label">Tags <span className="optional">(optional)</span></span>
                    <TagEditor value={form.tags} tagsColors={project.tags_colors} onChange={(v) => set('tags', v)} />
                </div>
                <div className="form-group span-2 row gap-4 flex-wrap">
                    <label className="switch">
                        <input type="checkbox" checked={form.client_requirement} onChange={(e) => set('client_requirement', e.target.checked)} />
                        <span className="switch-track" />
                        <span>Client requirement</span>
                    </label>
                    <label className="switch">
                        <input type="checkbox" checked={form.team_requirement} onChange={(e) => set('team_requirement', e.target.checked)} />
                        <span className="switch-track" />
                        <span>Team requirement</span>
                    </label>
                </div>
            </div>
        </form>
    );
};

/*
 * Create an epic.
 *   <CreateEpicModal projectId onClose onCreated={(epic) => …} />
 */
const CreateEpicModal = ({ projectId, onClose, onCreated }) => {
    const { project } = useProjectData(projectId);
    const [busy, setBusy] = useState(false);
    const formId = `create-epic-${useId().replace(/:/g, '')}`;
    return (
        <Modal
            isOpen
            onClose={busy ? () => {} : onClose}
            title="New epic"
            size="lg"
            footer={<CreateFooter formId={formId} busy={busy || !project} onCancel={onClose} label="Create epic" />}
        >
            {project ? (
                <EpicForm project={project} projectId={projectId} formId={formId} setBusy={setBusy} onCreated={onCreated} onClose={onClose} />
            ) : <Loader label="Loading project…" />}
        </Modal>
    );
};

export default CreateEpicModal;
