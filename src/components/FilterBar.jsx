import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { FaSearch, FaTimes, FaChevronDown, FaCheck } from 'react-icons/fa';
import { initials } from '../utils/format';
import '../styles/planning.css';

/*
 * FilterBar — search box + filter chips (each a dropdown of options with counts) + "Clear all".
 *
 *   <FilterBar
 *     search={q} onSearchChange={setQ} searchPlaceholder="Search stories…"
 *     filters={[{ key: 'status', label: 'Status', options: [{ value: 1, label: 'New', count: 4, color: '#hex' }] }]}
 *     values={{ status: [1] }} onChange={setValues}
 *   >{extra controls on the right}</FilterBar>
 *
 * Option shape: { value, label, count?, color?, user? (Taiga user → avatar) }.
 * `values` maps filter key -> array of selected option values.
 */

const FilterChip = ({ filter, selected, onToggle, onClearKey }) => {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const rootRef = useRef(null);
    const listId = useId();

    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); rootRef.current?.querySelector('button')?.focus(); } };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const options = filter.options || [];
    const shown = term
        ? options.filter((o) => String(o.label).toLowerCase().includes(term.toLowerCase()))
        : options;
    const selectedSet = new Set(selected.map(String));
    const active = selected.length > 0;
    const firstLabel = active ? options.find((o) => selectedSet.has(String(o.value)))?.label : null;

    return (
        <div className="fb-chip-wrap" ref={rootRef}>
            <button
                type="button"
                className={`fb-chip ${active ? 'is-active' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                onClick={() => setOpen((o) => !o)}
            >
                {filter.icon && <span className="fb-chip-icon">{filter.icon}</span>}
                <span>{filter.label}</span>
                {active && (
                    <span className="fb-chip-value">
                        {firstLabel || selected.length}
                        {selected.length > 1 && <span className="fb-chip-more">+{selected.length - 1}</span>}
                    </span>
                )}
                <FaChevronDown size={9} className="fb-chip-caret" />
            </button>
            {open && (
                <div className="popover fb-popover" role="listbox" id={listId} aria-multiselectable="true" aria-label={filter.label}>
                    {options.length > 7 && (
                        <div className="fb-popover-search">
                            <FaSearch size={11} />
                            <input
                                autoFocus
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder={`Filter ${filter.label.toLowerCase()}…`}
                                aria-label={`Filter ${filter.label} options`}
                            />
                        </div>
                    )}
                    <div className="fb-options">
                        {shown.length === 0 && <div className="fb-empty">No options</div>}
                        {shown.map((o, i) => {
                            const on = selectedSet.has(String(o.value));
                            return (
                                <button
                                    key={String(o.value)}
                                    type="button"
                                    role="option"
                                    aria-selected={on}
                                    className={`fb-option ${on ? 'is-on' : ''}`}
                                    onClick={() => onToggle(o.value)}
                                    autoFocus={options.length <= 7 && i === 0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const sib = e.key === 'ArrowDown' ? e.currentTarget.nextElementSibling : e.currentTarget.previousElementSibling;
                                            sib?.focus();
                                        }
                                    }}
                                >
                                    <span className="fb-check">{on && <FaCheck size={9} />}</span>
                                    {o.user !== undefined ? (
                                        <span className="avatar avatar-xs">{o.user?.photo ? <img src={o.user.photo} alt="" /> : initials(o.label)}</span>
                                    ) : o.color ? (
                                        <span className="dot" style={{ background: o.color }} />
                                    ) : null}
                                    <span className="fb-option-label">{o.label}</span>
                                    {o.count !== undefined && o.count !== null && <span className="fb-option-count">{o.count}</span>}
                                </button>
                            );
                        })}
                    </div>
                    {active && (
                        <div className="fb-popover-footer">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClearKey(filter.key)}>Clear {filter.label.toLowerCase()}</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const FilterBar = ({
    search = '',
    onSearchChange,
    searchPlaceholder = 'Search…',
    filters = [],
    values = {},
    onChange,
    onClearAll,
    children,
    className = '',
}) => {
    const searchRef = useRef(null);
    const active = useMemo(() => Object.values(values).some((v) => Array.isArray(v) && v.length), [values]);

    // "/" focuses the search box (unless already typing somewhere)
    useEffect(() => {
        if (!onSearchChange) return undefined;
        const onKey = (e) => {
            if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
            const t = e.target;
            if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onSearchChange]);

    const toggle = (key, value) => {
        const cur = values[key] || [];
        const exists = cur.some((v) => String(v) === String(value));
        onChange?.({ ...values, [key]: exists ? cur.filter((v) => String(v) !== String(value)) : [...cur, value] });
    };
    const clearKey = (key) => onChange?.({ ...values, [key]: [] });
    const clearAll = () => {
        if (onClearAll) onClearAll();
        else {
            onChange?.(Object.fromEntries(Object.keys(values).map((k) => [k, []])));
            onSearchChange?.('');
        }
    };

    return (
        <div className={`fb ${className}`}>
            {onSearchChange && (
                <div className="fb-search">
                    <FaSearch size={12} aria-hidden="true" />
                    <input
                        ref={searchRef}
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                    />
                    {search ? (
                        <button type="button" className="fb-search-clear" onClick={() => onSearchChange('')} aria-label="Clear search"><FaTimes size={10} /></button>
                    ) : (
                        <span className="kbd fb-kbd" aria-hidden="true">/</span>
                    )}
                </div>
            )}
            <div className="fb-chips">
                {filters.map((f) => (
                    <FilterChip
                        key={f.key}
                        filter={f}
                        selected={values[f.key] || []}
                        onToggle={(v) => toggle(f.key, v)}
                        onClearKey={clearKey}
                    />
                ))}
                {(active || search) && (
                    <button type="button" className="btn btn-ghost btn-sm fb-clear" onClick={clearAll}>
                        <FaTimes size={10} /> Clear all
                    </button>
                )}
            </div>
            {children && <div className="fb-extra">{children}</div>}
        </div>
    );
};

export default FilterBar;
