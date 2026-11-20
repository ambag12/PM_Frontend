import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHistory, FaPlus, FaPen, FaComment, FaUserPlus, FaBook, FaFlag } from 'react-icons/fa';
import { timelineService } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { Loader, EmptyState } from '../UI';
import { timeAgo, formatDateTime } from '../../utils/format';

const TYPE_LABEL = { userstory: 'user story', task: 'task', issue: 'issue', epic: 'epic', wikipage: 'wiki page', milestone: 'sprint', project: 'project' };

const itemLink = (kind, obj, projectId) => {
    if (!obj || !projectId) return null;
    if (kind === 'userstory' || kind === 'task') return `/project/${projectId}/backlog?ref=${obj.ref}`;
    if (kind === 'issue') return `/project/${projectId}/issues?ref=${obj.ref}`;
    if (kind === 'epic') return `/project/${projectId}/epics?ref=${obj.ref}`;
    if (kind === 'wikipage') return `/project/${projectId}/wiki?page=${obj.slug}`;
    if (kind === 'milestone') return `/project/${projectId}/milestones`;
    return `/project/${projectId}`;
};

/* Turn an API timeline entry ("userstories.userstory.change") into a readable row. */
const describe = (entry) => {
    const [, kind = '', action = ''] = (entry.event_type || '').split('.');
    const d = entry.data || {};
    const obj = d[kind] || null;
    const projectId = d.project?.id ?? entry.project;
    const title = obj ? (obj.subject || obj.name || obj.slug || '') : '';
    const ref = obj?.ref ? `#${obj.ref} ` : '';
    let verb = action === 'create' ? 'created' : action === 'delete' ? 'deleted' : 'updated';
    let icon = action === 'create' ? <FaPlus /> : <FaPen />;
    let tone = action === 'create' ? 'tone-success' : action === 'delete' ? 'tone-danger' : 'tone-info';
    if (d.comment) { verb = 'commented on'; icon = <FaComment />; tone = 'tone-accent'; }
    if (kind === 'membership') { verb = 'joined'; icon = <FaUserPlus />; tone = 'tone-primary'; }
    if (kind === 'wikipage') icon = <FaBook />;
    if (kind === 'milestone') icon = <FaFlag />;
    return { kind, verb, icon, tone, title: `${ref}${title}`.trim(), project: d.project, link: itemLink(kind, obj, projectId), comment: d.comment };
};

const ProfileActivity = ({ userId }) => {
    const toast = useToast();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;
        timelineService.getProfile(userId, { page })
            .then((res) => {
                if (!alive) return;
                setItems((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
                setHasMore(!!res.headers?.['x-pagination-next']);
                setLoading(false);
            })
            .catch((err) => {
                if (!alive) return;
                setLoading(false);
                if (page === 1) setError(err);
                else toast.error(err);
            });
        return () => { alive = false; };
    }, [userId, page, toast]);

    const more = () => {
        setLoading(true);
        setPage((p) => p + 1);
    };

    if (loading && items.length === 0) return <Loader label="Loading activity…" />;
    if (error) return <div className="alert alert-error">Could not load your activity.</div>;
    if (items.length === 0) return <div className="card"><EmptyState icon={<FaHistory />} title="No activity yet" description="Things you create, change or comment on will show up here." /></div>;

    return (
        <div className="card">
            <div className="timeline">
                {items.map((entry) => {
                    const e = describe(entry);
                    return (
                        <div key={entry.id} className="timeline-item">
                            <div className={`timeline-icon ${e.tone}`}>{e.icon}</div>
                            <div className="timeline-content">
                                <div>
                                    You {e.verb} {TYPE_LABEL[e.kind] || e.kind}{' '}
                                    {e.title && (e.link ? <Link to={e.link}><strong>{e.title}</strong></Link> : <strong>{e.title}</strong>)}
                                    {e.project?.name && e.kind !== 'project' && <> in <Link to={`/project/${e.project.id}`}>{e.project.name}</Link></>}
                                </div>
                                {e.comment && <div className="surface-muted text-sm mt-1" style={{ padding: '0.5rem 0.75rem' }}>{e.comment.length > 220 ? `${e.comment.slice(0, 220)}…` : e.comment}</div>}
                                <div className="timeline-time" title={formatDateTime(entry.created)}>{timeAgo(entry.created)}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {hasMore && (
                <div className="text-center mt-2">
                    <button className="btn btn-secondary btn-sm" onClick={more} disabled={loading}>{loading ? <span className="spinner spinner-sm" /> : 'Load more'}</button>
                </div>
            )}
        </div>
    );
};

export default ProfileActivity;
