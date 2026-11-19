// Due-date helpers. Overdue → danger, ≤14 days → warning.
export const dueTone = (days) => {
    if (days === null || days === undefined) return 'neutral';
    if (days < 0) return 'danger';
    if (days <= 14) return 'warning';
    return 'success';
};

export const countdownText = (days) => {
    if (days === null || days === undefined) return 'No due date';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`;
    if (days > 60) return `${Math.round(days / 30)} months left`;
    return `${days} days left`;
};

