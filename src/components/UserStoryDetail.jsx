import React from 'react';
import WorkItemDrawer from './work/WorkItemDrawer';
import StoryTasks from './work/StoryTasks';
import StoryEpics from './work/StoryEpics';
import { AssignedUsersField, PointsField, ToggleField } from './work/SideFields';

/*
 * User story detail drawer.
 *   <UserStoryDetail storyId={id} projectId={pid} onClose onUpdate={(story) => …} onDelete={(id) => …} />
 */
const UserStoryDetail = ({ storyId, projectId, onClose, onUpdate, onDelete }) => (
    <WorkItemDrawer
        type="userstory"
        id={storyId}
        projectId={projectId}
        onClose={onClose}
        onUpdate={onUpdate}
        onDelete={onDelete}
        renderBadges={({ item }) => (
            <>
                {item.total_points !== null && item.total_points !== undefined && (
                    <span className="badge badge-primary" title="Total story points">{item.total_points} pts</span>
                )}
                {item.milestone_name && <span className="badge badge-outline" title="Sprint">{item.milestone_name}</span>}
            </>
        )}
        renderMain={({ item, project, projectId: pid, canModify, can, reload }) => (
            <>
                {project.is_epics_activated !== false && (
                    <StoryEpics story={item} projectId={pid} canModify={canModify} onChanged={reload} />
                )}
                <StoryTasks story={item} project={project} projectId={pid} canModify={can('modify_task')} canAdd={can('add_task')} />
            </>
        )}
        renderSideTop={({ item, project, save, canModify }) => (
            <>
                <AssignedUsersField
                    value={item.assigned_users}
                    members={project.members}
                    disabled={!canModify}
                    onChange={(ids) => save({
                        assigned_users: ids,
                        // keep the main assignee inside the assigned users list
                        ...(ids.length && !ids.map(String).includes(String(item.assigned_to)) ? { assigned_to: ids[0] } : {}),
                        ...(!ids.length ? { assigned_to: null } : {}),
                    })}
                />
                <PointsField item={item} project={project} disabled={!canModify} onChange={(patch) => save(patch)} />
            </>
        )}
        renderSideBottom={({ item, save, canModify }) => (
            <div className="stack-sm">
                <ToggleField label="Client requirement" checked={item.client_requirement} disabled={!canModify} onChange={(v) => save({ client_requirement: v })} />
                <ToggleField label="Team requirement" checked={item.team_requirement} disabled={!canModify} onChange={(v) => save({ team_requirement: v })} />
            </div>
        )}
    />
);

export default UserStoryDetail;
