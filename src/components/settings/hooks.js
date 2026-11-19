import { useCallback, useEffect, useRef, useState } from 'react';

/*
 * useAsyncData(fetcher, deps) — load data once per deps change.
 *   const { data, loading, error, reload, setData } = useAsyncData(() => svc.list().then(r => r.data), [id]);
 * `reload()` refetches without flipping `loading` back on (no flicker after mutations).
 */
export function useAsyncData(fetcher, deps = []) {
    const [state, setState] = useState({ data: null, loading: true, error: null });
    const [nonce, setNonce] = useState(0);
    const fetcherRef = useRef(fetcher);

    useEffect(() => {
        fetcherRef.current = fetcher;
    });

    useEffect(() => {
        let alive = true;
        Promise.resolve()
            .then(() => fetcherRef.current())
            .then(
                (data) => alive && setState({ data, loading: false, error: null }),
                (error) => alive && setState((s) => ({ ...s, loading: false, error })),
            );
        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, nonce]);

    const reload = useCallback(() => setNonce((n) => n + 1), []);
    const setData = useCallback(
        (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
        [],
    );
    return { ...state, reload, setData };
}

/*
 * useDragReorder(items, onReorder) — HTML5 drag & drop + keyboard (↑/↓ on the focused handle).
 * onReorder(nextItems) receives the reordered array.
 */
export function useDragReorder(items, onReorder) {
    const [dragIndex, setDragIndex] = useState(null);
    const [overIndex, setOverIndex] = useState(null);
    const [armed, setArmed] = useState(null); // rows only become draggable from their handle

    const move = useCallback((from, to) => {
        if (from === to || from == null || to == null || to < 0 || to >= items.length) return;
        const next = items.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
    }, [items, onReorder]);

    const rowProps = (index) => ({
        draggable: armed === index,
        onDragStart: (e) => {
            setDragIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', String(index)); } catch { /* ignore */ }
        },
        onDragOver: (e) => {
            e.preventDefault();
            if (overIndex !== index) setOverIndex(index);
        },
        onDrop: (e) => {
            e.preventDefault();
            move(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
            setArmed(null);
        },
        onDragEnd: () => {
            setDragIndex(null);
            setOverIndex(null);
            setArmed(null);
        },
        'data-dragging': dragIndex === index ? 'true' : undefined,
        'data-over': overIndex === index && dragIndex !== index ? 'true' : undefined,
    });

    const handleProps = (index) => ({
        onMouseDown: () => setArmed(index),
        onMouseUp: () => setArmed(null),
        onTouchStart: () => setArmed(index),
        onKeyDown: (e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); move(index, index - 1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); move(index, index + 1); }
        },
    });

    return { rowProps, handleProps, move };
}
