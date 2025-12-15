import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiSearch, FiMoreHorizontal, FiShield, FiFilter, FiMail, FiUserPlus, FiDownload, FiChevronLeft, FiChevronRight, FiUser, FiEdit2, FiUserX, FiUserCheck, FiGrid, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import InviteUserModal from '../components/users/InviteUserModal';
import EditUserModal from '../components/users/EditUserModal';

const AllUsers = () => {
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
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchUsers();
    }, [currentPage]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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

    const handleQuickStatusChange = async (userId, newStatus) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/super/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchUsers();
            }
        } catch (err) {
            setError(err.message);
        }
        setOpenDropdownId(null);
    };

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            const offset = (currentPage - 1) * usersPerPage;
            const res = await fetch(`/api/super/users?limit=${usersPerPage}&offset=${offset}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch users');

            const data = await res.json();
            setUsers(data.users || []);
            setTotalUsers(data.total || 0);
        } catch (err) {
            setError(err.message);
            // Fallback to mock data for demo
            setUsers([
                { id: '1', name: 'Shahbaz A.', email: 'admin@meta.com', globalRole: 'ADMIN', status: 'ACTIVE', namespaces: [{ id: 'ns1', role: 'ADMIN' }] },
                { id: '2', name: 'Super Admin', email: 'super@senfo.ai', globalRole: 'SUPERUSER', status: 'ACTIVE', namespaces: [] },
                { id: '3', name: 'John Doe', email: 'john@example.com', globalRole: 'USER', status: 'ACTIVE', namespaces: [{ id: 'ns2', role: 'USER' }] },
                { id: '4', name: 'Alice Smith', email: 'alice@corp.com', globalRole: 'ADMIN', status: 'ACTIVE', namespaces: [{ id: 'ns1', role: 'ADMIN' }] },
                { id: '5', name: 'Bob Wilson', email: 'bob@dev.io', globalRole: 'USER', status: 'SUSPENDED', namespaces: [{ id: 'ns3', role: 'USER' }] },
            ]);
            setTotalUsers(5);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase())
    );

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

    const getStatusStyle = (status) => {
        if (status === 'ACTIVE') {
            return { dot: '#22c55e', shadow: '0 0 8px rgba(34, 197, 94, 0.5)' };
        }
        return { dot: '#6b7280', shadow: 'none' };
    };

    const totalPages = Math.ceil(totalUsers / usersPerPage);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%' }}
        >
            {/* Header */}
            <motion.div variants={item} style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Administration</span>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FiUsers style={{ color: 'var(--primary)' }} />
                            System Users
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>View and manage all users across all namespaces.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            style={{
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-main)',
                                border: '1px solid var(--border-main)',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                        >
                            <FiDownload size={16} />
                            Export CSV
                        </button>
                        <button 
                            className="primary-btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            onClick={() => setShowInviteModal(true)}
                        >
                            <FiUserPlus size={16} />
                            Invite User
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div variants={item} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: '#60a5fa' }}>
                            <FiUsers size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{totalUsers}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Users</div>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.5rem', color: '#a78bfa' }}>
                            <FiShield size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {users.filter(u => u.globalRole === 'SUPERUSER').length}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Superusers</div>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e' }}>
                            <FiUser size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {users.filter(u => u.status === 'ACTIVE').length}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <motion.div variants={item} className="glass-panel" style={{ overflow: 'hidden' }}>
                {/* Toolbar */}
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <FiSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <button
                        style={{
                            padding: '0.75rem',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FiFilter size={18} />
                    </button>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading users...
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role & Access</th>
                                    <th>Namespaces</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <React.Fragment key={user.id}>
                                        <tr>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, var(--bg-subtle), var(--bg-dark))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--text-main)',
                                                        fontWeight: 'bold',
                                                        border: '1px solid var(--border-main)',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{user.name || 'Unknown'}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <FiMail size={10} /> {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.375rem',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '1rem',
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: getStatusStyle(user.status).dot,
                                                        boxShadow: getStatusStyle(user.status).shadow
                                                    }} />
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                        {user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', position: 'relative' }}>
                                                <button 
                                                    onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                                                    style={{
                                                        padding: '0.5rem',
                                                        background: openDropdownId === user.id ? 'var(--bg-subtle)' : 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        borderRadius: 'var(--radius-md)'
                                                    }}
                                                >
                                                    <FiMoreHorizontal size={18} />
                                                </button>
                                                
                                                {/* Actions Dropdown */}
                                                {openDropdownId === user.id && (
                                                    <div
                                                        ref={dropdownRef}
                                                        style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: '100%',
                                                            minWidth: '180px',
                                                            background: 'var(--bg-panel)',
                                                            border: '1px solid var(--border-main)',
                                                            borderRadius: '0.5rem',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                            zIndex: 100,
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.75rem 1rem',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--text-main)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                fontSize: '0.875rem',
                                                                textAlign: 'left'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-subtle)'}
                                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                        >
                                                            <FiEdit2 size={14} />
                                                            Edit User
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditUser(user)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.75rem 1rem',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--text-main)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                fontSize: '0.875rem',
                                                                textAlign: 'left'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-subtle)'}
                                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                        >
                                                            <FiGrid size={14} />
                                                            Manage Namespaces
                                                        </button>
                                                        <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '0.25rem 0' }} />
                                                        {user.status === 'ACTIVE' ? (
                                                            <button
                                                                onClick={() => handleQuickStatusChange(user.id, 'SUSPENDED')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.75rem 1rem',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#f87171',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    fontSize: '0.875rem',
                                                                    textAlign: 'left'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.background = 'rgba(248, 113, 113, 0.1)'}
                                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                            >
                                                                <FiUserX size={14} />
                                                                Suspend User
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleQuickStatusChange(user.id, 'ACTIVE')}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.75rem 1rem',
                                                                    background: 'transparent',
                                                                    border: 'none',
                                                                    color: '#22c55e',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    fontSize: '0.875rem',
                                                                    textAlign: 'left'
                                                                }}
                                                                onMouseEnter={(e) => e.target.style.background = 'rgba(34, 197, 94, 0.1)'}
                                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                            >
                                                                <FiUserCheck size={14} />
                                                                Activate User
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        
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
                )}

                {/* Footer / Pagination */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)'
                }}>
                    <span>
                        Showing {Math.min((currentPage - 1) * usersPerPage + 1, totalUsers)}-{Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            style={{
                                padding: '0.5rem 0.75rem',
                                background: currentPage === 1 ? 'transparent' : 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-main)',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentPage === 1 ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            <FiChevronLeft size={16} /> Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            style={{
                                padding: '0.5rem 0.75rem',
                                background: currentPage >= totalPages ? 'transparent' : 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: currentPage >= totalPages ? 'var(--text-muted)' : 'var(--text-main)',
                                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                                opacity: currentPage >= totalPages ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            Next <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Invite User Modal */}
            <InviteUserModal 
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onSuccess={() => {
                    fetchUsers();
                    setShowInviteModal(false);
                }}
            />

            {/* Edit User Modal */}
            <EditUserModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                }}
                user={selectedUser}
                onSuccess={() => {
                    fetchUsers();
                    setShowEditModal(false);
                    setSelectedUser(null);
                }}
            />
        </motion.div>
    );
};

export default AllUsers;
