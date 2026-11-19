import React from 'react';
import { FaBan } from 'react-icons/fa';
import { UserAvatar } from '../UI';
import { fmtPoints } from './utils';

/* Small presentational pieces shared by the planning pages. */

export const AvatarStack = ({ users = [], max = 3, size = 'xs' }) => {
    if (!users.length) return null;
    const shown = users.slice(0, max);
    return (
        <span className="avatar-group pl-avatars" aria-label={`Assigned to ${users.map((u) => u.full_name_display || u.full_name || u.username).join(', ')}`}>
            {shown.map((u) => <UserAvatar key={u.id ?? u.username} user={u} size={size} />)}
            {users.length > max && <span className={`avatar avatar-${size} pl-avatar-more`}>+{users.length - max}</span>}
        </span>
    );
};

export const PointsBadge = ({ value, title = 'Story points' }) => (
    <span className={`pl-points ${value ? '' : 'is-empty'}`} title={title} aria-label={`${fmtPoints(value)} ${title.toLowerCase()}`}>
        {fmtPoints(value)}
    </span>
);

export const BlockedBadge = ({ note }) => (
    <span className="badge badge-error pl-blocked" title={note || 'Blocked'}>
        <FaBan size={9} /> Blocked
    </span>
);

export const EpicChips = ({ epics }) => {
    if (!epics?.length) return null;
    return (
        <span className="pl-epic-chips">
            {epics.map((e) => (
                <span key={e.id} className="pl-epic-chip" style={{ '--epic': e.color || 'var(--neutral-400)' }} title={`Epic #${e.ref} ${e.subject}`}>
                    {e.subject}
                </span>
            ))}
        </span>
    );
};
