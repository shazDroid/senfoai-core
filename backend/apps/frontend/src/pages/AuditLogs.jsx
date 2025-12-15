import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiActivity, FiSearch, FiUser, FiClock, FiShield, FiDatabase, FiUsers, FiGrid, FiKey, FiAlertTriangle, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { debugLog } from '../utils/debugLog';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [expandedLogs, setExpandedLogs] = useState(new Set());
    const pageSize = 20;

    const toggleExpand = (logId) => {
        setExpandedLogs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('senfo-jwt');
            const params = new URLSearchParams({
                limit: pageSize.toString(),
                offset: (page * pageSize).toString()
            });
            if (actionFilter) params.append('action', actionFilter);

            const res = await fetch(`/api/super/audit-logs?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                debugLog('Audit logs API response:', data);
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            } else {
                const errText = await res.text();
                debugLog('Failed to fetch audit logs:', res.status, errText);
            }
        } catch (error) {
            debugLog('Error fetching audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, actionFilter]);

    const getActionIcon = (action) => {
        const icons = {
            'LOGIN': FiUser,
            'NAMESPACE_CREATED': FiGrid,
            'MEMBERSHIP_ASSIGNED': FiUsers,
            'MEMBERSHIP_REVOKED': FiUsers,
            'GLOBAL_ROLE_CHANGED': FiShield,
            'REPO_ADDED': FiDatabase,
            'REPO_REMOVED': FiDatabase,
            'IAM_MAPPING_CREATED': FiKey,
            'IAM_MAPPING_DELETED': FiKey,
            'ACCESS_DENIED': FiAlertTriangle,
            'USER_CREATED': FiUser,
            'USER_STATUS_CHANGED': FiUser,
            'ORGANIZATION_UPDATED': FiShield,
            'SEED_COMPLETED': FiDatabase,
            'BOOTSTRAP_SUPERUSER_CREATED': FiShield
        };
        return icons[action] || FiActivity;
    };

    const getActionColor = (action) => {
        if (action.includes('DENIED') || action.includes('REMOVED') || action.includes('REVOKED')) {
            return 'text-red-400 bg-red-500/10';
        }
        if (action.includes('CREATED') || action.includes('ADDED') || action.includes('ASSIGNED')) {
            return 'text-green-400 bg-green-500/10';
        }
        if (action.includes('CHANGED') || action.includes('UPDATED')) {
            return 'text-yellow-400 bg-yellow-500/10';
        }
        return 'text-blue-400 bg-blue-500/10';
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const filteredLogs = logs.filter(log => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            log.action?.toLowerCase().includes(searchLower) ||
            log.actor?.email?.toLowerCase().includes(searchLower) ||
            log.actor?.name?.toLowerCase().includes(searchLower) ||
            log.targetType?.toLowerCase().includes(searchLower)
        );
    });

    const uniqueActions = [...new Set(logs.map(log => log.action))];

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%' }}
        >
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Security & Compliance</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                    Audit Logs
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    Track all security-relevant actions across the platform.
                </p>
            </div>

            {/* Stats Summary */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem' }}>
                            <FiActivity size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Events</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>{total}</p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '0.5rem' }}>
                            <FiUser size={20} color="#10b981" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Login Events</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                {logs.filter(l => l.action === 'LOGIN').length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <FiAlertTriangle size={20} color="#ef4444" />
                        </div>
                        <div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Access Denied</p>
                            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                {logs.filter(l => l.action === 'ACCESS_DENIED').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {/* Table Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                            <FiActivity size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' }}>Activity Log</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {/* Search */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            minWidth: '250px'
                        }}>
                            <FiSearch style={{ color: 'var(--text-muted)' }} size={16} />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>
                        {/* Action Filter */}
                        <select
                            value={actionFilter}
                            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
                            className="select-field"
                        >
                            <option value="">All Actions</option>
                            <option value="LOGIN">Login</option>
                            <option value="NAMESPACE_CREATED">Namespace Created</option>
                            <option value="MEMBERSHIP_ASSIGNED">Membership Assigned</option>
                            <option value="MEMBERSHIP_REVOKED">Membership Revoked</option>
                            <option value="GLOBAL_ROLE_CHANGED">Role Changed</option>
                            <option value="REPO_ADDED">Repo Added</option>
                            <option value="ACCESS_DENIED">Access Denied</option>
                            <option value="SEED_COMPLETED">Seed Completed</option>
                        </select>
                    </div>
                </div>

                {/* Logs List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Loading audit logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <FiActivity size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                            <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No audit logs found</p>
                            <p style={{ fontSize: '0.875rem' }}>Activity will appear here as users interact with the platform.</p>
                        </div>
                    ) : (
                        filteredLogs.map((log, index) => {
                            const ActionIcon = getActionIcon(log.action);
                            const colorClass = getActionColor(log.action);
                            const isExpanded = expandedLogs.has(log.id);
                            const hasDetails = log.metadata && Object.keys(log.metadata).length > 0;
                            
                            return (
                                <motion.div
                                    key={log.id || index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-subtle)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Main Row */}
                                    <div
                                        onClick={() => hasDetails && toggleExpand(log.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '1rem',
                                            cursor: hasDetails ? 'pointer' : 'default'
                                        }}
                                    >
                                        {/* Action Icon */}
                                        <div className={`${colorClass} p-2 rounded-lg`}>
                                            <ActionIcon size={18} />
                                        </div>

                                        {/* Action Details */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                                                    {formatAction(log.action)}
                                                </span>
                                                {log.targetType && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.125rem 0.5rem',
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        borderRadius: '0.25rem',
                                                        color: 'var(--text-muted)'
                                                    }}>
                                                        {log.targetType}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {log.actor ? (
                                                    <>by <strong>{log.actor.name || log.actor.email}</strong></>
                                                ) : (
                                                    'System'
                                                )}
                                                {hasDetails && !isExpanded && (
                                                    <span style={{ marginLeft: '0.5rem' }}>
                                                        • {JSON.stringify(log.metadata).substring(0, 60)}...
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Timestamp */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <FiClock size={14} />
                                            {formatDate(log.createdAt)}
                                        </div>

                                        {/* Expand/Collapse Button */}
                                        {hasDetails && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(log.id); }}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    padding: '0.375rem',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                            </button>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && hasDetails && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{
                                                borderTop: '1px solid var(--border-subtle)',
                                                padding: '1rem',
                                                background: 'rgba(0, 0, 0, 0.2)'
                                            }}
                                        >
                                            <div style={{ marginBottom: '0.75rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Full Details
                                                </span>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Log ID</span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{log.id}</span>
                                                </div>
                                                <div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Actor ID</span>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{log.actorId || 'N/A'}</span>
                                                </div>
                                                {log.targetId && (
                                                    <div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Target ID</span>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>{log.targetId}</span>
                                                    </div>
                                                )}
                                                {log.targetType && (
                                                    <div>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Target Type</span>
                                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{log.targetType}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Metadata</span>
                                                <pre style={{
                                                    fontSize: '0.8rem',
                                                    color: 'var(--text-main)',
                                                    background: 'rgba(0, 0, 0, 0.3)',
                                                    padding: '0.75rem',
                                                    borderRadius: '0.375rem',
                                                    overflow: 'auto',
                                                    maxHeight: '200px',
                                                    whiteSpace: 'pre-wrap',
                                                    wordBreak: 'break-all',
                                                    fontFamily: 'monospace',
                                                    margin: 0
                                                }}>
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {total > pageSize && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-main)',
                                background: page === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                                color: page === 0 ? 'var(--text-muted)' : 'var(--text-main)',
                                cursor: page === 0 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Previous
                        </button>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            Page {page + 1} of {Math.ceil(total / pageSize)}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={(page + 1) * pageSize >= total}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                border: '1px solid var(--border-main)',
                                background: (page + 1) * pageSize >= total ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                                color: (page + 1) * pageSize >= total ? 'var(--text-muted)' : 'var(--text-main)',
                                cursor: (page + 1) * pageSize >= total ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AuditLogs;

