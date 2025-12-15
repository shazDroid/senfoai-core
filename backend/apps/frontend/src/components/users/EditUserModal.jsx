import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiShield, FiToggleLeft, FiSave, FiGrid, FiSearch } from 'react-icons/fi';
import { debugLog } from '../../utils/debugLog';

const EditUserModal = ({ isOpen, onClose, user, onSuccess, adminMode = false }) => {
    const [formData, setFormData] = useState({
        globalRole: 'USER',
        status: 'ACTIVE'
    });
    const [namespaces, setNamespaces] = useState([]);
    const [userNamespaces, setUserNamespaces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('role'); // 'role' | 'namespaces'
    const [namespaceSearch, setNamespaceSearch] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            debugLog('EditUserModal - User data:', user);
            debugLog('EditUserModal - Admin mode:', adminMode);
            debugLog('EditUserModal - User namespaces:', user.namespaces);
            
            setFormData({
                globalRole: user.globalRole || 'USER',
                status: user.status || 'ACTIVE'
            });
            setError('');
            setNamespaceSearch('');
            setActiveTab('role');
            fetchNamespaces();
            
            // For admin mode, use namespaces from user object if available
            if (adminMode) {
                if (user.namespaces && Array.isArray(user.namespaces) && user.namespaces.length > 0) {
                    // Map the namespaces array to the format expected by the component
                    // Backend returns: { id, name, slug, role }
                    // Component expects: { namespace: { id, name, slug }, namespaceRole }
                    const mappedNamespaces = user.namespaces.map(ns => ({
                        id: ns.id, // This is the namespace ID
                        namespace: {
                            id: ns.id,
                            name: ns.name || ns.slug,
                            slug: ns.slug
                        },
                        namespaceRole: ns.role || 'USER'
                    }));
                    debugLog('Mapped user namespaces:', mappedNamespaces);
                    setUserNamespaces(mappedNamespaces);
                } else {
                    // Admin mode but no namespaces - set empty array
                    debugLog('No namespaces found for user in admin mode');
                    setUserNamespaces([]);
                }
            } else {
                // Superuser mode - fetch from API
                fetchUserDetails();
            }
        }
    }, [isOpen, user, adminMode]);

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

    const fetchUserDetails = async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/super/users/${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUserNamespaces(data.namespaceMemberships || []);
            }
        } catch (err) {
            debugLog('Error fetching user details:', err);
        }
    };

    const handleSaveRole = async () => {
        setError('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('senfo-jwt');

            // Update global role
            const roleRes = await fetch(`/api/super/users/${user.id}/global-role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ globalRole: formData.globalRole })
            });

            if (!roleRes.ok) {
                const errData = await roleRes.json();
                throw new Error(errData.message || 'Failed to update role');
            }

            // Update status
            const statusRes = await fetch(`/api/super/users/${user.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: formData.status })
            });

            if (!statusRes.ok) {
                const errData = await statusRes.json();
                throw new Error(errData.message || 'Failed to update status');
            }

            debugLog('User updated successfully');
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssignNamespace = async (namespaceId, role) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const endpoint = adminMode 
                ? `/api/admin/namespaces/${namespaceId}/members`
                : `/api/super/namespaces/${namespaceId}/members`;
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user.id, role })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to assign namespace');
            }

            // Refresh user details
            if (adminMode && user.namespaces) {
                // Update local state with new namespace
                const updatedNamespaces = [...userNamespaces, {
                    id: namespaceId,
                    namespace: namespaces.find(ns => ns.id === namespaceId),
                    namespaceRole: role
                }];
                setUserNamespaces(updatedNamespaces);
                // Also update the user object passed from parent
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                fetchUserDetails();
            }
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRemoveNamespace = async (namespaceId) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const endpoint = adminMode
                ? `/api/admin/namespaces/${namespaceId}/members/${user.id}`
                : `/api/super/namespaces/${namespaceId}/members/${user.id}`;
            
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to remove namespace');
            }

            // Refresh user details
            if (adminMode) {
                // Update local state by removing the namespace
                const updatedNamespaces = userNamespaces.filter(ns => ns.id !== namespaceId);
                setUserNamespaces(updatedNamespaces);
                // Also update the user object passed from parent
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                fetchUserDetails();
            }
        } catch (err) {
            setError(err.message);
        }
    };

    if (!isOpen || !user) return null;

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'SUPERUSER':
                return { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' };
            case 'ADMIN':
                return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
            default:
                return { background: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', border: '1px solid rgba(107, 114, 128, 0.3)' };
        }
    };

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
                        maxWidth: '550px',
                        padding: '0',
                        margin: '1rem',
                        overflow: 'hidden'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--bg-subtle), var(--bg-dark))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-main)',
                                    fontWeight: 'bold',
                                    border: '2px solid var(--border-main)',
                                    fontSize: '1.25rem'
                                }}>
                                    {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        {user.name || 'Unknown User'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        {user.email}
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
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)' }}>
                        <button
                            onClick={() => setActiveTab('role')}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'role' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'role' ? 'var(--text-main)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <FiShield size={16} /> Role & Status
                        </button>
                        <button
                            onClick={() => setActiveTab('namespaces')}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'namespaces' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'namespaces' ? 'var(--text-main)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <FiGrid size={16} /> Namespaces
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem' }}>
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

                        {activeTab === 'role' && (
                            <div>
                                {/* Global Role */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        <FiShield size={14} /> Global Role
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['USER', 'ADMIN', 'SUPERUSER'].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setFormData({ ...formData, globalRole: role })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    borderRadius: '0.5rem',
                                                    border: formData.globalRole === role ? '2px solid var(--primary)' : '1px solid var(--border-main)',
                                                    background: formData.globalRole === role ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-subtle)',
                                                    color: 'var(--text-main)',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Status */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        <FiToggleLeft size={14} /> Account Status
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setFormData({ ...formData, status })}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.75rem',
                                                    borderRadius: '0.5rem',
                                                    border: formData.status === status ? '2px solid var(--primary)' : '1px solid var(--border-main)',
                                                    background: formData.status === status ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-subtle)',
                                                    color: status === 'SUSPENDED' ? '#f87171' : status === 'ACTIVE' ? '#22c55e' : 'var(--text-main)',
                                                    cursor: 'pointer',
                                                    fontWeight: 500,
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Save Button */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                                    <button
                                        onClick={handleSaveRole}
                                        disabled={isLoading}
                                        className="primary-btn"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        {isLoading ? 'Saving...' : (
                                            <>
                                                <FiSave size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'namespaces' && (
                            <div>
                                {/* Current Namespaces */}
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        Current Memberships ({userNamespaces.length})
                                    </h4>
                                    {userNamespaces.length === 0 ? (
                                        <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                                            No namespace memberships
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {userNamespaces.map(membership => (
                                                <div
                                                    key={membership.namespace.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.75rem 1rem',
                                                        background: 'var(--bg-subtle)',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--border-subtle)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <FiGrid size={16} style={{ color: 'var(--text-muted)' }} />
                                                        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                                            {membership.namespace.name}
                                                        </span>
                                                        <span style={{
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 500,
                                                            ...getRoleBadgeStyle(membership.namespaceRole)
                                                        }}>
                                                            {membership.namespaceRole}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemoveNamespace(membership.namespace.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#f87171',
                                                            cursor: 'pointer',
                                                            padding: '0.25rem',
                                                            fontSize: '0.75rem'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Add to Namespace */}
                                <div>
                                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                        Add to Namespace
                                    </h4>
                                    {/* Search Input */}
                                    <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                                        <FiSearch 
                                            size={14} 
                                            style={{ 
                                                position: 'absolute', 
                                                left: '0.75rem', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                color: 'var(--text-muted)',
                                                pointerEvents: 'none'
                                            }} 
                                        />
                                        <input
                                            type="text"
                                            value={namespaceSearch}
                                            onChange={(e) => setNamespaceSearch(e.target.value)}
                                            placeholder="Search namespaces..."
                                            className="input-field"
                                            style={{ width: '100%', paddingLeft: '2.25rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                                        {namespaces
                                            .filter(ns => !userNamespaces.some(um => um.namespace.id === ns.id))
                                            .filter(ns => 
                                                ns.name.toLowerCase().includes(namespaceSearch.toLowerCase()) ||
                                                ns.slug?.toLowerCase().includes(namespaceSearch.toLowerCase())
                                            )
                                            .map(ns => (
                                                <div
                                                    key={ns.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.75rem 1rem',
                                                        background: 'var(--bg-subtle)',
                                                        borderRadius: '0.5rem',
                                                        border: '1px solid var(--border-subtle)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <FiGrid size={16} style={{ color: 'var(--text-muted)' }} />
                                                        <span style={{ color: 'var(--text-main)' }}>{ns.name}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <button
                                                            onClick={() => handleAssignNamespace(ns.id, 'USER')}
                                                            style={{
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '0.25rem',
                                                                border: '1px solid var(--border-main)',
                                                                background: 'transparent',
                                                                color: 'var(--text-muted)',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            + User
                                                        </button>
                                                        <button
                                                            onClick={() => handleAssignNamespace(ns.id, 'ADMIN')}
                                                            style={{
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '0.25rem',
                                                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                                                background: 'rgba(59, 130, 246, 0.1)',
                                                                color: '#60a5fa',
                                                                cursor: 'pointer',
                                                                fontSize: '0.75rem'
                                                            }}
                                                        >
                                                            + Admin
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        {namespaces
                                            .filter(ns => !userNamespaces.some(um => um.namespace.id === ns.id))
                                            .filter(ns => 
                                                ns.name.toLowerCase().includes(namespaceSearch.toLowerCase()) ||
                                                ns.slug?.toLowerCase().includes(namespaceSearch.toLowerCase())
                                            ).length === 0 && (
                                            <div style={{ padding: '1rem', background: 'var(--bg-subtle)', borderRadius: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
                                                {namespaceSearch 
                                                    ? 'No namespaces match your search' 
                                                    : 'User is assigned to all namespaces'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default EditUserModal;

