import React from 'react';
import { motion } from 'framer-motion';
import { FiActivity, FiCpu, FiUsers, FiLayers, FiCalendar } from 'react-icons/fi';
import StatCard from '../components/dashboard/StatCard';

const Dashboard = () => {
    const stats = [
        { title: 'Active Neural Nodes', value: '4,238', icon: FiCpu, change: '12%', isPositive: true },
        { title: 'Real-time Requests', value: '892/s', icon: FiActivity, change: '5%', isPositive: true },
        { title: 'Connected Agents', value: '156', icon: FiUsers, change: '3', isPositive: false },
        { title: 'System Load', value: '42%', icon: FiLayers, change: '2%', isPositive: true },
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

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%' }}
        >
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <span className="text-overline">Analytics</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>System Overview</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Real-time cluster monitoring and telemetry.</p>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-subtle)',
                    padding: '0.5rem 1rem',
                    borderRadius: '2rem',
                    fontSize: '0.875rem',
                    border: '1px solid var(--border-subtle)'
                }}>
                    <FiCalendar size={14} />
                    <span>{today}</span>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1.5rem',
                gridAutoRows: 'minmax(140px, auto)'
            }}>
                {/* Stat Cards - Row 1 */}
                {stats.map((stat, index) => (
                    <div key={index} style={{ gridColumn: 'span 1' }}>
                        <StatCard {...stat} />
                    </div>
                ))}

                {/* Network Topology - Row 2 (Span 3) */}
                <div className="glass-panel" style={{
                    gridColumn: 'span 3',
                    padding: '1.5rem',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)' }}>Network Topology</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            View Map
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px dashed var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.01)',
                        fontSize: '0.9rem'
                    }}>
                        Interactive Graph Render Area
                    </div>
                </div>

                {/* Recent Activities - Row 2 (Span 1) */}
                <div className="glass-panel" style={{
                    gridColumn: 'span 1',
                    padding: '1.5rem',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Activity Log</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                            <div key={item} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: item % 2 === 0 ? '#10b981' : '#3b82f6',
                                    marginTop: '0.4rem',
                                    flexShrink: 0
                                }} />
                                <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '500', lineHeight: '1.4', color: 'var(--text-main)' }}>System Optimization Protocol</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{item * 2} mins ago</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
