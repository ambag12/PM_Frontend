import React, { useState } from 'react';
import { FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import Logo from '../UI/Logo';
import '../../styles/overview.css';

const FEATURES = [
    { title: 'Plan from PC-1 to completion', text: 'Budgets, PSDP numbers, objectives and due dates in one place for every scheme.' },
    { title: 'Track delivery, not paperwork', text: 'Sprints, user stories, tasks and issues with live progress and team workload.' },
    { title: 'Tenders, staffing and oversight', text: 'Follow procurement and HR records with remarks, activity history and alerts.' },
];

/* Branded left panel for the login / register split screen. */
export const AuthAside = ({ heading = 'Deliver public projects on time and on budget.', intro }) => (
    <aside className="auth-aside">
        <div className="ov-auth-brand">
            <div className="sidebar-logo"><Logo size={40} /></div>
            <div className="ov-auth-brand-name">
                SocketSoft PM
                <small>Planning · Delivery · Oversight</small>
            </div>
        </div>
        <div>
            <h1>{heading}</h1>
            <p>{intro || 'A single workspace for development portfolios — from approval and procurement to execution and reporting.'}</p>
            <div className="mt-6">
                {FEATURES.map((f) => (
                    <div key={f.title} className="auth-feature">
                        <FaCheckCircle />
                        <div>
                            <span className="ov-auth-feature-title">{f.title}</span>
                            {f.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="ov-auth-foot">© {new Date().getFullYear()} SocketSoft · Secure access for authorised staff</div>
    </aside>
);

export const AuthMobileBrand = () => (
    <div className="ov-auth-mobile-brand">
        <div className="sidebar-logo"><Logo size={40} /></div>
        SocketSoft PM
    </div>
);

/* Password input with show/hide toggle */
export const PasswordInput = ({ id, value, onChange, invalid, autoComplete = 'current-password', placeholder, describedBy }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="ov-pass">
            <input
                id={id}
                type={show ? 'text' : 'password'}
                className={`form-input ${invalid ? 'is-invalid' : ''}`}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder={placeholder}
                aria-invalid={invalid ? 'true' : undefined}
                aria-describedby={describedBy}
            />
            <button
                type="button"
                className="ov-pass-toggle"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? <FaEyeSlash /> : <FaEye />}
            </button>
        </div>
    );
};
