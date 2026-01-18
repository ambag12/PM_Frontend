import client from './client';

// ============================================
// AUTH SERVICE
// ============================================
export const authService = {
    login: (username, password) => client.post('auth', { type: 'normal', username, password }),
    register: (userData) => client.post('auth/register/', { type: 'public', ...userData }),
    refreshToken: (refreshToken) => client.post('auth/refresh', { refresh: refreshToken }),
    changePassword: (currentPassword, newPassword) => client.post('users/change_password', { current_password: currentPassword, password: newPassword }),
};

// ============================================
// USERS SERVICE
// ============================================
export const userService = {
    list: (params) => client.get('users', { params }),
    get: (id) => client.get(`users/${id}`),
    getMe: () => client.get('users/me'),
    update: (id, data) => client.patch(`users/${id}`, data),
    updateMe: (data) => client.patch('users/me', data),
    getContacts: () => client.get('users/contacts'),
    getLiked: (id) => client.get(`users/${id}/liked`),
    getVoted: (id) => client.get(`users/${id}/voted`),
    getWatched: (id) => client.get(`users/${id}/watched`),
};

// ============================================
// PROJECTS SERVICE
// ============================================
export const projectService = {
    list: (params) => client.get('projects', { params }),
    listForUser: () => client.get('projects/list_project_for_user'),
    get: (id) => client.get(`projects/${id}`),
    getBySlug: (slug) => client.get('projects/by_slug', { params: { slug } }),
    create: (data) => client.post('projects', data),
    update: (id, data) => client.patch(`projects/${id}`, data),
    delete: (id) => client.delete(`projects/${id}`),
    bulkUpdateOrder: (data) => client.post('projects/bulk_update_order', data),

    // Stats
    getStats: (id) => client.get(`projects/${id}/stats`),
    getIssuesStats: (id) => client.get(`projects/${id}/issues_stats`),

    // Modules
    getModules: (id) => client.get(`projects/${id}/modules`),
    updateModules: (id, data) => client.patch(`projects/${id}/modules`, data),

    // Tags
    getTags: (id) => client.get(`projects/${id}/tags_colors`),
    createTag: (id, data) => client.post(`projects/${id}/create_tag`, data),
    editTag: (id, data) => client.post(`projects/${id}/edit_tag`, data),
    deleteTag: (id, data) => client.post(`projects/${id}/delete_tag`, data),
    mixTags: (id, data) => client.post(`projects/${id}/mix_tags`, data),

    // Duplicate/Transfer
    duplicate: (id, data) => client.post(`projects/${id}/duplicate`, data),
    transferRequest: (id) => client.post(`projects/${id}/transfer_request`),
    transferStart: (id, token) => client.post(`projects/${id}/transfer_start`, { token }),
    transferReject: (id, token) => client.post(`projects/${id}/transfer_reject`, { token }),
    transferAccept: (id, token) => client.post(`projects/${id}/transfer_accept`, { token }),

    // Watch/Like
    watch: (id) => client.post(`projects/${id}/watch`),
    unwatch: (id) => client.post(`projects/${id}/unwatch`),
    like: (id) => client.post(`projects/${id}/like`),
    unlike: (id) => client.post(`projects/${id}/unlike`),
};

// ============================================
// PROJECT TEMPLATES SERVICE (SuperAdmin)
// ============================================
export const projectTemplateService = {
    list: () => client.get('project-templates'),
    get: (id) => client.get(`project-templates/${id}`),
    create: (data) => client.post('project-templates', data),
    update: (id, data) => client.patch(`project-templates/${id}`, data),
    delete: (id) => client.delete(`project-templates/${id}`),
};

// ============================================
// MEMBERSHIPS SERVICE
// ============================================
export const membershipService = {
    list: (params) => client.get('memberships', { params }),
    get: (id) => client.get(`memberships/${id}`),
    create: (data) => client.post('memberships', data),
    bulkCreate: (data) => client.post('memberships/bulk_create', data),
    update: (id, data) => client.patch(`memberships/${id}`, data),
    delete: (id) => client.delete(`memberships/${id}`),
    resendInvitation: (id) => client.post(`memberships/${id}/resend_invitation`),
    getInvitationByToken: (token) => client.get('invitations', { params: { token } }),
};

