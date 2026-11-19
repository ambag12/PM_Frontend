import React from 'react';
import { FaBan, FaTasks } from 'react-icons/fa';
import { TagList } from '../UI';
import { AvatarStack, PointsBadge } from './Bits';

/*
 * KanbanCard — a user story on the Kanban board.
 *   zoom: 'compact' | 'detailed'
 */
const KanbanCard = ({ story, zoom, points, assignees, tagsColors, hint, dragging, canEdit, onOpen, onKeyDown, dragProps }) => {
    const epic = story.epics?.[0];
    const tasks = story.tasks || [];
    const doneTasks = tasks.filter((t) => t.is_closed).length;
    const compact = zoom === 'compact';

    return (
        <article
            data-kcard={story.id}
            tabIndex={0}
            className={[
                'pl-kcard',
                compact ? 'is-compact' : '',
                story.is_blocked ? 'is-blocked' : '',
                dragging ? 'is-dragging' : '',
                hint ? `drop-${hint}` : '',
                epic ? 'has-epic' : '',
            ].join(' ')}
            style={epic ? { '--epic': epic.color } : undefined}
            draggable={canEdit}
            onClick={onOpen}
            onKeyDown={onKeyDown}
            aria-label={`#${story.ref} ${story.subject}${story.is_blocked ? ', blocked' : ''}`}
            {...dragProps}
        >
            <div className="pl-kcard-top">
                <span className="ref">#{story.ref}</span>
                {story.is_blocked && <span className="pl-kcard-blocked" title={story.blocked_note || 'Blocked'}><FaBan size={10} /> Blocked</span>}
                {epic && !compact && <span className="pl-kcard-epic" title={`Epic #${epic.ref}`}>{epic.subject}</span>}
                <span className="pl-kcard-spacer" />
                {(points !== null || !compact) && <PointsBadge value={points} />}
            </div>
            <div className="pl-kcard-title">{story.subject}</div>
            {!compact && story.tags?.length > 0 && <div className="pl-kcard-tags"><TagList tags={story.tags} tagsColors={tagsColors} max={3} /></div>}
            {((!compact && tasks.length > 0) || assignees.length > 0) && (
                <div className="pl-kcard-foot">
                    {!compact && tasks.length > 0 ? (
                        <span className="pl-kcard-tasks" title={`${doneTasks} of ${tasks.length} tasks closed`}>
                            <FaTasks size={10} />
                            <span className="tabular">{doneTasks}/{tasks.length}</span>
                            <span className="pl-kcard-taskbar"><span style={{ width: `${(doneTasks / tasks.length) * 100}%` }} /></span>
                        </span>
                    ) : <span />}
                    <AvatarStack users={assignees} max={compact ? 2 : 3} />
                </div>
            )}
        </article>
    );
};

export default KanbanCard;
