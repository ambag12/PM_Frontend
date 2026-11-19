import { useCallback, useEffect, useState } from 'react';

/* Shared helpers for the planning pages (backlog, kanban, sprints, issues, epics). */

// Taiga lists are paginated (30) unless a page size is given; planning boards need everything.
export const ALL = { page_size: 1000 };

/*
 * useRemote(fetcher) — run an async fetcher (memoised with useCallback) and keep its result.
 *   - `loading` is true until the CURRENT fetcher resolved (stale data stays visible meanwhile)
 *   - `refresh()` refetches silently, `setData()` patches the cached value optimistically
 */
export function useRemote(fetcher) {
    const [tick, setTick] = useState(0);
    const [state, setState] = useState({ fetcher: null, data: undefined, error: null });

    useEffect(() => {
        if (!fetcher) return undefined;
        let alive = true;
        Promise.resolve()
            .then(fetcher)
            .then(
                (data) => { if (alive) setState({ fetcher, data, error: null }); },
                (error) => { if (alive) setState((s) => ({ fetcher, data: s.data, error })); },
            );
        return () => { alive = false; };
    }, [fetcher, tick]);

    const refresh = useCallback(() => setTick((t) => t + 1), []);
    const setData = useCallback(
        (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
        [],
    );

    return { data: state.data, error: state.error, loading: state.fetcher !== fetcher, refresh, setData };
}

export function useDebouncedValue(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// Read/write a small per-viewer preference (zoom level, collapsed columns…). Never throws.
export function usePersistentState(key, initial) {
    const [value, setValue] = useState(() => {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? initial : JSON.parse(raw);
        } catch {
            return initial;
        }
    });
    const update = useCallback((next) => {
        setValue((prev) => {
            const v = typeof next === 'function' ? next(prev) : next;
            try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
            return v;
        });
    }, [key]);
    return [value, update];
}

// Filter values ({ status: [1, 2], tags: ['x'] }) -> Taiga query params ({ status: '1,2', tags: 'x' })
export const toParams = (values = {}) => {
    const out = {};
    Object.entries(values).forEach(([k, v]) => {
        if (Array.isArray(v) && v.length) out[k] = v.join(',');
    });
    return out;
};

export const hasActiveValues = (values = {}) => Object.values(values).some((v) => Array.isArray(v) && v.length);

// Taiga filters_data entries -> FilterBar options
export const optionsFrom = {
    values: (list = []) => list.map((x) => ({ value: x.id, label: x.name, color: x.color, count: x.count })),
    users: (list = [], emptyLabel = 'Unassigned') => list.map((x) => ({
        value: x.id === null ? 'null' : x.id,
        label: x.id === null ? emptyLabel : (x.full_name || x.username || `User ${x.id}`),
        count: x.count,
        user: x.id === null ? null : x,
    })),
    tags: (list = []) => list.map((x) => ({ value: x.name, label: x.name, color: x.color, count: x.count })),
    epics: (list = []) => list.map((x) => ({
        value: x.id === null ? 'null' : x.id,
        label: x.id === null ? 'No epic' : `#${x.ref} ${x.subject}`,
        count: x.count,
    })),
};

// Story points: backend total when available, otherwise sum of the role points' values.
export const storyPoints = (story, points = []) => {
    if (!story) return null;
    if (story.total_points !== null && story.total_points !== undefined) return Number(story.total_points);
    const map = story.points || {};
    let total = null;
    Object.values(map).forEach((pid) => {
        const p = points.find((x) => String(x.id) === String(pid));
        if (p && p.value !== null && p.value !== undefined) total = (total || 0) + Number(p.value);
    });
    return total;
};

export const sumPoints = (stories, points) =>
    (stories || []).reduce((acc, s) => acc + (storyPoints(s, points) || 0), 0);

export const fmtPoints = (n) => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return '–';
    const v = Number(n);
    return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '');
};

// Sum of a Taiga per-role points dict ({ "1": 2.0, "2": 1.0 }) or a plain number
export const sumDict = (d) => {
    if (d === null || d === undefined) return 0;
    if (typeof d === 'number') return d;
    if (Array.isArray(d)) return d.reduce((a, b) => a + Number(b || 0), 0);
    return Object.values(d).reduce((a, b) => a + Number(b || 0), 0);
};

export const shortDate = (value) => {
    if (!value) return '—';
    const d = new Date(`${value}`.length === 10 ? `${value}T00:00:00` : value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

export const dateRange = (start, finish) => {
    if (!start && !finish) return 'No dates';
    const sameYear = start && finish && start.slice(0, 4) === finish.slice(0, 4);
    const end = finish ? new Date(`${finish}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: sameYear ? 'numeric' : undefined }) : '…';
    return `${shortDate(start)} – ${end}`;
};

export const toISODate = (d) => {
    const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return z.toISOString().slice(0, 10);
};

export const addDays = (iso, n) => {
    const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
    d.setDate(d.getDate() + n);
    return toISODate(d);
};

const dayDiff = (iso) => {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return Math.round((d - t) / 86400000);
};

// { key, label, tone } describing where a sprint is in time
export const sprintState = (m) => {
    if (!m) return { key: 'none', label: '', tone: 'neutral' };
    if (m.closed) return { key: 'closed', label: 'Closed', tone: 'neutral' };
    const toStart = dayDiff(m.estimated_start);
    const toEnd = dayDiff(m.estimated_finish);
    if (toStart !== null && toStart > 0) return { key: 'upcoming', label: `Starts in ${toStart}d`, tone: 'info' };
    if (toEnd !== null && toEnd < 0) return { key: 'overdue', label: `${Math.abs(toEnd)}d overdue`, tone: 'danger' };
    if (toEnd !== null) return { key: 'active', label: toEnd === 0 ? 'Ends today' : `${toEnd}d left`, tone: toEnd <= 2 ? 'warning' : 'success' };
    return { key: 'active', label: 'Active', tone: 'success' };
};

// Pick the "current" sprint: one running today, else the next upcoming, else the first.
export const pickCurrentSprint = (sprints = []) => {
    const open = sprints.filter((s) => !s.closed);
    return open.find((s) => sprintState(s).key === 'active')
        || open.find((s) => sprintState(s).key === 'overdue')
        || open[0]
        || sprints[0]
        || null;
};

// Everyone assigned to a story (assigned_to + assigned_users), resolved against project members.
export const storyAssignees = (story, members = []) => {
    const ids = new Set();
    if (story?.assigned_to) ids.add(story.assigned_to);
    (story?.assigned_users || []).forEach((id) => ids.add(id));
    return [...ids].map((id) => members.find((m) => m.id === id) || (story.assigned_to === id ? story.assigned_to_extra_info : null) || { id, full_name_display: `User ${id}` });
};

// Ignore keyboard shortcuts while typing in a field.
export const isTypingTarget = (el) => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

// Drop position on a vertical list item: 'before' when the pointer is in the top half.
export const dropPosition = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
};
