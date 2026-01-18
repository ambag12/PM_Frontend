import React from 'react';

const Badge = ({
    children,
    variant = 'default', // default, success, warning, error, info, or status-based
    size = 'md', // sm, md
    dot = false,
    className = '',
}) => {
    // Map common status names to badge classes
    const statusMap = {
        'new': 'badge-new',
        'ready': 'badge-ready',
        'in progress': 'badge-progress',
        'in-progress': 'badge-progress',
        'ready for test': 'badge-testing',
        'ready-for-test': 'badge-testing',
        'done': 'badge-done',
        'closed': 'badge-done',
        'archived': 'badge-archived',
        // Priority
        'low': 'badge-priority-low',
        'normal': 'badge-priority-normal',
        'high': 'badge-priority-high',
    };

    const variantMap = {
        'success': 'badge-success',
        'warning': 'badge-warning',
        'error': 'badge-error',
        'info': 'badge-info',
        'default': '',
    };

    // Determine the class based on variant or children text
    let badgeClass = variantMap[variant] || '';

    if (!badgeClass && typeof children === 'string') {
        const normalizedText = children.toLowerCase();
        badgeClass = statusMap[normalizedText] || '';
    }

    const sizeStyle = size === 'sm' ? { fontSize: '0.625rem', padding: '0.125rem 0.5rem' } : {};

    return (
        <span
            className={`badge ${badgeClass} ${className}`}
            style={sizeStyle}
        >
            {dot && (
                <span
                    style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'currentColor',
                        marginRight: '0.375rem',
                    }}
                />
            )}
            {children}
        </span>
    );
};

export default Badge;
