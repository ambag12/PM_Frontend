import React, { useEffect, useState } from 'react';
import { FaHistory, FaPlus, FaPen, FaTrash, FaRedo } from 'react-icons/fa';
import { historyService } from '../../api/services';
import { formatDateTime, timeAgo } from '../../utils/format';
import { Loader, UserAvatar } from '../UI';

const TYPE = {
    1: { label: 'edited the page', icon: <FaPen size={10} />, tone: 'tone-primary' },
    2: { label: 'created the page', icon: <FaPlus size={10} />, tone: 'tone-success' },
    3: { label: 'deleted the page', icon: <FaTrash size={10} />, tone: 'tone-danger' },
};

/* Change history of a wiki page (history/wiki/:id), newest first, with HTML content diffs. */
const WikiHistory = ({ pageId, version }) => {
    const [nonce, setNonce] = useState(0);
    const key = `${pageId}:${version}:${nonce}`;
    const [state, setState] = useState({ key: null, items: [], error: null });
    const [openId, setOpenId] = useState(null);

    useEffect(() => {
        let alive = true;
        historyService.get('wiki', pageId)
            .then((res) => alive && setState({ key, items: Array.isArray(res.data) ? res.data : [], error: null }))
            .catch((error) => alive && setState({ key, items: [], error }));
        return () => { alive = false; };
    }, [key, pageId]);

    if (state.key !== key && state.key === null) return <Loader label="Loading history…" />;
    if (state.error) {
        return (
            <div className="alert alert-error">
                <div className="flex-1">Couldn&apos;t load the page history.</div>
                <button className="btn btn-secondary btn-sm" onClick={() => setNonce((n) => n + 1)}><FaRedo size={11} /> Retry</button>
            </div>
        );
    }
    const items = [...state.items].filter((h) => !h.is_hidden || h.comment).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!items.length) {
        return <div className="wiki-empty-inline"><FaHistory /> No recorded changes yet. Edits made from now on will appear here.</div>;
    }

    return (
        <div className="timeline wiki-history">
            {items.map((h) => {
                const t = TYPE[h.type] || TYPE[1];
                const diff = h.values_diff?.content_diff?.[1];
                const keys = Object.keys(h.values_diff || {});
                const changed = keys.filter((k) => !['content_diff', 'content_html', 'attachments'].includes(k));
                const label = h.type === 1 && keys.includes('attachments') && !diff ? 'changed the attachments' : t.label;
                return (
                    <div key={h.id} className="timeline-item">
                        <span className={`timeline-icon ${t.tone}`}>{t.icon}</span>
                        <div className="timeline-content">
                            <div className="row flex-wrap gap-2">
                                <UserAvatar name={h.user?.name || h.user?.username} src={h.user?.photo} size="xs" />
                                <strong>{h.user?.name || h.user?.username || 'Someone'}</strong>
                                <span>{label}</span>
                                {changed.length > 0 && <span className="text-xs text-muted">({changed.join(', ')})</span>}
                            </div>
                            <div className="timeline-time" title={formatDateTime(h.created_at)}>{timeAgo(h.created_at)}</div>
                            {h.comment_html && <div className="prose wiki-history-comment" dangerouslySetInnerHTML={{ __html: h.comment_html }} />}
                            {diff && (
                                <>
                                    <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setOpenId(openId === h.id ? null : h.id)} aria-expanded={openId === h.id}>
                                        {openId === h.id ? 'Hide changes' : 'Show changes'}
                                    </button>
                                    {openId === h.id && (
                                        // HTML diff produced by the backend.
                                        <div className="wiki-diff" dangerouslySetInnerHTML={{ __html: diff }} />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default WikiHistory;
