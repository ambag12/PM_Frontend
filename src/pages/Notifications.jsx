import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    FaBell, FaCheck, FaCheckDouble, FaUserCheck, FaAt, FaEye, FaUserPlus, FaCommentAlt, FaChevronLeft, FaChevronRight,
    FaSlidersH, FaRedo,
} from 'react-icons/fa';
import { notificationService } from '../api/services';
import { useToast } from '../context/ToastContext';
import { PageHeader, EmptyState, UserAvatar } from '../components/UI';
import { SkeletonRows, ProjectLogo } from '../components/overview/OverviewParts';
import useAsync from '../components/overview/useAsync';
import { getErrorMessage } from '../api/client';
import { formatDateTime, timeAgo } from '../utils/format';
import '../styles/overview.css';

const PAGE_SIZE = 30;

const EVENT_META = {
    1: { verb: 'assigned you to', icon: <FaUserCheck />, tone: 'primary' },
    2: { verb: 'mentioned you in', icon: <FaAt />, tone: 'accent' },
    3: { verb: 'added you as a watcher of', icon: <FaEye />, tone: 'info' },
    4: { verb: 'added you to the project', icon: <FaUserPlus />, tone: 'success' },
    5: { verb: 'commented on', icon: <FaCommentAlt />, tone: 'neutral' },
    6: { verb: 'mentioned you in a comment on', icon: <FaAt />, tone: 'accent' },
};

const LEVELS = [
    { value: 1, label: 'Involved', hint: 'Only items you own, are assigned to, or watch' },
    { value: 2, label: 'All', hint: 'Every change in the project' },
    { value: 3, label: 'None', hint: 'No email notifications' },
];

const linkFor = (n) => {
    const d = n.data || {};
    const pid = d.project?.id;
    if (!pid) return null;
    const obj = d.obj;
    if (!obj) return `/project/${pid}`;
    switch (obj.content_type) {
        case 'userstory':
        case 'task': return obj.ref ? `/project/${pid}/backlog?ref=${obj.ref}` : `/project/${pid}/backlog`;
        case 'issue': return obj.ref ? `/project/${pid}/issues?ref=${obj.ref}` : `/project/${pid}/issues`;
        case 'epic': return obj.ref ? `/project/${pid}/epics?ref=${obj.ref}` : `/project/${pid}/epics`;
        case 'wikipage': return obj.slug ? `/project/${pid}/wiki?page=${encodeURIComponent(obj.slug)}` : `/project/${pid}/wiki`;
        case 'milestone': return `/project/${pid}/milestones`;
        default: return `/project/${pid}`;
    }
};

const NotificationRow = ({ n, onRead, busy }) => {
    const d = n.data || {};
    const meta = EVENT_META[n.event_type] || { verb: 'updated', icon: <FaBell />, tone: 'neutral' };
    const who = d.user?.name || d.user?.full_name || d.user?.username || 'Someone';
    const link = linkFor(n);
    const target = n.event_type === 4
        ? d.project?.name
        : d.obj ? `${d.obj.ref ? `#${d.obj.ref} ` : ''}${d.obj.subject || ''}`.trim() : d.project?.name;
    const unread = !n.read;

    return (
        <div className={`ov-notif ${unread ? 'unread' : ''}`}>
            {d.user ? <UserAvatar user={{ ...d.user, full_name_display: who }} size="md" /> : <span className={`ov-notif-icon tone-${meta.tone}`}>{meta.icon}</span>}
            <div className="ov-notif-body">
                <div>
                    <strong>{who}</strong> {meta.verb}{' '}
                    {link
                        ? <Link to={link} onClick={() => unread && onRead(n, true)}>{target || 'an item'}</Link>
                        : <strong>{target || 'an item'}</strong>}
                </div>
                <div className="ov-notif-time">
                    <span className={`tone-${meta.tone}`} style={{ color: 'var(--tone)' }}>{meta.icon}</span>{' '}
                    {d.project?.name && <>{d.project.name} · </>}
                    <time dateTime={n.created} title={formatDateTime(n.created)}>{timeAgo(n.created)}</time>
                    {unread && <span className="badge badge-primary" style={{ marginLeft: '0.5rem', height: 18 }}>New</span>}
                </div>
            </div>
            <div className="ov-notif-actions">
                {unread && (
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onRead(n)} disabled={busy} aria-label="Mark as read" title="Mark as read">
                        <FaCheck />
                    </button>
                )}
            </div>
        </div>
    );
};

