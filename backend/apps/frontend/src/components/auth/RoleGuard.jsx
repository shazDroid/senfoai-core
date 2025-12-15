import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserRole } from '../../utils/auth';

const RoleGuard = ({ children, requiredRoles }) => {
    const role = getUserRole();
    const location = useLocation();

    if (!role) {
        // Not logged in, redirect to login
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (requiredRoles && !requiredRoles.includes(role)) {
        console.warn(`RoleGuard: Access denied for role '${role}' to path '${location.pathname}'. Required: ${requiredRoles.join(', ')}`);

        // Redirect logic based on what they *should* see
        if (role === 'SUPER_USER') {
            return <Navigate to="/dashboard/super" replace />;
        }
        if (role === 'ADMIN') {
            return <Navigate to="/dashboard/admin" replace />;
        }
        // Default User
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default RoleGuard;
