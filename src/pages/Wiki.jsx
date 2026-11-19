import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaBook, FaPlus, FaHome, FaRedo, FaRegFileAlt } from 'react-icons/fa';
import { wikiService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useConfirm, useToast } from '../context/ToastContext';
import { PageHeader, EmptyState, Loader } from '../components/UI';
import WikiSidebar from '../components/wiki/WikiSidebar';
import WikiPageView from '../components/wiki/WikiPageView';
import WikiEditor from '../components/wiki/WikiEditor';
import CreatePageModal from '../components/wiki/CreatePageModal';
import { HOME_SLUG, leadingHeading, slugify, titleFromSlug } from '../components/wiki/wikiUtils';
import '../styles/wiki.css';

const Wiki = () => {
    const { project, projectId } = useProject();
    const { hasPermission } = usePermissions();
    const toast = useToast();
    const confirm = useConfirm();
    const [params, setParams] = useSearchParams();
    const slug = params.get('page') || HOME_SLUG;

    // Pages + links for the project (silent reloads keep the current data on screen).
    const [nonce, setNonce] = useState(0);
    const key = `${projectId}:${nonce}`;
    const [data, setData] = useState({ key: null, pid: null, pages: [], links: [], error: null });
    useEffect(() => {
        if (!projectId) return undefined;
        let alive = true;
        Promise.all([wikiService.listPages(projectId), wikiService.listLinks(projectId)])
            .then(([p, l]) => alive && setData({
                key, pid: projectId, error: null,
                pages: Array.isArray(p.data) ? p.data : [],
                links: Array.isArray(l.data) ? l.data : [],
            }))
            .catch((error) => alive && setData((d) => ({ ...d, key, pid: projectId, error })));
        return () => { alive = false; };
    }, [key, projectId]);
    const reload = () => setNonce((n) => n + 1);
    const loaded = data.pid === projectId && data.key !== null;
    const pages = useMemo(() => (loaded ? data.pages : []), [loaded, data.pages]);
    const links = useMemo(() => (loaded ? data.links : []), [loaded, data.links]);

    const [editingId, setEditingId] = useState(null);
    const [createFor, setCreateFor] = useState(null); // null | { slug }
    const [navOpen, setNavOpen] = useState(false);
    const [watchBusy, setWatchBusy] = useState(false);
    const [creatingHome, setCreatingHome] = useState(false);

    const page = pages.find((p) => p.slug === slug) || null;
    const editing = !!page && editingId === page.id;
    const existingSlugs = useMemo(() => new Set(pages.map((p) => p.slug)), [pages]);
    // Display title: leading "# Heading" of the page, else the title of a bookmark pointing at it, else the slug.
    const linkTitles = useMemo(() => Object.fromEntries(links.map((l) => [l.href, l.title])), [links]);
    const pageTitle = (p) => (p ? leadingHeading(p.content) || linkTitles[p.slug] || titleFromSlug(p.slug) : '');

    const isAdmin = project?.i_am_admin || project?.i_am_owner;
    const can = (perm) => isAdmin || hasPermission(perm);
    const perms = {
        addPage: can('add_wiki_page'),
        modifyPage: can('modify_wiki_page'),
        deletePage: can('delete_wiki_page'),
        addLink: can('add_wiki_link'),
        modifyLink: can('modify_wiki_link'),
        deleteLink: can('delete_wiki_link'),
    };

    const select = (s) => {
        setParams(s === HOME_SLUG ? {} : { page: s });
        setNavOpen(false);
    };

    const replacePage = (updated) => {
        if (!updated) return;
        setData((d) => ({ ...d, pages: d.pages.some((p) => p.id === updated.id) ? d.pages.map((p) => (p.id === updated.id ? updated : p)) : [...d.pages, updated] }));
    };

    const onCreated = (created) => {
        setCreateFor(null);
        replacePage(created);
        select(created.slug);
        setEditingId(created.id);
    };

    const createHome = async () => {
        setCreatingHome(true);
        try {
            const res = await wikiService.createPage({
                project: Number(projectId),
                slug: HOME_SLUG,
                content: `# ${project?.name || 'Project'} wiki\n\nWelcome! Use this page to collect key documents, decisions and how-tos.\n`,
            });
            toast.success('Home page created');
            onCreated(res.data);
        } catch (err) {
            toast.error(err);
        } finally {
            setCreatingHome(false);
        }
    };

    const toggleWatch = async () => {
        if (!page) return;
        setWatchBusy(true);
        try {
            if (page.is_watcher) await wikiService.unwatchPage(page.id);
            else await wikiService.watchPage(page.id);
            const res = await wikiService.getPage(page.id);
            replacePage(res.data);
            toast.success(page.is_watcher ? 'You stopped watching this page' : 'You are now watching this page');
        } catch (err) {
            toast.error(err);
        } finally {
            setWatchBusy(false);
        }
    };

    const deletePage = async () => {
        if (!page) return;
        const linked = links.filter((l) => l.href === page.slug);
        const ok = await confirm({
            title: `Delete “${pageTitle(page)}”?`,
            message: `The page, its attachments and history will be permanently deleted.${linked.length ? ' Bookmarks pointing to it will show as missing.' : ''}`,
            confirmText: 'Delete page',
            danger: true,
        });
        if (!ok) return;
        try {
            await wikiService.deletePage(page.id);
            toast.success('Page deleted');
            setData((d) => ({ ...d, pages: d.pages.filter((p) => p.id !== page.id) }));
            select(HOME_SLUG);
        } catch (err) {
            toast.error(err);
        }
    };

    const bookmarkTitle = page ? (slugify(pageTitle(page)) === page.slug ? pageTitle(page) : titleFromSlug(page.slug)) : '';
    const canBookmark = perms.addLink && !!page && slugify(bookmarkTitle) === page.slug;
    const bookmarked = !!page && links.some((l) => l.href === page.slug);
    const bookmark = async () => {
        try {
            await wikiService.createLink({ project: Number(projectId), title: bookmarkTitle });
            toast.success('Added to bookmarks');
            reload();
        } catch (err) {
            toast.error(err);
        }
    };

    const newPageButton = perms.addPage && (
        <button className="btn btn-primary" onClick={() => setCreateFor({ slug: '' })}><FaPlus size={11} /> New page</button>
    );

    const failed = !!data.error && data.pid === projectId;
    let main;
    if (failed) {
        main = null;
    } else if (!loaded) {
        main = <div className="card"><Loader label="Loading wiki…" /></div>;
    } else if (!pages.length) {
        main = (
            <div className="card">
                <EmptyState
                    icon={<FaBook />}
                    title="This wiki is empty"
                    description="Start with a home page for key documents, decisions and how-tos. Other pages and bookmarks can follow."
                    action={perms.addPage ? (
                        <button className="btn btn-primary" onClick={createHome} disabled={creatingHome}>
                            {creatingHome ? <span className="spinner spinner-sm" /> : <FaHome size={12} />} Create home page
                        </button>
                    ) : null}
                />
            </div>
        );
    } else if (!page) {
        main = (
            <div className="card">
                <EmptyState
                    icon={<FaRegFileAlt />}
                    title={`“${titleFromSlug(slug)}” doesn’t exist yet`}
                    description={`There is no page at wiki/${slug}.${perms.addPage ? ' You can create it now.' : ''}`}
                    action={(
                        <div className="row justify-center flex-wrap">
                            {perms.addPage && (
                                <button className="btn btn-primary" onClick={() => (slug === HOME_SLUG ? createHome() : setCreateFor({ slug }))} disabled={creatingHome}>
                                    <FaPlus size={11} /> Create this page
                                </button>
                            )}
                            {slug !== HOME_SLUG && existingSlugs.has(HOME_SLUG) && (
                                <button className="btn btn-secondary" onClick={() => select(HOME_SLUG)}><FaHome size={12} /> Go to home</button>
                            )}
                        </div>
                    )}
                />
            </div>
        );
    } else if (editing) {
        main = (
            <div className="card flush wiki-page">
                <div className="wiki-page-head">
                    <div className="flex-1">
                        <div className="eyebrow">Editing <span className="wiki-crumb-sep">/</span> <span className="mono">{page.slug}</span></div>
                        <h2 className="wiki-page-title">{pageTitle(page)}</h2>
                    </div>
                </div>
                <WikiEditor
                    key={page.id}
                    projectId={projectId}
                    page={page}
                    onCancel={() => setEditingId(null)}
                    onSaved={(saved) => { replacePage(saved); setEditingId(null); }}
                />
            </div>
        );
    } else {
        main = (
            <WikiPageView
                key={page.id}
                page={page}
                projectId={projectId}
                members={project?.members}
                canEdit={perms.modifyPage}
                canDelete={perms.deletePage}
                canBookmark={canBookmark}
                bookmarked={bookmarked}
                onEdit={() => setEditingId(page.id)}
                onDelete={deletePage}
                onToggleWatch={toggleWatch}
                onBookmark={bookmark}
                watchBusy={watchBusy}
                titleOf={pageTitle}
            />
        );
    }

    return (
        <div className="wiki-shell">
            <PageHeader
                icon={<FaBook />}
                title="Wiki"
                subtitle={project ? `Knowledge base for ${project.name}` : 'Project knowledge base'}
                actions={newPageButton}
            />

            {failed && (
                <div className="alert alert-error mb-4">
                    <div className="flex-1">Couldn&apos;t load the wiki. {data.error?.message}</div>
                    <button className="btn btn-secondary btn-sm" onClick={reload}><FaRedo size={11} /> Retry</button>
                </div>
            )}

            <div className="wiki-layout">
                <WikiSidebar
                    projectId={projectId}
                    pages={pages}
                    links={links}
                    currentSlug={slug}
                    onSelect={select}
                    onCreatePage={() => setCreateFor({ slug: '' })}
                    onChanged={reload}
                    canAddPage={perms.addPage}
                    canAddLink={perms.addLink}
                    canModifyLink={perms.modifyLink}
                    canDeleteLink={perms.deleteLink}
                    open={navOpen}
                    onToggle={() => setNavOpen((o) => !o)}
                    titleOf={pageTitle}
                />
                <div className="wiki-main">{main}</div>
            </div>

            {createFor && (
                <CreatePageModal
                    projectId={projectId}
                    existingSlugs={existingSlugs}
                    initialSlug={createFor.slug}
                    onClose={() => setCreateFor(null)}
                    onCreated={onCreated}
                />
            )}
        </div>
    );
};

export default Wiki;
