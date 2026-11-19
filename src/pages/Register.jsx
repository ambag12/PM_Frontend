import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaIdBadge, FaExclamationCircle, FaArrowRight } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { AuthAside, AuthMobileBrand, PasswordInput } from '../components/overview/AuthAside';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[\w.-]+$/;

const strengthOf = (pw) => {
    let s = 0;
    if (pw.length >= 8) s += 1;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s += 1;
    if (/\d/.test(pw)) s += 1;
    if (/[^\w\s]/.test(pw) || pw.length >= 14) s += 1;
    return s;
};
const STRENGTH = [
    { label: 'Too short', tone: 'danger' },
    { label: 'Weak', tone: 'danger' },
    { label: 'Fair', tone: 'warning' },
    { label: 'Good', tone: 'success' },
    { label: 'Strong', tone: 'success' },
];

const FIELDS = [
    { key: 'full_name', label: 'Full name', icon: <FaIdBadge size={13} />, autoComplete: 'name', placeholder: 'e.g. Ayesha Khan' },
    { key: 'username', label: 'Username', icon: <FaUser size={13} />, autoComplete: 'username', placeholder: 'e.g. a.khan' },
    { key: 'email', label: 'Work email', icon: <FaEnvelope size={13} />, autoComplete: 'email', placeholder: 'name@department.gov', type: 'email' },
];

const Register = () => {
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [form, setForm] = useState({ full_name: '', username: '', email: '', password: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const set = (key) => (e) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
    };

    const validate = () => {
        const next = {};
        if (!form.full_name.trim()) next.full_name = 'Enter your full name.';
        if (!form.username.trim()) next.username = 'Choose a username.';
        else if (!USERNAME_RE.test(form.username.trim())) next.username = 'Use letters, numbers, dots, dashes or underscores only.';
        if (!form.email.trim()) next.email = 'Enter your email address.';
        else if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.';
        if (!form.password) next.password = 'Choose a password.';
        else if (form.password.length < 6) next.password = 'Use at least 6 characters.';
        if (!form.confirm) next.confirm = 'Repeat your password.';
        else if (form.confirm !== form.password) next.confirm = 'Passwords do not match.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!validate()) return;
        setSubmitting(true);
        try {
            await register({
                username: form.username.trim(),
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                password: form.password,
            });
            navigate('/', { replace: true });
        } catch (err) {
            // Map field errors from the API onto the inputs where possible
            const data = err?.response?.data;
            const fieldErrors = {};
            if (data && typeof data === 'object') {
                ['username', 'full_name', 'email', 'password'].forEach((k) => {
                    if (data[k]) fieldErrors[k] = [].concat(data[k]).join(' ');
                });
            }
            setErrors(fieldErrors);
            setError(Object.keys(fieldErrors).length ? 'Please fix the highlighted fields.' : getErrorMessage(err, 'Could not create your account.'));
            setSubmitting(false);
        }
    };

    const strength = form.password ? strengthOf(form.password) : null;

    return (
        <div className="auth-shell">
            <AuthAside heading="Join your team’s project workspace." />
            <main className="auth-main">
                <div className="auth-card">
                    <AuthMobileBrand />
                    <h2>Create your account</h2>
                    <p className="auth-sub">It takes less than a minute. You can be added to projects afterwards.</p>

                    {error && (
                        <div className="alert alert-error mb-4" role="alert">
                            <FaExclamationCircle style={{ marginTop: 3, flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>
                        {FIELDS.map((f) => (
                            <div className="form-group" key={f.key}>
                                <label className="form-label" htmlFor={`reg-${f.key}`}>{f.label}</label>
                                <div className="form-input-icon">
                                    {f.icon}
                                    <input
                                        id={`reg-${f.key}`}
                                        type={f.type || 'text'}
                                        className={`form-input ${errors[f.key] ? 'is-invalid' : ''}`}
                                        value={form[f.key]}
                                        onChange={set(f.key)}
                                        autoComplete={f.autoComplete}
                                        placeholder={f.placeholder}
                                        autoFocus={f.key === 'full_name'}
                                        aria-invalid={errors[f.key] ? 'true' : undefined}
                                        aria-describedby={errors[f.key] ? `reg-${f.key}-err` : undefined}
                                    />
                                </div>
                                {errors[f.key] && <div id={`reg-${f.key}-err`} className="form-error">{errors[f.key]}</div>}
                            </div>
                        ))}

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-password">Password</label>
                                <PasswordInput
                                    id="reg-password"
                                    value={form.password}
                                    onChange={set('password')}
                                    invalid={!!errors.password}
                                    autoComplete="new-password"
                                    describedBy={errors.password ? 'reg-password-err' : 'reg-password-hint'}
                                />
                                {errors.password ? (
                                    <div id="reg-password-err" className="form-error">{errors.password}</div>
                                ) : strength !== null ? (
                                    <div id="reg-password-hint">
                                        <div className={`ov-strength tone-${STRENGTH[strength].tone}`} aria-hidden="true">
                                            {[1, 2, 3, 4].map((i) => <span key={i} className={i <= strength ? 'on' : ''} />)}
                                        </div>
                                        <div className="form-hint">Strength: {STRENGTH[strength].label}</div>
                                    </div>
                                ) : (
                                    <div id="reg-password-hint" className="form-hint">At least 6 characters.</div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
                                <PasswordInput
                                    id="reg-confirm"
                                    value={form.confirm}
                                    onChange={set('confirm')}
                                    invalid={!!errors.confirm}
                                    autoComplete="new-password"
                                    describedBy={errors.confirm ? 'reg-confirm-err' : undefined}
                                />
                                {errors.confirm && <div id="reg-confirm-err" className="form-error">{errors.confirm}</div>}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg w-full mt-2" disabled={submitting}>
                            {submitting ? <><span className="spinner spinner-sm" /> Creating account…</> : <>Create account <FaArrowRight size={12} /></>}
                        </button>
                    </form>

                    <p className="ov-auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Register;
