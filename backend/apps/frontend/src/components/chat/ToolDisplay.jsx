import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiCheckCircle, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ToolDisplay = ({ toolName, isExecuting }) => {
    const [expanded, setExpanded] = useState(false);

    // Auto-expand when executing
    useEffect(() => {
        if (isExecuting) setExpanded(true);
        else setExpanded(false);
    }, [isExecuting]);

    return (
        <div style={{ marginBottom: '1rem' }}>
            <motion.div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.02)'
                }}
                onClick={() => setExpanded(!expanded)}
            >
                {isExecuting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                        <FiCpu size={14} color="var(--primary)" />
                    </motion.div>
                ) : (
                    <FiCheckCircle size={14} color="#10b981" />
                )}

                <span>{isExecuting ? 'Analying request...' : 'Finished processing'}</span>
                {expanded ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
            </motion.div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            marginTop: '0.5rem',
                            padding: '0.75rem',
                            background: '#1e1e1e',
                            border: '1px solid #333',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            color: '#d4d4d4'
                        }}>
                            <div style={{ color: '#569cd6' }}>&gt; Executing tool: <span style={{ color: '#ce9178' }}>"{toolName}"</span></div>
                            {!isExecuting && <div style={{ color: '#6a9955', marginTop: '0.25rem' }}>// Tool execution completed successfully</div>}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ToolDisplay;
