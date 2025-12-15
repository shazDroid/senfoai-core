import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUserPlus, FiMail, FiUser, FiShield, FiGrid } from 'react-icons/fi';
import { debugLog } from '../../utils/debugLog';
import NamespaceSearch from './NamespaceSearch';

const InviteUserModal = ({ isOpen, onClose, onSuccess, adminMode = false }) => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        globalRole: 'USER',
        namespaceId: '',
        namespaceRole: 'USER'
    });
    const [namespaces, setNamespaces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchNamespaces();
            setFormData({
                email: '',
                name: '',
                globalRole: 'USER',
                namespaceId: '',
                namespaceRole: 'USER'
            });
            setError('');
        }
    }, [isOpen, adminMode]);

    const fetchNamespaces = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (adminMode) {
                // For admins, get namespaces from their JWT token
                const meRes = await fetch('/api/auth/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (meRes.ok) {
                    const userData = await meRes.json();
                    // Filter to only namespaces where user is ADMIN
                    const adminNamespaces = (userData.namespaces || [])
                        .filter(ns => ns.role === 'ADMIN')
                        .map(ns => ({ id: ns.id, name: ns.slug, slug: ns.slug }));
                    setNamespaces(adminNamespaces);
                }
            } else {
                // For superusers, get all namespaces
                const res = await fetch('/api/super/namespaces', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setNamespaces(data || []);
                }
            }
        } catch (err) {
            debugLog('Error fetching namespaces:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('senfo-jwt');
            
            if (adminMode) {
                // Admin mode: use admin endpoint, namespaceId is required
                if (!formData.namespaceId) {
                    throw new Error('Please select a namespace');
                }

                const res = await fetch(`/api/admin/namespaces/${formData.namespaceId}/users`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        name: formData.name || undefined,
                        namespaceRole: formData.namespaceRole
                    })
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to create user');
                }

                const newUser = await res.json();
                debugLog('User created:', newUser);
                onSuccess?.(newUser);
                onClose();
            } else {
                // Superuser mode: use super endpoint
                const payload = {
                    email: formData.email,
                    name: formData.name || undefined,
                    globalRole: formData.globalRole
                };

                // Add namespace assignment if selected
                if (formData.namespaceId) {
                    payload.namespaceId = formData.namespaceId;
                    payload.namespaceRole = formData.namespaceRole;
                }

                const res = await fetch('/api/super/users', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.message || 'Failed to create user');
                }

                const newUser = await res.json();
                debugLog('User created:', newUser);
                onSuccess?.(newUser);
                onClose();
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="glass-panel"
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        padding: '2rem',
                        margin: '1rem'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '0.75rem',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#60a5fa'
                            }}>
                                <FiUserPlus size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    Invite User
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    Add a new user to the system
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.5rem'
                            }}
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            color: '#f87171',
                            marginBottom: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        {/* Email Field */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <FiMail size={14} /> Email Address *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="user@example.com"
                                required
                                className="input-field"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Name Field */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <FiUser size={14} /> Display Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                className="input-field"
                                style={{ width: '100%' }}
                            />
                        </div>

                        {/* Global Role Field - Only for superusers */}
                        {!adminMode && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                    <FiShield size={14} /> Global Role
                                </label>
                                <select
                                    value={formData.globalRole}
                                    onChange={(e) => setFormData({ ...formData, globalRole: e.target.value })}
                                    className="select-field"
                                    style={{ width: '100%' }}
                                >
                                    <option value="USER">User</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SUPERUSER">Superuser</option>
                                </select>
                            </div>
                        )}

                        {/* Namespace Assignment */}
                        <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                <FiGrid size={14} /> Namespace Assignment {adminMode ? '' : '(Optional)'}
                            </label>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Namespace
                                    </label>
                                    <NamespaceSearch
                                        namespaces={namespaces}
                                        selectedNamespace={formData.namespaceId}
                                        onSelect={(ns) => setFormData({ ...formData, namespaceId: ns?.id || '' })}
                                        placeholder="Search namespaces..."
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Role in Namespace
                                    </label>
                                    <select
                                        value={formData.namespaceRole}
                                        onChange={(e) => setFormData({ ...formData, namespaceRole: e.target.value })}
                                        className="select-field"
                                        style={{ width: '100%', height: '38px' }}
                                        disabled={!formData.namespaceId}
                                    >
                                        <option value="USER">User</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-main)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontWeight: 500
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !formData.email}
                                className="primary-btn"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    opacity: (isLoading || !formData.email) ? 0.6 : 1
                                }}
                            >
                                {isLoading ? 'Creating...' : (
                                    <>
                                        <FiUserPlus size={16} />
                                        Invite User
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InviteUserModal;

