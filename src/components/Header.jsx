import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Header = ({ title = "Project Management System", subtitle = "Professional Project Tracking & Management" }) => {
    const { user } = useContext(AuthContext);

    return (
        <div className="professional-header">
            <div className="header-content">
                {/* Logo/Emblem Section */}
                <div style={{ width: '80px' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        background: 'var(--primary-600)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: '800',
                        color: 'white',
                        boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
                    }}>
                        PM
                    </div>
                </div>

                {/* Title Section (Centered) */}
                <div className="header-title">
                    <h1>{title}</h1>
                    <h2>{subtitle}</h2>
                </div>

                {/* Profile Section */}
                <div className="header-profile">
                    <div className="header-profile-info">
                        <span className="header-profile-name">{user?.full_name || 'User'}</span>
                        <span className="header-profile-role">{user?.email || 'Project Manager'}</span>
                    </div>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        border: '3px solid white',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
