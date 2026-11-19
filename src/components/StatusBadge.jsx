import React from 'react';

/*
 * StatusBadge — status pill.
 *   <StatusBadge status={story.status_extra_info} />            Taiga status object {name, color, is_closed}
 *   <StatusBadge status="In progress" color="#E47C40" />         name + colour
 *   <StatusBadge status="Completed" />                           name only → colour guessed from the wording
 */
const guessColor = (name) => {
    const s = String(name || '').toLowerCase();
    if (/complet|done|closed|finish|approved/.test(s)) return 'var(--success)';
    if (/progress|ongoing|active|review|test/.test(s)) return 'var(--warning)';
    if (/hold|paused|blocked|reject|cancel|overdue/.test(s)) return 'var(--error)';
    if (/new|pending|todo|open|ready|not.?started/.test(s)) return 'var(--info)';
    return 'var(--neutral-500)';
};

const StatusBadge = ({ status, color, isClosed, className = '' }) => {
    const obj = status && typeof status === 'object' ? status : null;
    const name = obj ? obj.name : status;
    const pill = (obj?.color || color) ?? guessColor(name);
    const closed = obj ? obj.is_closed : isClosed;
    if (!name) return <span className="text-muted text-sm">—</span>;
    return (
        <span className={`status-pill ${closed ? 'is-closed' : ''} ${className}`} style={{ '--pill': pill }}>
            {name}
        </span>
    );
};

export default StatusBadge;
