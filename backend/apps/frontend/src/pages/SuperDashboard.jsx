import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
    FiUsers, FiActivity, FiDatabase, FiServer, FiClock, FiShield, 
    FiAlertCircle, FiCheckCircle, FiArrowRight, FiGlobe, FiLayers,
    FiZap, FiTrendingUp, FiRefreshCw, FiSettings, FiFileText, FiUploadCloud
} from 'react-icons/fi';

const SuperDashboard = () => {
    const [stats, setStats] = useState({
        namespaces: 0,
        users: 0,
        activeUsers: 0,
        repos: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            
            // Fetch stats
            const statsRes = await fetch('/api/super/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (statsRes.ok) {
                const data = await statsRes.json();
                setStats({
                    namespaces: data.totalNamespaces || 0,
                    users: data.totalUsers || 0,
                    activeUsers: data.activeUsersLast30Days || 0,
                    repos: data.totalRepositories || 0
                });
            }

            // Fetch recent activity
            const activityRes = await fetch('/api/super/audit-logs?limit=5', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (activityRes.ok) {
                const data = await activityRes.json();
                setRecentActivity(data.logs || []);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    const quickActions = [
        { icon: FiLayers, label: 'Namespaces', path: '/dashboard/super/namespaces', color: '#3b82f6', desc: 'Manage workspaces' },
        { icon: FiUploadCloud, label: 'Repositories', path: '/dashboard/super/repos', color: '#06b6d4', desc: 'Manage repositories' },
        { icon: FiUsers, label: 'Users', path: '/dashboard/super/users', color: '#8b5cf6', desc: 'User management' },
        { icon: FiFileText, label: 'Audit Logs', path: '/dashboard/super/audit', color: '#f59e0b', desc: 'View activity' },
        { icon: FiSettings, label: 'Settings', path: '/dashboard/settings', color: '#6b7280', desc: 'System config' },
    ];

    const systemServices = [
        { name: 'MongoDB Atlas', status: 'connected', latency: '12ms' },
        { name: 'Authentication', status: 'connected', latency: '8ms' },
        { name: 'AI Engine', status: 'connected', latency: '45ms' },
        { name: 'Vector Store', status: 'connected', latency: '23ms' },
    ];

    const getActionIcon = (action) => {
        switch (action) {
            case 'LOGIN': return <FiUsers size={14} />;
            case 'USER_CREATED': return <FiUsers size={14} />;
            case 'NAMESPACE_CREATED': return <FiLayers size={14} />;
            case 'MEMBERSHIP_ASSIGNED': return <FiShield size={14} />;
            case 'REPO_ADDED': return <FiUploadCloud size={14} />;
            case 'REPO_REMOVED': return <FiDatabase size={14} />;
            case 'REPO_SCAN_TRIGGERED': return <FiZap size={14} />;
            case 'REPO_NAMESPACES_UPDATED': return <FiLayers size={14} />;
            default: return <FiActivity size={14} />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'LOGIN': return '#3b82f6';
            case 'USER_CREATED': return '#22c55e';
            case 'NAMESPACE_CREATED': return '#8b5cf6';
            case 'MEMBERSHIP_ASSIGNED': return '#f59e0b';
            case 'REPO_ADDED': return '#06b6d4';
            case 'REPO_REMOVED': return '#ef4444';
            case 'REPO_SCAN_TRIGGERED': return '#3b82f6';
            case 'REPO_NAMESPACES_UPDATED': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const formatTimeAgo = (dateString) => {
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

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%', maxWidth: '1400px' }}
        >
            {/* Header */}
            <motion.div variants={item} style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Administration</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                            Control Center
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Monitor system health and manage your organization.
                        </p>
                    </div>
                    <button 
                        onClick={fetchDashboardData}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                        }}
                    >
                        <FiRefreshCw size={14} /> Refresh
                    </button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
                variants={item}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}
            >
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Namespaces</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.namespaces || 0}</div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: '#3b82f6' }}>
                            <FiLayers size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiTrendingUp size={12} /> Active workspaces
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Users</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.users || 0}</div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.5rem', color: '#8b5cf6' }}>
                            <FiUsers size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCheckCircle size={12} /> {stats.activeUsers || 0} active
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repositories</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{stats.repos || 0}</div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '0.5rem', color: '#06b6d4' }}>
                            <FiDatabase size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiZap size={12} /> Indexed codebases
                    </div>
                    <Link 
                        to="/dashboard/super/repos"
                        style={{ 
                            marginTop: '0.5rem', 
                            fontSize: '0.75rem', 
                            color: '#06b6d4', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.25rem',
                            textDecoration: 'none'
                        }}
                    >
                        Manage repositories <FiArrowRight size={12} />
                    </Link>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Health</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>99.9%</div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e' }}>
                            <FiActivity size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCheckCircle size={12} /> All systems operational
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={item} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {quickActions.map((action, index) => (
                        <Link 
                            key={index} 
                            to={action.path}
                            style={{ textDecoration: 'none' }}
                        >
                            <motion.div 
                                className="glass-panel"
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ 
                                    padding: '1.25rem', 
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ 
                                    padding: '0.75rem', 
                                    background: `${action.color}15`, 
                                    borderRadius: '0.75rem', 
                                    color: action.color 
                                }}>
                                    <action.icon size={22} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>{action.label}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Recent Activity */}
                <motion.div variants={item} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', color: '#f59e0b' }}>
                                <FiClock size={18} />
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>Recent Activity</h3>
                        </div>
                        <Link to="/dashboard/super/audit" style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            View all <FiArrowRight size={12} />
                        </Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentActivity.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                No recent activity
                            </div>
                        ) : (
                            recentActivity.map((log, index) => (
                                <div 
                                    key={log.id || index}
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: 'var(--bg-subtle)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-subtle)'
                                    }}
                                >
                                    <div style={{ 
                                        padding: '0.5rem', 
                                        background: `${getActionColor(log.action)}15`, 
                                        borderRadius: '0.375rem', 
                                        color: getActionColor(log.action),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                                            {log.action?.replace(/_/g, ' ')}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.actor?.email || 'System'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                        {formatTimeAgo(log.createdAt)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* System Services */}
                <motion.div variants={item} className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '0.5rem', color: '#22c55e' }}>
                            <FiServer size={18} />
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)' }}>System Services</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {systemServices.map((service, index) => (
                            <div 
                                key={index}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    padding: '0.875rem 1rem',
                                    background: 'var(--bg-subtle)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--border-subtle)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ 
                                        width: '8px', 
                                        height: '8px', 
                                        borderRadius: '50%', 
                                        background: '#22c55e',
                                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                                    }} />
                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{service.name}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{service.latency}</span>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        fontWeight: 600, 
                                        padding: '0.25rem 0.5rem', 
                                        borderRadius: '0.25rem',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        color: '#22c55e',
                                        textTransform: 'uppercase'
                                    }}>
                                        Online
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        background: 'rgba(34, 197, 94, 0.05)', 
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(34, 197, 94, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <FiCheckCircle size={16} style={{ color: '#22c55e' }} />
                        <span style={{ fontSize: '0.8rem', color: '#22c55e' }}>All services are operational</span>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default SuperDashboard;
