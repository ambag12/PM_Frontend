import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaHistory, FaArrowLeft, FaRedo, FaStream } from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { timelineService } from '../api/services';
import { PageHeader, EmptyState } from '../components/UI';
import { ActivityItem, SkeletonRows } from '../components/overview/OverviewParts';
import useAsync, { hasNextPage } from '../components/overview/useAsync';
import { ACTIVITY_TYPES, describeEvent } from '../components/overview/activity';
import { getErrorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { userName } from '../utils/format';
import '../styles/overview.css';

const PAGE_SIZE = 30;

const dayKey = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? 'unknown' : d.toDateString();
};
const dayLabel = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Earlier';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

const fetchPage = async (projectId, page) => {
    const res = await timelineService.getProject(projectId, { page });
    return { list: Array.isArray(res.data) ? res.data : [], more: hasNextPage(res, PAGE_SIZE) };
};

const ProjectActivity = () => {
    const { project, projectId } = useProject();
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const [initialPage] = useState(() => Math.max(1, Math.min(20, Number(params.get('page')) || 1)));
    const [type, setType] = useState('all');
    const [member, setMember] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);

    // Load pages 1..initialPage so a shared ?page=N link restores the same depth.
    const feedQ = useAsync(async () => {
        let entries = [];
        let more = true;
        let page = 0;
        while (more && page < initialPage) {
            page += 1;
            const r = await fetchPage(projectId, page);
            entries = entries.concat(r.list);
            more = r.more;
        }
        return { entries, page, more };
    }, [projectId, initialPage]);

    const feed = feedQ.data;

    const loadMore = async () => {
        if (!feed || loadingMore) return;
        setLoadingMore(true);
        try {
            const next = feed.page + 1;
            const r = await fetchPage(projectId, next);
            feedQ.setData((d) => ({ entries: [...(d?.entries || []), ...r.list], page: next, more: r.more }));
            const p = new URLSearchParams(params);
            p.set('page', String(next));
            setParams(p, { replace: true });
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not load more activity.'));
        } finally {
            setLoadingMore(false);
        }
    };

    const events = useMemo(() => (feed?.entries || []).map(describeEvent), [feed]);
    const counts = useMemo(() => events.reduce((acc, ev) => ({ ...acc, [ev.type]: (acc[ev.type] || 0) + 1 }), {}), [events]);
    const people = useMemo(() => {
        const map = new Map();
        events.forEach((ev) => { if (ev.user?.id && !map.has(ev.user.id)) map.set(ev.user.id, ev.user); });
        return [...map.values()];
    }, [events]);

    const visible = events.filter((ev) => (type === 'all' || ev.type === type) && (!member || String(ev.user?.id) === member));
    const groups = [];
    visible.forEach((ev) => {
        const key = dayKey(ev.created);
        const last = groups[groups.length - 1];
        if (last && last.key === key) last.items.push(ev);
        else groups.push({ key, label: dayLabel(ev.created), items: [ev] });
    });

    return (
        <>
            <PageHeader
                icon={<FaHistory />}
                title="Activity"
                subtitle={project ? `Everything that happened in ${project.name}, newest first.` : 'Project timeline'}
                actions={(
                    <>
                        <button type="button" className="btn btn-secondary" onClick={feedQ.reload} disabled={feedQ.loading}><FaRedo size={11} /> Refresh</button>
                        <Link to={`/project/${projectId}`} className="btn btn-ghost"><FaArrowLeft size={11} /> Overview</Link>
                    </>
                )}
            />

            <div className="card mb-4">
                <div className="row flex-wrap justify-between gap-3">
                    <div className="ov-chips" role="group" aria-label="Filter by type">
                        <button type="button" className={`ov-filter-chip ${type === 'all' ? 'active' : ''}`} aria-pressed={type === 'all'} onClick={() => setType('all')}>
                            <FaStream size={11} /> All <span className="ov-chip-count">{events.length}</span>
                        </button>
                        {ACTIVITY_TYPES.filter((t) => counts[t.key]).map((t) => {
                            const Icon = t.icon;
                            return (
                                <button key={t.key} type="button" className={`ov-filter-chip tone-${t.tone} ${type === t.key ? 'active' : ''}`} aria-pressed={type === t.key} onClick={() => setType(t.key)}>
                                    <Icon size={11} /> {t.label} <span className="ov-chip-count">{counts[t.key]}</span>
                                </button>
                            );
                        })}
                    </div>
                    {people.length > 1 && (
                        <select className="form-input form-input-sm" style={{ width: 'auto', minWidth: 180 }} value={member} onChange={(e) => setMember(e.target.value)} aria-label="Filter by person">
                            <option value="">Everyone</option>
                            {people.map((u) => <option key={u.id} value={String(u.id)}>{u.name || userName(u)}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="card">
                {feedQ.loading && <SkeletonRows rows={8} height={20} />}
                {feedQ.error && !feed && (
                    <div className="alert alert-error">
                        <span className="flex-1">{getErrorMessage(feedQ.error, 'Could not load the project timeline.')}</span>
                        <button className="btn btn-sm btn-secondary" onClick={feedQ.reload}>Retry</button>
                    </div>
                )}
                {feed && visible.length === 0 && (
                    <EmptyState
                        icon={<FaHistory />}
                        title={events.length ? 'No matching activity' : 'No activity yet'}
                        description={events.length ? 'Try another filter, or load older activity.' : 'Changes to stories, tasks, issues, sprints and wiki pages will show up here.'}
                    />
                )}
                {groups.map((g) => (
                    <div key={g.key}>
                        <div className="ov-day-label">{g.label}</div>
                        <div className="timeline">
                            {g.items.map((ev) => <ActivityItem key={ev.id} ev={ev} />)}
                        </div>
                    </div>
                ))}
                {feed && (
                    <div className="text-center mt-4">
                        {feed.more ? (
                            <button type="button" className="btn btn-secondary" onClick={loadMore} disabled={loadingMore}>
                                {loadingMore ? <><span className="spinner spinner-sm" /> Loading…</> : 'Load older activity'}
                            </button>
                        ) : events.length > 0 && <span className="text-sm text-muted">You’ve reached the beginning of this project’s history.</span>}
                    </div>
                )}
            </div>
        </>
    );
};

export default ProjectActivity;
