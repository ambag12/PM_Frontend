import { epicService, issueService, taskService, userStoryService } from '../../api/services';

/*
 * Per-type configuration shared by the work-item drawers and widgets.
 *   service     — the services.js wrapper (crud + social + attachments + customAttributes)
 *   history     — the history/<type> key for comments + activity
 *   perm        — permission suffix (modify_us, comment_task, …)
 *   statusesKey / attrsKey / dueDatesKey — lists inside the project detail payload
 *   link        — deep link handled by the owning page (?ref=N)
 */
export const WORK_TYPES = {
    userstory: {
        key: 'userstory',
        label: 'User story',
        service: userStoryService,
        history: 'userstory',
        perm: { modify: 'modify_us', delete: 'delete_us', comment: 'comment_us' },
        statusesKey: 'us_statuses',
        attrsKey: 'userstory_custom_attributes',
        dueDatesKey: 'us_duedates',
        hasDueDate: true,
        hasSprint: true,
        link: (projectId, ref) => `/project/${projectId}/backlog?ref=${ref}`,
    },
    task: {
        key: 'task',
        label: 'Task',
        service: taskService,
        history: 'task',
        perm: { modify: 'modify_task', delete: 'delete_task', comment: 'comment_task' },
        statusesKey: 'task_statuses',
        attrsKey: 'task_custom_attributes',
        dueDatesKey: 'task_duedates',
        hasDueDate: true,
        hasSprint: true,
        link: (projectId, ref) => `/project/${projectId}/backlog?ref=${ref}`,
    },
    issue: {
        key: 'issue',
        label: 'Issue',
        service: issueService,
        history: 'issue',
        perm: { modify: 'modify_issue', delete: 'delete_issue', comment: 'comment_issue' },
        statusesKey: 'issue_statuses',
        attrsKey: 'issue_custom_attributes',
        dueDatesKey: 'issue_duedates',
        hasDueDate: true,
        hasSprint: true,
        link: (projectId, ref) => `/project/${projectId}/issues?ref=${ref}`,
    },
    epic: {
        key: 'epic',
        label: 'Epic',
        service: epicService,
        history: 'epic',
        perm: { modify: 'modify_epic', delete: 'delete_epic', comment: 'comment_epic' },
        statusesKey: 'epic_statuses',
        attrsKey: 'epic_custom_attributes',
        dueDatesKey: null,
        hasDueDate: false,
        hasSprint: false,
        link: (projectId, ref) => `/project/${projectId}/epics?ref=${ref}`,
    },
};

// the API returns 400 { version: "The version doesn't match with the current one" } on stale writes.
export const isVersionConflict = (err) => {
    const data = err?.response?.data;
    if (err?.response?.status !== 400 || !data) return false;
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    return /version/i.test(text);
};

export const DUE_STATUS = {
    not_set: { label: 'No due date', tone: 'neutral' },
    set: { label: 'On track', tone: 'success' },
    due_soon: { label: 'Due soon', tone: 'warning' },
    past_due: { label: 'Past due', tone: 'danger' },
    no_longer_applicable: { label: 'Closed', tone: 'neutral' },
};

export const EPIC_COLORS = ['#1D8C7D', '#0E7490', '#2867C9', '#7A5AC4', '#B5487A', '#D9455F', '#E0900F', '#6B8E23', '#4D5B62'];

export const randomEpicColor = () => EPIC_COLORS[Math.floor(Math.random() * EPIC_COLORS.length)];

export const memberOptions = (members) => (members || [])
    .filter((m) => m.is_active !== false)
    .map((m) => ({ value: m.id, label: m.full_name_display || m.username }));

export const statusOptions = (statuses) => [...(statuses || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({ value: s.id, label: s.name, color: s.color }));
