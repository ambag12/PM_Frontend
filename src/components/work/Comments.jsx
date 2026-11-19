import React, { useCallback, useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaUndo, FaHistory, FaRegCommentDots } from 'react-icons/fa';
import { historyService } from '../../api/services';
import { useToast, useConfirm } from '../../context/ToastContext';
import { timeAgo, formatDateTime } from '../../utils/format';
import { UserAvatar } from '../UI';
import { useCurrentUser } from './useWorkItem';

/*
 * Comments thread for a work item (history entries of type "comment").
 *   <Comments type="task" objectId={task.id} onAdd={(text) => mutate(…addComment…)} canComment canModerate />
 * Own comments (and any comment for admins) can be edited, deleted and restored;
 * edited comments expose their previous versions.
 */

const Versions = ({ type, objectId, commentId }) => {
    const [state, setState] = useState({ loading: true, list: [] });
    useEffect(() => {
        let off = false;
        historyService.getCommentVersions(type, objectId, commentId)
            .then((res) => { if (!off) setState({ loading: false, list: res.data || [] }); })
            .catch(() => { if (!off) setState({ loading: false, list: [] }); });
        return () => { off = true; };
    }, [type, objectId, commentId]);

    if (state.loading) return <div className="comment-versions text-xs text-muted"><span className="spinner spinner-sm" /> Loading history…</div>;
    if (!state.list.length) return <div className="comment-versions text-xs text-muted">No earlier versions.</div>;
    return (
        <ol className="comment-versions">
            {[...state.list].reverse().map((v, i) => (
                <li key={i}>
                    <div className="text-xs text-muted">{v.user?.name || v.user?.username || 'Someone'} · {formatDateTime(v.date)}</div>
                    <div className="prose comment-version-text" dangerouslySetInnerHTML={{ __html: v.comment_html || v.comment || '' }} />
                </li>
            ))}
        </ol>
    );
};

const CommentItem = ({ c, type, objectId, mine, canModerate, members, onChanged }) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(c.comment || '');
    const [busy, setBusy] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const deleted = !!c.delete_comment_date;
    const canManage = mine || canModerate;
    const member = (members || []).find((m) => String(m.id) === String(c.user?.pk));
    const author = { ...(member || {}), full_name_display: c.user?.name || member?.full_name_display || c.user?.username, photo: c.user?.photo || member?.photo };

    const run = async (fn, msg) => {
        setBusy(true);
        try {
            await fn();
            if (msg) toast.success(msg);
            await onChanged();
            return true;
        } catch (err) {
            toast.error(err);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const saveEdit = async () => {
        if (!text.trim()) return;
        if (await run(() => historyService.editComment(type, objectId, c.id, text.trim()), 'Comment updated')) setEditing(false);
    };

    const del = async () => {
        const ok = await confirm({ title: 'Delete comment?', message: 'The comment will be hidden. You can restore it afterwards.', confirmText: 'Delete', danger: true });
        if (ok) run(() => historyService.deleteComment(type, objectId, c.id), 'Comment deleted');
    };

    return (
        <article className={`comment ${deleted ? 'is-deleted' : ''}`}>
            <UserAvatar user={author} size="sm" />
            <div className="comment-body">
                <div className="comment-head">
                    <span className="comment-author">{author.full_name_display || 'Unknown'}</span>
                    <time className="comment-time" dateTime={c.created_at} title={formatDateTime(c.created_at)}>{timeAgo(c.created_at)}</time>
                    {c.edit_comment_date && !deleted && (
                        <button type="button" className="comment-edited" onClick={() => setShowVersions((s) => !s)} title={`Edited ${formatDateTime(c.edit_comment_date)}`} aria-expanded={showVersions}>
                            <FaHistory size={9} /> edited
                        </button>
                    )}
                    {canManage && !editing && (
                        <div className="comment-actions">
                            {deleted ? (
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => run(() => historyService.undeleteComment(type, objectId, c.id), 'Comment restored')} disabled={busy}>
                                    <FaUndo /> Restore
                                </button>
                            ) : (
                                <>
                                    {mine && (
                                        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => { setText(c.comment || ''); setEditing(true); }} aria-label="Edit comment" title="Edit" disabled={busy}>
                                            <FaEdit />
                                        </button>
                                    )}
                                    <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" onClick={del} aria-label="Delete comment" title="Delete" disabled={busy}>
                                        <FaTrash />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                {deleted ? (
                    <div className="comment-text">
                        Comment deleted{c.delete_comment_user?.name ? ` by ${c.delete_comment_user.name}` : ''} · {timeAgo(c.delete_comment_date)}
                    </div>
                ) : editing ? (
                    <div className="stack-sm">
                        <textarea
                            className="form-input"
                            rows={3}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit();
                                if (e.key === 'Escape') { e.stopPropagation(); setEditing(false); }
                            }}
                            aria-label="Edit comment"
                            autoFocus
                        />
                        <div className="row justify-end">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
                            <button type="button" className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy || !text.trim()}>Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="prose comment-prose" dangerouslySetInnerHTML={{ __html: c.comment_html || '' }} />
                )}
                {showVersions && !deleted && <Versions type={type} objectId={objectId} commentId={c.id} />}
            </div>
        </article>
    );
};

