import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isEnterprise, setIsEnterprise] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const endpoint = isEnterprise ? '/api/auth/ldap/login' : '/api/auth/dev/login';

        // For Dev Login, we only send email (as per backend implementation)
        // For LDAP, we send email (mapped to username in strategy) and password
        const payload = isEnterprise ? { username: email, password } : { email };

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.access_token) {
                // Success
                window.location.href = `/auth/callback?token=${data.access_token}`;
            } else {
                alert('Login Failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Login Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <button
                    type="button"
                    onClick={() => setIsEnterprise(!isEnterprise)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: isEnterprise ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                    }}
                >
                    {isEnterprise ? 'Switch to Standard Login' : 'Login with Enterprise SSO (LDAP)'}
                </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
                <label
                    htmlFor="email"
                    style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem'
                    }}
                >
                    {isEnterprise ? 'Enterprise ID / Email' : 'Email Address'}
                </label>
                <input
                    type="email"
                    id="email"
                    className="input-field"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label
                        htmlFor="password"
                        style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.9rem'
                        }}
                    >
                        Password
                    </label>
                    <a href="#" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}>
                        Forgot password?
                    </a>
                </div>
                <input
                    type="password"
                    id="password"
                    className="input-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={isEnterprise} // Password only strictly required for LDAP
                    disabled={!isEnterprise} // Dev login doesn't check password
                    style={{ opacity: isEnterprise ? 1 : 0.5, cursor: isEnterprise ? 'text' : 'not-allowed' }}
                />
            </div>

            <motion.button
                type="submit"
                className="primary-btn"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ width: '100%' }}
                disabled={loading}
            >
                {loading ? 'Authenticating...' : (isEnterprise ? 'Sign in with LDAP' : 'Sign in (Dev)')}
            </motion.button>
        </form>
    );
};

export default LoginForm;
