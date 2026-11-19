import React, { useEffect, useRef, useState } from 'react';
import { FaCopy, FaGripVertical, FaLock, FaCheck } from 'react-icons/fa';
import { Modal } from '../UI';
import { useToast } from '../../context/ToastContext';
import { PRESET_COLORS } from './constants';
import '../../styles/settings.css';

/* A titled settings card: header (icon, title, description, actions) + body. */
export const SettingsSection = ({ icon, title, description, actions, children, flush = false, tone, id }) => (
    <section className={`card flush settings-card ${tone === 'danger' ? 'is-danger' : ''}`} id={id}>
        <header className="settings-card-header">
            <div className="settings-card-heading">
                {icon && <span className="settings-card-icon">{icon}</span>}
                <div className="flex-1">
                    <h2 className="settings-card-title">{title}</h2>
                    {description && <p className="settings-card-desc">{description}</p>}
                </div>
            </div>
            {actions && <div className="row flex-wrap">{actions}</div>}
        </header>
        <div className={flush ? '' : 'card-body'}>{children}</div>
    </section>
);

export const ReadOnlyNotice = ({ title = 'Read-only', children }) => (
    <div className="alert alert-warning settings-readonly">
        <FaLock style={{ marginTop: 3 }} />
        <div>
            <strong>{title}.</strong> {children || 'Only project administrators can change these settings.'}
        </div>
    </div>
);


/* ColorPicker — swatch button that opens a small palette popover. */
export const ColorPicker = ({ value, onChange, disabled, label = 'Colour' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const pick = (c) => {
        setOpen(false);
        if (c !== value) onChange(c);
    };

    return (
        <div className="swatch-picker" ref={ref}>
            <button
                type="button"
                className="swatch-btn"
                style={{ '--swatch': value || 'transparent' }}
                onClick={() => setOpen((o) => !o)}
                disabled={disabled}
                aria-label={`${label}: ${value || 'none'}`}
                aria-expanded={open}
                title={value || 'No colour'}
            />
            {open && (
                <div className="swatch-popover" role="dialog" aria-label={label}>
                    <div className="swatch-grid">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                className={`swatch-option ${String(value).toLowerCase() === c.toLowerCase() ? 'selected' : ''}`}
                                style={{ '--swatch': c }}
                                onClick={() => pick(c)}
                                aria-label={c}
                            >
                                {String(value).toLowerCase() === c.toLowerCase() && <FaCheck size={9} />}
                            </button>
                        ))}
                    </div>
                    <label className="swatch-custom">
                        <input type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#1d8c7d'} onChange={(e) => pick(e.target.value)} />
                        <span>Custom…</span>
                    </label>
                </div>
            )}
        </div>
    );
};

/*
 * InlineText — an input that saves on blur / Enter when the value changed; Escape reverts.
 * Give it key={value} from the parent so it resets after a successful save.
 */
export const InlineText = ({ value, onSave, ariaLabel, type = 'text', disabled, className = '', placeholder, min }) => {
    const handle = async (e) => {
        const el = e.target;
        const raw = el.value;
        const next = type === 'number' ? (raw === '' ? null : Number(raw)) : raw.trim();
        const current = value ?? (type === 'number' ? null : '');
        if (next === current || (type !== 'number' && !next)) {
            el.value = value ?? '';
            return;
        }
        const ok = await onSave(next);
        if (ok === false) el.value = value ?? '';
    };
    return (
        <input
            className={`form-input form-input-sm inline-input ${className}`}
            type={type}
            defaultValue={value ?? ''}
            aria-label={ariaLabel}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            onBlur={handle}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') { e.currentTarget.value = value ?? ''; e.currentTarget.blur(); }
            }}
        />
    );
};

export const DragHandle = (props) => (
    <button type="button" className="drag-handle" aria-label="Drag to reorder (or use arrow keys)" title="Drag to reorder" {...props}>
        <FaGripVertical />
    </button>
);

/* Read-only value with a copy button. */
export const CopyField = ({ value, label }) => {
    const toast = useToast();
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Could not copy — select the text and copy it manually');
        }
    };
    return (
        <div className="copy-field">
            <input className="form-input form-input-sm mono" readOnly value={value} aria-label={label || 'Value'} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={copy} aria-label={`Copy ${label || 'value'}`}>
                <FaCopy /> Copy
            </button>
        </div>
    );
};

/*
 * MoveToModal — deleting a status/type/role requires choosing where its items go.
 * options: [{ id, name }] (excluding the item being deleted)
 */
export const MoveToModal = ({ item, options, noun = 'items', optional = false, onConfirm, onClose }) => {
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState(false);
    const selected = target || (optional ? '' : String(options[0]?.id ?? ''));

    const submit = async () => {
        setBusy(true);
        try {
            await onConfirm(selected || null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            isOpen={!!item}
            onClose={onClose}
            title={`Delete “${item?.name ?? ''}”`}
            size="sm"
            footer={(
                <>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-danger" onClick={submit} disabled={busy || (!optional && !selected)}>
                        {busy ? <span className="spinner spinner-sm" /> : 'Delete'}
                    </button>
                </>
            )}
        >
            {options.length === 0 && !optional ? (
                <div className="alert alert-warning">This is the last value — create another one first, then delete this.</div>
            ) : (
                <>
                    <p className="text-secondary text-sm mb-3">
                        Existing {noun} using <strong>{item?.name}</strong> will be moved to the value you choose.
                    </p>
                    <label className="form-label" htmlFor="move-to-select">Move {noun} to</label>
                    <select id="move-to-select" className="form-input" value={selected} onChange={(e) => setTarget(e.target.value)}>
                        {optional && <option value="">— None —</option>}
                        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                </>
            )}
        </Modal>
    );
};
