import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiSearch, FiMoreHorizontal, FiShield, FiFilter, FiMail, FiUserPlus, FiDownload, FiChevronLeft, FiChevronRight, FiUser, FiEdit2, FiUserX, FiUserCheck, FiGrid, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import InviteUserModal from '../components/users/InviteUserModal';
import EditUserModal from '../components/users/EditUserModal';
import { getCurrentUserId } from '../utils/auth';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const usersPerPage = 10;
    
    // Modal states
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [expandedRowId, setExpandedRowId] = useState(null);
    const dropdownRefs = useRef({});

    useEffect(() => {
        fetchUsers();
    }, [currentPage]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside any dropdown
            const clickedOutsideAll = Object.values(dropdownRefs.current).every(ref => {
                return !ref || !ref.contains(event.target);
            });
            
            if (clickedOutsideAll) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setShowEditModal(true);
        setOpenDropdownId(null);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch users');

            const data = await res.json();
            const currentUserId = getCurrentUserId();
            // Filter out the current logged-in user from the list
            const filteredUsers = (data.users || []).filter(user => user.id !== currentUserId);
            setUsers(filteredUsers);
            setTotalUsers(filteredUsers.length);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteUserClick = () => {
        setShowInviteModal(true);
    };

    const handleUserCreated = () => {
        fetchUsers();
    };

    const handleUserUpdated = () => {
        fetchUsers();
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'SUPERUSER':
                return { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' };
            case 'ADMIN':
                return { background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' };
            default:
                return { background: 'rgba(107, 114, 128, 0.15)', color: '#9ca3af', border: '1px solid rgba(107, 114, 128, 0.3)' };
        }
    };

    const filteredUsers = users.filter(user => {
        const searchLower = search.toLowerCase();
        return (
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower)
        );
    });

    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * usersPerPage,
        currentPage * usersPerPage
    );

    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading users...
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem 3rem', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FiUsers size={28} />
                        Namespace Users
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>View and manage users in your namespaces.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="glass-panel"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-main)',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <FiDownload size={16} />
                        Export CSV
                    </button>
                    <button
                        onClick={handleInviteUserClick}
                        className="primary-btn"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FiUserPlus size={16} />
                        Invite User
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '0.75rem',
                            background: 'rgba(59, 130, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa'
                        }}>
                            <FiUsers size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {totalUsers}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Users</div>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '0.75rem',
                            background: 'rgba(59, 130, 246, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#60a5fa'
                        }}>
                            <FiShield size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {users.filter(u => u.globalRole === 'ADMIN').length}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Admins</div>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '0.75rem',
                            background: 'rgba(34, 197, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4ade80'
                        }}>
                            <FiUserCheck size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {users.filter(u => u.status === 'ACTIVE').length}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Active</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <FiSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{ width: '100%', paddingLeft: '3rem' }}
                    />
                    <button
                        style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.5rem'
                        }}
                    >
                        <FiFilter size={18} />
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel" style={{ overflow: 'visible' }}>
                <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role & Access</th>
                            <th>Namespaces</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    {search ? 'No users found matching your search.' : 'No users in your namespaces yet.'}
                                </td>
                            </tr>
                        ) : (
                            paginatedUsers.map((user) => (
                                <React.Fragment key={user.id}>
                                <motion.tr
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: '600',
                                                fontSize: '0.875rem'
                                            }}>
                                                {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                                                    {user.name || 'No name'}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <FiMail size={12} />
                                                    {user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            ...getRoleBadgeStyle(user.globalRole)
                                        }}>
                                            {user.globalRole === 'SUPERUSER' && <FiShield size={10} />}
                                            {user.globalRole || 'USER'}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if ((user.namespacesCount ?? user.namespaces?.length ?? 0) > 0) {
                                                    setExpandedRowId(expandedRowId === user.id ? null : user.id);
                                                    setOpenDropdownId(null); // Close dropdown if open
                                                }
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '0.75rem',
                                                background: 'rgba(59, 130, 246, 0.08)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                padding: '0.375rem 0.625rem 0.375rem 0.875rem',
                                                borderRadius: '0.5rem',
                                                fontSize: '0.8125rem',
                                                fontWeight: 400,
                                                color: 'var(--text-main)',
                                                cursor: (user.namespacesCount ?? user.namespaces?.length ?? 0) > 0 ? 'pointer' : 'default',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                userSelect: 'none',
                                                minWidth: 'fit-content'
                                            }}
                                            onMouseEnter={(e) => {
                                                if ((user.namespacesCount ?? user.namespaces?.length ?? 0) > 0) {
                                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)';
                                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)';
                                                e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                                            }}
                                        >
                                            <span style={{ 
                                                fontSize: '0.8125rem',
                                                fontWeight: 400,
                                                color: 'var(--text-muted)',
                                                letterSpacing: '0.01em'
                                            }}>
                                                namespace{(user.namespacesCount ?? user.namespaces?.length ?? 0) !== 1 ? 's' : ''}
                                            </span>
                                            <span style={{
                                                background: 'rgba(59, 130, 246, 0.15)',
                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.375rem',
                                                fontWeight: 600,
                                                fontSize: '0.75rem',
                                                color: '#60a5fa',
                                                minWidth: '1.5rem',
                                                textAlign: 'center',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: 1,
                                                flexShrink: 0
                                            }}>
                                                {user.namespacesCount ?? user.namespaces?.length ?? 0}
                                            </span>
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.25rem',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            background: user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: user.status === 'ACTIVE' ? '#4ade80' : '#f87171',
                                            border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}>
                                            {user.status === 'ACTIVE' ? <FiUserCheck size={12} /> : <FiUserX size={12} />}
                                            {user.status || 'ACTIVE'}
                                        </span>
                                    </td>
                                    <td>
                                        <div 
                                            ref={(el) => {
                                                if (el) {
                                                    dropdownRefs.current[user.id] = el;
                                                } else {
                                                    delete dropdownRefs.current[user.id];
                                                }
                                            }}
                                            style={{ position: 'relative' }}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenDropdownId(openDropdownId === user.id ? null : user.id);
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.375rem',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <FiMoreHorizontal size={18} />
                                            </button>
                                            {openDropdownId === user.id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    right: 0,
                                                    top: '100%',
                                                    marginTop: '0.25rem',
                                                    background: 'var(--bg-panel)',
                                                    border: '1px solid var(--border-main)',
                                                    borderRadius: '0.5rem',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                                    zIndex: 1000,
                                                    minWidth: '180px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditUser(user);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem 1rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-main)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            textAlign: 'left'
                                                        }}
                                                        className="sidebar-link-hover"
                                                    >
                                                        <FiEdit2 size={16} />
                                                        Edit User
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditUser(user);
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.75rem',
                                                            padding: '0.75rem 1rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-main)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.875rem',
                                                            textAlign: 'left'
                                                        }}
                                                        className="sidebar-link-hover"
                                                    >
                                                        <FiUsers size={16} />
                                                        Manage Namespaces
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                                
                                {/* Expanded Row for Namespace Details */}
                                {expandedRowId === user.id && user.namespaces && user.namespaces.length > 0 && (
                                    <motion.tr
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <td colSpan={5} style={{ padding: 0, borderTop: 'none' }}>
                                            <div style={{
                                                padding: '1rem 1.5rem',
                                                background: 'var(--bg-subtle)',
                                                borderTop: '1px solid var(--border-subtle)'
                                            }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginBottom: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    color: 'var(--text-muted)'
                                                }}>
                                                    <FiGrid size={14} />
                                                    Assigned Namespaces
                                                </div>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                                                    gap: '0.75rem'
                                                }}>
                                                    {user.namespaces.map((ns) => (
                                                        <div
                                                            key={ns.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '0.75rem 1rem',
                                                                background: 'var(--bg-panel)',
                                                                border: '1px solid var(--border-main)',
                                                                borderRadius: '0.5rem'
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                                <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                                                    {ns.name || ns.slug}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                    {ns.slug}
                                                                </span>
                                                            </div>
                                                            <span style={{
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '0.375rem',
                                                                fontSize: '0.75rem',
                                                                fontWeight: 500,
                                                                ...getRoleBadgeStyle(ns.role === 'ADMIN' ? 'ADMIN' : 'USER')
                                                            }}>
                                                                {ns.role || 'USER'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </motion.tr>
                                )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Showing {paginatedUsers.length > 0 ? (currentPage - 1) * usersPerPage + 1 : 0}-{Math.min(currentPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="primary-btn"
                        style={{
                            opacity: currentPage === 1 ? 0.5 : 1,
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FiChevronLeft size={16} />
                        Previous
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="primary-btn"
                        style={{
                            opacity: currentPage >= totalPages ? 0.5 : 1,
                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Next
                        <FiChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showInviteModal && (
                <InviteUserModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    onSuccess={handleUserCreated}
                    adminMode={true}
                />
            )}

            {showEditModal && selectedUser && (
                <EditUserModal
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    user={selectedUser}
                    onSuccess={handleUserUpdated}
                    adminMode={true}
                />
            )}
        </div>
    );
};

export default AdminUsers;

