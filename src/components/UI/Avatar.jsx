import React from 'react';

const Avatar = ({
    src,
    alt,
    name,
    size = 'md', // sm, md, lg, xl
    className = '',
}) => {
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const sizeClass = `avatar-${size}`;

    return (
        <div className={`avatar ${sizeClass} ${className}`}>
            {src ? (
                <img src={src} alt={alt || name || 'Avatar'} />
            ) : (
                getInitials(name)
            )}
        </div>
    );
};

// Avatar Group for displaying multiple avatars
export const AvatarGroup = ({ children, max = 4 }) => {
    const childrenArray = React.Children.toArray(children);
    const visibleAvatars = childrenArray.slice(0, max);
    const remainingCount = childrenArray.length - max;

    return (
        <div className="avatar-group">
            {visibleAvatars}
            {remainingCount > 0 && (
                <div className="avatar avatar-md" style={{ background: 'var(--neutral-300)', color: 'var(--text-secondary)' }}>
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};

export default Avatar;