const PreferencesCard = () => {
    const toast = useToast();
    const policiesQ = useAsync(() => notificationService.listPolicies().then((r) => (Array.isArray(r.data) ? r.data : [])), []);
    const [saving, setSaving] = useState(null);

    const update = async (policy, level) => {
        if (policy.notify_level === level) return;
        const prev = policy.notify_level;
        setSaving(policy.id);
        policiesQ.setData((list) => list.map((p) => (p.id === policy.id ? { ...p, notify_level: level } : p)));
        try {
            await notificationService.updatePolicy(policy.id, level);
            toast.success(`${policy.project_name}: ${LEVELS.find((l) => l.value === level).label.toLowerCase()} notifications`);
        } catch (err) {
            policiesQ.setData((list) => list.map((p) => (p.id === policy.id ? { ...p, notify_level: prev } : p)));
            toast.error(err);
        } finally {
            setSaving(null);
        }
    };

    const policies = [...(policiesQ.data || [])].sort((a, b) => (a.project_name || '').localeCompare(b.project_name || ''));

    return (
        <section className="card" aria-labelledby="prefs-title">
            <div className="card-header">
                <div>
                    <h2 className="card-title row" id="prefs-title"><FaSlidersH className="text-primary-color" /> Notification preferences</h2>
                    <div className="ov-card-sub">Email notifications per project</div>
                </div>
            </div>
            <ul className="ov-steps mb-4">
                {LEVELS.map((l) => (
                    <li key={l.value}><span>{l.value}</span><span><strong className="text-heading">{l.label}</strong> — {l.hint}</span></li>
                ))}
            </ul>
            {policiesQ.loading && <SkeletonRows rows={3} height={30} />}
            {policiesQ.error && !policiesQ.data && (
                <div className="alert alert-error"><span className="flex-1">Could not load preferences.</span><button className="btn btn-sm btn-secondary" onClick={policiesQ.reload}>Retry</button></div>
            )}
            {policiesQ.data && policies.length === 0 && <p className="text-sm text-muted">You are not a member of any project yet.</p>}
            {policies.map((p) => (
                <div key={p.id} className="ov-policy-row">
                    <span className="ov-policy-name">
                        <ProjectLogo project={{ id: p.project, name: p.project_name }} size={28} />
                        <Link to={`/project/${p.project}`} className="truncate">{p.project_name}</Link>
                    </span>
                    <div className="segmented" role="radiogroup" aria-label={`Notification level for ${p.project_name}`}>
                        {LEVELS.map((l) => (
                            <button
                                key={l.value}
                                type="button"
                                role="radio"
                                aria-checked={p.notify_level === l.value}
                                className={p.notify_level === l.value ? 'active' : ''}
                                onClick={() => update(p, l.value)}
                                disabled={saving === p.id}
                                title={l.hint}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </section>
    );
};

const Notifications = () => {
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const page = Math.max(1, Number(params.get('page')) || 1);
    const unreadOnly = params.get('filter') === 'unread';
    const [busy, setBusy] = useState(false);

    const listQ = useAsync(
        () => notificationService.list({ page, ...(unreadOnly ? { only_unread: true } : {}) }).then((r) => {
            const d = r.data || {};
            return { objects: d.objects || (Array.isArray(d) ? d : []), total: d.total ?? (Array.isArray(d) ? d.length : 0) };
        }),
        [page, unreadOnly],
    );
    const unreadQ = useAsync(() => notificationService.list({ only_unread: true, page: 1 }).then((r) => r.data?.total ?? 0), []);

    const setParam = (changes) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([k, v]) => { if (v === null || v === undefined || v === '') next.delete(k); else next.set(k, String(v)); });
        setParams(next);
    };

    const markRead = async (n, silent = false) => {
        setBusy(true);
        listQ.setData((d) => d && ({ ...d, objects: d.objects.map((x) => (x.id === n.id ? { ...x, read: new Date().toISOString() } : x)) }));
        unreadQ.setData((c) => Math.max(0, (c || 0) - 1));
        try {
            await notificationService.markRead(n.id);
            if (unreadOnly && !silent) listQ.reload();
        } catch (err) {
            if (!silent) toast.error(err);
            listQ.reload();
            unreadQ.reload();
        } finally {
            setBusy(false);
        }
    };

    const markAll = async () => {
        setBusy(true);
        try {
            await notificationService.markAllRead();
            toast.success('All notifications marked as read');
            listQ.reload();
            unreadQ.setData(0);
        } catch (err) {
            toast.error(err);
        } finally {
            setBusy(false);
        }
    };

    const data = listQ.data;
    const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
    const unread = unreadQ.data ?? 0;

    return (
        <>
            <PageHeader
                icon={<FaBell />}
                title="Notifications"
                subtitle={unreadQ.loading ? 'Checking for updates…' : unread ? `You have ${unread} unread notification${unread === 1 ? '' : 's'}.` : 'You’re all caught up.'}
                actions={(
                    <>
                        <button type="button" className="btn btn-secondary" onClick={() => { listQ.reload(); unreadQ.reload(); }}><FaRedo size={11} /> Refresh</button>
                        <button type="button" className="btn btn-primary" onClick={markAll} disabled={busy || !unread}><FaCheckDouble size={12} /> Mark all as read</button>
                    </>
                )}
            />

            <div className="grid-main-side">
                <section className="card flush" aria-label="Notifications list">
                    <div className="card-header">
                        <div className="segmented" role="group" aria-label="Filter notifications">
                            <button type="button" className={!unreadOnly ? 'active' : ''} aria-pressed={!unreadOnly} onClick={() => setParam({ filter: null, page: null })}>All</button>
                            <button type="button" className={unreadOnly ? 'active' : ''} aria-pressed={unreadOnly} onClick={() => setParam({ filter: 'unread', page: null })}>
                                Unread {unread > 0 && <span className="badge badge-primary" style={{ height: 18 }}>{unread}</span>}
                            </button>
                        </div>
                        {data && <span className="ov-card-sub">{data.total} total</span>}
                    </div>

                    {listQ.loading && <div className="p-4"><SkeletonRows rows={6} height={34} /></div>}
                    {listQ.error && !data && (
                        <div className="p-4">
                            <div className="alert alert-error"><span className="flex-1">{getErrorMessage(listQ.error, 'Could not load notifications.')}</span><button className="btn btn-sm btn-secondary" onClick={listQ.reload}>Retry</button></div>
                        </div>
                    )}
                    {data && data.objects.length === 0 && (
                        <EmptyState
                            icon={<FaBell />}
                            title={unreadOnly ? 'No unread notifications' : 'No notifications yet'}
                            description={unreadOnly ? 'Nice — you’ve read everything.' : 'You’ll be notified when someone assigns you, mentions you or comments on items you follow.'}
                            action={unreadOnly ? <button className="btn btn-secondary btn-sm" onClick={() => setParam({ filter: null, page: null })}>Show all</button> : null}
                        />
                    )}
                    {data && data.objects.map((n) => <NotificationRow key={n.id} n={n} onRead={markRead} busy={busy} />)}

                    {data && totalPages > 1 && (
                        <div className="ov-table-foot" style={{ alignItems: 'center' }}>
                            <span>Page {page} of {totalPages}</span>
                            <span className="row">
                                <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setParam({ page: page - 1 > 1 ? page - 1 : null })}><FaChevronLeft size={10} /> Newer</button>
                                <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setParam({ page: page + 1 })}>Older <FaChevronRight size={10} /></button>
                            </span>
                        </div>
                    )}
                </section>

                <PreferencesCard />
            </div>
        </>
    );
};

export default Notifications;
