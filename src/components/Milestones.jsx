import React, { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaFlagCheckered, FaPlus, FaCalendarAlt } from 'react-icons/fa';
import { milestoneService } from '../api/services';
import { useProject } from '../context/ProjectContext';
import { usePermissions } from '../context/PermissionContext';
import { PageHeader, Button, Loader, EmptyState, Ring } from './UI';
import MilestoneDetail from './MilestoneDetail';
import SprintFormModal from './planning/SprintFormModal';
import { ALL, useRemote, sumDict, fmtPoints, dateRange, sprintState, pickCurrentSprint } from './planning/utils';
import { percent } from '../utils/format';
import '../styles/planning.css';

/* One sprint in the left-hand list; loads its own stats for the ring and task count. */
const SprintListItem = ({ sprint, active, onSelect, refreshKey }) => {
    const fetchStats = useCallback(() => milestoneService.getStats(sprint.id).then((r) => ({ ...r.data, refreshKey })), [sprint.id, refreshKey]);
    const { data: stats } = useRemote(fetchStats);
    const total = stats ? sumDict(stats.total_points) : sumDict(sprint.total_points);
    const done = stats ? sumDict(stats.completed_points) : sumDict(sprint.closed_points);
    const progress = total > 0 ? percent(done, total) : percent(stats?.completed_tasks, stats?.total_tasks);
    const state = sprintState(sprint);
    return (
        <button
            type="button"
            className={`pl-sl-item ${active ? 'is-active' : ''}`}
            onClick={() => onSelect(sprint.id)}
            aria-current={active ? 'true' : undefined}
        >
            <Ring value={progress} size={44} tone={sprint.closed ? 'neutral' : 'success'} label={`${progress}%`} />
            <span className="pl-sl-main">
                <span className="pl-sl-name">{sprint.name}</span>
                <span className="pl-sl-dates"><FaCalendarAlt size={9} /> {dateRange(sprint.estimated_start, sprint.estimated_finish)}</span>
                <span className="pl-sl-meta">
                    <span>{fmtPoints(done)}/{fmtPoints(total)} pts</span>
                    <span>{stats ? `${stats.completed_tasks}/${stats.total_tasks} tasks` : `${(sprint.user_stories || []).length} stories`}</span>
                </span>
            </span>
            <span className={`badge tone-${state.tone} pl-tone-badge pl-sl-badge`}>{state.label}</span>
        </button>
    );
};

/*
 * Milestones — sprint list (open / closed) + the selected sprint's detail and taskboard.
 *   <Milestones projectId={id} header />   (`header` renders the page header with actions)
 */
const Milestones = ({ projectId: projectIdProp, header = false }) => {
    const { projectId: ctxProjectId, project, reload } = useProject();
    const projectId = projectIdProp || ctxProjectId;
    const { canAdd } = usePermissions();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState('open');
    const [form, setForm] = useState(null); // { sprint? }
    const [statsKey, setStatsKey] = useState(0);

    const fetchList = useCallback(
        () => milestoneService.list({ project: projectId, closed: tab === 'closed', ...ALL }).then((r) => r.data),
        [projectId, tab],
    );
    const list = useRemote(fetchList);
    const sprints = list.data || [];

    const paramId = searchParams.get('sprint');
    const selectedId = paramId && (sprints.some((s) => String(s.id) === paramId) || !list.data) ? paramId : (pickCurrentSprint(sprints)?.id ?? null);

    const select = (id) => {
        const next = new URLSearchParams(searchParams);
        if (id) next.set('sprint', id); else next.delete('sprint');
        setSearchParams(next, { replace: true });
    };

    const afterChange = () => {
        list.refresh();
        setStatsKey((k) => k + 1);
        reload();
    };

    const openCount = (project?.milestones || []).filter((m) => !m.closed).length;
    const closedCount = project?.total_closed_milestones ?? (project?.milestones || []).filter((m) => m.closed).length;
    const lastFinish = (project?.milestones || []).length
        ? sprints.reduce((acc, m) => (m.estimated_finish && m.estimated_finish > acc ? m.estimated_finish : acc), '')
        : '';

    const newSprintBtn = canAdd('milestone') && (
        <Button icon={<FaPlus />} onClick={() => setForm({})}>New sprint</Button>
    );

    return (
        <div className="pl-page">
            {header && (
                <PageHeader
                    icon={<FaFlagCheckered />}
                    title="Sprints"
                    subtitle="Track sprint progress, burndown and the taskboard."
                    actions={newSprintBtn}
                />
            )}
            <div className="pl-sprints-layout">
                <aside className="pl-sl card flush" aria-label="Sprint list">
                    <div className="pl-sl-head">
                        <div className="segmented" role="tablist" aria-label="Sprint state">
                            <button type="button" role="tab" aria-selected={tab === 'open'} className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>
                                Open <span className="pl-seg-count">{openCount}</span>
                            </button>
                            <button type="button" role="tab" aria-selected={tab === 'closed'} className={tab === 'closed' ? 'active' : ''} onClick={() => setTab('closed')}>
                                Closed <span className="pl-seg-count">{closedCount}</span>
                            </button>
                        </div>
                        {!header && canAdd('milestone') && <Button size="sm" variant="secondary" icon={<FaPlus />} onClick={() => setForm({})} aria-label="New sprint" />}
                    </div>
                    <div className="pl-sl-list">
                        {list.loading && !list.data && <Loader label="" />}
                        {list.error && !list.data && <div className="alert alert-error m-3">Could not load sprints.</div>}
                        {list.data && sprints.length === 0 && (
                            <p className="pl-sl-empty">{tab === 'open' ? 'No open sprints.' : 'No closed sprints yet.'}</p>
                        )}
                        {sprints.map((s) => (
                            <SprintListItem key={s.id} sprint={s} active={String(s.id) === String(selectedId)} onSelect={select} refreshKey={statsKey} />
                        ))}
                    </div>
                </aside>

                <div className="pl-sd">
                    {selectedId ? (
                        <MilestoneDetail
                            key={selectedId}
                            projectId={projectId}
                            sprintId={selectedId}
                            refreshKey={statsKey}
                            onEdit={(sprint) => setForm({ sprint })}
                            onChanged={afterChange}
                            onDeleted={(gone) => { list.setData((d) => (d || []).filter((m) => m.id !== gone?.id)); select(null); afterChange(); }}
                        />
                    ) : list.data ? (
                        <div className="card">
                            <EmptyState
                                icon={<FaFlagCheckered />}
                                title={tab === 'open' ? 'No sprint in progress' : 'No closed sprints'}
                                description="Sprints are time-boxed iterations. Create one, then plan stories into it from the backlog."
                                action={canAdd('milestone') && <Button icon={<FaPlus />} onClick={() => setForm({})}>New sprint</Button>}
                            />
                        </div>
                    ) : <Loader />}
                </div>
            </div>

            {form && (
                <SprintFormModal
                    projectId={projectId}
                    sprint={form.sprint}
                    lastFinish={lastFinish}
                    sprintCount={(project?.milestones || []).length}
                    onClose={() => setForm(null)}
                    onSaved={(saved) => {
                        afterChange();
                        if (!form.sprint && saved?.id) { setTab('open'); select(saved.id); }
                    }}
                />
            )}
        </div>
    );
};

export default Milestones;
