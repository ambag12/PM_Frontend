import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FaLock, FaGlobeAsia, FaHistory, FaCog, FaArrowRight, FaExclamationTriangle, FaMapMarkerAlt, FaHashtag,
} from 'react-icons/fa';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { useToast } from '../context/ToastContext';
import {
    projectService, userStoryService, taskService, issueService, timelineService,
} from '../api/services';
import { PageHeader, Loader, EmptyState } from '../components/UI';
import {
    ProjectLogo, SocialToggle, PeopleModal, ActivityItem, SkeletonRows,
} from '../components/overview/OverviewParts';
import {
    ProjectFactsCard, ProgressCard, SprintsCard, IssuesBreakdownCard, TeamWorkloadCard,
} from '../components/overview/ProjectOverviewCards';
import WorkTabs from '../components/overview/WorkTabs';
import useAsync, { totalFromHeaders } from '../components/overview/useAsync';
import { describeEvent } from '../components/overview/activity';
import { getErrorMessage } from '../api/client';
import UserStoryDetail from '../components/UserStoryDetail';
import TaskDetail from '../components/TaskDetail';
import IssueDetail from '../components/IssueDetail';
import CreateUserStoryModal from '../components/CreateUserStoryModal';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateIssueModal from '../components/CreateIssueModal';
import { formatDate } from '../utils/format';
import '../styles/overview.css';

const LIST_SERVICES = { userstories: userStoryService, tasks: taskService, issues: issueService };

const loadLists = async (projectId, scope, enabled) => {
    const params = { project: projectId, page_size: 100, ...(scope === 'open' ? { status__is_closed: false } : {}) };
    const keys = Object.keys(LIST_SERVICES).filter((k) => enabled[k]);
    const results = await Promise.all(keys.map((k) => LIST_SERVICES[k].list(params)));
    const out = {};
    keys.forEach((k, i) => {
        const items = Array.isArray(results[i].data) ? results[i].data : [];
        out[k] = { items, total: totalFromHeaders(results[i]) };
    });
    return out;
};

