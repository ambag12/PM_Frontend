import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { projectService } from '../../api/services';
import { useProject } from '../../context/ProjectContext';
import { AuthContext } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { WORK_TYPES, isVersionConflict } from './workTypes';

/*
 * Project payload for a work item: reuse useProject() when it is the same project,
 * otherwise fetch the project detail once.
 */
export function useProjectData(projectId) {
    const ctx = useProject();
    const ctxMatch = !!(ctx?.project && projectId && String(ctx.project.id) === String(projectId));
    const [fetched, setFetched] = useState(null);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        if (ctxMatch || !projectId) return undefined;
        let off = false;
        projectService.get(projectId)
            .then((res) => { if (!off) setFetched(res.data); })
            .catch(() => { if (!off) setFetched({ id: projectId, _failed: true }); });
        return () => { off = true; };
    }, [projectId, ctxMatch, nonce]);

    const project = ctxMatch
        ? ctx.project
        : (fetched && String(fetched.id) === String(projectId) && !fetched._failed ? fetched : null);

    const ctxReload = ctx?.reload;
    const reloadProject = useCallback(() => {
        if (ctxMatch) return ctxReload?.();
        setNonce((n) => n + 1);
        return undefined;
    }, [ctxMatch, ctxReload]);

    const can = useCallback((perm) => {
        if (!project) return false;
        if (project.i_am_admin || project.i_am_owner) return true;
        return (project.my_permissions || []).includes(perm);
    }, [project]);

    return { project, reloadProject, can };
}

export function useCurrentUser() {
    const auth = useContext(AuthContext);
    return auth?.user || null;
}

/*
 * Loads one work item and exposes save(patch) that sends the current `version`.
 * On a "version doesn't match" conflict it reloads the item and re-applies the
 * same change once on top of the latest version.
 *   const { item, loading, error, save, mutate, reload, setItem } = useWorkItem('task', id, { onUpdate })
 */
export function useWorkItem(type, id, { onUpdate } = {}) {
    const cfg = WORK_TYPES[type];
    const svc = cfg.service;
    const toast = useToast();
    const [state, setState] = useState({ id: null, item: null, error: null });
    const latest = useRef(null);
    const onUpdateRef = useRef(onUpdate);
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

    const commit = useCallback((item) => {
        latest.current = item;
        setState({ id: String(item.id), item, error: null });
    }, []);

    const reload = useCallback(async () => {
        try {
            const res = await svc.get(id);
            commit(res.data);
            return res.data;
        } catch (err) {
            setState({ id: String(id), item: null, error: err });
            return null;
        }
    }, [svc, id, commit]);

    useEffect(() => {
        if (id === undefined || id === null) return undefined;
        let off = false;
        svc.get(id)
            .then((res) => { if (!off) commit(res.data); })
            .catch((err) => { if (!off) setState({ id: String(id), item: null, error: err }); });
        return () => { off = true; };
    }, [id, svc, commit]);

    // mutate(fn): fn(currentItem) must return an axios promise resolving to the updated item.
    const mutate = useCallback(async (fn, { notify = true } = {}) => {
        const cur = latest.current;
        if (!cur) return null;
        try {
            const res = await fn(cur);
            const next = res?.data && res.data.id ? res.data : await reload();
            if (res?.data?.id) commit(res.data);
            if (notify) onUpdateRef.current?.(next);
            return next;
        } catch (err) {
            if (!isVersionConflict(err)) {
                toast.error(err);
                throw err;
            }
            // Someone else changed the item: reload and re-apply once.
            const fresh = await reload();
            if (!fresh) throw err;
            try {
                const res = await fn(fresh);
                const next = res?.data && res.data.id ? res.data : await reload();
                if (res?.data?.id) commit(res.data);
                toast.info('This item had been changed by someone else. The latest version was loaded and your change applied.');
                if (notify) onUpdateRef.current?.(next);
                return next;
            } catch (err2) {
                toast.error(err2);
                throw err2;
            }
        }
    }, [reload, commit, toast]);

    const save = useCallback(
        (patch, opts) => mutate((cur) => svc.update(cur.id, { ...patch, version: cur.version }), opts),
        [mutate, svc],
    );

    const matches = state.id !== null && String(state.id) === String(id);
    const item = matches ? state.item : null;
    const error = matches ? state.error : null;

    return useMemo(() => ({
        cfg,
        item,
        error,
        loading: !matches,
        reload,
        save,
        mutate,
        setItem: commit,
    }), [cfg, item, error, matches, reload, save, mutate, commit]);
}
