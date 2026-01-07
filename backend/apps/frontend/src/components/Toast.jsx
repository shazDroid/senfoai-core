import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiAlertTriangle, FiInfo, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);

/**
 * Custom hook to use toast notifications
 */
export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

/**
 * Toast styling configurations
 */
const toastStyles = {
    success: {
        bg: 'rgba(34, 197, 94, 0.15)',
        border: 'rgba(34, 197, 94, 0.4)',
        icon: FiCheckCircle,
        iconColor: '#22c55e'
    },
    error: {
        bg: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(239, 68, 68, 0.4)',
        icon: FiAlertCircle,
        iconColor: '#ef4444'
    },
    warning: {
        bg: 'rgba(245, 158, 11, 0.15)',
        border: 'rgba(245, 158, 11, 0.4)',
        icon: FiAlertTriangle,
        iconColor: '#f59e0b'
    },
    info: {
        bg: 'rgba(59, 130, 246, 0.15)',
        border: 'rgba(59, 130, 246, 0.4)',
        icon: FiInfo,
        iconColor: '#3b82f6'
    }
};

/**
 * Individual Toast component
 */
const ToastItem = ({ toast, onDismiss }) => {
    const style = toastStyles[toast.type];
    const IconComponent = style.icon;

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: style.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${style.border}`,
                borderRadius: 'var(--radius-lg, 12px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                maxWidth: '400px',
                minWidth: '300px',
                pointerEvents: 'auto'
            }}
        >
            <div style={{
                flexShrink: 0,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <IconComponent size={20} color={style.iconColor} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-main, #fff)',
                    marginBottom: toast.message ? '0.25rem' : 0,
                    lineHeight: 1.4
                }}>
                    {toast.title}
                </div>
                {toast.message && (
                    <div style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-muted, #a1a1aa)',
                        lineHeight: 1.5,
                        wordBreak: 'break-word'
                    }}>
                        {toast.message}
                    </div>
                )}
            </div>

            <button
                onClick={() => onDismiss(toast.id)}
                style={{
                    flexShrink: 0,
                    padding: '0.25rem',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: 'var(--text-muted, #a1a1aa)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = 'var(--text-main, #fff)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted, #a1a1aa)';
                }}
            >
                <FiX size={16} />
            </button>
        </motion.div>
    );
};

/**
 * Toast Container - renders all active toasts
 */
const ToastContainer = ({ toasts, onDismiss }) => {
    return (
        <div
            style={{
                position: 'fixed',
                top: '1rem',
                right: '1rem',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                pointerEvents: 'none'
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </AnimatePresence>
        </div>
    );
};

/**
 * Toast Provider - wrap your app with this
 */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const showToast = useCallback((type, title, message, duration = 5000) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newToast = {
            id,
            type,
            title,
            message,
            duration
        };

        setToasts((prev) => [...prev, newToast]);

        // Auto-dismiss after duration (if duration > 0)
        if (duration > 0) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }
    }, [dismiss]);

    const success = useCallback((title, message) => {
        showToast('success', title, message);
    }, [showToast]);

    const error = useCallback((title, message) => {
        showToast('error', title, message, 8000); // Errors stay longer
    }, [showToast]);

    const warning = useCallback((title, message) => {
        showToast('warning', title, message, 6000);
    }, [showToast]);

    const info = useCallback((title, message) => {
        showToast('info', title, message);
    }, [showToast]);

    const value = {
        showToast,
        success,
        error,
        warning,
        info,
        dismiss,
        dismissAll
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
};

export default ToastProvider;
