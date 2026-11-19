import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaUser, FaExclamationCircle, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthAside, AuthMobileBrand, PasswordInput } from '../components/overview/AuthAside';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ username: '', password: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.username.trim()) next.username = 'Enter your username or email.';
        if (!form.password) next.password = 'Enter your password.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!validate()) return;
        setSubmitting(true);
        try {
            await login(form.username.trim(), form.password);
            navigate(location.state?.from || '/', { replace: true });
        } catch (err) {
            const status = err?.response?.status;
            setError(status === 400 || status === 401
                ? getErrorMessage(err, 'Username or password is incorrect.')
                : getErrorMessage(err, 'Could not sign in. Please try again.'));
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-shell">
            <AuthAside />
            <main className="auth-main">
                <div className="auth-card">
                    <AuthMobileBrand />
                    <h2>Welcome back</h2>
                    <p className="auth-sub">Sign in to continue to your projects.</p>

                    {error && (
                        <div className="alert alert-error mb-4" role="alert">
                            <FaExclamationCircle style={{ marginTop: 3, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label className="form-label" htmlFor="login-username">Username or email</label>
                            <div className="form-input-icon">
                                <FaUser size={13} />
                                <input
                                    id="login-username"
                                    className={`form-input ${errors.username ? 'is-invalid' : ''}`}
                                    value={form.username}
                                    onChange={set('username')}
                                    autoComplete="username"
                                    autoFocus
                                    placeholder="e.g. a.khan"
                                    aria-invalid={errors.username ? 'true' : undefined}
                                    aria-describedby={errors.username ? 'login-username-err' : undefined}
                                />
                            </div>
                            {errors.username && <div id="login-username-err" className="form-error">{errors.username}</div>}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="login-password">Password</label>
                            <PasswordInput
                                id="login-password"
                                value={form.password}
                                onChange={set('password')}
                                invalid={!!errors.password}
                                placeholder="Your password"
                                describedBy={errors.password ? 'login-password-err' : undefined}
                            />
                            {errors.password && <div id="login-password-err" className="form-error">{errors.password}</div>}
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={submitting}>
                            {submitting ? <><span className="spinner spinner-sm" /> Signing in…</> : <>Sign in <FaArrowRight size={12} /></>}
                        </button>
                    </form>

                    <p className="ov-auth-switch">
                        New to the workspace? <Link to="/register">Create an account</Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Login;
