import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import { FiChevronDown, FiEdit } from 'react-icons/fi';

const DashboardLayout = () => {
    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar is fixed width within the flex container */}
            <Sidebar />

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                position: 'relative'
            }}>
                {/* Minimal ChatGPT-like Topbar */}
                <header style={{
                    height: '56px',
                    padding: '0 1rem',
                    display: 'flex',
                    justifyContent: 'flex-start', // Aligned left usually, or centered version selector
                    alignItems: 'center',
                    background: 'transparent',
                    position: 'absolute', // Overlay or just top
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 40
                }}>
                    {/* Mobile Menu Trigger (Hidden on Desktop) could go here */}

                </header>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
