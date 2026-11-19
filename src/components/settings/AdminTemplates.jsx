import React, { useState } from 'react';
import { FaFileAlt, FaPen, FaTrash, FaEye, FaLock } from 'react-icons/fa';
import { projectTemplateService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Loader, EmptyState, Modal, Field, StatusPill } from '../UI';
import { useAsyncData } from './hooks';
import { formatDate } from '../../utils/format';

const MODULE_FLAGS = [
    ['is_epics_activated', 'Epics'], ['is_backlog_activated', 'Backlog'], ['is_kanban_activated', 'Kanban'],
    ['is_issues_activated', 'Issues'], ['is_wiki_activated', 'Wiki'],
];

const TemplateView = ({ t, onClose }) => (
    <Modal isOpen onClose={onClose} title={t.name} size="lg" footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
        <p className="text-secondary text-sm mb-4">{t.description || 'No description.'}</p>
        <div className="settings-subhead">Modules</div>
        <div className="module-flags mb-4">
            {MODULE_FLAGS.map(([k, l]) => <span key={k} className={`badge ${t[k] ? 'badge-success' : ''}`}>{l}{t[k] ? '' : ' (off)'}</span>)}
        </div>
        {[['us_statuses', 'User story statuses'], ['task_statuses', 'Task statuses'], ['issue_statuses', 'Issue statuses'], ['issue_types', 'Issue types'], ['priorities', 'Priorities'], ['severities', 'Severities']].map(([k, l]) => (
            Array.isArray(t[k]) && t[k].length > 0 && (
                <div key={k} className="mb-3">
                    <div className="settings-subhead">{l}</div>
                    <div className="tag-list">{t[k].map((v) => <StatusPill key={v.name} name={v.name} color={v.color} />)}</div>
                </div>
            )
        ))}
        {Array.isArray(t.roles) && (
            <div>
                <div className="settings-subhead">Roles</div>
                <div className="tag-list">{t.roles.map((r) => <span key={r.slug || r.name} className="badge badge-outline">{r.name}</span>)}</div>
            </div>
        )}
    </Modal>
);

const TemplateEdit = ({ t, onClose, onSave }) => {
    const [name, setName] = useState(t.name);
    const [description, setDescription] = useState(t.description || '');
    const [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try { await onSave({ name: name.trim(), description: description.trim() }); } finally { setBusy(false); }
    };
    return (
        <Modal isOpen onClose={onClose} title="Edit template" footer={(
            <>
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" type="submit" form="tpl-edit" disabled={busy || !name.trim()}>{busy ? <span className="spinner spinner-sm" /> : 'Save'}</button>
            </>
        )}>
            <form id="tpl-edit" onSubmit={submit}>
                <Field label="Name"><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></Field>
                <Field label="Description"><textarea className="form-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            </form>
        </Modal>
    );
};

const AdminTemplates = ({ isSuperuser }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const { data, loading, error, reload } = useAsyncData(
        () => (isSuperuser ? projectTemplateService.list().then((r) => r.data) : Promise.resolve([])),
        [isSuperuser],
    );
    const [viewing, setViewing] = useState(null);
    const [editing, setEditing] = useState(null);

    if (!isSuperuser) {
        return (
            <div className="card">
                <EmptyState icon={<FaLock />} title="Superusers only" description="Project templates define the default statuses, roles and modules of new projects. Only a system superuser can manage them." />
            </div>
        );
    }

    const save = async (fields) => {
        try {
            await projectTemplateService.update(editing.id, fields);
            toast.success('Template saved');
            setEditing(null);
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const remove = async (t) => {
        if (!(await confirm({ title: `Delete template “${t.name}”?`, message: 'Existing projects are not affected, but new projects can no longer use it.', confirmText: 'Delete template', danger: true }))) return;
        try {
            await projectTemplateService.delete(t.id);
            toast.success('Template deleted');
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    if (loading) return <Loader label="Loading templates…" />;
    if (error) return <div className="alert alert-error">Could not load templates.</div>;
    if (!data?.length) return <div className="card"><EmptyState icon={<FaFileAlt />} title="No templates" description="Create one from a project’s Settings › Danger zone." /></div>;

    return (
        <>
            <div className="grid-auto">
                {data.map((t) => (
                    <div key={t.id} className="card template-card">
                        <div className="row justify-between">
                            <h3 className="card-title truncate">{t.name}</h3>
                            <span className="badge badge-outline mono">{t.slug}</span>
                        </div>
                        <p>{t.description || 'No description.'}</p>
                        <div className="module-flags">
                            {MODULE_FLAGS.filter(([k]) => t[k]).map(([k, l]) => <span key={k} className="badge badge-primary">{l}</span>)}
                        </div>
                        <div className="row justify-between mt-2">
                            <span className="text-xs text-muted">Updated {formatDate(t.modified_date)}</span>
                            <div className="row" style={{ gap: 2 }}>
                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewing(t)} aria-label={`View ${t.name}`}><FaEye /></button>
                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(t)} aria-label={`Edit ${t.name}`}><FaPen /></button>
                                <button className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(t)} aria-label={`Delete ${t.name}`}><FaTrash /></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {viewing && <TemplateView t={viewing} onClose={() => setViewing(null)} />}
            {editing && <TemplateEdit t={editing} onClose={() => setEditing(null)} onSave={save} />}
        </>
    );
};

export default AdminTemplates;
