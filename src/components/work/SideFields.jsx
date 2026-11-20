import React, { useId, useState } from 'react';
import { FaTimes, FaPlus, FaLock } from 'react-icons/fa';
import { Switch, UserAvatar } from '../UI';
import { formatDate, userName } from '../../utils/format';
import { DUE_STATUS } from './workTypes';

/*
 * Editable fields for the drawer side column. Each one saves immediately through onChange
 * (which returns a promise) and shows a small spinner while saving.
 */

const useBusy = () => {
    const [busy, setBusy] = useState(false);
    const run = async (fn) => {
        setBusy(true);
        try { await fn(); } catch { /* the caller shows a toast */ } finally { setBusy(false); }
    };
    return [busy, run];
};

export const SideField = ({ label, htmlFor, busy, children, hint }) => (
    <div className="detail-field">
        <label htmlFor={htmlFor}>
            {label}
            {busy && <span className="spinner spinner-sm" aria-label="Saving" />}
        </label>
        {children}
        {hint && <div className="form-hint">{hint}</div>}
    </div>
);

/* options: [{ value, label, color? }] — value null means "none" */
export const SelectField = ({ label, value, options, onChange, disabled, noneLabel, hint, swatch }) => {
    const id = useId();
    const [busy, run] = useBusy();
    const current = options.find((o) => String(o.value) === String(value ?? ''));
    return (
        <SideField label={label} htmlFor={id} busy={busy} hint={hint}>
            <div className={`side-select ${swatch && current?.color ? 'has-swatch' : ''}`} style={swatch && current?.color ? { '--swatch': current.color } : undefined}>
                <select
                    id={id}
                    className="form-input form-input-sm"
                    value={value ?? ''}
                    disabled={disabled || busy}
                    onChange={(e) => {
                        const raw = e.target.value;
                        const next = raw === '' ? null : (options.find((o) => String(o.value) === raw)?.value ?? raw);
                        run(() => onChange(next));
                    }}
                >
                    {noneLabel !== undefined && <option value="">{noneLabel}</option>}
                    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </div>
        </SideField>
    );
};

