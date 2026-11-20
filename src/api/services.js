import client from './client';

// Small helpers ------------------------------------------------------------
const crud = (base) => ({
    list: (params) => client.get(base, { params }),
    get: (id) => client.get(`${base}/${id}`),
    create: (data) => client.post(base, data),
    update: (id, data) => client.patch(`${base}/${id}`, data),
    delete: (id, params) => client.delete(`${base}/${id}`, { params }),
});

// the API "project values" (statuses, points, priorities…) all share this shape.
const projectValues = (base) => ({
    ...crud(base),
    bulkUpdateOrder: (projectId, orderPairs) =>
        client.post(`${base}/bulk_update_order`, { project: projectId, [`bulk_${base.replace(/-/g, '_')}`]: orderPairs }), // orderPairs: [[id, order], …]
    // Deleting a value requires moving its items to another value.
    deleteMoveTo: (id, moveTo) => client.delete(`${base}/${id}`, { params: moveTo ? { moveTo } : {} }),
});

// Attachments live under "<resource>/attachments" for epics, userstories, tasks, issues and wiki.
const attachments = (resource) => ({
    list: (projectId, objectId) => client.get(`${resource}/attachments`, { params: { project: projectId, object_id: objectId } }),
    get: (id) => client.get(`${resource}/attachments/${id}`),
    upload: (projectId, objectId, file, description = '') => {
        const fd = new FormData();
        fd.append('project', projectId);
        fd.append('object_id', objectId);
        fd.append('attached_file', file);
        if (description) fd.append('description', description);
        return client.post(`${resource}/attachments`, fd);
    },
    update: (id, data) => client.patch(`${resource}/attachments/${id}`, data),
    delete: (id) => client.delete(`${resource}/attachments/${id}`),
});

// Custom attribute definitions + per-item values.
const customAttributes = (defsBase, valuesBase) => ({
    list: (projectId) => client.get(defsBase, { params: { project: projectId } }),
    create: (data) => client.post(defsBase, data),
    update: (id, data) => client.patch(`${defsBase}/${id}`, data),
    delete: (id) => client.delete(`${defsBase}/${id}`),
    bulkUpdateOrder: (projectId, orderPairs) =>
        client.post(`${defsBase}/bulk_update_order`, { project: projectId, [`bulk_${defsBase.replace(/-/g, '_')}`]: orderPairs }),
    getValues: (objectId) => client.get(`${valuesBase}/${objectId}`),
    // data: { attributes_values: { [attrId]: value }, version }
    updateValues: (objectId, data) => client.patch(`${valuesBase}/${objectId}`, data),
});

// Voting + watching + comments shared by epics, userstories, tasks, issues.
const social = (base) => ({
    upvote: (id) => client.post(`${base}/${id}/upvote`),
    downvote: (id) => client.post(`${base}/${id}/downvote`),
    getVoters: (id) => client.get(`${base}/${id}/voters`),
    watch: (id) => client.post(`${base}/${id}/watch`),
    unwatch: (id) => client.post(`${base}/${id}/unwatch`),
    getWatchers: (id) => client.get(`${base}/${id}/watchers`),
    // the API adds comments by PATCHing the item with { comment, version }.
    addComment: (id, comment, version) => client.patch(`${base}/${id}`, { comment, version }),
});

// ============================================
// AUTH
// ============================================
export const authService = {
    login: (username, password) => client.post('auth', { type: 'normal', username, password }),
    register: (userData) => client.post('auth/register', { type: 'public', accepted_terms: true, ...userData }),
    refreshToken: (refresh) => client.post('auth/refresh', { refresh }),
};

