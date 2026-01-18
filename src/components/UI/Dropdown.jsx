import React, { useState, useRef, useEffect } from 'react';

const Dropdown = ({
    trigger,
    children,
    align = 'right', // left, right
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const alignStyle = align === 'left' ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' };

    return (
        <div
            className={`dropdown ${isOpen ? 'open' : ''} ${className}`}
            ref={dropdownRef}
        >
            <div onClick={() => setIsOpen(!isOpen)}>
                {trigger}
            </div>
            <div className="dropdown-menu" style={alignStyle}>
                {children}
            </div>
        </div>
    );
};

export const DropdownItem = ({ children, icon, danger = false, onClick }) => (
    <div
        className={`dropdown-item ${danger ? 'dropdown-item-danger' : ''}`}
        onClick={onClick}
    >
        {icon && <span>{icon}</span>}
        {children}
    </div>
);

export const DropdownDivider = () => <div className="dropdown-divider" />;

export default Dropdown;
