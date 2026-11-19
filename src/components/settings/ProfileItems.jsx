import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaHeart, FaThumbsUp } from 'react-icons/fa';
import { userService } from '../../api/services';
import { Loader, EmptyState, StatusPill } from '../UI';
import { useAsyncData } from './hooks';
import { timeAgo } from '../../utils/format';

const FILTERS = {
    watched: [['', 'All'], ['project', 'Projects'], ['epic', 'Epics'], ['userstory', 'Stories'], ['task', 'Tasks'], ['issue', 'Issues']],
    liked: [['', 'All'], ['project', 'Projects']],
    voted: [['', 'All'], ['epic', 'Epics'], ['userstory', 'Stories'], ['task', 'Tasks'], ['issue', 'Issues']],
};
const META = {
    watched: { fetch: userService.getWatched, icon: <FaEye />, empty: 'Watch stories, tasks or projects to follow their changes.' },
    liked: { fetch: userService.getLiked, icon: <FaHeart />, empty: 'Like projects to keep them handy here.' },
    voted: { fetch: userService.getVoted, icon: <FaThumbsUp />, empty: 'Vote for stories or issues you care about.' },
};
const TYPE = { project: 'Project', epic: 'Epic', userstory: 'Story', task: 'Task', issue: 'Issue' };

const linkFor = (it) => {
    const p = it.type === 'project' ? it.id : it.project;
    if (it.type === 'project') return `/project/${p}`;
    if (it.type === 'issue') return `/project/${p}/issues?ref=${it.ref}`;
    if (it.type === 'epic') return `/project/${p}/epics?ref=${it.ref}`;
    return `/project/${p}/backlog?ref=${it.ref}`;
};

const ProfileItems = ({ userId, kind }) => {
    const [type, setType] = useState('');
    const meta = META[kind];
    const { data, loading, error } = useAsyncData(
        () => meta.fetch(userId, type ? { type } : undefined).then((r) => r.data),
        [userId, kind, type],
    );

    return (
        <div className="card flush">
            <div className="card-header">
                <div className="segmented" role="group" aria-label="Filter by type">
                    {FILTERS[kind].map(([v, l]) => (
                        <button key={v || 'all'} className={type === v ? 'active' : ''} onClick={() => setType(v)} aria-pressed={type === v}>{l}</button>
                    ))}
                </div>
                {!loading && data && <span className="text-sm text-muted">{data.length} item{data.length === 1 ? '' : 's'}</span>}
            </div>
            {loading ? <Loader label="" /> : error ? (
                <div className="card-body"><div className="alert alert-error">Could not load this list.</div></div>
            ) : (data || []).length === 0 ? (
                <EmptyState icon={meta.icon} title="Nothing here yet" description={meta.empty} />
            ) : (
                <div className="list" style={{ padding: '0.25rem 0.75rem' }}>
                    {data.map((it) => (
                        <Link key={`${it.type}-${it.id}`} to={linkFor(it)} className="list-item clickable">
                            <span className="badge badge-outline" style={{ minWidth: 58, justifyContent: 'center' }}>{TYPE[it.type] || it.type}</span>
                            <div className="list-item-main">
                                <div className="list-item-title">{it.ref ? <span className="ref">#{it.ref} </span> : null}{it.subject || it.name}</div>
                                <div className="list-item-sub">
                                    {it.type !== 'project' ? it.project_name : it.description?.slice(0, 90)}
                                    {it.created_date ? ` · ${timeAgo(it.created_date)}` : ''}
                                </div>
                            </div>
                            {it.status && <StatusPill name={it.status} color={it.status_color} />}
                            <span className="text-xs text-muted nowrap" title="Watchers / votes">
                                {kind === 'voted' ? `${it.total_voters ?? 0} votes` : kind === 'watched' ? `${it.total_watchers ?? 0} watching` : `${it.total_fans ?? ''}`}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProfileItems;
