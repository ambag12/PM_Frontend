import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { projectService } from '../api/services';
import { PermissionProvider } from './PermissionContext';

/*
 * Loads the current project (from /project/:id/... in the URL) once and shares it with the
 * sidebar, top bar and every project page. The Taiga project detail payload already contains
 * statuses, points, priorities, severities, issue types, members, roles, tags_colors,
 * custom attributes, my_permissions, i_am_admin, and this fork's custom fields
 * (due_date, pc1_url, total_budget, psdp, location, obj_of_proj).
 *
 *   const { project, projectId, loading, error, reload } = useProject();
 */

const ProjectContext = createContext({ project: null, projectId: null, loading: false, error: null, reload: () => {} });

export const getProjectIdFromPath = (pathname) => {
    const m = pathname.match(/^\/project\/(\d+)/);
    return m ? m[1] : null;
};

export const ProjectProvider = ({ children }) => {
    const location = useLocation();
    const projectId = getProjectIdFromPath(location.pathname);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async (id, { silent = false } = {}) => {
        if (!id) return;
        if (!silent) setLoading(true);
        setError(null);
        try {
            const res = await projectService.get(id);
            setProject(res.data);
        } catch (err) {
            setError(err);
            setProject(null);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!projectId) {
            setProject(null);
            return;
        }
        if (String(project?.id) !== String(projectId)) {
            load(projectId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const reload = useCallback(() => load(projectId, { silent: true }), [load, projectId]);

    // Optimistically merge fields into the cached project (e.g. after a PATCH).
    const patchLocal = useCallback((fields) => setProject((p) => (p ? { ...p, ...fields } : p)), []);

    const value = useMemo(() => ({
        project: String(project?.id) === String(projectId) ? project : null,
        projectId,
        loading,
        error,
        reload,
        patchLocal,
    }), [project, projectId, loading, error, reload, patchLocal]);

    return (
        <ProjectContext.Provider value={value}>
            <PermissionProvider project={value.project}>
                {children}
            </PermissionProvider>
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
