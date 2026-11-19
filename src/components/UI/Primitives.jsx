import React, { useEffect, useRef } from 'react';
import { FaTimes, FaInbox } from 'react-icons/fa';
import { initials, normalizeTags, userName, userPhoto } from '../../utils/format';

/* ----------------------------------------------------------------------------
 * PageHeader — consistent page title row.
 *   <PageHeader icon={<FaBug/>} title="Issues" subtitle="…" actions={<Button…/>} />
 * -------------------------------------------------------------------------- */
export const PageHeader = ({ icon, title, subtitle, actions, eyebrow, children }) => (
    <div className="page-header">
        <div className="page-header-main">
            {icon && <div className="page-header-icon">{icon}</div>}
            <div className="flex-1">
                {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
                <h1 className="page-title">{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
                {children}
            </div>
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
    </div>
);

/* StatCard — tone: primary|success|warning|danger|info|accent|neutral */
export const StatCard = ({ icon, label, value, hint, tone = 'primary', onClick }) => (
    <div className={`stat-card tone-${tone} ${onClick ? 'card-clickable' : ''}`} onClick={onClick}>
        {icon && <div className="stat-icon">{icon}</div>}
        <div className="flex-1">
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
            {hint && <div className="stat-hint">{hint}</div>}
        </div>
    </div>
);

export const EmptyState = ({ icon = <FaInbox />, title, description, action }) => (
    <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        {title && <div className="empty-state-title">{title}</div>}
        {description && <p className="empty-state-description">{description}</p>}
        {action}
    </div>
);

export const Loader = ({ label = 'Loading…' }) => (
    <div className="loader-block">
        <span className="spinner spinner-lg" />
        {label && <span>{label}</span>}
    </div>
);

/* StatusPill — pass a Taiga status object ({name, color, is_closed}) or name + color */
export const StatusPill = ({ status, name, color, className = '' }) => {
    const n = status?.name ?? name;
    const c = status?.color ?? color;
    if (!n) return <span className="text-muted text-sm">—</span>;
    return (
        <span className={`status-pill ${status?.is_closed ? 'is-closed' : ''} ${className}`} style={c ? { '--pill': c } : undefined}>
            {n}
        </span>
    );
};

/* TagList — accepts Taiga tags ([[name,color]] or [name]) and optional project.tags_colors */
export const TagList = ({ tags, tagsColors, max }) => {
    const list = normalizeTags(tags, tagsColors);
    if (!list.length) return null;
    const shown = max ? list.slice(0, max) : list;
    return (
        <div className="tag-list">
            {shown.map((t) => (
                <span key={t.name} className="tag-chip" style={t.color ? { '--tag': t.color } : undefined}>{t.name}</span>
            ))}
            {max && list.length > max && <span className="tag-chip">+{list.length - max}</span>}
        </div>
    );
};

export const ProgressBar = ({ value = 0, tone, size, showLabel = false }) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className="flex items-center gap-2 w-full">
            <div className={`progress ${size ? `progress-${size}` : ''} ${tone ? `tone-${tone}` : ''}`}>
                <div className="progress-bar" style={{ width: `${v}%` }} />
            </div>
            {showLabel && <span className="text-xs font-semibold text-secondary tabular" style={{ minWidth: 34, textAlign: 'right' }}>{v}%</span>}
        </div>
    );
};

export const Ring = ({ value = 0, size = 72, tone, label }) => (
    <div className={`ring ${tone ? `tone-${tone}` : ''}`} style={{ '--value': Math.max(0, Math.min(100, value)), '--size': `${size}px` }}>
        <span>{label ?? `${Math.round(value)}%`}</span>
    </div>
);

/* UserAvatar — accepts a Taiga user object, or name/src */
export const UserAvatar = ({ user, name, src, size = 'sm', title }) => {
    const n = name || userName(user);
    const photo = src || userPhoto(user);
    return (
        <span className={`avatar avatar-${size}`} title={title || n}>
            {photo ? <img src={photo} alt={n} /> : initials(n)}
        </span>
    );
};

/* Drawer — right-side panel for item details */
export const Drawer = ({ isOpen, onClose, title, subtitle, actions, footer, width, children }) => {
    const panelRef = useRef(null);
    useEffect(() => {
        if (!isOpen) return undefined;
        // Escape closes only the top-most layer: not while a modal is open, and only the last drawer.
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            if (document.querySelector('.modal-overlay.open')) return;
            const drawers = document.querySelectorAll('.drawer');
            if (drawers.length && drawers[drawers.length - 1] !== panelRef.current) return;
            onClose?.();
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    return (
        <>
            <div className="drawer-overlay" onClick={onClose} />
            <aside ref={panelRef} className="drawer" style={width ? { width: `min(${width}px, 100vw)` } : undefined} role="dialog" aria-modal="true">
                <div className="drawer-header">
                    <div className="flex-1" style={{ minWidth: 0 }}>
                        {subtitle && <div className="text-xs text-muted mb-1">{subtitle}</div>}
                        {typeof title === 'string' ? <h2 className="text-xl font-bold">{title}</h2> : title}
                    </div>
                    <div className="row">
                        {actions}
                        <button className="modal-close" onClick={onClose} aria-label="Close"><FaTimes size={15} /></button>
                    </div>
                </div>
                <div className="drawer-body">{children}</div>
                {footer && <div className="drawer-footer">{footer}</div>}
            </aside>
        </>
    );
};

/* Switch — accessible toggle */
export const Switch = ({ checked, onChange, label, disabled }) => (
    <label className="switch" style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}>
        <input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
        <span className="switch-track" />
        {label && <span>{label}</span>}
    </label>
);

/* Field — label + control + hint/error */
export const Field = ({ label, hint, error, optional, children, className = '' }) => (
    <div className={`form-group ${className}`}>
        {label && (
            <label className="form-label">
                {label} {optional && <span className="optional">(optional)</span>}
            </label>
        )}
        {children}
        {error ? <div className="form-error">{error}</div> : hint ? <div className="form-hint">{hint}</div> : null}
    </div>
);
