import React, { useState } from 'react';
import { FaTags } from 'react-icons/fa';
import {
    epicStatusService, usStatusService, pointsService, taskStatusService, issueStatusService,
    issueTypeService, priorityService, severityService, swimlaneService,
    usDueDateService, taskDueDateService, issueDueDateService,
} from '../../api/services';
import { SettingsSection } from './shared';
import ValueList from './ValueList';

const CLOSED = { key: 'is_closed', label: 'Closed' };

const KINDS = [
    { id: 'epic_statuses', label: 'Epic statuses', short: 'Epic statuses', singular: 'status', noun: 'epics', service: epicStatusService, color: true, flags: [CLOSED], moveTo: 'required' },
    { id: 'us_statuses', label: 'User story statuses', short: 'Story statuses', singular: 'status', noun: 'user stories', service: usStatusService, color: true, wip: true, flags: [CLOSED, { key: 'is_archived', label: 'Archived' }], moveTo: 'required' },
    { id: 'points', label: 'Points', short: 'Points', singular: 'point', noun: 'estimates', service: pointsService, value: true, moveTo: 'required' },
    { id: 'task_statuses', label: 'Task statuses', short: 'Task statuses', singular: 'status', noun: 'tasks', service: taskStatusService, color: true, flags: [CLOSED], moveTo: 'required' },
    { id: 'issue_statuses', label: 'Issue statuses', short: 'Issue statuses', singular: 'status', noun: 'issues', service: issueStatusService, color: true, flags: [CLOSED], moveTo: 'required' },
    { id: 'issue_types', label: 'Issue types', short: 'Types', singular: 'type', noun: 'issues', service: issueTypeService, color: true, moveTo: 'required' },
    { id: 'priorities', label: 'Priorities', short: 'Priorities', singular: 'priority', noun: 'issues', service: priorityService, color: true, moveTo: 'required' },
    { id: 'severities', label: 'Severities', short: 'Severities', singular: 'severity', noun: 'issues', service: severityService, color: true, moveTo: 'required' },
    { id: 'swimlanes', label: 'Kanban swimlanes', short: 'Swimlanes', singular: 'swimlane', noun: 'user stories', service: swimlaneService, moveTo: 'optional' },
    { id: 'us_duedates', label: 'User story due-date presets', short: 'Story due dates', singular: 'preset', service: usDueDateService, color: true, dueDate: true, moveTo: false, orderBy: 'patch' },
    { id: 'task_duedates', label: 'Task due-date presets', short: 'Task due dates', singular: 'preset', service: taskDueDateService, color: true, dueDate: true, moveTo: false, orderBy: 'patch' },
    { id: 'issue_duedates', label: 'Issue due-date presets', short: 'Issue due dates', singular: 'preset', service: issueDueDateService, color: true, dueDate: true, moveTo: false, orderBy: 'patch' },
];

const AttributesSettings = ({ project, canEdit, onChanged }) => {
    const [active, setActive] = useState(KINDS[1].id);
    const kind = KINDS.find((k) => k.id === active);

    return (
        <SettingsSection
            icon={<FaTags />}
            title="Attributes"
            description="Statuses, estimation points, issue classifications, swimlanes and due-date presets. Deleting a value moves its items to another value."
            flush
        >
            <div className="tabs attr-tabs" role="tablist" aria-label="Attribute lists">
                {KINDS.map((k) => (
                    <button
                        key={k.id}
                        role="tab"
                        aria-selected={active === k.id}
                        className={`tab ${active === k.id ? 'active' : ''}`}
                        onClick={() => setActive(k.id)}
                    >
                        {k.short}
                        {Array.isArray(project[k.id]) && <span className="tab-count">{project[k.id].length}</span>}
                    </button>
                ))}
            </div>
            {kind.id === 'swimlanes' && !project.is_kanban_activated && (
                <div className="alert alert-warning" style={{ margin: '0 1rem 1rem' }}>Swimlanes are used by the Kanban board, which is currently disabled in Modules.</div>
            )}
            <ValueList key={kind.id} kind={kind} projectId={project.id} canEdit={canEdit} onChanged={onChanged} />
        </SettingsSection>
    );
};

export default AttributesSettings;