const ProjectDetail = () => {
    const { project, projectId, loading, error, reload, patchLocal } = useProject();
    const { canAdd, isAdmin, hasPermission } = usePermissions();
    const toast = useToast();

    const [tab, setTab] = useState('userstories');
    const [scope, setScope] = useState('open');
    const [open, setOpen] = useState(null); // { kind, id }
    const [creating, setCreating] = useState(null); // 'userstories' | 'tasks' | 'issues'
    const [people, setPeople] = useState(null); // 'fans' | 'watchers'
    const [socialBusy, setSocialBusy] = useState(false);

    const enabled = useMemo(() => ({
        userstories: !!(project?.is_backlog_activated || project?.is_kanban_activated),
        tasks: !!(project?.is_backlog_activated || project?.is_kanban_activated),
        issues: !!project?.is_issues_activated,
    }), [project?.is_backlog_activated, project?.is_kanban_activated, project?.is_issues_activated]);

    const statsQ = useAsync(() => projectService.getStats(projectId).then((r) => r.data), [projectId]);
    const issuesStatsQ = useAsync(() => projectService.getIssuesStats(projectId).then((r) => r.data), [projectId]);
    const memberStatsQ = useAsync(() => projectService.getMemberStats(projectId).then((r) => r.data), [projectId]);
    const timelineQ = useAsync(() => timelineService.getProject(projectId, { page: 1 }).then((r) => (Array.isArray(r.data) ? r.data : [])), [projectId]);
    // Open items are always needed (workload); "all" only when the user asks for it.
    const openQ = useAsync(() => (project ? loadLists(projectId, 'open', enabled) : Promise.resolve(null)), [projectId, !!project, enabled]);
    const allQ = useAsync(() => (project && scope === 'all' ? loadLists(projectId, 'all', enabled) : Promise.resolve(null)), [projectId, !!project, scope === 'all', enabled]);
    const listsQ = scope === 'all' ? allQ : openQ;

    const refreshWork = () => {
        openQ.reload();
        if (scope === 'all') allQ.reload();
        statsQ.reload();
        issuesStatsQ.reload();
        timelineQ.reload();
    };

    const openItems = useMemo(() => {
        const d = openQ.data || {};
        return [...(d.userstories?.items || []), ...(d.tasks?.items || []), ...(d.issues?.items || [])];
    }, [openQ.data]);

    if (loading || (!project && !error)) return <Loader label="Loading project…" />;
    if (error || !project) {
        const status = error?.response?.status;
        return (
            <EmptyState
                icon={<FaExclamationTriangle />}
                title={status === 404 ? 'Project not found' : status === 403 ? 'You don’t have access to this project' : 'Could not load this project'}
                description={getErrorMessage(error, 'Please try again in a moment.')}
                action={<div className="row justify-center"><button className="btn btn-secondary" onClick={reload}>Retry</button><Link to="/" className="btn btn-primary">Back to dashboard</Link></div>}
            />
        );
    }

    const toggleSocial = async (kind) => {
        const like = kind === 'like';
        const on = like ? project.is_fan : project.is_watcher;
        const flag = like ? 'is_fan' : 'is_watcher';
        const counter = like ? 'total_fans' : 'total_watchers';
        const prev = { [flag]: on, [counter]: project[counter] };
        setSocialBusy(true);
        patchLocal({ [flag]: !on, [counter]: Math.max(0, (project[counter] || 0) + (on ? -1 : 1)) });
        try {
            if (like) await (on ? projectService.unlike(project.id) : projectService.like(project.id));
            else await (on ? projectService.unwatch(project.id) : projectService.watch(project.id));
            toast.success(like ? (on ? 'Removed from your liked projects' : 'Added to your liked projects') : (on ? 'You stopped watching this project' : 'You are now watching this project'));
        } catch (err) {
            patchLocal(prev);
            toast.error(err);
        } finally {
            setSocialBusy(false);
        }
    };

    const activity = (timelineQ.data || []).slice(0, 10).map(describeEvent);
    const myRole = project.i_am_owner ? 'Owner' : project.i_am_admin ? 'Admin' : project.i_am_member ? 'Member' : 'Viewer';
    const canEdit = isAdmin || hasPermission('modify_project');

    const closeDetail = () => setOpen(null);
    const onItemChanged = () => refreshWork();
    const onItemDeleted = () => { setOpen(null); refreshWork(); };
    const onCreated = () => { setCreating(null); refreshWork(); };

    return (
        <>
            <PageHeader
                icon={<ProjectLogo project={project} size={60} />}
                eyebrow="Project overview"
                title={project.name}
                subtitle={project.description}
                actions={(
                    <>
                        <SocialToggle
                            kind="like"
                            active={project.is_fan}
                            count={project.total_fans}
                            busy={socialBusy}
                            onToggle={() => toggleSocial('like')}
                            onShowPeople={() => setPeople('fans')}
                        />
                        <SocialToggle
                            kind="watch"
                            active={project.is_watcher}
                            count={project.total_watchers}
                            busy={socialBusy}
                            onToggle={() => toggleSocial('watch')}
                            onShowPeople={() => setPeople('watchers')}
                        />
                        <Link to={`/project/${project.id}/activity`} className="btn btn-secondary"><FaHistory size={12} /> Activity</Link>
                        {isAdmin && <Link to={`/project/${project.id}/settings`} className="btn btn-ghost btn-icon" aria-label="Project settings" title="Project settings"><FaCog /></Link>}
                    </>
                )}
            >
                <div className="ov-hero-meta">
                    {project.is_private
                        ? <span className="badge"><FaLock size={9} /> Private</span>
                        : <span className="badge badge-primary"><FaGlobeAsia size={10} /> Public</span>}
                    <span className="badge badge-outline">{myRole}</span>
                    {project.psdp && <span className="badge badge-outline"><FaHashtag size={9} /> {project.psdp}</span>}
                    {project.location && <span className="badge badge-outline"><FaMapMarkerAlt size={9} /> {project.location}</span>}
                    <span className="text-xs text-muted">Created {formatDate(project.created_date)}</span>
                </div>
            </PageHeader>

            <div className="grid-main-side">
                <div className="stack">
                    <ProjectFactsCard project={project} canEdit={canEdit} />
                    <ProgressCard project={project} stats={statsQ.data} loading={statsQ.loading} error={statsQ.error} />
                    {(enabled.userstories || enabled.issues) ? (
                        <WorkTabs
                            project={project}
                            enabled={enabled}
                            tab={tab}
                            onTab={setTab}
                            scope={scope}
                            onScope={setScope}
                            lists={listsQ.data}
                            loading={listsQ.loading}
                            error={listsQ.error}
                            onRetry={listsQ.reload}
                            onOpen={(kind, id) => setOpen({ kind, id })}
                            onCreate={setCreating}
                            canAdd={canAdd}
                        />
                    ) : (
                        <div className="card">
                            <EmptyState title="Work tracking is turned off" description="Enable the backlog or issues module in project settings to track work here." />
                        </div>
                    )}
                </div>

                <div className="stack">
                    {(project.is_backlog_activated || (project.milestones || []).length > 0) && (
                        <SprintsCard projectId={project.id} fallback={project.milestones} />
                    )}
                    {project.is_issues_activated && (
                        <IssuesBreakdownCard projectId={project.id} stats={issuesStatsQ.data} loading={issuesStatsQ.loading} error={issuesStatsQ.error} />
                    )}
                    <TeamWorkloadCard project={project} memberStats={memberStatsQ.data} openItems={openItems} loading={openQ.loading} />
                    <section className="card" aria-labelledby="ov-activity-title">
                        <div className="card-header">
                            <h2 className="card-title" id="ov-activity-title">Recent activity</h2>
                            <Link to={`/project/${project.id}/activity`} className="ov-card-link">View all <FaArrowRight size={10} /></Link>
                        </div>
                        {timelineQ.loading && <SkeletonRows rows={5} />}
                        {timelineQ.error && !timelineQ.data && <div className="alert alert-error">Could not load activity.</div>}
                        {!timelineQ.loading && activity.length === 0 && !timelineQ.error && <p className="text-sm text-muted">No activity yet.</p>}
                        {activity.length > 0 && (
                            <div className="timeline ov-feed">
                                {activity.map((ev) => <ActivityItem key={ev.id} ev={ev} showDetails={false} />)}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {open?.kind === 'userstories' && (
                <UserStoryDetail storyId={open.id} projectId={project.id} onClose={closeDetail} onUpdate={onItemChanged} onDelete={onItemDeleted} />
            )}
            {open?.kind === 'tasks' && (
                <TaskDetail taskId={open.id} projectId={project.id} onClose={closeDetail} onUpdate={onItemChanged} onDelete={onItemDeleted} />
            )}
            {open?.kind === 'issues' && (
                <IssueDetail issueId={open.id} projectId={project.id} onClose={closeDetail} onUpdate={onItemChanged} onDelete={onItemDeleted} />
            )}

            {creating === 'userstories' && <CreateUserStoryModal projectId={project.id} onClose={() => setCreating(null)} onStoryCreated={onCreated} />}
            {creating === 'tasks' && <CreateTaskModal projectId={project.id} onClose={() => setCreating(null)} onTaskCreated={onCreated} />}
            {creating === 'issues' && <CreateIssueModal projectId={project.id} onClose={() => setCreating(null)} onIssueCreated={onCreated} />}

            {people && (
                <PeopleModal
                    title={people === 'fans' ? `People who like ${project.name}` : `People watching ${project.name}`}
                    loader={() => (people === 'fans' ? projectService.getFans(project.id) : projectService.getWatchers(project.id))}
                    members={project.members}
                    onClose={() => setPeople(null)}
                />
            )}
        </>
    );
};

export default ProjectDetail;