// ============================================
// USERS
// ============================================
export const userService = {
    list: (params) => client.get('users', { params }),
    get: (id) => client.get(`users/${id}`),
    getMe: () => client.get('users/me'),
    update: (id, data) => client.patch(`users/${id}`, data),
    getStats: (id) => client.get(`users/${id}/stats`),
    getContacts: (id) => client.get(`users/${id}/contacts`),
    getLiked: (id, params) => client.get(`users/${id}/liked`, { params }),
    getVoted: (id, params) => client.get(`users/${id}/voted`, { params }),
    getWatched: (id, params) => client.get(`users/${id}/watched`, { params }),
    changePassword: (currentPassword, password) => client.post('users/change_password', { current_password: currentPassword, password }),
    changeAvatar: (file) => {
        const fd = new FormData();
        fd.append('avatar', file);
        return client.post('users/change_avatar', fd);
    },
    removeAvatar: () => client.post('users/remove_avatar'),
    sendVerificationEmail: () => client.post('users/send_verification_email'),
    passwordRecovery: (username) => client.post('users/password_recovery', { username }),
    changeEmail: (emailToken) => client.post('users/change_email', { email_token: emailToken }),
    cancelAccount: (cancelToken) => client.post('users/cancel', { cancel_token: cancelToken }),
};

// ============================================
// PROJECTS (incl. custom endpoints: due date, PC1, tenders, HR, remarks)
// ============================================
export const projectService = {
    list: (params) => client.get('projects', { params }),
    listForUser: () => client.get('projects/list_project_for_user'),
    get: (id) => client.get(`projects/${id}`),
    getBySlug: (slug) => client.get('projects/by_slug', { params: { slug } }),
    create: (data) => client.post('projects', data),
    update: (id, data) => client.patch(`projects/${id}`, data),
    delete: (id) => client.delete(`projects/${id}`),
    bulkUpdateOrder: (orderPairs) => client.post('projects/bulk_update_order', orderPairs),

    // Stats
    getStats: (id) => client.get(`projects/${id}/stats`),
    getMemberStats: (id) => client.get(`projects/${id}/member_stats`),
    getIssuesStats: (id) => client.get(`projects/${id}/issues_stats`),

    // Modules (integrations config) & feature toggles live on the project itself
    getModules: (id) => client.get(`projects/${id}/modules`, { params: { project: id } }), // GET also needs ?project (admin check)
    updateModules: (id, data) => client.patch(`projects/${id}/modules`, data),

    // Tags
    getTagsColors: (id) => client.get(`projects/${id}/tags_colors`),
    createTag: (id, tag, color) => client.post(`projects/${id}/create_tag`, { tag, color }),
    editTag: (id, fromTag, toTag, color) => client.post(`projects/${id}/edit_tag`, { from_tag: fromTag, to_tag: toTag, color }),
    deleteTag: (id, tag) => client.post(`projects/${id}/delete_tag`, { tag }),
    mixTags: (id, fromTags, toTag) => client.post(`projects/${id}/mix_tags`, { from_tags: fromTags, to_tag: toTag }),

    // Logo
    changeLogo: (id, file) => {
        const fd = new FormData();
        fd.append('logo', file);
        return client.post(`projects/${id}/change_logo`, fd);
    },
    removeLogo: (id) => client.post(`projects/${id}/remove_logo`),

    // Social
    like: (id) => client.post(`projects/${id}/like`),
    unlike: (id) => client.post(`projects/${id}/unlike`),
    getFans: (id) => client.get(`projects/${id}/fans`),
    watch: (id, notifyLevel) => client.post(`projects/${id}/watch`, notifyLevel ? { notify_level: notifyLevel } : {}),
    unwatch: (id) => client.post(`projects/${id}/unwatch`),
    getWatchers: (id) => client.get(`projects/${id}/watchers`),

    // Membership lifecycle
    leave: (id) => client.post(`projects/${id}/leave`),
    duplicate: (id, data) => client.post(`projects/${id}/duplicate`, data), // { name, description, is_private, users: [{id}] }
    createTemplate: (id, data) => client.post(`projects/${id}/create_template`, data), // superuser only

    // Transfer ownership
    transferValidateToken: (id, token) => client.post(`projects/${id}/transfer_validate_token`, { token }),
    transferRequest: (id) => client.post(`projects/${id}/transfer_request`),
    transferStart: (id, userId) => client.post(`projects/${id}/transfer_start`, { user: userId }),
    transferAccept: (id, token, reason = '') => client.post(`projects/${id}/transfer_accept`, { token, reason }),
    transferReject: (id, token, reason = '') => client.post(`projects/${id}/transfer_reject`, { token, reason }),

    // CSV export links (admin)
    regenerateCsvUuid: (id, kind) => client.post(`projects/${id}/regenerate_${kind}_csv_uuid`), // kind: epics|userstories|tasks|issues
    deleteCsvUuid: (id, kind) => client.post(`projects/${id}/delete_${kind}_csv_uuid`),

    // ---- Custom endpoints added in this fork ----
    // Due date: "YYYY-MM-DD"
    changeDueDate: (id, dueDate) => client.patch(`projects/${id}/change_due_date`, { due_date: dueDate }),
    // PC-1 document upload (stored on Cloudinary, URL saved to project.pc1_url)
    uploadPc1: (projectId, file) => {
        const fd = new FormData();
        fd.append('project_id', projectId);
        fd.append('pc1', file);
        return client.post('projects/upload_pc1', fd);
    },
};