const Comments = ({ type, objectId, onAdd, canComment, canModerate, members, onCountChange }) => {
    const user = useCurrentUser();
    const [data, setData] = useState({ id: null, list: [], error: null });
    const [text, setText] = useState('');
    const [posting, setPosting] = useState(false);
    const [order, setOrder] = useState('newest');

    const load = useCallback(async () => {
        try {
            const res = await historyService.getComments(type, objectId);
            const list = (res.data || []).filter((e) => e.comment || e.delete_comment_date);
            setData({ id: objectId, list, error: null });
            onCountChange?.(list.filter((e) => !e.delete_comment_date).length);
        } catch (err) {
            setData({ id: objectId, list: [], error: err });
        }
    }, [type, objectId, onCountChange]);

    useEffect(() => { load(); }, [load]);

    const loading = String(data.id) !== String(objectId);

    const submit = async (e) => {
        e?.preventDefault();
        const value = text.trim();
        if (!value) return;
        setPosting(true);
        try {
            await onAdd(value);
            setText('');
            await load();
        } catch {
            // toast shown by mutate()
        } finally {
            setPosting(false);
        }
    };

    const sorted = [...data.list].sort((a, b) => (order === 'newest' ? -1 : 1) * (new Date(a.created_at) - new Date(b.created_at)));

    return (
        <div className="comments">
            {canComment && (
                <form className="comment-composer" onSubmit={submit}>
                    <UserAvatar user={user} size="sm" />
                    <div className="flex-1 stack-sm">
                        <textarea
                            className="form-input"
                            rows={text ? 3 : 2}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
                            placeholder="Write a comment… (Markdown supported, Ctrl+Enter to send)"
                            aria-label="New comment"
                        />
                        {text.trim() && (
                            <div className="row justify-end">
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setText('')} disabled={posting}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={posting}>
                                    {posting && <span className="spinner spinner-sm" />} Comment
                                </button>
                            </div>
                        )}
                    </div>
                </form>
            )}

            {loading ? (
                <div className="stack-sm mt-3">
                    <div className="skeleton" style={{ height: 48 }} />
                    <div className="skeleton" style={{ height: 48 }} />
                </div>
            ) : data.error ? (
                <div className="alert alert-error mt-3">Could not load comments. <button type="button" className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>
            ) : sorted.length === 0 ? (
                <div className="work-empty"><FaRegCommentDots /> No comments yet{canComment ? ' — start the conversation.' : '.'}</div>
            ) : (
                <>
                    {sorted.length > 1 && (
                        <div className="row justify-end mt-2">
                            <div className="segmented" role="group" aria-label="Comment order">
                                <button type="button" className={order === 'newest' ? 'active' : ''} onClick={() => setOrder('newest')}>Newest</button>
                                <button type="button" className={order === 'oldest' ? 'active' : ''} onClick={() => setOrder('oldest')}>Oldest</button>
                            </div>
                        </div>
                    )}
                    <div className="comment-list">
                        {sorted.map((c) => (
                            <CommentItem
                                key={c.id}
                                c={c}
                                type={type}
                                objectId={objectId}
                                mine={user && String(c.user?.pk) === String(user.id)}
                                canModerate={canModerate}
                                members={members}
                                onChanged={load}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Comments;
