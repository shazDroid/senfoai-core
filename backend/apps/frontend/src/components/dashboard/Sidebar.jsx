import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMessageSquare, FiPlus, FiSettings, FiUser, FiMoreHorizontal, FiBox, FiDatabase, FiUsers, FiSun, FiMoon, FiUploadCloud, FiActivity, FiLogOut } from 'react-icons/fi';
import { useTheme } from '../../context/ThemeContext';
import { getUserRole, logout } from '../../utils/auth';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                marginBottom: '0.5rem',
                borderRadius: '0.5rem',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                cursor: 'pointer',
                transition: 'background 0.2s',
            }}
            className="sidebar-link-hover"
        >
            <div style={{
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)'
            }}>
                {theme === 'dark' ? <FiSun size={16} /> : <FiMoon size={16} />}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
        </button>
    );
};

const Sidebar = () => {
    // Reactive role state
    const [role, setRole] = useState(getUserRole());
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef(null);

    useEffect(() => {
        // Poll briefly for role changes (e.g. after login redirect)
        // This handles cases where Sidebar mounts before token is fully processed
        const checkRole = () => {
            const r = getUserRole();
            if (r !== role) {
                console.log("Sidebar: Role updated to", r);
                setRole(r);
            }
        };

        const interval = setInterval(checkRole, 500);
        return () => clearInterval(interval);
    }, [role]);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mock user for profile section
    const user = {
        name: role === 'SUPER_USER' ? 'Super Admin' : role === 'ADMIN' ? 'Namespace Admin' : 'Shahbaz A.',
        plan: role === 'SUPER_USER' ? 'Unlimited' : 'Plus'
    };

    const location = useLocation();
    const isSuperPage = location.pathname.startsWith('/dashboard/super');

    // Override role if we are on a super page (Dev/MVP convenience)
    // Or normally check role
    const effectiveRole = isSuperPage ? 'SUPER_USER' : role;

    let mainNav = [];
    let dataSourceNav = [];
    let toolsNav = [];

    if (effectiveRole === 'SUPER_USER') {
        mainNav = [
            { icon: FiBox, label: 'System Overview', path: '/dashboard/super', end: true },
            { icon: FiDatabase, label: 'Global Namespaces', path: '/dashboard/super/namespaces' },
        ];
        dataSourceNav = [
            { icon: FiUploadCloud, label: 'Repositories', path: '/dashboard/super/repos' },
        ];
        toolsNav = [
            { icon: FiUsers, label: 'All Users', path: '/dashboard/super/users' },
            { icon: FiActivity, label: 'Audit Logs', path: '/dashboard/super/audit' },
            { icon: FiSettings, label: 'System Settings', path: '/dashboard/settings' },
        ];
    } else if (effectiveRole === 'ADMIN') {
        mainNav = [
            { icon: FiBox, label: 'Overview', path: '/dashboard/admin', end: true },
        ];
        dataSourceNav = [
            { icon: FiUploadCloud, label: 'Repositories', path: '/dashboard/admin/repos' },
        ];
        toolsNav = [
            { icon: FiUsers, label: 'Users', path: '/dashboard/admin/users' },
            { icon: FiSettings, label: 'Settings', path: '/dashboard/settings' },
        ];
    } else {
        // Default USER
        mainNav = [
            { icon: FiMessageSquare, label: 'Senfo Chat', path: '/dashboard/chat' },
            { icon: FiBox, label: 'Dashboard', path: '/dashboard', end: true },
        ];
        dataSourceNav = [
            { icon: FiDatabase, label: 'Data Sources', path: '/dashboard/data-sources' },
        ];
        toolsNav = [
            { icon: FiSettings, label: 'Settings', path: '/dashboard/settings' },
        ];
    }

    return (
        <aside style={{
            width: '260px',
            minWidth: '260px',
            height: '100vh',
            background: 'var(--bg-panel)',
            display: 'flex',
            flexDirection: 'column',
            color: 'var(--text-main)',
            fontSize: '0.875rem',
            borderRight: '1px solid var(--border-subtle)'
        }}>
            {/* New Chat Button Area */}
            <div style={{ padding: '0.75rem 0.75rem 0 0.75rem' }}>
                <NavLink
                    to="/dashboard/chat"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '0.5rem',
                        background: 'transparent',
                        color: 'var(--text-main)',
                        transition: 'background 0.2s',
                        marginBottom: '1rem',
                        border: '1px solid var(--border-subtle)'
                    }}
                    className="sidebar-link-hover"
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {/* OpenAI Logo Svg Mock */}
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span style={{ fontWeight: 500 }}>New chat</span>
                    </div>
                    <FiPlus size={16} />
                </NavLink>
            </div>

            {/* Scrollable Navigation Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem' }}>

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
                        Senfo AI
                    </div>
                    {mainNav.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '0.5rem',
                                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                                marginBottom: '2px',
                                textDecoration: 'none'
                            })}
                        >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {dataSourceNav.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
                            Data Source
                        </div>
                        {dataSourceNav.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.6rem 0.75rem',
                                    borderRadius: '0.5rem',
                                    color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                    background: isActive ? 'var(--bg-subtle)' : 'transparent',
                                    marginBottom: '2px',
                                    textDecoration: 'none'
                                })}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
                        Tools
                    </div>
                    {toolsNav.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            style={({ isActive }) => ({
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '0.5rem',
                                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                background: isActive ? 'var(--bg-subtle)' : 'transparent',
                                marginBottom: '2px',
                                textDecoration: 'none'
                            })}
                        >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>

            </div>

            {/* User Profile Section at Bottom */}
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <ThemeToggle />
                <div ref={userMenuRef} style={{ position: 'relative' }}>
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem',
                            borderRadius: '0.5rem',
                            background: showUserMenu ? 'var(--bg-subtle)' : 'transparent',
                            border: 'none',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                        }}
                        className="sidebar-link-hover"
                    >
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#10a37f', // User avatar color
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                        }}>
                            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.name}</span>
                        </div>
                        <FiMoreHorizontal size={16} color="#888" />
                    </button>
                    
                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                        <div style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: 0,
                            right: 0,
                            marginBottom: '0.5rem',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-main)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            overflow: 'hidden',
                            zIndex: 1000
                        }}>
                            <button
                                onClick={() => {
                                    logout();
                                    setShowUserMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    transition: 'background 0.2s'
                                }}
                                className="sidebar-link-hover"
                            >
                                <FiLogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
