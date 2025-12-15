export const getUserRole = () => {
    const token = localStorage.getItem('senfo-jwt');
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        console.log("DEBUG AUTH Decoded:", decoded);

        // Check globalRole from JWT token
        // Priority: SUPERUSER > ADMIN > USER
        if (decoded.globalRole === 'SUPERUSER' || decoded.globalRole === 'SUPER_USER') {
            return 'SUPER_USER';
        }

        // Check if user has ADMIN global role
        if (decoded.globalRole === 'ADMIN') {
            return 'ADMIN';
        }

        // Check if user is admin of any namespace (for namespace admins with USER global role)
        const namespaces = decoded.namespaces || [];
        const hasNamespaceAdmin = namespaces.some(ns => ns.role === 'ADMIN');
        if (hasNamespaceAdmin) {
            return 'ADMIN';
        }

        // Default to USER
        return 'USER';
    } catch (e) {
        console.error("DEBUG AUTH Error:", e);
        return null;
    }
};

export const getCurrentUserId = () => {
    const token = localStorage.getItem('senfo-jwt');
    if (!token) return null;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        return decoded.sub || decoded.userId || null;
    } catch (e) {
        console.error("Error getting user ID:", e);
        return null;
    }
};

export const logout = async () => {
    try {
        const token = localStorage.getItem('senfo-jwt');
        if (token) {
            // Call logout endpoint (optional - for audit logging)
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (err) {
                // Ignore errors - logout should work even if API call fails
                console.warn('Logout API call failed:', err);
            }
        }
    } catch (err) {
        console.warn('Error during logout:', err);
    } finally {
        // Always clear token and redirect, even if API call fails
        localStorage.removeItem('senfo-jwt');
        window.location.href = '/';
    }
};