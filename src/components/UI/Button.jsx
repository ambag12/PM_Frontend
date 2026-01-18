import React from 'react';

const Button = ({
    children,
    variant = 'primary', // primary, secondary, ghost, danger, success
    size = 'md', // sm, md, lg
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    ...props
}) => {
    const baseClass = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = size !== 'md' ? `btn-${size}` : '';
    const iconOnlyClass = !children && icon ? 'btn-icon' : '';
    const widthClass = fullWidth ? 'w-full' : '';

    const classes = [
        baseClass,
        variantClass,
        sizeClass,
        iconOnlyClass,
        widthClass,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="spinner spinner-sm" />
            ) : (
                <>
                    {icon && iconPosition === 'left' && <span className="btn-icon-wrapper">{icon}</span>}
                    {children}
                    {icon && iconPosition === 'right' && <span className="btn-icon-wrapper">{icon}</span>}
                </>
            )}
        </button>
    );
};

export default Button;
