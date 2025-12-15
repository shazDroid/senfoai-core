import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, change, isPositive }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel"
            style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '100%'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>{title}</h3>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem', color: 'var(--text-main)' }}>
                        {value}
                    </div>
                </div>
                <div style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {Icon && <Icon size={20} />}
                </div>
            </div>

            {change && (
                <div style={{ fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{
                        color: isPositive ? '#10b981' : '#ef4444',
                        fontWeight: '500'
                    }}>
                        {isPositive ? '+' : ''}{change}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>from last month</span>
                </div>
            )}
        </motion.div>
    );
};

export default StatCard;
