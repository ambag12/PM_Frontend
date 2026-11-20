import React, { useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { useToast, useConfirm } from '../../context/ToastContext';
import { Loader, EmptyState, Switch } from '../UI';
import { ColorPicker, InlineText, DragHandle, MoveToModal } from './shared';
import { PRESET_COLORS } from './constants';
import { useAsyncData, useDragReorder } from './hooks';

/*
 * Generic editor for an API "project value" list.
 * kind = {
 *   id, label, noun, service,           // service: list/create/update/delete (+ bulkUpdateOrder, deleteMoveTo)
 *   color?: bool, flags?: [{key,label}], wip?: bool, value?: bool, dueDate?: bool,
 *   moveTo?: 'required' | 'optional' | false, orderBy?: 'bulk' | 'patch'
 * }
 */
const ValueList = ({ kind, projectId, canEdit, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const { data, loading, error, setData, reload } = useAsyncData(
        () => kind.service.list({ project: projectId }).then((r) => [...r.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
        [kind.id, projectId],
    );
    const items = data || [];
    const [newName, setNewName] = useState('');
    const [newExtra, setNewExtra] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const changed = () => onChanged?.();

    const patch = async (item, fields, msg) => {
        const prev = items;
        setData((list) => list.map((x) => (x.id === item.id ? { ...x, ...fields } : x)));
        try {
            await kind.service.update(item.id, fields);
            if (msg) toast.success(msg);
            changed();
            return true;
        } catch (err) {
            setData(prev);
            toast.error(err);
            return false;
        }
    };

    const reorder = async (next) => {
        const prev = items;
        setData(next.map((x, i) => ({ ...x, order: i + 1 })));
        try {
            if (kind.orderBy === 'patch') {
                await Promise.all(next.map((x, i) => (x.order !== i + 1 ? kind.service.update(x.id, { order: i + 1 }) : null)));
            } else {
                await kind.service.bulkUpdateOrder(projectId, next.map((x, i) => [x.id, i + 1]));
            }
            toast.success('Order saved');
            changed();
        } catch (err) {
            setData(prev);
            toast.error(err);
        }
    };
    const { rowProps, handleProps } = useDragReorder(items, reorder);

    const create = async (e) => {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        setCreating(true);
        try {
            const body = { project: projectId, name, order: (items[items.length - 1]?.order ?? items.length) + 1 };
            if (kind.color) body.color = PRESET_COLORS[items.length % PRESET_COLORS.length];
            if (kind.value) body.value = newExtra === '' ? null : Number(newExtra);
            if (kind.dueDate) {
                body.days_to_due = newExtra === '' ? null : Number(newExtra);
                body.by_default = false;
            }
            await kind.service.create(body);
            setNewName('');
            setNewExtra('');
            toast.success(`“${name}” added`);
            reload();
            changed();
        } catch (err) {
            toast.error(err);
        } finally {
            setCreating(false);
        }
    };

    const remove = async (item) => {
        const others = items.filter((x) => x.id !== item.id);
        if (kind.moveTo === 'required' || (kind.moveTo === 'optional' && others.length > 0)) {
            setDeleting(item);
            return;
        }
        if (!(await confirm({ title: `Delete “${item.name}”?`, message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
        try {
            await kind.service.delete(item.id);
            toast.success(`“${item.name}” deleted`);
            reload();
            changed();
        } catch (err) {
            toast.error(err);
        }
    };

    const confirmMove = async (moveTo) => {
        const item = deleting;
        try {
            await kind.service.deleteMoveTo(item.id, moveTo);
            toast.success(`“${item.name}” deleted`);
            setDeleting(null);
            reload();
            changed();
        } catch (err) {
            toast.error(err);
        }
    };

    if (loading) return <Loader label={`Loading ${kind.label.toLowerCase()}…`} />;
    if (error) return <div className="card-body"><div className="alert alert-error">Could not load {kind.label.toLowerCase()}.</div></div>;

    const extraHeader = [
        kind.value && 'Value',
        kind.dueDate && 'Days to due',
        kind.wip && 'WIP',
        ...(kind.flags || []).map((f) => f.label),
        kind.dueDate && 'Default',
    ].filter(Boolean).join(' · ');

    return (
        <div>
            {items.length === 0 ? (
                <EmptyState title={`No ${kind.label.toLowerCase()} yet`} description="Add the first one below." />
            ) : (
                <div className="value-list" role="list" aria-label={kind.label}>
                    <div className="value-head" aria-hidden="true">
                        <span />
                        <span />
                        <span>Name</span>
                        <span>{extraHeader}</span>
                        <span />
                    </div>
                    {items.map((item, index) => (
                        <div key={item.id} className="value-row" role="listitem" {...(canEdit ? rowProps(index) : {})}>
                            {canEdit ? <DragHandle {...handleProps(index)} /> : <span />}
                            {kind.color ? (
                                <ColorPicker value={item.color} disabled={!canEdit} label={`${item.name} colour`} onChange={(c) => patch(item, { color: c }, 'Colour updated')} />
                            ) : <span className="text-xs text-muted tabular">{index + 1}</span>}
                            <InlineText key={item.name} value={item.name} ariaLabel={`Rename ${item.name}`} disabled={!canEdit} onSave={(v) => patch(item, { name: v }, 'Renamed')} />
                            <div className="value-extra">
                                {kind.value && (
                                    <InlineText key={`v${item.value}`} type="number" value={item.value} ariaLabel={`${item.name} value`} placeholder="?" disabled={!canEdit} onSave={(v) => patch(item, { value: v }, 'Value updated')} />
                                )}
                                {kind.dueDate && (
                                    <InlineText key={`d${item.days_to_due}`} type="number" value={item.days_to_due} ariaLabel={`${item.name} days to due`} placeholder="—" disabled={!canEdit} onSave={(v) => patch(item, { days_to_due: v }, 'Days updated')} />
                                )}
                                {kind.wip && (
                                    <InlineText key={`w${item.wip_limit}`} type="number" min="0" value={item.wip_limit} ariaLabel={`${item.name} WIP limit`} placeholder="∞" disabled={!canEdit} onSave={(v) => patch(item, { wip_limit: v }, 'WIP limit updated')} />
                                )}
                                {(kind.flags || []).map((f) => (
                                    <Switch key={f.key} checked={item[f.key]} disabled={!canEdit} label={f.label} onChange={(v) => patch(item, { [f.key]: v }, `${f.label} ${v ? 'on' : 'off'}`)} />
                                ))}
                                {kind.dueDate && (
                                    <Switch checked={item.by_default} disabled={!canEdit || item.by_default} label="Default" onChange={(v) => v && patch(item, { by_default: true }, 'Default changed').then(reload)} />
                                )}
                            </div>
                            {canEdit ? (
                                <button
                                    className="btn btn-danger-ghost btn-sm btn-icon"
                                    onClick={() => remove(item)}
                                    aria-label={`Delete ${item.name}`}
                                    title={kind.dueDate && item.by_default ? 'The default cannot be deleted' : 'Delete'}
                                    disabled={kind.dueDate && item.by_default}
                                >
                                    <FaTrash />
                                </button>
                            ) : <span />}
                        </div>
                    ))}
                </div>
            )}

            {canEdit && (
                <form className="value-new" onSubmit={create}>
                    <input className="form-input form-input-sm" placeholder={`New ${kind.singular || 'value'} name`} value={newName} onChange={(e) => setNewName(e.target.value)} aria-label={`New ${kind.singular || 'value'} name`} maxLength={255} />
                    {(kind.value || kind.dueDate) && (
                        <input
                            className="form-input form-input-sm"
                            style={{ maxWidth: 130 }}
                            type="number"
                            placeholder={kind.value ? 'Value' : 'Days to due'}
                            aria-label={kind.value ? 'Point value' : 'Days to due'}
                            value={newExtra}
                            onChange={(e) => setNewExtra(e.target.value)}
                        />
                    )}
                    <button className="btn btn-primary btn-sm" type="submit" disabled={creating || !newName.trim()}>
                        {creating ? <span className="spinner spinner-sm" /> : <><FaPlus /> Add</>}
                    </button>
                    <span className="text-xs text-muted ml-auto">Drag rows (or focus the handle and press ↑/↓) to reorder.</span>
                </form>
            )}

            <MoveToModal
                key={deleting?.id ?? 'none'}
                item={deleting}
                noun={kind.noun}
                optional={kind.moveTo === 'optional' && items.length <= 1}
                options={items.filter((x) => x.id !== deleting?.id)}
                onConfirm={confirmMove}
                onClose={() => setDeleting(null)}
            />
        </div>
    );
};

export default ValueList;
