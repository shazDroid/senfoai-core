import React from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import { motion } from 'framer-motion';

const SocialButton = ({ icon: Icon, label, onClick }) => (
    <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.95rem',
            fontWeight: '500',
            marginBottom: '0.75rem',
            backdropFilter: 'blur(5px)',
        }}
    >
        <Icon size={20} />
        {label}
    </motion.button>
);

const SocialLogin = () => {
    const handleGoogleLogin = () => {
        window.location.href = "/api/auth/google";
    };

    const handleGithubLogin = () => {
        console.log("Github Login clicked");
        // TODO: Implement actual Github Auth
    };

    const handleDevLogin = async (email) => {
        try {
            const res = await fetch('/api/auth/dev/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.access_token) {
                window.location.href = `/auth/callback?token=${data.access_token}`;
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div style={{ marginTop: '1.5rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.85rem'
            }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                <span>Or continue with</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
            </div>

            <SocialButton
                icon={FcGoogle}
                label="Sign in with Google"
                onClick={handleGoogleLogin}
            />
            <SocialButton
                icon={FaGithub}
                label="Sign in with GitHub"
                onClick={handleGithubLogin}
            />

            {/* DEV ONLY SECTION */}
            <div className="mt-8 pt-6 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-4 text-center uppercase tracking-wider">Dev Quick Login</p>
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => handleDevLogin('super@senfo.ai')}
                        className="p-2 text-xs bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 border border-purple-500/30"
                    >
                        Super
                    </button>
                    <button
                        onClick={() => handleDevLogin('admin@meta.com')}
                        className="p-2 text-xs bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30 border border-blue-500/30"
                    >
                        Admin
                    </button>
                    <button
                        onClick={() => handleDevLogin('user@meta.com')}
                        className="p-2 text-xs bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 border border-green-500/30"
                    >
                        User
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SocialLogin;
