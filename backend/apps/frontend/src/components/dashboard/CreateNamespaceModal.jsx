import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiGrid } from 'react-icons/fi';

const CreateNamespaceModal = ({ isOpen, onClose, onConfirm }) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setError('');
        setIsSubmitting(true);
        try {
            await onConfirm(name);
            setName('');
        } catch (err) {
            setError(err.message || 'Failed to create namespace');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setName('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)'
                    }}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="glass-panel"
                    style={{
                        width: '100%',
                        maxWidth: '440px',
                        padding: '1.5rem',
                        position: 'relative',
                        zIndex: 10
                    }}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                                padding: '0.5rem',
                                background: 'rgba(16, 163, 127, 0.1)',
                                borderRadius: '0.5rem',
                                color: 'var(--primary)'
                            }}>
                                <FiGrid size={20} />
                            </div>
                            <h3 style={{
                                fontSize: '1.1rem',
                                fontWeight: '600',
                                color: 'var(--text-main)'
                            }}>
                                Create New Namespace
                            </h3>
                        </div>
                        <button
                            onClick={handleClose}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: '0.5rem',
                                borderRadius: '0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.2s'
                            }}
                            className="hover:text-white"
                        >
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label
                                htmlFor="namespace-name"
                                style={{
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    color: 'var(--text-muted)',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                Namespace Name
                            </label>
                            <input
                                type="text"
                                id="namespace-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="input-field"
                                autoFocus
                                style={{ marginBottom: '0.5rem' }}
                            />
                            {name && (
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                    fontFamily: 'monospace'
                                }}>
                                    Slug: <span style={{ color: 'var(--primary)' }}>/{slug}</span>
                                </div>
                            )}
                            {error && (
                                <div style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: '#ef4444'
                                }}>
                                    {error}
                                </div>
                            )}
                        </div>

                        <p style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            marginBottom: '1.5rem'
                        }}>
                            Creating a namespace isolates resources and users. You can add team members after creation.
                        </p>

                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                        }}>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: 'var(--text-muted)',
                                    background: 'transparent',
                                    border: '1px solid var(--border-main)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:bg-white/5 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!name.trim() || isSubmitting}
                                className="primary-btn"
                                style={{
                                    opacity: (!name.trim() || isSubmitting) ? 0.5 : 1,
                                    cursor: (!name.trim() || isSubmitting) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Namespace'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CreateNamespaceModal;
