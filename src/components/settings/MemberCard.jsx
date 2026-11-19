import React from 'react';
import { FaTrash, FaPaperPlane, FaCrown, FaEnvelope } from 'react-icons/fa';
import { Switch, UserAvatar } from '../UI';
import { formatDate } from '../../utils/format';

const memberDisplayName =(m) => m.full_name || m.user_email || m.email || 'Invited user';

/* One team member (or pending invitation) with inline management controls. */
const MemberCard = ({ m, roles, stats, canManage, isMe, busy, onRole, onAdmin, onRemove, onResend }) => {
    const pending = !m.user;
    const name = memberDisplayName(m);
    const s = stats || {};
    return (
        <article className={`member-card ${pending ? 'is-pending' : ''}`} aria-label={name}>
            <div className="member-top">
                {pending ? (
                    <span className="avatar avatar-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}><FaEnvelope /></span>
                ) : (
                    <UserAvatar user={{ full_name_display: name, photo: m.photo }} size="lg" />
                )}
                <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="member-name truncate">{name}{isMe && <span className="text-muted font-normal"> (you)</span>}</div>
                    <div className="member-sub truncate">{pending ? `Invited ${formatDate(m.created_at)}` : (m.user_email || m.email || `Member since ${formatDate(m.created_at)}`)}</div>
                </div>
            </div>

            <div className="row flex-wrap" style={{ gap: '0.35rem' }}>
                {m.is_owner && <span className="badge badge-accent"><FaCrown size={10} /> Owner</span>}
                {m.is_admin && <span className="badge badge-primary">Admin</span>}
                {pending ? <span className="badge badge-warning">Pending invitation</span> : m.is_user_active === false ? <span className="badge badge-error">Inactive</span> : <span className="badge badge-success">Active</span>}
            </div>

            <div className="member-controls">
                {canManage ? (
                    <select
                        className="form-input form-input-sm"
                        value={m.role}
                        onChange={(e) => onRole(m, Number(e.target.value))}
                        disabled={busy}
                        aria-label={`Role for ${name}`}
                    >
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                ) : (
                    <span className="badge badge-outline">{m.role_name}</span>
                )}
                {canManage && (
                    <Switch checked={m.is_admin} onChange={(v) => onAdmin(m, v)} disabled={busy || m.is_owner} label="Admin" />
                )}
            </div>

            {!pending && (
                <div className="mini-stats" aria-label="Activity in this project">
                    <div className="mini-stat"><b>{s.closed_tasks ?? 0}</b><span>Tasks closed</span></div>
                    <div className="mini-stat"><b>{s.closed_bugs ?? 0}</b><span>Issues closed</span></div>
                    <div className="mini-stat"><b>{s.created_bugs ?? 0}</b><span>Issues filed</span></div>
                    <div className="mini-stat"><b>{s.wiki_changes ?? 0}</b><span>Wiki edits</span></div>
                </div>
            )}

            {canManage && (
                <div className="member-actions">
                    {pending ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => onResend(m)} disabled={busy}><FaPaperPlane /> Resend invite</button>
                    ) : <span className="text-xs text-muted">Joined {formatDate(m.created_at)}</span>}
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => onRemove(m)} disabled={busy || m.is_owner} title={m.is_owner ? 'Transfer ownership before removing the owner' : undefined}>
                        <FaTrash /> {pending ? 'Revoke' : 'Remove'}
                    </button>
                </div>
            )}
        </article>
    );
};

export default MemberCard;
