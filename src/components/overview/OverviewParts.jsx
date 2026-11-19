import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaEye, FaRegEye, FaRegClock, FaCommentAlt } from 'react-icons/fa';
import Modal from '../UI/Modal';
import { Loader, EmptyState, UserAvatar } from '../UI';
import { daysUntil, formatDate, initials, timeAgo } from '../../utils/format';
import useAsync from './useAsync';
import { dueTone, countdownText } from './due';
import '../../styles/overview.css';

/* Logo tile: project logo image, or initials on a palette colour chosen from the project id. */
export const ProjectLogo = ({ project, size = 44 }) => {
    const src = size > 64 ? project?.logo_big_url || project?.logo_small_url : project?.logo_small_url || project?.logo_big_url;
    const hue = ((Number(project?.id) || 0) % 6) + 1;
    const [failed, setFailed] = useState(null); // src that failed to load → fall back to initials
    return (
        <span
            className="ov-logo"
            style={{ '--logo-size': `${size}px`, '--logo-tone': `var(--chart-${hue})` }}
            aria-hidden="true"
        >
            {src && src !== failed ? <img src={src} alt="" onError={() => setFailed(src)} /> : initials(project?.name)}
        </span>
    );
};

export const DueChip = ({ date, closed = false, compact = false }) => {
    if (!date) return compact ? null : <span className="ov-chip tone-neutral"><FaRegClock /> No due date</span>;
    const days = daysUntil(date);
    const tone = closed ? 'neutral' : dueTone(days);
    return (
        <span className={`ov-chip tone-${tone}`} title={formatDate(date)}>
            <FaRegClock />
            {compact ? formatDate(date, { day: 'numeric', month: 'short' }) : formatDate(date)}
            {!closed && <span className="ov-chip-sep">·</span>}
            {!closed && countdownText(days)}
        </span>
    );
};

/* Like / watch toggle with a count that can open the people list. */
export const SocialToggle = ({ kind, active, count, busy, onToggle, onShowPeople, size }) => {
    const like = kind === 'like';
    const Icon = like ? (active ? FaHeart : FaRegHeart) : (active ? FaEye : FaRegEye);
    const label = like ? (active ? 'Liked' : 'Like') : (active ? 'Watching' : 'Watch');
    return (
        <span className={`ov-social ${size === 'sm' ? 'ov-social-sm' : ''}`}>
            <button
                type="button"
                className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''} ${active ? 'is-on' : ''} ${like && active ? 'ov-liked' : ''}`}
                onClick={onToggle}
                disabled={busy}
                aria-pressed={!!active}
                title={like ? (active ? 'Remove like' : 'Like this project') : (active ? 'Stop watching' : 'Watch this project')}
            >
                <Icon /> <span className="ov-social-label">{label}</span>
            </button>
            <button
                type="button"
                className={`btn btn-secondary ${size === 'sm' ? 'btn-sm' : ''} ov-social-count`}
                onClick={onShowPeople}
                disabled={!onShowPeople}
                aria-label={`${count || 0} ${like ? 'fans' : 'watchers'} — show list`}
                title={onShowPeople ? `Show ${like ? 'fans' : 'watchers'}` : undefined}
            >
                {count || 0}
            </button>
        </span>
    );
};

/* Modal listing project fans or watchers. `loader` returns a promise of [{id, username, full_name}] */
export const PeopleModal = ({ title, loader, onClose, members = [] }) => {
    const { data, error, loading } = useAsync(() => loader().then((r) => r.data || []), [title]);
    return (
        <Modal isOpen onClose={onClose} title={title} size="sm">
            {loading && <Loader label="Loading…" />}
            {error && <div className="alert alert-error">Could not load this list.</div>}
            {data && data.length === 0 && <EmptyState title="Nobody yet" description="Be the first one." />}
            {data && data.length > 0 && (
                <div className="list">
                    {data.map((p) => {
                        const m = members.find((x) => String(x.id) === String(p.id));
                        return (
                            <div key={p.id} className="list-item">
                                <UserAvatar user={m || p} name={p.full_name || p.username} size="md" />
                                <div className="list-item-main">
                                    <div className="list-item-title">{p.full_name || p.username}</div>
                                    <div className="list-item-sub">@{p.username}{m?.role_name ? ` · ${m.role_name}` : ''}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
};

/* One activity row (timeline-item). `ev` comes from describeEvent(). */
export const ActivityItem = ({ ev, showProject = false, showDetails = true }) => {
    const Icon = ev.icon;
    const object = ev.link ? <Link to={ev.link} className="ov-act-link">{ev.object}</Link> : <strong>{ev.object}</strong>;
    return (
        <div className={`timeline-item tone-${ev.tone}`}>
            <div className="timeline-icon"><Icon /></div>
            <div className="timeline-content">
                <div className="ov-act-line">
                    <strong>{ev.who}</strong> {ev.verb} {ev.object ? object : null}
                    {ev.parent && <span className="text-muted"> {ev.parent}</span>}
                </div>
                {showDetails && ev.details.length > 0 && (
                    <ul className="ov-act-details">
                        {ev.details.slice(0, 4).map((d) => <li key={d}>{d}</li>)}
                        {ev.details.length > 4 && <li>and {ev.details.length - 4} more changes</li>}
                    </ul>
                )}
                {ev.comment && (
                    <div className="ov-act-comment"><FaCommentAlt aria-hidden="true" /> <span>{ev.comment}</span></div>
                )}
                <div className="timeline-time">
                    <time dateTime={ev.created} title={ev.created ? new Date(ev.created).toLocaleString() : ''}>{timeAgo(ev.created)}</time>
                    {showProject && ev.projectName && (
                        <> · {ev.projectId ? <Link to={`/project/${ev.projectId}`}>{ev.projectName}</Link> : ev.projectName}</>
                    )}
                </div>
            </div>
        </div>
    );
};

/* Small skeleton rows for list placeholders */
export const SkeletonRows = ({ rows = 4, height = 18 }) => (
    <div className="stack-sm" aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height, width: `${90 - ((i * 13) % 35)}%` }} />
        ))}
    </div>
);
