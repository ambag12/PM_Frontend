import React, { useId, useRef, useState } from 'react';
import { issueService } from '../api/services';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Modal, Field, Loader } from './UI';
import TagEditor from './work/TagEditor';
import { CreateFooter, CreatedNote } from './work/FormBits';
import { useProjectData } from './work/useWorkItem';
import { memberOptions, statusOptions } from './work/workTypes';

const firstId = (list) => [...(list || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.id ?? '';

const IssueForm = ({ project, projectId, formId, setBusy, onIssueCreated, onClose }) => {
    const toast = useToast();
    const subjectRef = useRef(null);
    const [form, setForm] = useState(() => ({
        subject: '',
        description: '',
        type: project.default_issue_type ?? firstId(project.issue_types),
        severity: project.default_severity ?? firstId(project.severities),
        priority: project.default_priority ?? firstId(project.priorities),
        status: project.default_issue_status ?? firstId(project.issue_statuses),
        assigned_to: '',
        tags: [],
        due_date: '',
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
            setErrors({ subject: 'Describe the issue in a short subject.' });
            subjectRef.current?.focus();
            return;
        }
        setErrors({});
        setApiError('');
        setBusy(true);
        try {
            const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));
            const res = await issueService.create({
                project: Number(projectId),
                subject,
                description: form.description,
                type: num(form.type),
                severity: num(form.severity),
                priority: num(form.priority),
                status: num(form.status),
                assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
                tags: form.tags,
                due_date: form.due_date || null,
            });
            onIssueCreated?.(res.data);
            if (another) {
                setForm((f) => ({ ...f, subject: '', description: '', due_date: '' }));
                setCreated(`Issue #${res.data.ref} reported. Add the next one.`);
                subjectRef.current?.focus();
            } else {
                toast.success(`Issue #${res.data.ref} reported`);
                onClose();
            }
        } catch (err) {
            setApiError(getErrorMessage(err, 'Could not create the issue.'));
        } finally {
            setBusy(false);
        }
    };

    const select = (key, label, list, extra = {}) => (
        <Field label={label} {...extra}>
            <select className="form-input" value={form[key]} onChange={(e) => set(key, e.target.value)} aria-label={label}>
                {statusOptions(list).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </Field>
    );

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
                    placeholder="e.g. Site access road blocked"
                    aria-invalid={!!errors.subject}
                    maxLength={500}
                    autoFocus
                />
            </Field>
            <Field label="Description" optional hint="Steps, impact, evidence… Markdown is supported.">
                <textarea className="form-input" rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} aria-label="Description" />
            </Field>
            <div className="form-grid">
                {select('type', 'Type', project.issue_types)}
                {select('status', 'Status', project.issue_statuses)}
                {select('severity', 'Severity', project.severities)}
                {select('priority', 'Priority', project.priorities)}
                <Field label="Assigned to" optional>
                    <select className="form-input" value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} aria-label="Assigned to">
                        <option value="">Unassigned</option>
                        {memberOptions(project.members).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Due date" optional>
                    <input type="date" className="form-input" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} aria-label="Due date" />
                </Field>
                <div className="form-group span-2">
                    <span className="form-label">Tags <span className="optional">(optional)</span></span>
                    <TagEditor value={form.tags} tagsColors={project.tags_colors} onChange={(v) => set('tags', v)} />
                </div>
            </div>
        </form>
    );
};

/*
 * Report an issue.
 *   <CreateIssueModal projectId onClose onIssueCreated={(issue) => …} />
 */
const CreateIssueModal = ({ projectId, onClose, onIssueCreated }) => {
    const { project } = useProjectData(projectId);
    const [busy, setBusy] = useState(false);
    const formId = `create-issue-${useId().replace(/:/g, '')}`;
    return (
        <Modal
            isOpen
            onClose={busy ? () => {} : onClose}
            title="Report an issue"
            size="lg"
            footer={<CreateFooter formId={formId} busy={busy || !project} onCancel={onClose} label="Create issue" />}
        >
            {project ? (
                <IssueForm project={project} projectId={projectId} formId={formId} setBusy={setBusy} onIssueCreated={onIssueCreated} onClose={onClose} />
            ) : <Loader label="Loading project…" />}
        </Modal>
    );
};

export default CreateIssueModal;
