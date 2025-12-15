import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUsers, FiUploadCloud, FiDatabase, FiCheckCircle, FiTrendingUp, FiArrowRight, FiLayers } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [repoUrl, setRepoUrl] = useState('');
    const [stats, setStats] = useState({
        repositories: 0,
        teamMembers: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setStats({
                    repositories: data.repositories || 0,
                    teamMembers: data.teamMembers || 0
                });
            } else {
                console.error('Failed to fetch admin stats:', res.statusText);
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
            transition: {
                staggerChildren: 0.08
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    const handleImportRepo = () => {
        console.log("Importing:", repoUrl);
        // TODO: Call API
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
                <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                }}>
                    Organization
                </span>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '1rem' 
                }}>
                    <div>
                        <h2 style={{ 
                            fontSize: '1.8rem', 
                            fontWeight: 'bold', 
                            marginBottom: '0.25rem', 
                            color: 'var(--text-main)' 
                        }}>
                            Namespace Admin
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Manage your organization's repositories and access.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => navigate('/dashboard/admin/users')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease'
                            }}
                            className="sidebar-link-hover"
                        >
                            <FiUsers size={16} />
                            Manage Users
                        </button>
                        <button
                            onClick={() => navigate('/dashboard/admin/repos')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'var(--primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(16, 163, 127, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#0d8a6b';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 163, 127, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--primary)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 163, 127, 0.3)';
                            }}
                        >
                            <FiUploadCloud size={16} />
                            Manage Repositories
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div 
                variants={item}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}
            >
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repositories</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {isLoading ? '...' : stats.repositories}
                            </div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '0.5rem', color: '#06b6d4' }}>
                            <FiDatabase size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCheckCircle size={12} /> In your namespaces
                    </div>
                    <Link 
                        to="/dashboard/admin/repos"
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
                        View all repositories <FiArrowRight size={12} />
                    </Link>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Members</div>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                                {isLoading ? '...' : stats.teamMembers}
                            </div>
                        </div>
                        <div style={{ padding: '0.625rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '0.5rem', color: '#8b5cf6' }}>
                            <FiUsers size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FiCheckCircle size={12} /> Across all namespaces
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={item} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: 'var(--text-muted)', 
                    marginBottom: '1rem', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                }}>
                    Quick Actions
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <Link 
                        to="/dashboard/admin/repos"
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
                                background: 'rgba(6, 182, 212, 0.15)', 
                                borderRadius: '0.75rem', 
                                color: '#06b6d4' 
                            }}>
                                <FiUploadCloud size={22} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>Repositories</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage repositories</div>
                            </div>
                        </motion.div>
                    </Link>
                    <Link 
                        to="/dashboard/admin/users"
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
                                background: 'rgba(139, 92, 246, 0.15)', 
                                borderRadius: '0.75rem', 
                                color: '#8b5cf6' 
                            }}>
                                <FiUsers size={22} />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', color: 'var(--text-main)', fontSize: '0.95rem' }}>Users</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Manage team members</div>
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default AdminDashboard;
