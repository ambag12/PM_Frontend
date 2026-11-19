import React, { useId, useMemo, useState } from 'react';
import { FaCommentDots, FaPaperPlane } from 'react-icons/fa';
import { remarkService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { formatDateTime, timeAgo } from '../../utils/format';
import { UserAvatar } from '../UI';
import { memberName, useMyMembership } from './hooks';
import { sortRemarks } from './moduleUtils';

/*
 * Remarks thread for a tender or an HR record.
 *   target: { tenders: id } | { hr: id }
 *   memberships: membership list of the project (user_member is a membership id)
 */
const RemarksThread = ({ remarks, memberships, projectId, target, onAdded, placeholder = 'Add a remark…' }) => {
    const toast = useToast();
    const [text, setText] = useState('');
    const inputId = useId();
    const [saving, setSaving] = useState(false);
    const me = useMyMembership(memberships);
    const sorted = useMemo(() => sortRemarks(remarks), [remarks]);
    const byId = useMemo(() => new Map((memberships || []).map((m) => [m.id, m])), [memberships]);

    const submit = async (e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        setSaving(true);
        try {
            const res = await remarkService.create({
                project: Number(projectId),
                remarks: body,
                ...target,
                ...(me ? { user_member: me.id } : {}),
            });
            setText('');
            toast.success('Remark added');
            onAdded?.(res.data?.data);
        } catch (err) {
            toast.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="remarks">
            <form className="remarks-compose" onSubmit={submit}>
                <UserAvatar name={memberName(me) || 'You'} src={me?.photo} size="sm" />
                <div className="flex-1">
                    <label htmlFor={inputId} className="sr-only">Remark</label>
                    <textarea
                        id={inputId}
                        className="form-input"
                        rows={2}
                        placeholder={placeholder}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
                        }}
                    />
                    <div className="row justify-between mt-2">
                        <span className="text-xs text-muted">
                            {me ? <>Posting as <strong>{memberName(me)}</strong> · Ctrl+Enter to send</> : 'Ctrl+Enter to send'}
                        </span>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !text.trim()}>
                            {saving ? <span className="spinner spinner-sm" /> : <FaPaperPlane size={11} />} Post remark
                        </button>
                    </div>
                </div>
            </form>

            {sorted.length === 0 ? (
                <div className="remarks-empty">
                    <FaCommentDots aria-hidden="true" />
                    <span>No remarks yet. Notes from committee meetings, approvals and follow-ups go here.</span>
                </div>
            ) : (
                <div className="remarks-list">
                    {sorted.map((r) => {
                        const author = byId.get(r.user_member);
                        const name = author ? memberName(author) : r.user_member ? `Member #${r.user_member}` : 'Unknown author';
                        return (
                            <div key={r.id} className="comment">
                                <UserAvatar name={name} src={author?.photo} size="sm" />
                                <div className="comment-body">
                                    <div className="comment-head">
                                        <span className="comment-author">{name}</span>
                                        {author?.role_name && <span className="badge">{author.role_name}</span>}
                                        <span className="comment-time" title={formatDateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
                                    </div>
                                    <div className="comment-text">{r.remarks}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RemarksThread;
