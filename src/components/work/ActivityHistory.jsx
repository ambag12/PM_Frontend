import React, { useEffect, useState } from 'react';
import { FaHistory, FaPlus, FaPen, FaTrash } from 'react-icons/fa';
import { historyService } from '../../api/services';
import { timeAgo, formatDateTime, formatDate } from '../../utils/format';
import { UserAvatar } from '../UI';

/*
 * Activity tab: field changes from history/<type>/<id>?type=activity.
 * values_diff is rendered as "status: New → In progress".
 */

const HIDDEN = /(_order|_html)$|^(kanban_order|backlog_order|sprint_order|us_order|taskboard_order|epics_order|comment|comment_html)$/;
const LABELS = {
    assigned_to: 'assigned to',
    assigned_users: 'assigned users',
    milestone: 'sprint',
    user_story: 'user story',
    due_date: 'due date',
    due_date_reason: 'due date reason',
    is_blocked: 'blocked',
    is_iocaine: 'iocaine',
    client_requirement: 'client requirement',
    team_requirement: 'team requirement',
    description_diff: 'description',
    blocked_note_diff: 'blocked note',
    content_diff: 'content',
    finish_date: 'finished date',
    finished_date: 'finished date',
    is_closed: 'closed',
};

const fmt = (v) => {
    if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return <em className="diff-empty">empty</em>;
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return v.map((x) => (Array.isArray(x) ? x[0] : x)).filter((x) => x !== null).join(', ') || <em className="diff-empty">empty</em>;
    if (typeof v === 'object') return JSON.stringify(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return formatDate(v);
    return String(v);
};

const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const Change = ({ label, from, to }) => (
    <li className="diff-row">
        <span className="diff-field">{cap(label)}:</span>{' '}
        {isEmpty(from) ? fmt(from) : <span className="diff-old">{fmt(from)}</span>}
        <span className="diff-arrow" aria-label="changed to"> → </span>
        <span className="diff-new">{fmt(to)}</span>
    </li>
);

const Note = ({ label, children }) => (
    <li className="diff-row"><span className="diff-field">{cap(label)}:</span> {children}</li>
);

const renderDiff = (key, value) => {
    const label = LABELS[key] || key.replace(/_/g, ' ');
    if (key.endsWith('_diff')) return [<Note key={key} label={label}>updated</Note>];
    if (key === 'points' && value && !Array.isArray(value)) {
        return Object.entries(value).map(([role, pair]) => <Change key={`pts-${role}`} label={`points (${role})`} from={pair?.[0]} to={pair?.[1]} />);
    }
    if (key === 'attachments' && value && !Array.isArray(value)) {
        return [
            ...(value.new || []).map((a, i) => <Note key={`an${i}`} label="attachment added">{a.filename || a.name}</Note>),
            ...(value.changed || []).map((a, i) => <Note key={`ac${i}`} label="attachment updated">{a.filename}{a.changes?.description ? ' (description)' : ''}{a.changes?.is_deprecated ? ` (${a.changes.is_deprecated[1] ? 'deprecated' : 'restored'})` : ''}</Note>),
            ...(value.deleted || []).map((a, i) => <Note key={`ad${i}`} label="attachment removed">{a.filename || a.name}</Note>),
        ];
    }
    if (key === 'custom_attributes' && value && !Array.isArray(value)) {
        return [
            ...(value.new || []).map((a, i) => <Change key={`cn${i}`} label={a.name} from={null} to={a.value} />),
            ...(value.changed || []).map((a, i) => <Change key={`cc${i}`} label={a.name} from={a.changes?.value?.[0]} to={a.changes?.value?.[1]} />),
            ...(value.deleted || []).map((a, i) => <Change key={`cd${i}`} label={a.name} from={a.value} to={null} />),
        ];
    }
    if ((key === 'user_stories' || key === 'related_userstories') && value && !Array.isArray(value)) {
        return [
            ...(value.new || []).map((s, i) => <Note key={`un${i}`} label="story linked">#{s.ref} {s.subject}</Note>),
            ...(value.deleted || []).map((s, i) => <Note key={`ud${i}`} label="story unlinked">#{s.ref} {s.subject}</Note>),
        ];
    }
    if (Array.isArray(value) && value.length === 2) return [<Change key={key} label={label} from={value[0]} to={value[1]} />];
    return [<Note key={key} label={label}>updated</Note>];
};

const ENTRY = {
    1: { icon: <FaPen />, tone: 'tone-primary', verb: 'made changes' },
    2: { icon: <FaPlus />, tone: 'tone-success', verb: 'created this item' },
    3: { icon: <FaTrash />, tone: 'tone-danger', verb: 'deleted this item' },
};

const ActivityHistory = ({ type, objectId, refreshKey }) => {
    const [data, setData] = useState({ id: null, list: [], error: null });

    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let off = false;
        historyService.getActivity(type, objectId)
            .then((res) => { if (!off) setData({ id: objectId, list: res.data || [], error: null }); })
            .catch((err) => { if (!off) setData({ id: objectId, list: [], error: err }); });
        return () => { off = true; };
    }, [type, objectId, refreshKey, nonce]);

    const load = () => setNonce((n) => n + 1);

    if (String(data.id) !== String(objectId)) {
        return <div className="stack-sm"><div className="skeleton" style={{ height: 40 }} /><div className="skeleton" style={{ height: 40 }} /></div>;
    }
    if (data.error) {
        return <div className="alert alert-error">Could not load activity. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>;
    }

    const entries = [...data.list]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((e) => ({
            ...e,
            rows: Object.entries(e.values_diff || {}).filter(([k]) => !HIDDEN.test(k)).flatMap(([k, v]) => renderDiff(k, v)),
        }))
        .filter((e) => e.rows.length || e.type !== 1);

    if (!entries.length) return <div className="work-empty"><FaHistory /> No activity recorded yet.</div>;

    return (
        <div className="timeline activity-list">
            {entries.map((e) => {
                const meta = ENTRY[e.type] || ENTRY[1];
                return (
                    <div key={e.id} className="timeline-item">
                        <div className={`timeline-icon ${meta.tone}`}>
                            {e.user?.photo ? <UserAvatar user={{ full_name_display: e.user.name, photo: e.user.photo }} size="xs" /> : meta.icon}
                        </div>
                        <div className="timeline-content">
                            <div>
                                <strong>{e.user?.name || e.user?.username || 'Someone'}</strong>{' '}
                                {e.rows.length ? (e.type === 2 ? meta.verb : 'changed') : meta.verb}
                                <span className="timeline-time" title={formatDateTime(e.created_at)}> · {timeAgo(e.created_at)}</span>
                            </div>
                            {e.rows.length > 0 && <ul className="diff-list">{e.rows}</ul>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActivityHistory;
