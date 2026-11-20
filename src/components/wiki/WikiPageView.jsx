import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaPen, FaTrash, FaBookmark, FaRegFileAlt, FaPaperclip, FaHistory } from 'react-icons/fa';
import { formatDateTime, timeAgo } from '../../utils/format';
import { Tabs, UserAvatar } from '../UI';
import WikiAttachments from './WikiAttachments';
import WikiHistory from './WikiHistory';
import { leadingHeading, pageTitle as defaultTitle } from './wikiUtils';

/* Selected wiki page: header with meta + actions, and Content / Attachments / History tabs. */
const WikiPageView = ({
    page, projectId, members, canEdit, canDelete, canBookmark, bookmarked,
    onEdit, onDelete, onToggleWatch, onBookmark, watchBusy, titleOf = defaultTitle,
}) => {
    const [tab, setTab] = useState('content');
    const [attachCount, setAttachCount] = useState(null);
    const modifier = (members || []).find((m) => m.id === page.last_modifier);
    const owner = (members || []).find((m) => m.id === page.owner);
    const modifierName = modifier?.full_name_display || modifier?.username || (page.last_modifier ? `User #${page.last_modifier}` : 'Unknown');

    return (
        <article className="wiki-page card flush">
            <header className="wiki-page-head">
                <div className="flex-1">
                    <div className="eyebrow">Wiki <span className="wiki-crumb-sep">/</span> <span className="mono">{page.slug}</span></div>
                    <h2 className="wiki-page-title">{titleOf(page)}</h2>
                    <div className="wiki-page-meta">
                        <UserAvatar name={modifierName} src={modifier?.photo} size="xs" />
                        <span>
                            Last edited by <strong>{modifierName}</strong>{' '}
                            <span title={formatDateTime(page.modified_date)}>{timeAgo(page.modified_date)}</span>
                        </span>
                        <span className="wiki-dot" aria-hidden="true" />
                        <span>{page.editions || 1} edition{(page.editions || 1) === 1 ? '' : 's'}</span>
                        {owner && owner.id !== modifier?.id && (
                            <>
                                <span className="wiki-dot" aria-hidden="true" />
                                <span>Created by {owner.full_name_display || owner.username}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="wiki-page-actions">
                    <button
                        type="button"
                        className={`btn btn-secondary btn-sm ${page.is_watcher ? 'is-on' : ''}`}
                        onClick={onToggleWatch}
                        disabled={watchBusy}
                        aria-pressed={!!page.is_watcher}
                        title={page.is_watcher ? 'Stop watching this page' : 'Get notified when this page changes'}
                    >
                        {page.is_watcher ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                        {page.is_watcher ? 'Unwatch' : 'Watch'}
                        <span className="wiki-count">{page.total_watchers || 0}</span>
                    </button>
                    {canBookmark && !bookmarked && (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={onBookmark} title="Add to bookmarks">
                            <FaBookmark size={11} /> Bookmark
                        </button>
                    )}
                    {canEdit && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}>
                            <FaPen size={11} /> Edit
                        </button>
                    )}
                    {canDelete && (
                        <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" onClick={onDelete} aria-label="Delete page" title="Delete page">
                            <FaTrash size={12} />
                        </button>
                    )}
                </div>
            </header>

            <div className="wiki-page-tabs">
                <Tabs
                    activeTab={tab}
                    onChange={setTab}
                    tabs={[
                        { id: 'content', label: 'Page', icon: <FaRegFileAlt size={12} /> },
                        { id: 'attachments', label: 'Attachments', icon: <FaPaperclip size={12} />, badge: attachCount ?? undefined },
                        { id: 'history', label: 'History', icon: <FaHistory size={12} /> },
                    ]}
                />
            </div>

            <div className="wiki-page-body">
                {tab === 'content' && (
                    String(page.content || '').trim() ? (
                        // HTML rendered and sanitised by the backend.
                        <div className={`prose wiki-prose ${leadingHeading(page.content) ? 'has-title' : ''}`} dangerouslySetInnerHTML={{ __html: page.html || '' }} />
                    ) : (
                        <div className="wiki-empty-page">
                            <FaRegFileAlt />
                            <p>This page is empty.</p>
                            {canEdit && <button type="button" className="btn btn-primary btn-sm" onClick={onEdit}><FaPen size={11} /> Start writing</button>}
                        </div>
                    )
                )}
                <div hidden={tab !== 'attachments'}>
                    <WikiAttachments projectId={projectId} pageId={page.id} canEdit={canEdit} onCountChange={setAttachCount} />
                </div>
                {tab === 'history' && <WikiHistory pageId={page.id} version={page.version} />}
            </div>
        </article>
    );
};

export default WikiPageView;
