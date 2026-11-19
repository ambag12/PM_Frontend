import React, { useId, useRef, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { EPIC_COLORS } from './workTypes';

/* Colour picker: preset swatches + custom colour input. onChange(hex) may return a promise. */
const ColorField = ({ label = 'Colour', value, onChange, disabled }) => {
    const id = useId();
    const [busy, setBusy] = useState(false);
    const [draft, setDraft] = useState(null);
    const timer = useRef(null);
    const pick = async (c) => {
        if (disabled || !c || c.toLowerCase() === String(value || '').toLowerCase()) return;
        setBusy(true);
        try { await onChange(c); } catch { /* caller shows toast */ } finally { setBusy(false); }
    };
    return (
        <div className="detail-field">
            <label htmlFor={id}>{label} {busy && <span className="spinner spinner-sm" aria-label="Saving" />}</label>
            <div className="swatch-picker" role="group" aria-label={label}>
                {EPIC_COLORS.map((c) => {
                    const on = c.toLowerCase() === String(value || '').toLowerCase();
                    return (
                        <button
                            key={c}
                            type="button"
                            className={`swatch-btn ${on ? 'is-on' : ''}`}
                            style={{ '--swatch': c }}
                            onClick={() => pick(c)}
                            disabled={disabled || busy}
                            aria-label={`Colour ${c}`}
                            aria-pressed={on}
                        >
                            {on && <FaCheck size={9} />}
                        </button>
                    );
                })}
                <input
                    id={id}
                    type="color"
                    className="swatch-custom"
                    value={draft || (/^#[0-9a-f]{6}$/i.test(value || '') ? value : '#1D8C7D')}
                    disabled={disabled || busy}
                    onChange={(e) => {
                        // the native picker fires continuously while dragging: save once it settles
                        const c = e.target.value;
                        setDraft(c);
                        clearTimeout(timer.current);
                        timer.current = setTimeout(() => { pick(c).finally(() => setDraft(null)); }, 700);
                    }}
                    aria-label="Custom colour"
                    title="Custom colour"
                />
            </div>
        </div>
    );
};

export default ColorField;
