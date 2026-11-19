import {
    FaListUl, FaTasks, FaBug, FaLayerGroup, FaFlagCheckered, FaBook, FaProjectDiagram, FaUserPlus, FaLink,
} from 'react-icons/fa';

/*
 * Helpers that turn Taiga timeline entries into readable activity rows.
 * Timeline entry: { id, event_type: "<app>.<model>.<create|change|delete>", data: { user, project, comment,
 *   values_diff, userstory|task|issue|epic|milestone|wikipage|… }, created, project }
 */

export const ACTIVITY_TYPES = [
    { key: 'userstory', label: 'User stories', icon: FaListUl, tone: 'primary' },
    { key: 'task', label: 'Tasks', icon: FaTasks, tone: 'info' },
    { key: 'issue', label: 'Issues', icon: FaBug, tone: 'danger' },
    { key: 'epic', label: 'Epics', icon: FaLayerGroup, tone: 'accent' },
    { key: 'milestone', label: 'Sprints', icon: FaFlagCheckered, tone: 'success' },
    { key: 'wikipage', label: 'Wiki', icon: FaBook, tone: 'neutral' },
    { key: 'project', label: 'Project', icon: FaProjectDiagram, tone: 'neutral' },
];

const TYPE_META = Object.fromEntries(ACTIVITY_TYPES.map((t) => [t.key, t]));
TYPE_META.membership = { key: 'project', label: 'Members', icon: FaUserPlus, tone: 'success' };
TYPE_META.relateduserstory = { key: 'epic', label: 'Epics', icon: FaLink, tone: 'accent' };

const FIELD_LABELS = {
    status: 'status',
    assigned_to: 'assignee',
    assigned_users: 'assignees',
    subject: 'title',
    description_diff: 'description',
    milestone: 'sprint',
    points: 'points',
    tags: 'tags',
    due_date: 'due date',
    is_blocked: 'blocked flag',
    is_iocaine: 'iocaine flag',
    priority: 'priority',
    severity: 'severity',
    type: 'type',
    estimated_start: 'start date',
    estimated_finish: 'finish date',
    name: 'name',
    content_diff: 'content',
    attachments: 'attachments',
    client_requirement: 'client requirement',
    team_requirement: 'team requirement',
    color: 'colour',
};

const fmtValue = (v) => {
    if (v === null || v === undefined || v === '') return 'none';
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'none';
    if (typeof v === 'boolean') return v ? 'yes' : 'no';
    if (typeof v === 'object') return Object.values(v).filter((x) => typeof x !== 'object').join(', ') || 'updated';
    const s = String(v);
    return s.length > 60 ? `${s.slice(0, 57)}…` : s;
};

// List of human-readable change phrases from values_diff
export const describeDiff = (diff = {}) => {
    const out = [];
    Object.entries(diff || {}).forEach(([key, val]) => {
        if (key.endsWith('_html')) return; // rendered copies of description/content
        const label = FIELD_LABELS[key] || key.replace(/_/g, ' ');
        if (key === 'attachments' && val && typeof val === 'object' && !Array.isArray(val)) {
            const n = (val.new || []).length;
            const d = (val.deleted || []).length;
            const c = (val.changed || []).length;
            if (n) out.push(`added ${n} attachment${n > 1 ? 's' : ''}`);
            if (c) out.push(`updated ${c} attachment${c > 1 ? 's' : ''}`);
            if (d) out.push(`removed ${d} attachment${d > 1 ? 's' : ''}`);
            return;
        }
        if (key.endsWith('_diff') || key === 'description' || key === 'content') {
            out.push(`updated the ${label}`);
            return;
        }
        if (Array.isArray(val) && val.length === 2) {
            const [from, to] = val;
            if (from === null || from === undefined || from === '' || (Array.isArray(from) && !from.length)) {
                out.push(`set ${label} to “${fmtValue(to)}”`);
            } else if (to === null || to === undefined || to === '' || (Array.isArray(to) && !to.length)) {
                out.push(`cleared ${label}`);
            } else {
                out.push(`changed ${label} from “${fmtValue(from)}” to “${fmtValue(to)}”`);
            }
            return;
        }
        out.push(`updated ${label}`);
    });
    return out;
};

