import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
    // Determine badge class based on status
    const getBadgeClass = () => {
        if (!status) return 'status-badge';

        const statusLower = typeof status === 'string' ? status.toLowerCase() : '';

        if (statusLower.includes('complet') || statusLower.includes('done') || statusLower.includes('closed')) {
            return 'status-badge completed';
        } else if (statusLower.includes('progress') || statusLower.includes('ongoing') || statusLower.includes('active')) {
            return 'status-badge progress';
        } else if (statusLower.includes('pending') || statusLower.includes('todo') || statusLower.includes('open')) {
            return 'status-badge pending';
        } else if (statusLower.includes('hold') || statusLower.includes('paused') || statusLower.includes('blocked')) {
            return 'status-badge hold';
        }

        return 'status-badge';
    };

    return (
        <span className={getBadgeClass()}>
            {status || 'Unknown'}
        </span>
    );
};

export default StatusBadge;
