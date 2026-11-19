import React from 'react';

// SocketSoft "Ss" leaf mark (same artwork as public/favicon.svg).
const Logo = ({ size = 34, title = 'SocketSoft', className = '' }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M4 39.2C4 19.8 19.8 4 39.2 4H60v20.8C60 44.2 44.2 60 24.8 60H4z" fill="#c8ff19" />
        <path d="M11.9 54.3c18.7-2.2 30.9-13.6 37.7-31.6" fill="none" stroke="#eff8df" strokeWidth="2.9" strokeLinecap="round" opacity=".75" />
        <text x="32" y="41" textAnchor="middle" fontFamily="Inter, 'Segoe UI', Arial, sans-serif" fontWeight="800" fontSize="26" letterSpacing="-.5" fill="#10120f">Ss</text>
    </svg>
);

export default Logo;
