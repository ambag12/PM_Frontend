import React from 'react';

const Card = ({
    children,
    title,
    subtitle,
    headerAction,
    glass = false,
    clickable = false,
    className = '',
    onClick,
    ...props
}) => {
    const baseClass = 'card';
    const glassClass = glass ? 'card-glass' : '';
    const clickableClass = clickable ? 'card-clickable' : '';

    const classes = [baseClass, glassClass, clickableClass, className].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            onClick={clickable ? onClick : undefined}
            {...props}
        >
            {(title || headerAction) && (
                <div className="card-header">
                    <div>
                        {title && <h3 className="card-title">{title}</h3>}
                        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
