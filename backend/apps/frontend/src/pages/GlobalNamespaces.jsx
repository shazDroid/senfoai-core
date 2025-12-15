import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGrid, FiSearch, FiPlus, FiUsers, FiServer, FiActivity, FiExternalLink, FiMoreVertical, FiEdit2, FiTrash2 } from 'react-icons/fi';
import StatCard from '../components/dashboard/StatCard';
import CreateNamespaceModal from '../components/dashboard/CreateNamespaceModal';
import { debugLog } from '../utils/debugLog';

const GlobalNamespaces = () => {
    const [namespaces, setNamespaces] = useState([]);
    const [search, setSearch] = useState('');
    const [openMenu, setOpenMenu] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNamespaces = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch('/api/super/namespaces', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Map API response to frontend format
                const mapped = data.map(ns => ({
                    id: ns.id,
                    name: ns.name,
                    slug: ns.slug,
                    description: ns.description,
                    users: ns.membersCount || 0,
                    repos: ns.reposCount || 0,
                    status: 'Active', // Default status
                    tier: 'Free', // Default tier
                    created: ns.createdAt,
                    createdBy: ns.createdBy
                }));
                setNamespaces(mapped);
            } else {
                debugLog('Failed to fetch namespaces:', res.status);
            }
        } catch (error) {
            debugLog('Error fetching namespaces:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNamespaces();
    }, []);

    const handleCreateNamespace = async (name, description) => {
        const token = localStorage.getItem('senfo-jwt');

        const res = await fetch('/api/super/namespaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, description })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err || `Failed to create namespace (${res.status})`);
        }

        await fetchNamespaces(); // Refresh list
        setIsModalOpen(false);
    };

    const filteredNamespaces = namespaces.filter(ns =>
        ns.name.toLowerCase().includes(search.toLowerCase()) ||
        ns.slug.toLowerCase().includes(search.toLowerCase())
    );

    const stats = [
        { title: 'Total Namespaces', value: namespaces.length.toString(), icon: FiGrid, change: '+' + namespaces.length, isPositive: true },
        { title: 'Total Users', value: namespaces.reduce((acc, ns) => acc + (ns.users || 0), 0).toLocaleString(), icon: FiUsers, change: '+18%', isPositive: true },
        { title: 'Active Namespaces', value: namespaces.filter(ns => ns.status === 'Active').length.toString(), icon: FiActivity, change: '+1', isPositive: true },
        { title: 'Total Repositories', value: namespaces.reduce((acc, ns) => acc + (ns.repos || 0), 0).toString(), icon: FiServer, change: '+12', isPositive: true },
    ];

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'Enterprise': return 'bg-purple-500/20 text-purple-400';
            case 'Standard': return 'bg-blue-500/20 text-blue-400';
            case 'Starter': return 'bg-cyan-500/20 text-cyan-400';
            case 'Dev': return 'bg-orange-500/20 text-orange-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%' }}
        >
            <CreateNamespaceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleCreateNamespace}
            />

            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Administration</span>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Global Namespaces</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Manage and monitor all tenant namespaces across the installation.</p>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                gridAutoRows: 'minmax(140px, auto)',
                marginBottom: '2rem'
            }}>
                {stats.map((stat, index) => (
                    <div key={index} style={{ gridColumn: 'span 1' }}>
                        <StatCard {...stat} />
                    </div>
                ))}
            </div>

            {/* Namespaces Table Section */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                {/* Table Header with Search and Action */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                            <FiGrid size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' }}>All Namespaces</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            minWidth: '280px'
                        }}>
                            <FiSearch style={{ color: 'var(--text-muted)' }} size={16} />
                            <input
                                type="text"
                                placeholder="Search namespaces..."
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
                        <button
                            className="primary-btn flex items-center gap-2"
                            style={{ whiteSpace: 'nowrap' }}
                            onClick={() => setIsModalOpen(true)}
                        >
                            <FiPlus size={16} />
                            New Namespace
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Namespace</th>
                                <th>Slug</th>
                                <th>Users</th>
                                <th>Repositories</th>
                                <th>Tier</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredNamespaces.map((ns) => (
                                <tr key={ns.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '0.5rem',
                                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.2))',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '600',
                                                fontSize: '0.75rem',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                            }}>
                                                {ns.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: '500' }}>{ns.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <code style={{
                                            fontSize: '0.8rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            /{ns.slug}
                                        </code>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FiUsers size={14} style={{ color: 'var(--text-muted)' }} />
                                            <span>{ns.users}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <FiServer size={14} style={{ color: 'var(--text-muted)' }} />
                                            <span>{ns.repos}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${getTierColor(ns.tier)}`}>
                                            {ns.tier}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded ${ns.status === 'Active'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {ns.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {new Date(ns.created).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </td>
                                    <td>
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={() => setOpenMenu(openMenu === ns.id ? null : ns.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '0.5rem',
                                                    borderRadius: '0.25rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                className="hover:bg-white/10"
                                            >
                                                <FiMoreVertical size={16} />
                                            </button>
                                            {openMenu === ns.id && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: '100%',
                                                        marginTop: '0.25rem',
                                                        background: 'var(--bg-panel)',
                                                        border: '1px solid var(--border-main)',
                                                        borderRadius: '0.5rem',
                                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                                                        zIndex: 50,
                                                        minWidth: '150px',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    <button
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-main)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.875rem'
                                                        }}
                                                        className="hover:bg-white/5"
                                                    >
                                                        <FiExternalLink size={14} /> Open
                                                    </button>
                                                    <button
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-main)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.875rem'
                                                        }}
                                                        className="hover:bg-white/5"
                                                    >
                                                        <FiEdit2 size={14} /> Edit
                                                    </button>
                                                    <button
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem 1rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem',
                                                            fontSize: '0.875rem'
                                                        }}
                                                        className="hover:bg-white/5"
                                                    >
                                                        <FiTrash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Empty State */}
                {filteredNamespaces.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem 1rem',
                        color: 'var(--text-muted)'
                    }}>
                        <FiSearch size={40} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>No namespaces found</p>
                        <p style={{ fontSize: '0.875rem' }}>Try adjusting your search criteria</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default GlobalNamespaces;
