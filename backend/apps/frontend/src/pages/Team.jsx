import React from 'react';
import { FiPlus, FiMoreHorizontal } from 'react-icons/fi';

const Team = () => {
    const members = [
        { name: 'Sarah Connor', role: 'Engineering Lead', email: 'sarah@senfo.ai', status: 'Online' },
        { name: 'John Smith', role: 'AI Researcher', email: 'john@senfo.ai', status: 'Busy' },
        { name: 'Emily Chen', role: 'Frontend Dev', email: 'emily@senfo.ai', status: 'Online' },
        { name: 'Michael Ross', role: 'DevOps Engineer', email: 'mike@senfo.ai', status: 'Offline' },
        { name: 'Jessica Vue', role: 'Product Manager', email: 'jess@senfo.ai', status: 'Online' },
        { name: 'David Kim', role: 'Data Scientist', email: 'david@senfo.ai', status: 'Online' },
        { name: 'Amanda Low', role: 'UX Designer', email: 'amanda@senfo.ai', status: 'Away' },
        { name: 'Chris P. Bacon', role: 'Security Analyst', email: 'chris@senfo.ai', status: 'Offline' },
    ];

    return (
        <div style={{ padding: '2rem 3rem', width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <span className="text-overline">Administration</span>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)' }}>Team Management</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Overview of all 156 active agents and human collaborators.</p>
                </div>
                <button className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiPlus /> Invite Member
                </button>
            </div>

            {/* Enterprise Data Table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Active</th>
                            <th>Permissions</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {members.map((member, i) => (
                            <tr key={i}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: '#333',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.85rem',
                                            fontWeight: '600'
                                        }}>
                                            {member.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '500' }}>{member.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{member.role}</td>
                                <td>
                                    <span className="status-indicator" style={{
                                        background: member.status === 'Online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                        color: member.status === 'Online' ? '#10b981' : 'var(--text-muted)'
                                    }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                                        {member.status}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>2 hours ago</td>
                                <td>Owner</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                        <FiMoreHorizontal size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Team;
