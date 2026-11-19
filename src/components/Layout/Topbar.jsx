import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    FaBars, FaSearch, FaBell, FaMoon, FaSun, FaChevronRight, FaUser, FaSignOutAlt,
    FaCheckDouble, FaBook, FaBug, FaTasks, FaListUl, FaLayerGroup,
} from 'react-icons/fa';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProject } from '../../context/ProjectContext';
import { notificationService, searchService } from '../../api/services';
import { initials, timeAgo } from '../../utils/format';

const SECTION_LABELS = {
    backlog: 'Backlog', kanban: 'Kanban', issues: 'Issues', milestones: 'Sprints', wiki: 'Wiki',
    members: 'Team', settings: 'Settings', epics: 'Epics', tenders: 'Tenders', hr: 'HR',
    activity: 'Activity', search: 'Search',
};
const GLOBAL_LABELS = {
    '/': 'Dashboard', '/create-project': 'New project', '/profile': 'My profile', '/admin': 'Admin',
    '/tenders': 'Tenders', '/hr': 'HR management', '/notifications': 'Notifications',
};

const NOTIF_VERBS = {
    1: 'assigned you to',
    2: 'mentioned you in',
    3: 'added you as a watcher of',
    4: 'added you to the project',
    5: 'commented on',
    6: 'mentioned you in a comment on',
};

export const describeNotification = (n) => {
    const d = n.data || {};
    const who = d.user?.name || d.user?.full_name_display || d.user?.username || 'Someone';
    const verb = NOTIF_VERBS[n.event_type] || 'updated';
    const target = n.event_type === 4 ? d.project?.name : d.obj ? `#${d.obj.ref} ${d.obj.subject}` : d.project?.name;
    return { who, verb, target, project: d.project };
};

// Link to the item a notification refers to (best effort)
export const notificationLink = (n) => {
    const d = n.data || {};
    const pid = d.project?.id;
    if (!pid) return '/notifications';
    const ct = d.obj?.content_type;
    if (ct === 'issue') return `/project/${pid}/issues`;
    if (ct === 'task' || ct === 'userstory') return `/project/${pid}/backlog`;
    if (ct === 'epic') return `/project/${pid}/epics`;
    return `/project/${pid}`;
};

const RESULT_GROUPS = [
    { key: 'userstories', label: 'User stories', icon: <FaListUl />, path: 'backlog' },
    { key: 'tasks', label: 'Tasks', icon: <FaTasks />, path: 'backlog' },
    { key: 'issues', label: 'Issues', icon: <FaBug />, path: 'issues' },
    { key: 'epics', label: 'Epics', icon: <FaLayerGroup />, path: 'epics' },
    { key: 'wikipages', label: 'Wiki pages', icon: <FaBook />, path: 'wiki' },
];

const useClickOutside = (ref, onOutside) => {
    useEffect(() => {
        const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ref, onOutside]);
};

