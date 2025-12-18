import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import DashboardLayout from './layouts/DashboardLayout';
import RoleGuard from './components/auth/RoleGuard';

import Chat from './pages/Chat';
import DataSource from './pages/DataSource';
import Settings from './pages/Settings';
import Team from './pages/Team';

import SuperDashboard from './pages/SuperDashboard';
import GlobalNamespaces from './pages/GlobalNamespaces';
import AllUsers from './pages/AllUsers';
import AuditLogs from './pages/AuditLogs';
import SuperRepositories from './pages/SuperRepositories';
import ApprovalRequests from './pages/ApprovalRequests';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminRepositories from './pages/AdminRepositories';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />

            {/* Super User Routes */}
            <Route path="super" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <SuperDashboard />
              </RoleGuard>
            } />
            <Route path="super/namespaces" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <GlobalNamespaces />
              </RoleGuard>
            } />
            <Route path="super/users" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <AllUsers />
              </RoleGuard>
            } />
            <Route path="super/audit" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <AuditLogs />
              </RoleGuard>
            } />
            <Route path="super/repos" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <SuperRepositories />
              </RoleGuard>
            } />
            <Route path="super/approvals" element={
              <RoleGuard requiredRoles={['SUPER_USER']}>
                <ApprovalRequests />
              </RoleGuard>
            } />

            {/* Admin Routes */}
            <Route path="admin" element={
              <RoleGuard requiredRoles={['ADMIN']}>
                <AdminDashboard />
              </RoleGuard>
            } />
            <Route path="admin/users" element={
              <RoleGuard requiredRoles={['ADMIN']}>
                <AdminUsers />
              </RoleGuard>
            } />
            <Route path="admin/repos" element={
              <RoleGuard requiredRoles={['ADMIN']}>
                <AdminRepositories />
              </RoleGuard>
            } />

            {/* Shared/Common Routes */}
            {/* These might need guarding too, defaulting to allowing all logged in users for now */}
            <Route path="chat" element={<RoleGuard requiredRoles={['USER', 'ADMIN', 'SUPER_USER']}><Chat /></RoleGuard>} />
            <Route path="data-sources" element={<RoleGuard requiredRoles={['USER', 'ADMIN', 'SUPER_USER']}><DataSource /></RoleGuard>} />
            <Route path="settings" element={<RoleGuard requiredRoles={['USER', 'ADMIN', 'SUPER_USER']}><Settings /></RoleGuard>} />
            <Route path="team" element={<RoleGuard requiredRoles={['ADMIN', 'SUPER_USER']}><Team /></RoleGuard>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
