import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { membershipService, projectService } from '../../api/services';
import { AuthContext } from '../../context/AuthContext';

/* -------------------------------------------------------------------------
 * Memberships per project (cached). Remarks store `user_member` as a
 * MEMBERSHIP id, so we need the membership list to resolve authors and to
 * find the current user's membership when posting.
 * ----------------------------------------------------------------------- */
const membershipCache = new Map();

export const loadMemberships = (projectId) => {
    const key = String(projectId);
    if (!membershipCache.has(key)) {
        const p = membershipService.list({ project: projectId })
            .then((r) => (Array.isArray(r.data) ? r.data : []))
            .catch((err) => {
                membershipCache.delete(key);
                throw err;
            });
        membershipCache.set(key, p);
    }
    return membershipCache.get(key);
};

export const useMemberships = (projectId) => {
    const [state, setState] = useState({ pid: null, list: [] });
    useEffect(() => {
        if (!projectId) return undefined;
        let alive = true;
        loadMemberships(projectId)
            .then((list) => alive && setState({ pid: String(projectId), list }))
            .catch(() => alive && setState({ pid: String(projectId), list: [] }));
        return () => { alive = false; };
    }, [projectId]);
    return state.pid === String(projectId) ? state.list : [];
};

// Current user's membership in a list of memberships.
export const useMyMembership = (memberships) => {
    const { user } = useContext(AuthContext);
    return useMemo(
        () => (memberships || []).find((m) => String(m.user) === String(user?.id)) || null,
        [memberships, user?.id],
    );
};

export const memberName = (m) => (m ? m.full_name || m.user_email || m.email || 'Member' : null);

/* -------------------------------------------------------------------------
 * Projects the current user belongs to (for global pages + pickers).
 * ----------------------------------------------------------------------- */
let projectsPromise = null;
export const loadMyProjects = (force = false) => {
    if (!projectsPromise || force) {
        projectsPromise = projectService.listForUser()
            .then((r) => (Array.isArray(r.data) ? r.data : []))
            .catch((err) => {
                projectsPromise = null;
                throw err;
            });
    }
    return projectsPromise;
};

export const useMyProjects = (enabled = true) => {
    const [state, setState] = useState({ loaded: false, projects: [], error: null });
    useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        loadMyProjects()
            .then((projects) => alive && setState({ loaded: true, projects, error: null }))
            .catch((error) => alive && setState({ loaded: true, projects: [], error }));
        return () => { alive = false; };
    }, [enabled]);
    return state;
};

/* -------------------------------------------------------------------------
 * Records of a custom module (tenders / HR) for one project, or for every
 * project of the user (the API returns nothing without `project`, so the
 * global view fans out one request per project).
 *
 *   const { records, projects, loading, error, failed, reload, upsert } =
 *       useModuleRecords(tenderService.list, projectId);
 * Each record gets `_project` ({ id, name, slug }).
 * ----------------------------------------------------------------------- */
const unwrap = (res) => {
    const d = res?.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.data)) return d.data;
    return [];
};

export const useModuleRecords = (listFn, projectId, projectInfo) => {
    const scope = projectId ? `p${projectId}` : 'all';
    const [nonce, setNonce] = useState(0);
    const key = `${scope}:${nonce}`;
    const [state, setState] = useState({ key: null, scope: null, records: [], projects: [], failed: [], error: null });

    useEffect(() => {
        let alive = true;
        const run = async () => {
            if (projectId) {
                const res = await listFn(projectId);
                const p = { id: Number(projectId) };
                return { records: unwrap(res).map((r) => ({ ...r, _project: p })), projects: [p], failed: [] };
            }
            const projects = await loadMyProjects(nonce > 0);
            const results = await Promise.allSettled(projects.map((p) => listFn(p.id)));
            const records = [];
            const failed = [];
            results.forEach((r, i) => {
                const p = { id: projects[i].id, name: projects[i].name, slug: projects[i].slug };
                if (r.status === 'fulfilled') unwrap(r.value).forEach((rec) => records.push({ ...rec, _project: p }));
                else failed.push(p);
            });
            return { records, projects: projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, members: p.members })), failed };
        };
        run()
            .then((res) => alive && setState({ key, scope, error: null, ...res }))
            .catch((error) => alive && setState((s) => ({ ...s, key, scope, error })));
        return () => { alive = false; };
    }, [key, scope, projectId, nonce, listFn]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);

    const upsert = useCallback((record) => {
        if (!record) return;
        setState((s) => {
            const existing = s.records.find((r) => r.id === record.id);
            const _project = existing?._project
                || s.projects.find((p) => String(p.id) === String(record.project))
                || { id: record.project };
            const next = { ...record, _project };
            return {
                ...s,
                records: existing ? s.records.map((r) => (r.id === record.id ? next : r)) : [next, ...s.records],
            };
        });
    }, []);

    const sameScope = state.scope === scope;
    const infoName = projectInfo?.name;
    const infoSlug = projectInfo?.slug;
    const records = useMemo(() => {
        if (!sameScope) return [];
        if (!projectId || !infoName) return state.records;
        return state.records.map((r) => (r._project?.name ? r : { ...r, _project: { ...r._project, name: infoName, slug: infoSlug } }));
    }, [sameScope, state.records, projectId, infoName, infoSlug]);

    return {
        records,
        projects: sameScope ? state.projects : [],
        failed: sameScope ? state.failed : [],
        error: sameScope ? state.error : null,
        loading: !sameScope,
        refreshing: sameScope && state.key !== key,
        reload,
        upsert,
    };
};
