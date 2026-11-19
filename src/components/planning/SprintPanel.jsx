import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronRight, FaCalendarAlt, FaArrowLeft, FaColumns } from 'react-icons/fa';
import { milestoneService } from '../../api/services';
import { StatusPill } from '../UI';
import { PointsBadge } from './Bits';
import { percent } from '../../utils/format';
import { useRemote, storyPoints, sumPoints, sumDict, fmtPoints, dateRange, sprintState, dropPosition } from './utils';

/*
 * SprintPanel — one sprint in the backlog's planning column. A drop target for stories.
 *   dnd: { dragging: [ids], hint, startDrag, overRow, overContainer, drop, endDrag }
 */
const SprintPanel = ({ projectId, sprint, points, refreshKey, defaultOpen = true, canEdit, dnd, onOpenStory, onMoveToBacklog }) => {
    const [open, setOpen] = useState(defaultOpen);
    const stories = [...(sprint.user_stories || [])].sort((a, b) => (a.sprint_order ?? 0) - (b.sprint_order ?? 0));
    // refreshKey re-requests the stats after stories move in or out
    const fetchStats = useCallback(
        () => milestoneService.getStats(sprint.id).then((r) => ({ ...r.data, refreshKey })),
        [sprint.id, refreshKey],
    );
    const { data: stats } = useRemote(fetchStats);

    const totalPts = stats ? sumDict(stats.total_points) : sumPoints(stories, points);
    const donePts = stats ? sumDict(stats.completed_points) : sumPoints(stories.filter((s) => s.is_closed), points);
    const progress = totalPts > 0
        ? percent(donePts, totalPts)
        : percent(stats?.completed_userstories ?? stories.filter((s) => s.is_closed).length, stats?.total_userstories ?? stories.length);
    const state = sprintState(sprint);
    const container = sprint.id;
    const isTarget = dnd.hint?.container === container;

    return (
        <section
            className={`pl-sprint card flush ${isTarget ? 'is-drop-target' : ''} ${sprint.closed ? 'is-closed' : ''}`}
            onDragOver={canEdit ? (e) => dnd.overContainer(e, container) : undefined}
            onDragLeave={canEdit ? (e) => dnd.leave(e, container) : undefined}
            onDrop={canEdit ? (e) => dnd.drop(e, container, stories) : undefined}
            aria-label={`Sprint ${sprint.name}`}
        >
            <header className="pl-sprint-head">
                <button type="button" className="pl-sprint-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                    {open ? <FaChevronDown size={11} /> : <FaChevronRight size={11} />}
                    <span className="pl-sprint-name">{sprint.name}</span>
                </button>
                <span className={`badge tone-${state.tone} pl-tone-badge`}>{state.label}</span>
            </header>
            <div className="pl-sprint-meta">
                <span className="row gap-1"><FaCalendarAlt size={10} /> {dateRange(sprint.estimated_start, sprint.estimated_finish)}</span>
                <span>{stories.length} {stories.length === 1 ? 'story' : 'stories'}</span>
                <span><b>{fmtPoints(donePts)}</b> / {fmtPoints(totalPts)} pts</span>
            </div>
            <div className="pl-sprint-progress">
                <div className="progress progress-sm tone-success" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${sprint.name} progress`}>
                    <div className="progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs text-secondary tabular">{progress}%</span>
                <Link to={`/project/${projectId}/milestones?sprint=${sprint.id}`} className="btn btn-ghost btn-sm pl-taskboard-link" title="Open taskboard">
                    <FaColumns size={11} /> Taskboard
                </Link>
            </div>
            {open && (
                <ul className="pl-sprint-stories" aria-label={`Stories in ${sprint.name}`}>
                    {stories.length === 0 && (
                        <li className={`pl-sprint-empty ${isTarget && !dnd.hint?.id ? 'is-hint' : ''}`}>
                            {canEdit ? 'Drag stories here to plan them into this sprint' : 'No stories planned'}
                        </li>
                    )}
                    {stories.map((s) => {
                        const hint = isTarget && dnd.hint?.id === s.id ? dnd.hint.pos : null;
                        return (
                            <li
                                key={s.id}
                                data-story-id={s.id}
                                className={`pl-mini-story ${dnd.dragging.includes(s.id) ? 'is-dragging' : ''} ${hint ? `drop-${hint}` : ''} ${s.is_closed ? 'is-closed' : ''}`}
                                draggable={canEdit}
                                onDragStart={(e) => dnd.startDrag(e, s, container)}
                                onDragEnd={dnd.endDrag}
                                onDragOver={(e) => dnd.overRow(e, container, s.id, dropPosition(e))}
                            >
                                <button type="button" className="pl-mini-story-main" onClick={() => onOpenStory(s)}>
                                    <span className="ref">#{s.ref}</span>
                                    <span className="pl-mini-story-subject">{s.subject}</span>
                                </button>
                                <StatusPill status={s.status_extra_info} className="pl-pill-sm" />
                                <PointsBadge value={storyPoints(s, points)} />
                                {canEdit && !sprint.closed && (
                                    <button type="button" className="btn btn-ghost btn-sm btn-icon pl-row-action" onClick={() => onMoveToBacklog(s)} title="Move back to backlog" aria-label={`Move #${s.ref} back to backlog`}>
                                        <FaArrowLeft size={11} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
};

export default SprintPanel;