// ============================================
// ROLES SERVICE
// ============================================
export const roleService = {
    list: (params) => client.get('roles', { params }),
    get: (id) => client.get(`roles/${id}`),
    create: (data) => client.post('roles', data),
    update: (id, data) => client.patch(`roles/${id}`, data),
    delete: (id) => client.delete(`roles/${id}`),
};

// ============================================
// USER STORIES SERVICE
// ============================================
export const userStoryService = {
    list: (params) => client.get('userstories', { params }),
    get: (id) => client.get(`userstories/${id}`),
    getByRef: (projectId, ref) => client.get('userstories/by_ref', { params: { project: projectId, ref } }),
    create: (data) => client.post('userstories', data),
    update: (id, data) => client.patch(`userstories/${id}`, data),
    delete: (id) => client.delete(`userstories/${id}`),
    bulkCreate: (projectId, data) => client.post('userstories/bulk_create', { project_id: projectId, ...data }),
    bulkUpdateBacklogOrder: (projectId, data) => client.post('userstories/bulk_update_backlog_order', { project_id: projectId, ...data }),
    bulkUpdateKanbanOrder: (projectId, data) => client.post('userstories/bulk_update_kanban_order', { project_id: projectId, ...data }),
    bulkUpdateMilestone: (projectId, data) => client.post('userstories/bulk_update_milestone', { project_id: projectId, ...data }),
    getFiltersData: (projectId) => client.get('userstories/filters_data', { params: { project: projectId } }),

    // Voting
    upvote: (id) => client.post(`userstories/${id}/upvote`),
    downvote: (id) => client.post(`userstories/${id}/downvote`),

    // Watching
    watch: (id) => client.post(`userstories/${id}/watch`),
    unwatch: (id) => client.post(`userstories/${id}/unwatch`),
    getWatchers: (id) => client.get(`userstories/${id}/voters`),

    // Attachments
    getAttachments: (id) => client.get('userstory-attachments', { params: { object_id: id } }),
    createAttachment: (id, formData) => client.post('userstory-attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { object_id: id }
    }),
};

// ============================================
// TASKS SERVICE
// ============================================
export const taskService = {
    list: (params) => client.get('tasks', { params }),
    get: (id) => client.get(`tasks/${id}`),
    getByRef: (projectId, ref) => client.get('tasks/by_ref', { params: { project: projectId, ref } }),
    create: (data) => client.post('tasks', data),
    update: (id, data) => client.patch(`tasks/${id}`, data),
    delete: (id) => client.delete(`tasks/${id}`),
    bulkCreate: (projectId, data) => client.post('tasks/bulk_create', { project_id: projectId, ...data }),
    bulkUpdateTasksOrder: (projectId, data) => client.post('tasks/bulk_update_taskboard_order', { project_id: projectId, ...data }),
    getFiltersData: (projectId) => client.get('tasks/filters_data', { params: { project: projectId } }),

    // Voting
    upvote: (id) => client.post(`tasks/${id}/upvote`),
    downvote: (id) => client.post(`tasks/${id}/downvote`),

    // Watching
    watch: (id) => client.post(`tasks/${id}/watch`),
    unwatch: (id) => client.post(`tasks/${id}/unwatch`),

    // Attachments
    getAttachments: (id) => client.get('task-attachments', { params: { object_id: id } }),
};

// ============================================
// ISSUES SERVICE
// ============================================
export const issueService = {
    list: (params) => client.get('issues', { params }),
    get: (id) => client.get(`issues/${id}`),
    getByRef: (projectId, ref) => client.get('issues/by_ref', { params: { project: projectId, ref } }),
    create: (data) => client.post('issues', data),
    update: (id, data) => client.patch(`issues/${id}`, data),
    delete: (id) => client.delete(`issues/${id}`),
    bulkCreate: (projectId, data) => client.post('issues/bulk_create', { project_id: projectId, ...data }),
    getFiltersData: (projectId) => client.get('issues/filters_data', { params: { project: projectId } }),

    // Voting
    upvote: (id) => client.post(`issues/${id}/upvote`),
    downvote: (id) => client.post(`issues/${id}/downvote`),

    // Watching
    watch: (id) => client.post(`issues/${id}/watch`),
    unwatch: (id) => client.post(`issues/${id}/unwatch`),

    // Attachments
    getAttachments: (id) => client.get('issue-attachments', { params: { object_id: id } }),

    // Promote to User Story
    promoteToUserStory: (id, projectId) => client.post(`issues/${id}/promote_to_user_story`, { project_id: projectId }),
};

