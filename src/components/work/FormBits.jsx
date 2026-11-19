import React from 'react';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import { UserAvatar } from '../UI';
import { userName } from '../../utils/format';
import { EPIC_COLORS } from './workTypes';
import '../../styles/work.css';

/* Footer for the create modals: Cancel · Create & add another · Create */
export const CreateFooter = ({ formId, busy, onCancel, label = 'Create' }) => (
    <>
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" form={formId} value="another" className="btn btn-secondary hide-sm-inline" disabled={busy}>
            Create &amp; add another
        </button>
        <button type="submit" form={formId} value="close" className="btn btn-primary" disabled={busy}>
            {busy && <span className="spinner spinner-sm" />} {label}
        </button>
    </>
);

/* Inline banner after "add another" */
export const CreatedNote = ({ text, onDismiss }) => (
    <div className="alert alert-success mb-4" role="status">
        <FaCheckCircle style={{ marginTop: 3 }} />
        <div className="flex-1">{text}</div>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onDismiss} aria-label="Dismiss"><FaTimes /></button>
    </div>
);

/* Multi-person picker for forms: chips + "add" select. value = [userId] */
export const PeoplePicker = ({ id, value = [], members, onChange }) => {
    const ids = value.map(String);
    const chosen = (members || []).filter((m) => ids.includes(String(m.id)));
    const rest = (members || []).filter((m) => m.is_active !== false && !ids.includes(String(m.id)));
    return (
        <div className="people-picker">
            {chosen.length > 0 && (
                <ul className="people-chips">
                    {chosen.map((m) => (
                        <li key={m.id} className="person-chip">
                            <UserAvatar user={m} size="xs" />
                            <span className="truncate">{userName(m)}</span>
                            <button type="button" onClick={() => onChange(value.filter((x) => String(x) !== String(m.id)))} aria-label={`Remove ${userName(m)}`}>
                                <FaTimes size={9} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <select
                id={id}
                className="form-input"
                value=""
                disabled={!rest.length}
                onChange={(e) => e.target.value && onChange([...value, Number(e.target.value)])}
            >
                <option value="">{rest.length ? (chosen.length ? '+ Add another person…' : 'Choose people…') : 'Everyone is assigned'}</option>
                {rest.map((m) => <option key={m.id} value={m.id}>{userName(m)}</option>)}
            </select>
        </div>
    );
};

/* Colour swatches for forms (epic colour) */
export const SwatchInput = ({ id, value, onChange }) => (
    <div className="swatch-picker" role="group" aria-label="Colour">
        {EPIC_COLORS.map((c) => {
            const on = c.toLowerCase() === String(value || '').toLowerCase();
            return (
                <button key={c} type="button" className={`swatch-btn ${on ? 'is-on' : ''}`} style={{ '--swatch': c }}
                    onClick={() => onChange(c)} aria-label={`Colour ${c}`} aria-pressed={on} />
            );
        })}
        <input id={id} type="color" className="swatch-custom" value={value || '#1D8C7D'} onChange={(e) => onChange(e.target.value)} aria-label="Custom colour" title="Custom colour" />
    </div>
);