// ============================================
// TENDERS (custom)
// ============================================
export const TENDER_STATUSES = [
    { value: 'not_started', label: 'Not Started', tone: 'neutral' },
    { value: 'pending', label: 'Pending', tone: 'warning' },
    { value: 'in_progress', label: 'In Progress', tone: 'info' },
    { value: 'on_hold', label: 'On Hold', tone: 'danger' },
    { value: 'completed', label: 'Completed', tone: 'success' },
];

export const tenderService = {
    // Backend only returns tenders when a project (or tender_id) is given, except for superusers.
    list: (projectId) => client.get('projects/get_tenders', { params: projectId ? { project: projectId } : {} }),
    get: (tenderId) => client.get('projects/get_tenders', { params: { tender_id: tenderId } }),
    // data: { project, name_of_tenders, status, tech_opeining, financial_opening }
    create: (data) => client.post('projects/create_tenders', data),
    update: (tenderId, data) => client.patch('projects/update_tenders', { tender_id: tenderId, ...data }),
};

// ============================================
// HR (custom)
// ============================================
export const hrService = {
    list: (projectId) => client.get('projects/get_hr_func', { params: projectId ? { project: projectId } : {} }),
    get: (hrId) => client.get('projects/get_hr_func', { params: { hr_id: hrId } }),
    // fields: project, hr_name, filename, position, ppps, no_of_posts, filled, vacancy, created_date, finish_date; file optional
    create: (fields, file) => {
        const fd = new FormData();
        Object.entries(fields).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') fd.append(k, v);
        });
        if (file) fd.append('file', file);
        return client.post('projects/post_hr_func', fd);
    },
};

// ============================================
// REMARKS (custom) — attach to an HR record or a tender
// ============================================
export const remarkService = {
    // data: { project, remarks, hr?, tenders?, user_member? (membership id) }
    create: (data) => client.post('projects/create_remarks', data),
};

// ============================================
// PROJECT TEMPLATES
// ============================================
export const projectTemplateService = crud('project-templates');

// ============================================
// MEMBERSHIPS & INVITATIONS
// ============================================
export const membershipService = {
    ...crud('memberships'),
    // data: { project_id, bulk_memberships: [{ role_id, username }], invitation_extra_text }
    bulkCreate: (data) => client.post('memberships/bulk_create', data),
    resendInvitation: (id) => client.post(`memberships/${id}/resend_invitation`),
    getInvitation: (token) => client.get(`invitations/${token}`),
};

// ============================================
// ROLES
// ============================================
export const roleService = {
    ...crud('roles'),
    deleteMoveTo: (id, moveTo) => client.delete(`roles/${id}`, { params: moveTo ? { moveTo } : {} }),
};