const itemLink = (model, data, projectId) => {
    if (!projectId) return null;
    const base = `/project/${projectId}`;
    switch (model) {
        case 'userstory': return data.userstory?.ref ? `${base}/backlog?ref=${data.userstory.ref}` : `${base}/backlog`;
        case 'task': return data.task?.ref ? `${base}/backlog?ref=${data.task.ref}` : `${base}/backlog`;
        case 'issue': return data.issue?.ref ? `${base}/issues?ref=${data.issue.ref}` : `${base}/issues`;
        case 'epic':
        case 'relateduserstory': return data.epic?.ref ? `${base}/epics?ref=${data.epic.ref}` : `${base}/epics`;
        case 'milestone': return `${base}/milestones`;
        case 'wikipage': return data.wikipage?.slug ? `${base}/wiki?page=${encodeURIComponent(data.wikipage.slug)}` : `${base}/wiki`;
        case 'membership': return `${base}/members`;
        default: return base;
    }
};

const objectLabel = (model, data) => {
    switch (model) {
        case 'userstory': return data.userstory ? `#${data.userstory.ref} ${data.userstory.subject}` : 'a user story';
        case 'task': return data.task ? `#${data.task.ref} ${data.task.subject}` : 'a task';
        case 'issue': return data.issue ? `#${data.issue.ref} ${data.issue.subject}` : 'an issue';
        case 'epic': return data.epic ? `#${data.epic.ref} ${data.epic.subject}` : 'an epic';
        case 'relateduserstory': return data.userstory ? `#${data.userstory.ref} ${data.userstory.subject}` : 'a user story';
        case 'milestone': return data.milestone?.name || 'a sprint';
        case 'wikipage': return data.wikipage?.slug ? `“${data.wikipage.slug}”` : '';
        case 'project': return data.project?.name || '';
        case 'membership': return data.project?.name || 'the project';
        default: return '';
    }
};

const MODEL_NOUN = {
    userstory: 'user story', task: 'task', issue: 'issue', epic: 'epic', milestone: 'sprint',
    wikipage: 'wiki page', project: 'project',
};

/*
 * describeEvent(entry) → { type, icon, tone, who, user, verb, object, link, details[], comment, created, projectName }
 */
export const describeEvent = (entry) => {
    const data = entry?.data || {};
    const [, model = 'project', action = 'change'] = String(entry?.event_type || '').split('.');
    const meta = TYPE_META[model] || TYPE_META.project;
    const projectId = data.project?.id || entry?.project;
    const who = data.user?.name || data.user?.full_name_display || data.user?.username || 'Someone';
    const comment = (data.comment || '').trim();
    const details = action === 'change' ? describeDiff(data.values_diff) : [];

    const noun = MODEL_NOUN[model] ? `the ${MODEL_NOUN[model]}` : '';
    let verb;
    let object = objectLabel(model, data);
    if (model === 'membership') {
        verb = action === 'create' ? 'joined' : 'updated membership in';
    } else if (model === 'relateduserstory') {
        verb = action === 'delete' ? 'unlinked' : 'linked';
        object = `${objectLabel('relateduserstory', data)} ${action === 'delete' ? 'from' : 'to'} ${data.epic ? `epic #${data.epic.ref} ${data.epic.subject}` : 'an epic'}`;
    } else if (action === 'create') {
        verb = `created ${noun}`.trim();
    } else if (action === 'delete') {
        verb = `deleted ${noun}`.trim();
    } else if (comment && !details.length) {
        verb = `commented on ${noun}`.trim();
    } else {
        verb = `updated ${noun}`.trim();
    }

    // Tasks created from a story: show the parent story
    const parent = model === 'task' && data.task?.userstory ? `in #${data.task.userstory.ref} ${data.task.userstory.subject}` : null;

    return {
        id: entry?.id,
        type: meta.key,
        icon: meta.icon,
        tone: action === 'delete' ? 'danger' : meta.tone,
        who,
        user: data.user,
        verb,
        object,
        parent,
        link: action === 'delete' ? null : itemLink(model, data, projectId),
        details,
        comment,
        created: entry?.created,
        projectName: data.project?.name,
        projectId,
    };
};
