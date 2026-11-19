import React, { useState } from 'react';
import { FaSlidersH, FaPlus, FaTrash, FaPen, FaTimes } from 'react-icons/fa';
import { epicService, userStoryService, taskService, issueService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Loader, EmptyState, Modal, Field } from '../UI';
import { SettingsSection, DragHandle } from './shared';
import { useAsyncData, useDragReorder } from './hooks';

const ENTITIES = [
    { id: 'epic', label: 'Epics', service: epicService },
    { id: 'userstory', label: 'User stories', service: userStoryService },
    { id: 'task', label: 'Tasks', service: taskService },
    { id: 'issue', label: 'Issues', service: issueService },
];

const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'multiline', label: 'Multi-line text' },
    { value: 'richtext', label: 'Rich text' },
    { value: 'date', label: 'Date' },
    { value: 'url', label: 'URL' },
    { value: 'dropdown', label: 'Dropdown' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'number', label: 'Number' },
];
const typeLabel = (v) => FIELD_TYPES.find((t) => t.value === v)?.label || v;

const FieldModal = ({ initial, onClose, onSave }) => {
    const [form, setForm] = useState(() => ({
        name: initial?.name || '',
        description: initial?.description || '',
        type: initial?.type || 'text',
        extra: Array.isArray(initial?.extra) ? initial.extra : [],
    }));
    const [option, setOption] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const addOption = () => {
        const v = option.trim();
        if (!v || form.extra.includes(v)) return;
        setForm((f) => ({ ...f, extra: [...f.extra, v] }));
        setOption('');
    };

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await onSave({ ...form, name: form.name.trim(), extra: form.type === 'dropdown' ? form.extra : null });
        } finally {
            setBusy(false);
        }
    };

    const invalid = !form.name.trim() || (form.type === 'dropdown' && form.extra.length === 0);

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={initial ? `Edit “${initial.name}”` : 'New custom field'}
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" type="submit" form="cf-form" disabled={busy || invalid}>
                        {busy ? <span className="spinner spinner-sm" /> : initial ? 'Save field' : 'Create field'}
                    </button>
                </>
            )}
        >
            <form id="cf-form" onSubmit={submit}>
                <Field label="Name">
                    <input className="form-input" value={form.name} onChange={set('name')} required maxLength={64} autoFocus />
                </Field>
                <Field label="Description" optional>
                    <input className="form-input" value={form.description} onChange={set('description')} />
                </Field>
                <Field label="Type">
                    <select className="form-input" value={form.type} onChange={set('type')}>
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                </Field>
                {form.type === 'dropdown' && (
                    <Field label="Options" hint="Add at least one option.">
                        <div className="chip-input">
                            {form.extra.map((o) => (
                                <span key={o} className="chip">
                                    {o}
                                    <button type="button" aria-label={`Remove ${o}`} onClick={() => setForm((f) => ({ ...f, extra: f.extra.filter((x) => x !== o) }))}><FaTimes size={9} /></button>
                                </span>
                            ))}
                            <input
                                value={option}
                                onChange={(e) => setOption(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addOption(); } }}
                                onBlur={addOption}
                                placeholder="Type an option, press Enter"
                                aria-label="New dropdown option"
                            />
                        </div>
                    </Field>
                )}
            </form>
        </Modal>
    );
};