// ============================================
// EPICS
// ============================================
export const epicService = {
    ...crud('epics'),
    ...social('epics'),
    getByRef: (projectId, ref) => client.get('epics/by_ref', { params: { project: projectId, ref } }),
    bulkCreate: (projectId, bulkEpics, statusId) => client.post('epics/bulk_create', { project_id: projectId, status_id: statusId, bulk_epics: bulkEpics }),
    getFiltersData: (projectId, params = {}) => client.get('epics/filters_data', { params: { ...params, project: projectId } }),
    // Related user stories
    listRelated: (epicId) => client.get(`epics/${epicId}/related_userstories`),
    addRelated: (epicId, userStoryId) => client.post(`epics/${epicId}/related_userstories`, { epic: epicId, user_story: userStoryId }),
    updateRelated: (epicId, userStoryId, data) => client.patch(`epics/${epicId}/related_userstories/${userStoryId}`, data),
    removeRelated: (epicId, userStoryId) => client.delete(`epics/${epicId}/related_userstories/${userStoryId}`),
    bulkCreateRelated: (epicId, projectId, bulkUserstories) =>
        client.post(`epics/${epicId}/related_userstories/bulk_create`, { project_id: projectId, bulk_userstories: bulkUserstories }),
    attachments: attachments('epics'),
    customAttributes: customAttributes('epic-custom-attributes', 'epics/custom-attributes-values'),
};

// ============================================
// USER STORIES
// ============================================
export const userStoryService = {
    ...crud('userstories'),
    ...social('userstories'),
    getByRef: (projectId, ref) => client.get('userstories/by_ref', { params: { project: projectId, ref } }),
    bulkCreate: (projectId, bulkStories, statusId) => client.post('userstories/bulk_create', { project_id: projectId, status_id: statusId, bulk_stories: bulkStories }),
    // bulk_userstories: [usId, …]; extra: { milestone_id? (moves the stories into that sprint; omit = backlog),
    // after_userstory_id? | before_userstory_id? } — no neighbour = top of the list
    bulkUpdateBacklogOrder: (projectId, bulkUserstories, extra = {}) =>
        client.post('userstories/bulk_update_backlog_order', { project_id: projectId, bulk_userstories: bulkUserstories, ...extra }),
    // Kanban move: status + optional swimlane + ordering neighbour
    bulkUpdateKanbanOrder: (projectId, statusId, bulkUserstories, extra = {}) =>
        client.post('userstories/bulk_update_kanban_order', { project_id: projectId, status_id: statusId, bulk_userstories: bulkUserstories, ...extra }),
    // bulkStories: [{ us_id, order }] (backend key is `bulk_stories`)
    bulkUpdateMilestone: (projectId, milestoneId, bulkStories) =>
        client.post('userstories/bulk_update_milestone', { project_id: projectId, milestone_id: milestoneId, bulk_stories: bulkStories }),
    getFiltersData: (projectId, params = {}) => client.get('userstories/filters_data', { params: { ...params, project: projectId } }),
    attachments: attachments('userstories'),
    customAttributes: customAttributes('userstory-custom-attributes', 'userstories/custom-attributes-values'),
};

// ============================================
// TASKS
// ============================================
export const taskService = {
    ...crud('tasks'),
    ...social('tasks'),
    getByRef: (projectId, ref) => client.get('tasks/by_ref', { params: { project: projectId, ref } }),
    bulkCreate: (projectId, bulkTasks, extra = {}) => client.post('tasks/bulk_create', { project_id: projectId, bulk_tasks: bulkTasks, ...extra }),
    // bulkTasks: [{ task_id, order }]; extra: { status_id?, milestone_id? } narrows the set being re-ordered
    bulkUpdateTaskboardOrder: (projectId, bulkTasks, extra = {}) => client.post('tasks/bulk_update_taskboard_order', { project_id: projectId, bulk_tasks: bulkTasks, ...extra }),
    bulkUpdateMilestone: (projectId, milestoneId, bulkTasks) => client.post('tasks/bulk_update_milestone', { project_id: projectId, milestone_id: milestoneId, bulk_tasks: bulkTasks }),
    getFiltersData: (projectId) => client.get('tasks/filters_data', { params: { project: projectId } }),
    promoteToUserStory: (id, projectId) => client.post(`tasks/${id}/promote_to_user_story`, { project_id: projectId }),
    attachments: attachments('tasks'),
    customAttributes: customAttributes('task-custom-attributes', 'tasks/custom-attributes-values'),
};