// ============================================
// MILESTONES SERVICE
// ============================================
export const milestoneService = {
    list: (params) => client.get('milestones', { params }),
    get: (id) => client.get(`milestones/${id}`),
    create: (data) => client.post('milestones', data),
    update: (id, data) => client.patch(`milestones/${id}`, data),
    delete: (id) => client.delete(`milestones/${id}`),
    getStats: (id) => client.get(`milestones/${id}/stats`),
    watch: (id) => client.post(`milestones/${id}/watch`),
    unwatch: (id) => client.post(`milestones/${id}/unwatch`),
};

// ============================================
// EPICS SERVICE
// ============================================
export const epicService = {
    list: (params) => client.get('epics', { params }),
    get: (id) => client.get(`epics/${id}`),
    create: (data) => client.post('epics', data),
    update: (id, data) => client.patch(`epics/${id}`, data),
    delete: (id) => client.delete(`epics/${id}`),
    bulkCreate: (projectId, data) => client.post('epics/bulk_create', { project_id: projectId, ...data }),
    getFiltersData: (projectId) => client.get('epics/filters_data', { params: { project: projectId } }),
    getRelatedUserStories: (id) => client.get(`epics/${id}/related_userstories`),
    createRelatedUserStory: (id, data) => client.post(`epics/${id}/related_userstories`, data),
    bulkCreateRelatedUserStories: (id, data) => client.post(`epics/${id}/related_userstories/bulk_create`, data),

    // Voting
    upvote: (id) => client.post(`epics/${id}/upvote`),
    downvote: (id) => client.post(`epics/${id}/downvote`),

    // Watching
    watch: (id) => client.post(`epics/${id}/watch`),
    unwatch: (id) => client.post(`epics/${id}/unwatch`),
};

// ============================================
// WIKI SERVICE
// ============================================
export const wikiService = {
    // Pages
    listPages: (params) => client.get('wiki', { params }),
    getPage: (id) => client.get(`wiki/${id}`),
    getPageBySlug: (projectId, slug) => client.get('wiki/by_slug', { params: { project: projectId, slug } }),
    createPage: (data) => client.post('wiki', data),
    updatePage: (id, data) => client.patch(`wiki/${id}`, data),
    deletePage: (id) => client.delete(`wiki/${id}`),
    watchPage: (id) => client.post(`wiki/${id}/watch`),
    unwatchPage: (id) => client.post(`wiki/${id}/unwatch`),

    // Links
    listLinks: (params) => client.get('wiki-links', { params }),
    getLink: (id) => client.get(`wiki-links/${id}`),
    createLink: (data) => client.post('wiki-links', data),
    updateLink: (id, data) => client.patch(`wiki-links/${id}`, data),
    deleteLink: (id) => client.delete(`wiki-links/${id}`),

    // Attachments
    getAttachments: (id) => client.get('wiki-attachments', { params: { object_id: id } }),
};

// ============================================
// HISTORY SERVICE
// ============================================
export const historyService = {
    getUserStoryHistory: (id) => client.get(`history/userstory/${id}`),
    getTaskHistory: (id) => client.get(`history/task/${id}`),
    getIssueHistory: (id) => client.get(`history/issue/${id}`),
    getEpicHistory: (id) => client.get(`history/epic/${id}`),
    getWikiHistory: (id) => client.get(`history/wiki/${id}`),

    deleteComment: (type, objectId, commentId) => client.delete(`history/${type}/${objectId}/delete_comment`, { params: { id: commentId } }),
    undeleteComment: (type, objectId, commentId) => client.post(`history/${type}/${objectId}/undelete_comment`, { id: commentId }),
    editComment: (type, objectId, commentId, comment) => client.post(`history/${type}/${objectId}/edit_comment`, { id: commentId, comment }),
};

// ============================================
// USER STORAGE SERVICE
// ============================================
export const userStorageService = {
    list: () => client.get('user-storage'),
    get: (key) => client.get(`user-storage/${key}`),
    create: (data) => client.post('user-storage', data),
    update: (key, data) => client.patch(`user-storage/${key}`, data),
    delete: (key) => client.delete(`user-storage/${key}`),
};

