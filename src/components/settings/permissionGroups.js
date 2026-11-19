// Permission catalogue (mirrors taiga/permissions/choices.py incl. this fork's tenders/HR/remarks perms).

export const PERMISSION_GROUPS = [
    { id: 'project', label: 'Project', perms: [['view_project', 'View project']] },
    { id: 'epics', label: 'Epics', perms: [['view_epics', 'View'], ['add_epic', 'Add'], ['modify_epic', 'Modify'], ['comment_epic', 'Comment'], ['delete_epic', 'Delete']] },
    { id: 'us', label: 'User stories', perms: [['view_us', 'View'], ['add_us', 'Add'], ['modify_us', 'Modify'], ['comment_us', 'Comment'], ['delete_us', 'Delete']] },
    { id: 'tasks', label: 'Tasks', perms: [['view_tasks', 'View'], ['add_task', 'Add'], ['modify_task', 'Modify'], ['comment_task', 'Comment'], ['delete_task', 'Delete']] },
    { id: 'issues', label: 'Issues', perms: [['view_issues', 'View'], ['add_issue', 'Add'], ['modify_issue', 'Modify'], ['comment_issue', 'Comment'], ['delete_issue', 'Delete']] },
    { id: 'sprints', label: 'Sprints', perms: [['view_milestones', 'View'], ['add_milestone', 'Add'], ['modify_milestone', 'Modify'], ['delete_milestone', 'Delete']] },
    {
        id: 'wiki',
        label: 'Wiki',
        perms: [
            ['view_wiki_pages', 'View pages'], ['add_wiki_page', 'Add pages'], ['modify_wiki_page', 'Modify pages'], ['comment_wiki_page', 'Comment pages'], ['delete_wiki_page', 'Delete pages'],
            ['view_wiki_links', 'View links'], ['add_wiki_link', 'Add links'], ['modify_wiki_link', 'Modify links'], ['delete_wiki_link', 'Delete links'],
        ],
    },
    { id: 'tenders', label: 'Tenders', perms: [['view_tenders', 'View'], ['add_tenders', 'Add'], ['modify_tenders', 'Modify'], ['delete_tenders', 'Delete']] },
    { id: 'hr', label: 'HR', perms: [['view_hr', 'View'], ['add_hr', 'Add'], ['modify_hr', 'Modify'], ['delete_hr', 'Delete']] },
    { id: 'remarks', label: 'Remarks', perms: [['view_remarks', 'View'], ['add_remarks', 'Add'], ['modify_remarks', 'Modify'], ['delete_remarks', 'Delete']] },
    {
        id: 'admin',
        label: 'Administration',
        perms: [
            ['modify_project', 'Modify project'], ['change_project', 'Change due date / PC-1'], ['delete_project', 'Delete project'],
            ['add_member', 'Add members'], ['remove_member', 'Remove members'],
            ['admin_project_values', 'Manage attributes'], ['admin_roles', 'Manage roles'],
        ],
    },
];

// Permissions that can be granted to non-members of a public project.
export const PUBLIC_PERMISSIONS = [
    ['view_project', 'View project'],
    ['view_milestones', 'View sprints'],
    ['view_epics', 'View epics'],
    ['view_us', 'View user stories'],
    ['view_tasks', 'View tasks'],
    ['view_issues', 'View issues'],
    ['view_wiki_pages', 'View wiki pages'],
    ['view_wiki_links', 'View wiki links'],
];

export const DEFAULT_ROLE_PERMISSIONS = ['view_project', 'view_milestones', 'view_epics', 'view_us', 'view_tasks', 'view_issues', 'view_wiki_pages', 'view_wiki_links'];
