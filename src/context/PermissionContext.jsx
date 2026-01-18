import React, { createContext, useContext, useMemo } from 'react';

const PermissionContext = createContext({
    permissions: [],
    projectInfo: {},
    hasPermission: () => false,
    canView: () => false,
    canModify: () => false,
    canDelete: () => false,
    canAdd: () => false,
    isOwner: false,
    isAdmin: false,
    isMember: false,
});

export const usePermissions = () => useContext(PermissionContext);

// Permission categories for easy checking
const PERMISSION_MAP = {
    // User Stories
    us: { view: 'view_us', add: 'add_us', modify: 'modify_us', delete: 'delete_us', comment: 'comment_us' },
    // Tasks
    task: { view: 'view_tasks', add: 'add_task', modify: 'modify_task', delete: 'delete_task', comment: 'comment_task' },
    // Issues
    issue: { view: 'view_issues', add: 'add_issue', modify: 'modify_issue', delete: 'delete_issue', comment: 'comment_issue' },
    // Milestones
    milestone: { view: 'view_milestones', add: 'add_milestone', modify: 'modify_milestone', delete: 'delete_milestone' },
    // Epics
    epic: { view: 'view_epics', add: 'add_epic', modify: 'modify_epic', delete: 'delete_epic', comment: 'comment_epic' },
    // Wiki
    wiki: { view: 'view_wiki_pages', add: 'add_wiki_page', modify: 'modify_wiki_page', delete: 'delete_wiki_page', comment: 'comment_wiki_page' },
    wikiLink: { view: 'view_wiki_links', add: 'add_wiki_link', modify: 'modify_wiki_link', delete: 'delete_wiki_link' },
    // Project
    project: { view: 'view_project', modify: 'modify_project', delete: 'delete_project' },
    // Members
    member: { add: 'add_member', remove: 'remove_member' },
    // Admin
    admin: { values: 'admin_project_values', roles: 'admin_roles' },
};

export const PermissionProvider = ({ children, project = null }) => {
    const value = useMemo(() => {
        const permissions = project?.my_permissions || [];
        const isOwner = project?.i_am_owner || false;
        const isAdmin = project?.i_am_admin || false;
        const isMember = project?.i_am_member || false;

        // Check if user has a specific permission
        const hasPermission = (permission) => {
            if (isOwner || isAdmin) return true;
            return permissions.includes(permission);
        };

        // Check view permission for a resource type
        const canView = (resourceType) => {
            const perm = PERMISSION_MAP[resourceType]?.view;
            return perm ? hasPermission(perm) : false;
        };

        // Check add permission for a resource type
        const canAdd = (resourceType) => {
            const perm = PERMISSION_MAP[resourceType]?.add;
            return perm ? hasPermission(perm) : false;
        };

        // Check modify permission for a resource type
        const canModify = (resourceType) => {
            const perm = PERMISSION_MAP[resourceType]?.modify;
            return perm ? hasPermission(perm) : false;
        };

        // Check delete permission for a resource type
        const canDelete = (resourceType) => {
            const perm = PERMISSION_MAP[resourceType]?.delete;
            return perm ? hasPermission(perm) : false;
        };

        // Check comment permission for a resource type
        const canComment = (resourceType) => {
            const perm = PERMISSION_MAP[resourceType]?.comment;
            return perm ? hasPermission(perm) : false;
        };

        return {
            permissions,
            projectInfo: project,
            hasPermission,
            canView,
            canAdd,
            canModify,
            canDelete,
            canComment,
            isOwner,
            isAdmin,
            isMember,
        };
    }, [project]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
};

// Permission Gate Component - conditionally renders children based on permission
export const PermissionGate = ({
    children,
    permission,
    resourceType,
    action = 'view', // 'view', 'add', 'modify', 'delete', 'comment'
    fallback = null,
    requireOwner = false,
    requireAdmin = false,
}) => {
    const { hasPermission, canView, canAdd, canModify, canDelete, canComment, isOwner, isAdmin } = usePermissions();

    let hasAccess = false;

    if (requireOwner && !isOwner) {
        return fallback;
    }

    if (requireAdmin && !isAdmin && !isOwner) {
        return fallback;
    }

    if (permission) {
        hasAccess = hasPermission(permission);
    } else if (resourceType) {
        switch (action) {
            case 'view':
                hasAccess = canView(resourceType);
                break;
            case 'add':
                hasAccess = canAdd(resourceType);
                break;
            case 'modify':
                hasAccess = canModify(resourceType);
                break;
            case 'delete':
                hasAccess = canDelete(resourceType);
                break;
            case 'comment':
                hasAccess = canComment(resourceType);
                break;
            default:
                hasAccess = canView(resourceType);
        }
    } else {
        hasAccess = true;
    }

    return hasAccess ? children : fallback;
};

export default PermissionContext;