/* Multi-assignee (user stories: assigned_users) */
export const AssignedUsersField = ({ value = [], members, onChange, disabled }) => {
    const id = useId();
    const [busy, run] = useBusy();
    const ids = (value || []).map(String);
    const chosen = (members || []).filter((m) => ids.includes(String(m.id)));
    const unknown = ids.filter((x) => !(members || []).some((m) => String(m.id) === x));
    const rest = (members || []).filter((m) => m.is_active !== false && !ids.includes(String(m.id)));
    return (
        <SideField label="Assigned users" htmlFor={id} busy={busy}>
            {chosen.length === 0 && unknown.length === 0 && <span className="text-sm text-muted">Nobody</span>}
            <ul className="people-chips">
                {chosen.map((m) => (
                    <li key={m.id} className="person-chip">
                        <UserAvatar user={m} size="xs" />
                        <span className="truncate">{userName(m)}</span>
                        {!disabled && (
                            <button type="button" onClick={() => run(() => onChange(value.filter((x) => String(x) !== String(m.id))))} aria-label={`Unassign ${userName(m)}`} disabled={busy}>
                                <FaTimes size={9} />
                            </button>
                        )}
                    </li>
                ))}
                {unknown.map((uid) => <li key={uid} className="person-chip">User #{uid}</li>)}
            </ul>
            {!disabled && rest.length > 0 && (
                <select
                    id={id}
                    className="form-input form-input-sm"
                    value=""
                    disabled={busy}
                    onChange={(e) => e.target.value && run(() => onChange([...(value || []), Number(e.target.value)]))}
                    aria-label="Add assigned user"
                >
                    <option value="">+ Add person…</option>
                    {rest.map((m) => <option key={m.id} value={m.id}>{userName(m)}</option>)}
                </select>
            )}
        </SideField>
    );
};

/* Due date + the backend's computed due_date_status */
export const DueDateField = ({ item, onChange, disabled }) => {
    const id = useId();
    const [busy, run] = useBusy();
    const status = DUE_STATUS[item.due_date_status] || DUE_STATUS.not_set;
    return (
        <SideField label="Due date" htmlFor={id} busy={busy}>
            <div className="row">
                <input
                    id={id}
                    type="date"
                    className="form-input form-input-sm flex-1"
                    value={item.due_date || ''}
                    disabled={disabled || busy}
                    onChange={(e) => run(() => onChange({ due_date: e.target.value || null }))}
                />
                {item.due_date && !disabled && (
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => run(() => onChange({ due_date: null }))} aria-label="Clear due date" title="Clear due date" disabled={busy}>
                        <FaTimes />
                    </button>
                )}
            </div>
            {item.due_date && (
                <span className={`due-chip tone-${status.tone}`} title={item.due_date_reason || undefined}>
                    <span className="dot" /> {status.label} · {formatDate(item.due_date)}
                </span>
            )}
        </SideField>
    );
};

export const ToggleField = ({ label, checked, onChange, disabled, hint }) => {
    const [busy, run] = useBusy();
    return (
        <div className="toggle-field">
            <Switch checked={checked} disabled={disabled || busy} onChange={(v) => run(() => onChange(v))} label={label} />
            {busy && <span className="spinner spinner-sm" aria-label="Saving" />}
            {hint && <div className="form-hint">{hint}</div>}
        </div>
    );
};

/* Blocked switch + reason */
export const BlockedField = ({ item, onChange, disabled }) => {
    const id = useId();
    const [busy, run] = useBusy();
    const [note, setNote] = useState(null); // null = not editing
    const editing = note !== null;
    return (
        <div className={`blocked-field ${item.is_blocked ? 'is-blocked' : ''}`}>
            <div className="row">
                <Switch
                    checked={item.is_blocked}
                    disabled={disabled || busy}
                    label={<span className="inline-flex items-center gap-1"><FaLock size={10} /> Blocked</span>}
                    onChange={(v) => {
                        if (v) setNote(item.blocked_note || '');
                        run(() => onChange({ is_blocked: v, ...(v ? {} : { blocked_note: '' }) }));
                    }}
                />
                {busy && <span className="spinner spinner-sm" aria-label="Saving" />}
            </div>
            {item.is_blocked && (editing ? (
                <div className="stack-sm mt-2">
                    <label htmlFor={id} className="sr-only">Why is it blocked?</label>
                    <textarea
                        id={id}
                        className="form-input"
                        rows={2}
                        value={note}
                        placeholder="Why is it blocked?"
                        onChange={(e) => setNote(e.target.value)}
                        autoFocus
                    />
                    <div className="row justify-end">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNote(null)}>Cancel</button>
                        <button type="button" className="btn btn-primary btn-sm" disabled={busy}
                            onClick={() => run(async () => { await onChange({ blocked_note: note }); setNote(null); })}>
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" className="blocked-note" onClick={() => !disabled && setNote(item.blocked_note || '')} disabled={disabled}>
                    {item.blocked_note || <span className="text-muted">{disabled ? 'No reason given' : 'Add a reason…'}</span>}
                </button>
            ))}
        </div>
    );
};

/* Story points per role: role_points { roleId: pointId } */
export const PointsField = ({ item, project, onChange, disabled }) => {
    const [busy, run] = useBusy();
    const roles = (project?.roles || []).filter((r) => r.computable);
    const points = [...(project?.points || [])].sort((a, b) => a.order - b.order);
    if (!roles.length) return null;
    return (
        <SideField label={`Points${item.total_points !== null && item.total_points !== undefined ? ` · ${item.total_points} total` : ''}`} busy={busy}>
            <div className="points-grid">
                {roles.map((r) => (
                    <label key={r.id} className="points-cell">
                        <span className="points-role">{r.name}</span>
                        <select
                            className="form-input form-input-sm"
                            value={item.points?.[r.id] ?? ''}
                            disabled={disabled || busy}
                            onChange={(e) => run(() => onChange({ points: { ...(item.points || {}), [r.id]: Number(e.target.value) } }))}
                            aria-label={`Points for ${r.name}`}
                        >
                            {item.points?.[r.id] === undefined && <option value="">—</option>}
                            {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </label>
                ))}
            </div>
        </SideField>
    );
};

/* Read-only person + date rows */
export const MetaRows = ({ item }) => (
    <div className="meta-rows">
        <div className="meta-row">
            <span>Created by</span>
            <span className="row gap-1 truncate"><UserAvatar user={item.owner_extra_info} size="xs" /> <span className="truncate">{userName(item.owner_extra_info)}</span></span>
        </div>
        <div className="meta-row"><span>Created</span><span title={item.created_date}>{formatDate(item.created_date, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        <div className="meta-row"><span>Modified</span><span title={item.modified_date}>{formatDate(item.modified_date, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
        {(item.finish_date || item.finished_date) && (
            <div className="meta-row"><span>Finished</span><span>{formatDate(item.finish_date || item.finished_date)}</span></div>
        )}
    </div>
);

export const AddButton = ({ children, ...props }) => (
    <button type="button" className="btn btn-ghost btn-sm" {...props}><FaPlus size={10} /> {children}</button>
);
