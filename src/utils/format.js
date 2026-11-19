// Formatting helpers shared across pages.

export const initials = (name) => {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export const formatDate = (value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, opts);
};

export const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (value) => {
    if (!value) return '';
    const d = new Date(value);
    const s = Math.round((Date.now() - d.getTime()) / 1000);
    if (Number.isNaN(s)) return '';
    if (s < 45) return 'just now';
    const units = [
        ['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60],
    ];
    for (const [unit, secs] of units) {
        const n = Math.floor(Math.abs(s) / secs);
        if (n >= 1) return s >= 0 ? `${n} ${unit}${n > 1 ? 's' : ''} ago` : `in ${n} ${unit}${n > 1 ? 's' : ''}`;
    }
    return 'just now';
};

// Days until a date (negative = overdue)
export const daysUntil = (value) => {
    if (!value) return null;
    const d = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
};

export const formatNumber = (n, opts) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString(undefined, opts));

// Compact money/budget display: 2450000000 -> "2.45B"
export const formatCompact = (n) => {
    if (n === null || n === undefined || n === '') return '—';
    return Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n));
};

export const formatBytes = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export const percent = (part, total) => (total ? Math.round((Number(part) / Number(total)) * 100) : 0);

// Taiga user objects vary by endpoint: { full_name_display, full_name, username, photo, big_photo, gravatar_id }
export const userName = (u) => (u ? u.full_name_display || u.full_name || u.username || u.email || 'Unknown' : 'Unassigned');
export const userPhoto = (u) => (u ? u.photo || u.big_photo || null : null);

// Taiga tags come as [[name, color], …] or ["name", …]
export const normalizeTags = (tags, tagsColors = {}) =>
    (tags || []).map((t) => (Array.isArray(t) ? { name: t[0], color: t[1] || tagsColors[t[0]] || null } : { name: t, color: tagsColors[t] || null }));

// Find a value (status/priority/…) by id in a project list
export const byId = (list, id) => (list || []).find((x) => String(x.id) === String(id)) || null;
