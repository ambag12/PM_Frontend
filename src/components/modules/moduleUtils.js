// Shared helpers for this fork's custom modules (Tenders, HR, Remarks).
import { TENDER_STATUSES } from '../../api/services';
import { daysUntil } from '../../utils/format';

export const tenderStatusMeta = (value) =>
    TENDER_STATUSES.find((s) => s.value === value) || { value: value || 'not_started', label: value ? String(value).replace(/_/g, ' ') : 'Not Started', tone: 'neutral' };

// Linear procurement flow shown in the stepper; "on_hold" is a side state.
export const TENDER_FLOW = ['not_started', 'pending', 'in_progress', 'completed'];

/*
 * Tender opening dates are free text in the DB (tech_opeining / financial_opening).
 * The UI writes ISO dates (YYYY-MM-DD) but must cope with anything that was typed before.
 */
export const parseLooseDate = (value) => {
    if (!value) return null;
    const s = String(value).trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return validDate(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/); // DD/MM/YYYY
    if (m) return validDate(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
};

const validDate = (y, mo, d) => {
    const dt = new Date(y, mo, d);
    return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? dt : null;
};

const pad = (n) => String(n).padStart(2, '0');
export const toDateInput = (value) => {
    const d = value instanceof Date ? value : parseLooseDate(value);
    return d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
};

export const todayInput = () => toDateInput(new Date());

// HR dates are DateTimeFields: the backend rejects date-only strings.
export const toApiDateTime = (dateInput) => (dateInput ? `${dateInput}T00:00:00Z` : '');

export const UPCOMING_WINDOW = 14;

// { state: 'none' | 'text' | 'past' | 'today' | 'soon' | 'later', date, days, raw }
export const openingInfo = (value) => {
    if (!value || !String(value).trim()) return { state: 'none', raw: value };
    const date = parseLooseDate(value);
    if (!date) return { state: 'text', raw: value };
    const days = daysUntil(date);
    let state = 'later';
    if (days < 0) state = 'past';
    else if (days === 0) state = 'today';
    else if (days <= UPCOMING_WINDOW) state = 'soon';
    return { state, date, days, raw: value };
};

export const relativeDays = (days) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days === -1) return 'Yesterday';
    return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
};

// Remarks: newest first.
export const sortRemarks = (remarks) =>
    [...(remarks || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

export const latestDate = (...values) => {
    const ts = values.filter(Boolean).map((v) => new Date(v).getTime()).filter((n) => !Number.isNaN(n));
    return ts.length ? new Date(Math.max(...ts)).toISOString() : null;
};

// Cloudinary is not configured on local backends: turn its cryptic error into guidance.
export const isStorageError = (message) => /api_key|cloudinary|cloud_name|api secret/i.test(String(message || ''));

export const matches = (q, ...fields) => {
    if (!q) return true;
    const needle = q.trim().toLowerCase();
    return fields.some((f) => f !== null && f !== undefined && String(f).toLowerCase().includes(needle));
};

// Last activity on a record: its own update time or its newest remark.
export const lastActivity = (rec, remarks) =>
    latestDate(rec?.updated_at, rec?.created_at, ...(remarks || []).map((r) => r.created_at));
