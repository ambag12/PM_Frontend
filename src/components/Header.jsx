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
                        width: '80px',
                        height: '80px',
                        background: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        fontWeight: 'bold',
                        color: 'var(--primary-green)'
                    }}>
                        PM
                    </div>
                </div>

                {/* Title Section */}
                <div className="header-title">
                    <h1>{title}</h1>
                    <h2>{subtitle}</h2>
                    <p>Professional Project Management Platform</p>
                </div>

                {/* Profile Section */}
                <div className="header-profile">
                    <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '50%',
                        border: '3px solid white',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.5rem',
                        fontWeight: 'bold'
                    }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="header-profile-name">{user?.full_name || 'User'}</span>
                    <span className="header-profile-role">{user?.email || 'Project Manager'}</span>
                </div>
            </div>
        </div>
    );
};

export default Header;