// ============================================
// ISSUES
// ============================================
export const issueService = {
    ...crud('issues'),
    ...social('issues'),
    getByRef: (projectId, ref) => client.get('issues/by_ref', { params: { project: projectId, ref } }),
    bulkCreate: (projectId, bulkIssues) => client.post('issues/bulk_create', { project_id: projectId, bulk_issues: bulkIssues }),
    getFiltersData: (projectId, params = {}) => client.get('issues/filters_data', { params: { ...params, project: projectId } }),
    promoteToUserStory: (id, projectId) => client.post(`issues/${id}/promote_to_user_story`, { project_id: projectId }),
    attachments: attachments('issues'),
    customAttributes: customAttributes('issue-custom-attributes', 'issues/custom-attributes-values'),
};

// ============================================
// MILESTONES (sprints)
// ============================================
export const milestoneService = {
    ...crud('milestones'),
    getStats: (id) => client.get(`milestones/${id}/stats`),
    watch: (id) => client.post(`milestones/${id}/watch`),
    unwatch: (id) => client.post(`milestones/${id}/unwatch`),
    getWatchers: (id) => client.get(`milestones/${id}/watchers`),
};

// ============================================
// WIKI
// ============================================
export const wikiService = {
    listPages: (projectId) => client.get('wiki', { params: { project: projectId } }),
    getPage: (id) => client.get(`wiki/${id}`),
    getPageBySlug: (projectId, slug) => client.get('wiki/by_slug', { params: { project: projectId, slug } }),
    createPage: (data) => client.post('wiki', data), // { project, slug, content }
    updatePage: (id, data) => client.patch(`wiki/${id}`, data), // { content, version }
    deletePage: (id) => client.delete(`wiki/${id}`),
    renderMarkdown: (projectId, content) => client.post('wiki/render', { project_id: projectId, content }),
    watchPage: (id) => client.post(`wiki/${id}/watch`),
    unwatchPage: (id) => client.post(`wiki/${id}/unwatch`),
    getWatchers: (id) => client.get(`wiki/${id}/watchers`),

    listLinks: (projectId) => client.get('wiki-links', { params: { project: projectId } }),
    createLink: (data) => client.post('wiki-links', data), // { project, title, href }
    updateLink: (id, data) => client.patch(`wiki-links/${id}`, data),
    deleteLink: (id) => client.delete(`wiki-links/${id}`),

    attachments: attachments('wiki'),
};

// ============================================
// HISTORY & COMMENTS
// type: 'epic' | 'userstory' | 'task' | 'issue' | 'wiki'
// ============================================
export const historyService = {
    get: (type, id, params) => client.get(`history/${type}/${id}`, { params }),
    getComments: (type, id) => client.get(`history/${type}/${id}`, { params: { type: 'comment' } }),
    getActivity: (type, id) => client.get(`history/${type}/${id}`, { params: { type: 'activity' } }),
    editComment: (type, id, commentId, comment) => client.post(`history/${type}/${id}/edit_comment`, { comment }, { params: { id: commentId } }),
    deleteComment: (type, id, commentId) => client.post(`history/${type}/${id}/delete_comment`, null, { params: { id: commentId } }),
    undeleteComment: (type, id, commentId) => client.post(`history/${type}/${id}/undelete_comment`, null, { params: { id: commentId } }),
    getCommentVersions: (type, id, commentId) => client.get(`history/${type}/${id}/comment_versions`, { params: { id: commentId } }),
};

