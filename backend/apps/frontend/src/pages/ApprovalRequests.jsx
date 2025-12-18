import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    FiTrash2, FiCheck, FiX, FiClock, FiUser, FiDatabase,
    FiRefreshCw, FiAlertTriangle, FiLayers, FiGitBranch,
    FiCalendar, FiInbox
} from 'react-icons/fi';

// Enable debug logging
const DEBUG = true;
const debugLog = (...args) => {
    if (DEBUG) console.log('[ApprovalRequests]', ...args);
};

const ApprovalRequests = () => {
    const [pendingDeletions, setPendingDeletions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState(new Set());

    useEffect(() => {
        fetchPendingDeletions();
    }, []);

    const fetchPendingDeletions = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch('/api/super/pending-deletions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                debugLog('Pending deletions:', data);
                setPendingDeletions(data || []);
            } else {
                debugLog('Failed to fetch pending deletions:', res.status);
            }
        } catch (err) {
            debugLog('Error fetching pending deletions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (repoId, repoName) => {
        if (!window.confirm(`Are you sure you want to APPROVE deletion of "${repoName}"? This action cannot be undone.`)) {
            return;
        }

        setProcessingIds(prev => new Set([...prev, repoId]));
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/super/repos/${repoId}/approve-delete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                await fetchPendingDeletions();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to approve deletion');
            }
        } catch (err) {
            debugLog('Approve error:', err);
            alert('Failed to approve deletion');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(repoId);
                return next;
            });
        }
    };

    const handleReject = async (repoId, repoName) => {
        if (!window.confirm(`Reject deletion request for "${repoName}"? The repository will remain active.`)) {
            return;
        }

        setProcessingIds(prev => new Set([...prev, repoId]));
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/super/repos/${repoId}/reject-delete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                await fetchPendingDeletions();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Failed to reject deletion');
            }
        } catch (err) {
            debugLog('Reject error:', err);
            alert('Failed to reject deletion');
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(repoId);
                return next;
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%', maxWidth: '1200px' }}
        >
            {/* Header */}
            <motion.div variants={item} style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Administration</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                            Approval Requests
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Review and approve pending actions from namespace admins.
                        </p>
                    </div>
                    <button
                        onClick={fetchPendingDeletions}
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-muted)',
                            cursor: isLoading ? 'wait' : 'pointer',
                            fontSize: '0.875rem',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        <FiRefreshCw size={14} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                        Refresh
                    </button>
                </div>
            </motion.div>

            {/* Stats Summary */}
            <motion.div
                variants={item}
                className="glass-panel"
                style={{
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        padding: '0.625rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: '0.5rem',
                        color: '#ef4444'
                    }}>
                        <FiTrash2 size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            {pendingDeletions.length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Pending Deletions
                        </div>
                    </div>
                </div>
                {pendingDeletions.length > 0 && (
                    <div style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#f59e0b'
                    }}>
                        <FiAlertTriangle size={16} />
                        Requires your attention
                    </div>
                )}
            </motion.div>

            {/* Pending Deletions List */}
            <motion.div variants={item}>
                <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--text-muted)',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <FiTrash2 size={14} />
                    Repository Deletion Requests
                </h3>

                {isLoading ? (
                    <div className="glass-panel" style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <FiRefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '0.5rem' }} />
                        <div>Loading pending requests...</div>
                    </div>
                ) : pendingDeletions.length === 0 ? (
                    <div className="glass-panel" style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <FiInbox size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
                            No pending requests
                        </div>
                        <div style={{ fontSize: '0.875rem' }}>
                            All approval requests have been processed.
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {pendingDeletions.map((repo) => (
                            <motion.div
                                key={repo.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-panel"
                                style={{ padding: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    {/* Left side - Repo info */}
                                    <div style={{ flex: 1, minWidth: '300px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                            <div style={{
                                                padding: '0.5rem',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                borderRadius: '0.5rem',
                                                color: '#ef4444'
                                            }}>
                                                <FiDatabase size={18} />
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.125rem' }}>
                                                    {repo.name}
                                                </h4>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                                    {repo.gitUrl}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Metadata Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            background: 'var(--bg-subtle)',
                                            borderRadius: 'var(--radius-sm)',
                                            marginTop: '0.75rem'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                                    <FiGitBranch size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                    Branch
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                    {repo.defaultBranch || 'main'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                                    <FiUser size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                    Requested By
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                    {repo.requestedBy?.name || repo.requestedBy?.email || 'Unknown'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                                    <FiClock size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                    Requested
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                    {formatTimeAgo(repo.requestedAt)}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                                                    <FiLayers size={10} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                                    Namespaces
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                                    {repo.namespaces?.length || 0}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Namespaces Tags */}
                                        {repo.namespaces && repo.namespaces.length > 0 && (
                                            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                                {repo.namespaces.map(ns => (
                                                    <span
                                                        key={ns.id}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.25rem 0.5rem',
                                                            background: 'var(--bg-panel)',
                                                            border: '1px solid var(--border-main)',
                                                            borderRadius: '0.25rem',
                                                            color: 'var(--text-muted)'
                                                        }}
                                                    >
                                                        {ns.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right side - Actions */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem',
                                        minWidth: '160px'
                                    }}>
                                        <button
                                            onClick={() => handleApprove(repo.id, repo.name)}
                                            disabled={processingIds.has(repo.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.25rem',
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'white',
                                                cursor: processingIds.has(repo.id) ? 'wait' : 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                opacity: processingIds.has(repo.id) ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <FiCheck size={16} />
                                            Approve Delete
                                        </button>
                                        <button
                                            onClick={() => handleReject(repo.id, repo.name)}
                                            disabled={processingIds.has(repo.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.5rem',
                                                padding: '0.75rem 1.25rem',
                                                background: 'transparent',
                                                border: '1px solid var(--border-main)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-main)',
                                                cursor: processingIds.has(repo.id) ? 'wait' : 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                opacity: processingIds.has(repo.id) ? 0.6 : 1,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <FiX size={16} />
                                            Reject Request
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

export default ApprovalRequests;
