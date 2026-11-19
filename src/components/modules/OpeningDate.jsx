import React from 'react';
import { formatDate } from '../../utils/format';
import { openingInfo, relativeDays } from './moduleUtils';

/*
 * Tender opening date (stored as free text). Highlights openings within 14 days and past ones,
 * and shows non-date values verbatim.
 */
const OpeningDate = ({ value, done = false }) => {
    const info = openingInfo(value);
    if (info.state === 'none') return <span className="text-muted">—</span>;
    if (info.state === 'text') {
        return <span className="opening-text" title="Free-text value (not a date)">{String(info.raw)}</span>;
    }
    const chip = {
        today: { cls: 'tone-accent', text: 'Today' },
        soon: { cls: 'tone-warning', text: relativeDays(info.days) },
        past: { cls: 'tone-neutral', text: done ? 'Opened' : relativeDays(info.days) },
        later: null,
    }[info.state];
    return (
        <span className={`opening-date is-${info.state}`}>
            <span className="opening-date-value">{formatDate(info.date)}</span>
            {chip && <span className={`opening-chip ${chip.cls}`}>{chip.text}</span>}
        </span>
    );
};

export default OpeningDate;