const FieldList = ({ entity, projectId, canEdit, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const svc = entity.service.customAttributes;
    const { data, loading, error, reload, setData } = useAsyncData(
        () => svc.list(projectId).then((r) => [...r.data].sort((a, b) => a.order - b.order)),
        [entity.id, projectId],
    );
    const items = data || [];
    const [editing, setEditing] = useState(null); // null | 'new' | field

    const reorder = async (next) => {
        const prev = items;
        setData(next.map((x, i) => ({ ...x, order: i + 1 })));
        try {
            await svc.bulkUpdateOrder(projectId, next.map((x, i) => [x.id, i + 1]));
            toast.success('Order saved');
            onChanged?.();
        } catch (err) {
            setData(prev);
            toast.error(err);
        }
    };
    const { rowProps, handleProps } = useDragReorder(items, reorder);

    const save = async (form) => {
        try {
            if (editing === 'new') {
                await svc.create({ ...form, project: projectId, order: items.length + 1 });
                toast.success(`Field “${form.name}” created`);
            } else {
                await svc.update(editing.id, form);
                toast.success(`Field “${form.name}” saved`);
            }
            setEditing(null);
            reload();
            onChanged?.();
        } catch (err) {
            toast.error(err);
        }
    };

    const remove = async (f) => {
        if (!(await confirm({ title: `Delete field “${f.name}”?`, message: `Values stored in this field on every ${entity.label.toLowerCase().replace(/s$/, '')} will be lost.`, confirmText: 'Delete field', danger: true }))) return;
        try {
            await svc.delete(f.id);
            toast.success(`Field “${f.name}” deleted`);
            reload();
            onChanged?.();
        } catch (err) {
            toast.error(err);
        }
    };

    if (loading) return <Loader label="Loading fields…" />;
    if (error) return <div className="card-body"><div className="alert alert-error">Could not load custom fields.</div></div>;

    return (
        <div>
            {items.length === 0 ? (
                <EmptyState icon={<FaSlidersH />} title={`No custom fields for ${entity.label.toLowerCase()}`} description="Capture extra information such as contractor, cost centre or inspection date." />
            ) : (
                <div className="value-list" role="list" aria-label={`${entity.label} custom fields`} style={{ '--value-extra': '150px' }}>
                    {items.map((f, i) => (
                        <div key={f.id} className="value-row" role="listitem" {...(canEdit ? rowProps(i) : {})}>
                            {canEdit ? <DragHandle {...handleProps(i)} /> : <span />}
                            <span className="text-xs text-muted tabular">{i + 1}</span>
                            <div style={{ minWidth: 0 }}>
                                <div className="font-semibold text-heading truncate">{f.name}</div>
                                {f.description && <div className="text-xs text-muted truncate">{f.description}</div>}
                                {f.type === 'dropdown' && Array.isArray(f.extra) && (
                                    <div className="tag-list mt-1">{f.extra.map((o) => <span key={o} className="tag-chip">{o}</span>)}</div>
                                )}
                            </div>
                            <div className="value-extra"><span className="badge badge-primary">{typeLabel(f.type)}</span></div>
                            {canEdit ? (
                                <div className="row" style={{ gap: 2 }}>
                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(f)} aria-label={`Edit ${f.name}`}><FaPen /></button>
                                    <button className="btn btn-danger-ghost btn-sm btn-icon" onClick={() => remove(f)} aria-label={`Delete ${f.name}`}><FaTrash /></button>
                                </div>
                            ) : <span />}
                        </div>
                    ))}
                </div>
            )}
            {canEdit && (
                <div className="value-new">
                    <button className="btn btn-primary btn-sm" onClick={() => setEditing('new')}><FaPlus /> Add field</button>
                    {items.length > 1 && <span className="text-xs text-muted ml-auto">Drag rows to change the order fields appear in.</span>}
                </div>
            )}
            {editing && <FieldModal initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
        </div>
    );
};

const CustomFieldsSettings = ({ project, canEdit, onChanged }) => {
    const [active, setActive] = useState('userstory');
    const entity = ENTITIES.find((e) => e.id === active);
    return (
        <SettingsSection icon={<FaSlidersH />} title="Custom fields" description="Add your own fields to epics, user stories, tasks and issues." flush>
            <div className="tabs attr-tabs" role="tablist" aria-label="Custom field targets">
                {ENTITIES.map((e) => (
                    <button key={e.id} role="tab" aria-selected={active === e.id} className={`tab ${active === e.id ? 'active' : ''}`} onClick={() => setActive(e.id)}>
                        {e.label}
                    </button>
                ))}
            </div>
            <FieldList key={entity.id} entity={entity} projectId={project.id} canEdit={canEdit} onChanged={onChanged} />
        </SettingsSection>
    );
};

export default CustomFieldsSettings;
