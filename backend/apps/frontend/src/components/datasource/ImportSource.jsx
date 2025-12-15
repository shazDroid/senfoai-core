import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiGithub, FiFolder, FiCheck } from 'react-icons/fi';

const ImportSource = ({ onImport }) => {
    const [activeTab, setActiveTab] = useState('github');
    const [url, setUrl] = useState('');
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleImport = () => {
        setImporting(true);
        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += 10;
            setProgress(currentProgress);
            if (currentProgress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    setImporting(false);
                    onImport({
                        name: activeTab === 'github' ? url.split('/').pop() : 'local-repo',
                        type: activeTab === 'github' ? 'GitHub Repository' : 'Local Folder',
                        files: 142,
                        size: '24 MB',
                        status: 'Active',
                        date: new Date().toISOString()
                    });
                    setProgress(0);
                    setUrl('');
                }, 500);
            }
        }, 200);
    };

    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Connect Data Source</h3>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => setActiveTab('github')}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'github' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        border: activeTab === 'github' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        color: activeTab === 'github' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.3s'
                    }}
                >
                    <FiGithub /> GitHub
                </button>
                <button
                    onClick={() => setActiveTab('local')}
                    style={{
                        flex: 1,
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: activeTab === 'local' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        border: activeTab === 'local' ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                        color: activeTab === 'local' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.3s'
                    }}
                >
                    <FiFolder /> Local Upload
                </button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
                {activeTab === 'github' ? (
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Repository URL</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="https://github.com/username/repo"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                        />
                    </div>
                ) : (
                    <div style={{
                        border: '2px dashed var(--glass-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '3rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                    }}>
                        <FiFolder size={32} style={{ marginBottom: '1rem' }} />
                        <p>Click to select folder</p>
                    </div>
                )}
            </div>

            {importing && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        <span>Processing...</span>
                        <span>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            style={{ height: '100%', background: 'var(--primary)' }}
                        />
                    </div>
                </div>
            )}

            <button className="primary-btn" style={{ width: '100%' }} onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : 'Start Import'}
            </button>

        </div>
    );
};

export default ImportSource;