// ============================================
// PROJECT VALUES (statuses, points, priorities, severities, types, swimlanes, due dates)
// ============================================
export const epicStatusService = projectValues('epic-statuses');
export const usStatusService = projectValues('userstory-statuses');
export const taskStatusService = projectValues('task-statuses');
export const issueStatusService = projectValues('issue-statuses');
export const issueTypeService = projectValues('issue-types');
export const priorityService = projectValues('priorities');
export const severityService = projectValues('severities');
export const pointsService = projectValues('points');
export const swimlaneService = projectValues('swimlanes'); // bulk_swimlanes; moveTo optional when it is the last swimlane
export const usDueDateService = crud('userstory-due-dates');
export const taskDueDateService = crud('task-due-dates');
export const issueDueDateService = crud('issue-due-dates');

// ============================================
// NOTIFICATIONS
// ============================================
export const notificationService = {
    // In-app notifications (bell)
    list: (params) => client.get('web-notifications', { params }),
    markAllRead: () => client.post('web-notifications/set-as-read'),
    markRead: (id) => client.patch(`web-notifications/${id}/set-as-read`),
    // Per-project email notification level: 1 = involved, 2 = all, 3 = none
    listPolicies: () => client.get('notify-policies'),
    updatePolicy: (id, notifyLevel) => client.patch(`notify-policies/${id}`, { notify_level: notifyLevel }),
};

// ============================================
// TIMELINE (activity feeds)
// ============================================
export const timelineService = {
    getProfile: (userId, params) => client.get(`timeline/profile/${userId}`, { params }),
    getUser: (userId, params) => client.get(`timeline/user/${userId}`, { params }),
    getProject: (projectId, params) => client.get(`timeline/project/${projectId}`, { params }),
};

// ============================================
// SEARCH & RESOLVER
// ============================================
export const searchService = {
    // Returns { epics, userstories, tasks, issues, wikipages, count }
    search: (projectId, text) => client.get('search', { params: { project: projectId, text } }),
};

export const resolverService = {
    resolveProject: (slug) => client.get('resolver', { params: { project: slug } }),
    resolveRef: (slug, ref) => client.get('resolver', { params: { project: slug, ref } }),
};

// ============================================
// USER STORAGE (per-user key/value settings)
// ============================================
export const userStorageService = {
    list: () => client.get('user-storage'),
    get: (key) => client.get(`user-storage/${key}`),
    create: (key, value) => client.post('user-storage', { key, value }),
    update: (key, value) => client.patch(`user-storage/${key}`, { value }),
    delete: (key) => client.delete(`user-storage/${key}`),
};

// ============================================
// WEBHOOKS
// ============================================
export const webhookService = {
    ...crud('webhooks'),
    test: (id) => client.post(`webhooks/${id}/test`),
    listLogs: (webhookId) => client.get('webhooklogs', { params: { webhook: webhookId } }),
    resendLog: (logId) => client.post(`webhooklogs/${logId}/resend`),
};

// ============================================
// EXPORT
// ============================================
export const exportService = {
    exportProject: (projectId) => client.get(`exporter/${projectId}`),
};

// Export all services as a default object
export default {
    auth: authService,
    users: userService,
    projects: projectService,
    tenders: tenderService,
    hr: hrService,
    remarks: remarkService,
    projectTemplates: projectTemplateService,
    memberships: membershipService,
    roles: roleService,
    epics: epicService,
    userStories: userStoryService,
    tasks: taskService,
    issues: issueService,
    milestones: milestoneService,
    wiki: wikiService,
    history: historyService,
    epicStatuses: epicStatusService,
    usStatuses: usStatusService,
    taskStatuses: taskStatusService,
    issueStatuses: issueStatusService,
    issueTypes: issueTypeService,
    priorities: priorityService,
    severities: severityService,
    points: pointsService,
    swimlanes: swimlaneService,
    notifications: notificationService,
    timeline: timelineService,
    search: searchService,
    resolver: resolverService,
    userStorage: userStorageService,
    webhooks: webhookService,
    export: exportService,
};
