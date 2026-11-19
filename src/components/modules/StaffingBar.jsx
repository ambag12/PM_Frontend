import React from 'react';

const num = (v) => Number(v) || 0;

// Stacked filled / vacant bar. Posts not accounted for (posts − filled − vacant) stay as track.
const StaffingBar = ({ posts, filled, vacant, size }) => {
    const base = Math.max(num(posts), num(filled) + num(vacant), 1);
    return (
        <div className={`progress-stack mod-stack ${size === 'lg' ? 'is-lg' : ''}`} role="img" aria-label={`${filled} filled, ${vacant} vacant of ${posts} posts`}>
            {num(filled) > 0 && <span className="is-filled" style={{ width: `${(num(filled) / base) * 100}%` }} />}
            {num(vacant) > 0 && <span className="is-vacant" style={{ width: `${(num(vacant) / base) * 100}%` }} />}
        </div>
    );
};

export default StaffingBar;