// ============================================
// PRIORITIES SERVICE
// ============================================
export const priorityService = {
    list: (params) => client.get('priorities', { params }),
    get: (id) => client.get(`priorities/${id}`),
    create: (data) => client.post('priorities', data),
    update: (id, data) => client.patch(`priorities/${id}`, data),
    delete: (id) => client.delete(`priorities/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('priorities/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// SEVERITIES SERVICE
// ============================================
export const severityService = {
    list: (params) => client.get('severities', { params }),
    get: (id) => client.get(`severities/${id}`),
    create: (data) => client.post('severities', data),
    update: (id, data) => client.patch(`severities/${id}`, data),
    delete: (id) => client.delete(`severities/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('severities/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// ISSUE TYPES SERVICE
// ============================================
export const issueTypeService = {
    list: (params) => client.get('issue-types', { params }),
    get: (id) => client.get(`issue-types/${id}`),
    create: (data) => client.post('issue-types', data),
    update: (id, data) => client.patch(`issue-types/${id}`, data),
    delete: (id) => client.delete(`issue-types/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('issue-types/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// ISSUE STATUSES SERVICE
// ============================================
export const issueStatusService = {
    list: (params) => client.get('issue-statuses', { params }),
    get: (id) => client.get(`issue-statuses/${id}`),
    create: (data) => client.post('issue-statuses', data),
    update: (id, data) => client.patch(`issue-statuses/${id}`, data),
    delete: (id) => client.delete(`issue-statuses/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('issue-statuses/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// TASK STATUSES SERVICE
// ============================================
export const taskStatusService = {
    list: (params) => client.get('task-statuses', { params }),
    get: (id) => client.get(`task-statuses/${id}`),
    create: (data) => client.post('task-statuses', data),
    update: (id, data) => client.patch(`task-statuses/${id}`, data),
    delete: (id) => client.delete(`task-statuses/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('task-statuses/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// US STATUSES SERVICE
// ============================================
export const usStatusService = {
    list: (params) => client.get('userstory-statuses', { params }),
    get: (id) => client.get(`userstory-statuses/${id}`),
    create: (data) => client.post('userstory-statuses', data),
    update: (id, data) => client.patch(`userstory-statuses/${id}`, data),
    delete: (id) => client.delete(`userstory-statuses/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('userstory-statuses/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// POINTS SERVICE
// ============================================
export const pointsService = {
    list: (params) => client.get('points', { params }),
    get: (id) => client.get(`points/${id}`),
    create: (data) => client.post('points', data),
    update: (id, data) => client.patch(`points/${id}`, data),
    delete: (id) => client.delete(`points/${id}`),
    bulkUpdateOrder: (projectId, data) => client.post('points/bulk_update_order', { project: projectId, ...data }),
};

// ============================================
// TIMELINE SERVICE
// ============================================
export const timelineService = {
    getProfile: (userId) => client.get(`timeline/profile/${userId}`),
    getUser: (userId) => client.get(`timeline/user/${userId}`),
    getProject: (projectId) => client.get(`timeline/project/${projectId}`),
};

// ============================================
// SEARCH SERVICE
// ============================================
export const searchService = {
    search: (projectId, query) => client.get('search', { params: { project: projectId, text: query } }),
};

// ============================================
// RESOLVER SERVICE
// ============================================
export const resolverService = {
    resolve: (project, type, ref) => client.get('resolver', { params: { project, [type]: ref } }),
};

// Export all services as default object
export default {
    auth: authService,
    users: userService,
    projects: projectService,
    projectTemplates: projectTemplateService,
    memberships: membershipService,
    roles: roleService,
    userStories: userStoryService,
    tasks: taskService,
    issues: issueService,
    milestones: milestoneService,
    epics: epicService,
    wiki: wikiService,
    history: historyService,
    userStorage: userStorageService,
    priorities: priorityService,
    severities: severityService,
    issueTypes: issueTypeService,
    issueStatuses: issueStatusService,
    taskStatuses: taskStatusService,
    usStatuses: usStatusService,
    points: pointsService,
    timeline: timelineService,
    search: searchService,
    resolver: resolverService,
};