const Topbar = ({ onMenuClick, isMobile }) => {
    const { user, logout } = useContext(AuthContext);
    const { theme, toggle } = useTheme();
    const { project, projectId } = useProject();
    const location = useLocation();
    const navigate = useNavigate();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [userOpen, setUserOpen] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [unread, setUnread] = useState(0);

    const searchRef = useRef(null);
    const inputRef = useRef(null);
    const notifRef = useRef(null);
    const userRef = useRef(null);
    useClickOutside(searchRef, useCallback(() => setSearchOpen(false), []));
    useClickOutside(notifRef, useCallback(() => setNotifOpen(false), []));
    useClickOutside(userRef, useCallback(() => setUserOpen(false), []));

    // Breadcrumbs
    const crumbs = [];
    if (projectId) {
        crumbs.push({ label: 'Projects', to: '/' });
        crumbs.push({ label: project?.name || '…', to: `/project/${projectId}` });
        const section = location.pathname.split('/')[3];
        if (section) crumbs.push({ label: SECTION_LABELS[section] || section });
    } else {
        crumbs.push({ label: GLOBAL_LABELS[location.pathname] || 'Workspace' });
    }

    // Notifications (poll every 60s)
    const loadNotifications = useCallback(async () => {
        try {
            const res = await notificationService.list({ page: 1 });
            const list = res.data?.objects || (Array.isArray(res.data) ? res.data : []);
            setNotifs(list.slice(0, 8));
            const unreadRes = await notificationService.list({ only_unread: true, page: 1 });
            setUnread(unreadRes.data?.total ?? (unreadRes.data?.objects || []).length);
        } catch {
            /* notifications are non-critical */
        }
    }, []);

    useEffect(() => {
        loadNotifications();
        const t = setInterval(loadNotifications, 60000);
        return () => clearInterval(t);
    }, [loadNotifications]);

    const markAllRead = async () => {
        await notificationService.markAllRead().catch(() => {});
        loadNotifications();
    };

    // Search (debounced, project scoped)
    useEffect(() => {
        if (!projectId || query.trim().length < 2) {
            setResults(null);
            return undefined;
        }
        setSearching(true);
        const t = setTimeout(async () => {
            try {
                const res = await searchService.search(projectId, query.trim());
                setResults(res.data);
            } catch {
                setResults(null);
            } finally {
                setSearching(false);
            }
        }, 280);
        return () => clearTimeout(t);
    }, [query, projectId]);

    // "/" or Ctrl+K focuses search
    useEffect(() => {
        const onKey = (e) => {
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
            if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                inputRef.current?.focus();
                setSearchOpen(true);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    const submitSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        if (projectId) navigate(`/project/${projectId}/search?q=${encodeURIComponent(query.trim())}`);
        else navigate(`/?q=${encodeURIComponent(query.trim())}`);
        setSearchOpen(false);
    };

    const goToResult = (group, item) => {
        setSearchOpen(false);
        setQuery('');
        const q = group.key === 'wikipages' ? `?page=${item.slug}` : `?ref=${item.ref}`;
        navigate(`/project/${projectId}/${group.path}${q}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="topbar">
            {isMobile && (
                <button className="icon-btn" onClick={onMenuClick} aria-label="Open menu"><FaBars /></button>
            )}

            <nav className="topbar-crumbs" aria-label="Breadcrumb">
                {crumbs.map((c, i) => (
                    <React.Fragment key={i}>
                        {i > 0 && <FaChevronRight className="crumb-sep" />}
                        {c.to && i < crumbs.length - 1
                            ? <Link to={c.to}>{c.label}</Link>
                            : <span className="crumb-current">{c.label}</span>}
                    </React.Fragment>
                ))}
            </nav>

            <div className="topbar-spacer" />

            <div className="topbar-search" ref={searchRef}>
                <form onSubmit={submitSearch} className="w-full" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <FaSearch size={13} style={{ position: 'absolute', left: '0.75rem' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                        onFocus={() => setSearchOpen(true)}
                        placeholder={projectId ? `Search ${project?.name || 'project'}…` : 'Search projects…'}
                        aria-label="Search"
                    />
                    <span className="kbd">/</span>
                </form>
                {searchOpen && projectId && query.trim().length >= 2 && (
                    <div className="popover" style={{ left: 0, right: 0, minWidth: 340 }}>
                        <div className="popover-body">
                            {searching && <div className="p-4 text-sm text-muted row"><span className="spinner spinner-sm" /> Searching…</div>}
                            {!searching && results && results.count === 0 && <div className="p-4 text-sm text-muted">No matches for “{query}”.</div>}
                            {!searching && results && RESULT_GROUPS.map((g) => (results[g.key] || []).length > 0 && (
                                <div key={g.key} className="py-1">
                                    <div className="eyebrow" style={{ padding: '0.5rem 1rem 0.25rem' }}>{g.label}</div>
                                    {results[g.key].slice(0, 5).map((item) => (
                                        <button key={item.id} className="menu-item" onClick={() => goToResult(g, item)}>
                                            {g.icon}
                                            {item.ref && <span className="ref">#{item.ref}</span>}
                                            <span className="truncate">{item.subject || item.slug}</span>
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                        {results && results.count > 0 && (
                            <div className="popover-footer">
                                <button className="text-primary-color font-semibold" onClick={submitSearch}>See all {results.count} results</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="topbar-actions">
                <button className="icon-btn" onClick={toggle} aria-label="Toggle theme" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
                    {theme === 'dark' ? <FaSun /> : <FaMoon />}
                </button>

                <div style={{ position: 'relative' }} ref={notifRef}>
                    <button className="icon-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
                        <FaBell />
                        {unread > 0 && <span className="dot-count">{unread > 9 ? '9+' : unread}</span>}
                    </button>
                    {notifOpen && (
                        <div className="popover" style={{ width: 360 }}>
                            <div className="popover-header">
                                <span>Notifications</span>
                                {unread > 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={markAllRead}><FaCheckDouble /> Mark all read</button>
                                )}
                            </div>
                            <div className="popover-body">
                                {notifs.length === 0 && <div className="p-6 text-center text-sm text-muted">You’re all caught up.</div>}
                                {notifs.map((n) => {
                                    const d = describeNotification(n);
                                    return (
                                        <Link
                                            key={n.id}
                                            to={notificationLink(n)}
                                            className="menu-item items-start"
                                            style={{ background: n.read ? undefined : 'var(--primary-50)' }}
                                            onClick={() => { setNotifOpen(false); if (!n.read) notificationService.markRead(n.id).then(loadNotifications).catch(() => {}); }}
                                        >
                                            <span className="avatar avatar-sm">{initials(d.who)}</span>
                                            <span className="flex-1 text-sm">
                                                <strong>{d.who}</strong> {d.verb} <strong>{d.target}</strong>
                                                <span className="block text-xs text-muted">{d.project?.name} · {timeAgo(n.created)}</span>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                            <div className="popover-footer">
                                <Link to="/notifications" onClick={() => setNotifOpen(false)}>View all notifications</Link>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ position: 'relative' }} ref={userRef}>
                    <button className="icon-btn" style={{ width: 'auto', padding: '0 0.25rem' }} onClick={() => setUserOpen((o) => !o)} aria-label="Account menu">
                        <span className="avatar avatar-sm">
                            {user?.photo ? <img src={user.photo} alt="" /> : initials(user?.full_name || user?.username)}
                        </span>
                    </button>
                    {userOpen && (
                        <div className="popover" style={{ width: 240 }}>
                            <div className="popover-header" style={{ display: 'block' }}>
                                <div className="truncate">{user?.full_name || user?.username}</div>
                                <div className="text-xs text-muted font-normal truncate">{user?.email || `@${user?.username}`}</div>
                            </div>
                            <div className="py-1">
                                <Link to="/profile" className="menu-item" onClick={() => setUserOpen(false)}><FaUser /> My profile</Link>
                                <Link to="/notifications" className="menu-item" onClick={() => setUserOpen(false)}><FaBell /> Notifications</Link>
                                <button className="menu-item" onClick={toggle}>{theme === 'dark' ? <FaSun /> : <FaMoon />} {theme === 'dark' ? 'Light' : 'Dark'} mode</button>
                                <div className="dropdown-divider" />
                                <button className="menu-item danger" onClick={handleLogout}><FaSignOutAlt /> Sign out</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Topbar;
