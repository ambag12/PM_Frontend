import { useCallback, useEffect, useState } from 'react';

/*
 * useAsync — run an async loader whenever `deps` change.
 *
 *   const { data, error, loading, reload, setData } = useAsync(() => svc.get(id).then(r => r.data), [id]);
 *
 * - `loading` is true only until the first result for the current deps arrives,
 *   so `reload()` refreshes silently (no loader flash).
 * - `setData` lets callers apply optimistic updates.
 * State is only set from promise callbacks, never synchronously inside the effect.
 */
export default function useAsync(loader, deps = []) {
    const key = JSON.stringify(deps);
    const [nonce, setNonce] = useState(0);
    const [state, setState] = useState({ key: null, data: undefined, error: null });

    useEffect(() => {
        let alive = true;
        Promise.resolve()
            .then(() => loader())
            .then(
                (data) => { if (alive) setState({ key, data, error: null }); },
                (error) => { if (alive) setState((s) => ({ key, data: s.key === key ? s.data : undefined, error })); },
            );
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);
    const setData = useCallback((updater) => setState((s) => ({
        ...s,
        data: typeof updater === 'function' ? updater(s.data) : updater,
    })), []);

    const current = state.key === key;
    return {
        data: current ? state.data : undefined,
        error: current ? state.error : null,
        loading: !current,
        reload,
        setData,
    };
}

// Read the total count the API sends in the pagination headers (falls back to the list length).
export const totalFromHeaders = (res) => {
    const n = Number(res?.headers?.['x-pagination-count']);
    return Number.isFinite(n) && res?.headers?.['x-pagination-count'] !== undefined
        ? n
        : (Array.isArray(res?.data) ? res.data.length : 0);
};

export const hasNextPage = (res, pageSize = 30) => {
    const next = res?.headers?.['x-pagination-next'];
    if (next !== undefined) return Boolean(next);
    return Array.isArray(res?.data) && res.data.length >= pageSize;
};
