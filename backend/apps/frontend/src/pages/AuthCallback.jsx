import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        (async () => {
            if (token) {
                console.log('Login success, saving token...');
                localStorage.setItem('senfo-jwt', token);

                // Determine redirect based on role
                let dest = '/dashboard';
                try {
                    const { getUserRole } = await import('../utils/auth'); // Dynamic import
                    const role = getUserRole();
                    if (role === 'SUPER_USER') dest = '/dashboard/super';
                    else if (role === 'ADMIN') dest = '/dashboard/admin';
                } catch (e) {
                    console.error('Error importing auth utils:', e);
                }

                // Use replace: true to replace the current entry in the history stack
                navigate(dest, { replace: true });
            } else {
                // If no token in URL, check if we might have just saved it (race condition)
                const stored = localStorage.getItem('senfo-jwt');
                if (stored) {
                    console.log('Token found in storage, redirecting...');
                    let dest = '/dashboard';
                    try {
                        const { getUserRole } = await import('../utils/auth');
                        const role = getUserRole();
                        if (role === 'SUPER_USER') dest = '/dashboard/super';
                        else if (role === 'ADMIN') dest = '/dashboard/admin';
                    } catch (e) { console.error(e); }

                    navigate(dest, { replace: true });
                } else {
                    console.error('No token found in callback or storage');
                    navigate('/');
                }
            }
        })();
    }, [navigate]);

    return (
        <div className="flex items-center justify-center h-screen bg-black text-white">
            <div className="text-xl animate-pulse">Authenticating with Senfo AI...</div>
        </div>
    );
};

export default AuthCallback;
