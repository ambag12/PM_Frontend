import React, { useMemo, useState } from 'react';
import {
    FaBookmark, FaRegFileAlt, FaHome, FaPlus, FaSearch, FaPen, FaTrash, FaCheck, FaTimes, FaChevronDown,
} from 'react-icons/fa';
import { wikiService } from '../../api/services';
import { useConfirm, useToast } from '../../context/ToastContext';
import { timeAgo } from '../../utils/format';
import { HOME_SLUG, pageTitle as defaultTitle, slugify } from './wikiUtils';

/*
 * Left pane of the wiki: curated bookmarks (wiki links) + all pages with search.
 * Creating a bookmark makes the API create the target page (slug derived from the title) if missing.
 */
const WikiSidebar = ({
    projectId, pages, links, currentSlug, onSelect, onCreatePage, onChanged,
    canAddPage, canAddLink, canModifyLink, canDeleteLink, open, onToggle, titleOf = defaultTitle,
}) => {
    const toast = useToast();
    const confirm = useConfirm();
    const [q, setQ] = useState('');
    const [adding, setAdding] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [busy, setBusy] = useState(false);

    const pageSlugs = useMemo(() => new Set(pages.map((p) => p.slug)), [pages]);
    const sortedPages = useMemo(() => [...pages]
        .filter((p) => !q || p.slug.toLowerCase().includes(q.toLowerCase()) || titleOf(p).toLowerCase().includes(q.toLowerCase())
            || String(p.content || '').toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => (a.slug === HOME_SLUG ? -1 : b.slug === HOME_SLUG ? 1 : a.slug.localeCompare(b.slug))), [pages, q, titleOf]);
    const visibleLinks = useMemo(() => links.filter((l) => !q || l.title.toLowerCase().includes(q.toLowerCase())), [links, q]);

    const addLink = async (e) => {
        e.preventDefault();
        const title = newTitle.trim();
        if (!title) return;
        setBusy(true);
        try {
            const res = await wikiService.createLink({ project: Number(projectId), title });
            toast.success(pageSlugs.has(res.data?.href) ? 'Bookmark added' : 'Bookmark and page created');
            setNewTitle('');
            setAdding(false);
            onChanged?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    const renameLink = async (link) => {
        const title = editTitle.trim();
        if (!title || title === link.title) { setEditingId(null); return; }
        setBusy(true);
        try {
            await wikiService.updateLink(link.id, { title });
            toast.success('Bookmark renamed');
            setEditingId(null);
            onChanged?.();
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    const deleteLink = async (link) => {
        const ok = await confirm({
            title: 'Remove bookmark?',
            message: `“${link.title}” will be removed from the bookmarks. The page itself is kept.`,
            confirmText: 'Remove',
            danger: true,
        });
        if (!ok) return;
        try {
            await wikiService.deleteLink(link.id);
            toast.success('Bookmark removed');
            onChanged?.();
        } catch (err) {
            toast.error(err);
        }
    };

    const current = pages.find((p) => p.slug === currentSlug);

    return (
        <aside className={`wiki-nav card flush ${open ? 'is-open' : ''}`} aria-label="Wiki navigation">
            <button type="button" className="wiki-nav-toggle" onClick={onToggle} aria-expanded={open}>
                <FaRegFileAlt />
                <span className="flex-1 truncate">{current ? titleOf(current) : 'Pages'}</span>
                <span className="badge">{pages.length}</span>
                <FaChevronDown className="wiki-nav-chevron" />
            </button>

            <div className="wiki-nav-body">
                <div className="wiki-nav-search form-input-icon">
                    <FaSearch size={12} />
                    <input className="form-input form-input-sm" type="search" placeholder="Search pages…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search wiki pages" />
                </div>

                <div className="wiki-nav-section">
                    <div className="wiki-nav-heading">
                        <span><FaBookmark size={10} /> Bookmarks</span>
                        {canAddLink && !adding && (
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setAdding(true)} aria-label="Add bookmark" title="Add bookmark">
                                <FaPlus size={10} />
                            </button>
                        )}
                    </div>
                    {adding && (
                        <form className="wiki-link-form" onSubmit={addLink}>
                            <input
                                className="form-input form-input-sm"
                                autoFocus
                                placeholder="Bookmark title"
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
                                aria-label="Bookmark title"
                            />
                            <div className="wiki-link-form-foot">
                                <span className="text-xs text-muted truncate">
                                    {newTitle.trim() ? <>→ <span className="mono">{slugify(newTitle) || '…'}</span>{!pageSlugs.has(slugify(newTitle)) && ' (new page)'}</> : 'Links to the page with this title'}
                                </span>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setNewTitle(''); }}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !newTitle.trim()}>Add</button>
                            </div>
                        </form>
                    )}
                    {visibleLinks.length === 0 && !adding ? (
                        <p className="wiki-nav-empty">{q ? 'No bookmarks match.' : 'Pin key pages here for quick access.'}</p>
                    ) : (
                        <ul className="wiki-nav-list">
                            {visibleLinks.map((l) => (
                                <li key={l.id}>
                                    {editingId === l.id ? (
                                        <form className="wiki-link-edit" onSubmit={(e) => { e.preventDefault(); renameLink(l); }}>
                                            <input
                                                className="form-input form-input-sm"
                                                autoFocus
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                                                aria-label="Bookmark title"
                                            />
                                            <button type="submit" className="btn btn-ghost btn-sm btn-icon" aria-label="Save" disabled={busy}><FaCheck size={11} /></button>
                                            <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Cancel" onClick={() => setEditingId(null)}><FaTimes size={11} /></button>
                                        </form>
                                    ) : (
                                        <div className={`wiki-nav-item is-link ${l.href === currentSlug ? 'active' : ''}`}>
                                            <button type="button" className="wiki-nav-btn" onClick={() => onSelect(l.href)} title={`/${l.href}`}>
                                                <FaBookmark size={11} className="wiki-nav-icon" />
                                                <span className="truncate">{l.title}</span>
                                                {!pageSlugs.has(l.href) && <span className="badge badge-warning">missing</span>}
                                            </button>
                                            <span className="wiki-nav-actions">
                                                {canModifyLink && (
                                                    <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label={`Rename ${l.title}`} onClick={() => { setEditingId(l.id); setEditTitle(l.title); }}>
                                                        <FaPen size={10} />
                                                    </button>
                                                )}
                                                {canDeleteLink && (
                                                    <button type="button" className="btn btn-danger-ghost btn-sm btn-icon" aria-label={`Remove ${l.title}`} onClick={() => deleteLink(l)}>
                                                        <FaTrash size={10} />
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="wiki-nav-section">
                    <div className="wiki-nav-heading">
                        <span><FaRegFileAlt size={10} /> All pages <span className="wiki-count">{pages.length}</span></span>
                        {canAddPage && (
                            <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onCreatePage} aria-label="New page" title="New page">
                                <FaPlus size={10} />
                            </button>
                        )}
                    </div>
                    {sortedPages.length === 0 ? (
                        <p className="wiki-nav-empty">{q ? 'No pages match.' : 'No pages yet.'}</p>
                    ) : (
                        <ul className="wiki-nav-list">
                            {sortedPages.map((p) => (
                                <li key={p.id}>
                                    <div className={`wiki-nav-item ${p.slug === currentSlug ? 'active' : ''}`}>
                                        <button type="button" className="wiki-nav-btn" onClick={() => onSelect(p.slug)} aria-current={p.slug === currentSlug ? 'page' : undefined}>
                                            {p.slug === HOME_SLUG ? <FaHome size={12} className="wiki-nav-icon" /> : <FaRegFileAlt size={11} className="wiki-nav-icon" />}
                                            <span className="flex-1 wiki-nav-text">
                                                <span className="truncate block">{titleOf(p)}</span>
                                                <span className="wiki-nav-sub">{timeAgo(p.modified_date)}</span>
                                            </span>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default WikiSidebar;
