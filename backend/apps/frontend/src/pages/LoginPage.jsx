import React from 'react';
import { motion } from 'framer-motion';
import LoginForm from '../components/LoginForm';
import SocialLogin from '../components/SocialLogin';

const LoginPage = () => {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Ambience */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                left: '-10%',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-20%',
                right: '-10%',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
                filter: 'blur(80px)',
                zIndex: 0
            }} />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '2.5rem',
                    zIndex: 1,
                    position: 'relative'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            marginBottom: '0.5rem',
                            background: 'linear-gradient(to right, #fff, #94a3b8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}
                    >
                        Senfo AI
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={{ color: 'var(--text-muted)' }}
                    >
                        Welcome back, explorer.
                    </motion.p>
                </div>

                <LoginForm />
                <SocialLogin />

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
                    <a href="#" style={{ color: 'var(--primary)', fontWeight: '500' }}>
                        Request Access
                    </a>
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
