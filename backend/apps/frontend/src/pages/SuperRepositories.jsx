import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    FiDatabase, FiUploadCloud, FiGithub, FiFolder, FiGrid, FiList, 
    FiSearch, FiMoreVertical, FiTrash2, FiRefreshCw, FiExternalLink,
    FiCode, FiFileText, FiTag, FiCalendar, FiLayers, FiCheckCircle,
    FiClock, FiXCircle, FiCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { debugLog } from '../utils/debugLog';

const SuperRepositories = () => {
    const navigate = useNavigate();
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [showImportModal, setShowImportModal] = useState(false);
    const [importSource, setImportSource] = useState(null); // 'local' or 'github'
    const [selectedNamespace, setSelectedNamespace] = useState(null);
    const [namespaces, setNamespaces] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [editingRepo, setEditingRepo] = useState(null);
    const [showEditNamespacesModal, setShowEditNamespacesModal] = useState(false);

    useEffect(() => {
        fetchRepositories();
        fetchNamespaces();
    }, []);

    // Wrapper function to ensure refresh works properly
    const handleRefresh = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                debugLog('No authentication token found');
                return;
            }
            
            const res = await fetch('/api/super/repos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const repos = await res.json();
                // Handle both array and object responses
                const reposArray = Array.isArray(repos) ? repos : (repos.repositories || repos.data || []);
                debugLog('Refreshed repositories:', reposArray.length, reposArray);
                setRepositories((reposArray || []).map(repo => ({
                    ...repo,
                    // Mock data for fields not in schema
                    language: detectLanguage(repo.name, repo.gitUrl),
                    framework: detectFramework(repo.name, repo.gitUrl),
                    fileCount: Math.floor(Math.random() * 5000) + 100, // Mock
                    version: '1.0.0', // Mock
                    scanStatus: repo.scanStatus || 'PENDING' // Ensure scanStatus exists
                })));
            } else {
                const errorData = await res.json().catch(() => ({}));
                debugLog('Failed to refresh repositories:', res.statusText, errorData);
                // Don't clear repositories on error - keep existing data
            }
        } catch (err) {
            debugLog('Failed to refresh repositories:', err);
            // Don't clear repositories on error - keep existing data
        }
    };

    const fetchNamespaces = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch('/api/super/namespaces', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Superusers can see all namespaces
                const namespacesList = Array.isArray(data) ? data : (data.namespaces || []);
                setNamespaces(namespacesList.map(ns => ({
                    id: ns.id,
                    name: ns.name,
                    slug: ns.slug
                })));
                // Set first namespace as default if available
                if (namespacesList.length > 0 && !selectedNamespace) {
                    setSelectedNamespace(namespacesList[0].id);
                }
            }
            } catch (err) {
                debugLog('Failed to fetch namespaces:', err);
            }
    };

    const fetchRepositories = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                debugLog('No authentication token found');
                setIsLoading(false);
                return; // Don't clear existing repos if token is missing
            }
            
            const res = await fetch('/api/super/repos', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const repos = await res.json();
                // Handle both array and object responses
                const reposArray = Array.isArray(repos) ? repos : (repos.repositories || repos.data || []);
                debugLog('Fetched repositories:', reposArray.length, reposArray);
                setRepositories((reposArray || []).map(repo => ({
                    ...repo,
                    // Mock data for fields not in schema
                    language: detectLanguage(repo.name, repo.gitUrl),
                    framework: detectFramework(repo.name, repo.gitUrl),
                    fileCount: Math.floor(Math.random() * 5000) + 100, // Mock
                    version: '1.0.0', // Mock
                    scanStatus: repo.scanStatus || 'PENDING' // Ensure scanStatus exists
                })));
            } else {
                const errorData = await res.json().catch(() => ({}));
                debugLog('Failed to fetch repositories:', res.statusText, errorData);
                // Don't clear repositories on error - keep existing data
            }
        } catch (err) {
            debugLog('Failed to fetch repositories:', err);
            // Don't clear repositories on error - keep existing data
        } finally {
            setIsLoading(false);
        }
    };

    // Mock language detection
    const detectLanguage = (name, gitUrl) => {
        const url = gitUrl.toLowerCase();
        if (url.includes('typescript') || url.includes('ts')) return 'TypeScript';
        if (url.includes('python')) return 'Python';
        if (url.includes('java')) return 'Java';
        if (url.includes('javascript') || url.includes('js')) return 'JavaScript';
        if (url.includes('go')) return 'Go';
        if (url.includes('rust')) return 'Rust';
        if (url.includes('cpp') || url.includes('c++')) return 'C++';
        return 'Mixed';
    };

    // Mock framework detection
    const detectFramework = (name, gitUrl) => {
        const url = gitUrl.toLowerCase();
        if (url.includes('react')) return 'React';
        if (url.includes('vue')) return 'Vue.js';
        if (url.includes('angular')) return 'Angular';
        if (url.includes('next')) return 'Next.js';
        if (url.includes('django')) return 'Django';
        if (url.includes('flask')) return 'Flask';
        if (url.includes('express')) return 'Express';
        if (url.includes('spring')) return 'Spring';
        return 'None';
    };

    const filteredRepos = repositories.filter(repo =>
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        repo.gitUrl.toLowerCase().includes(search.toLowerCase())
    );

    const handleImportClick = (source) => {
        setImportSource(source);
        setShowImportModal(true);
    };

    const handleImport = async (data) => {
        setIsImporting(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const res = await fetch(`/api/super/repos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    gitUrl: data.gitUrl,
                    defaultBranch: data.defaultBranch || 'main',
                    namespaceIds: data.namespaceIds || [data.namespaceId] // Support both old and new format
                })
            });

            const responseData = await res.json().catch(() => ({}));

            if (res.ok) {
                // Success - refresh repositories and close modal
                setShowImportModal(false);
                setImportSource(null);
                await fetchRepositories(); // This will show loading state
            } else {
                // Error response
                throw new Error(responseData.message || `Failed to import repository: ${res.status} ${res.statusText}`);
            }
        } catch (err) {
            debugLog('Import error:', err);
            throw err; // Re-throw to be handled by modal
        } finally {
            setIsImporting(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%', maxWidth: '1400px' }}
        >
            {/* Header */}
            <motion.div variants={item} style={{ marginBottom: '2rem' }}>
                <span style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-muted)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                }}>
                    Repositories
                </span>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '1rem' 
                }}>
                    <div>
                        <h2 style={{ 
                            fontSize: '1.8rem', 
                            fontWeight: 'bold', 
                            marginBottom: '0.25rem', 
                            color: 'var(--text-main)' 
                        }}>
                            Code Repositories
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                            Manage and import repositories from various sources.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => handleImportClick('github')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease'
                            }}
                            className="sidebar-link-hover"
                        >
                            <FiGithub size={16} />
                            Import from GitHub
                        </button>
                        <button
                            onClick={() => handleImportClick('local')}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1rem',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease'
                            }}
                            className="sidebar-link-hover"
                        >
                            <FiFolder size={16} />
                            Import Local
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Search and View Toggle */}
            <motion.div 
                variants={item}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}
            >
                <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                    <FiSearch 
                        size={18} 
                        style={{ 
                            position: 'absolute', 
                            left: '1rem', 
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            pointerEvents: 'none',
                            zIndex: 1
                        }} 
                    />
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                        style={{
                            width: '100%',
                            paddingLeft: '2.75rem',
                            paddingRight: '1rem',
                            fontSize: '0.875rem',
                            height: '38px',
                            boxSizing: 'border-box',
                            lineHeight: '38px'
                        }}
                    />
                </div>
                <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    background: 'var(--bg-subtle)',
                    padding: '0.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-main)'
                }}>
                    <button
                        onClick={() => setViewMode('grid')}
                        style={{
                            padding: '0.5rem',
                            background: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            minWidth: '36px',
                            height: '36px'
                        }}
                    >
                        <FiGrid size={16} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '0.5rem',
                            background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                            color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            minWidth: '36px',
                            height: '36px'
                        }}
                    >
                        <FiList size={16} />
                    </button>
                </div>
            </motion.div>

            {/* Repositories Display */}
            {isLoading ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel" 
                    style={{ 
                        textAlign: 'center', 
                        padding: '4rem 2rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem'
                    }}
                >
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        <FiRefreshCw 
                            size={24} 
                            style={{ 
                                animation: 'spin 1s linear infinite',
                                color: 'var(--primary)'
                            }} 
                        />
                        <span style={{ 
                            fontSize: '1rem', 
                            fontWeight: 500,
                            color: 'var(--text-main)'
                        }}>
                            Loading repositories...
                        </span>
                    </div>
                    <p style={{ 
                        fontSize: '0.875rem', 
                        color: 'var(--text-muted)',
                        margin: 0
                    }}>
                        Fetching your repository data
                    </p>
                </motion.div>
            ) : repositories.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel" 
                    style={{ padding: '3rem', textAlign: 'center' }}
                >
                    <FiDatabase size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No repositories found</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Import your first repository to get started
                    </p>
                    <button
                        onClick={() => handleImportClick('github')}
                        className="primary-btn"
                        style={{ padding: '0.625rem 1.25rem' }}
                    >
                        <FiUploadCloud size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                        Import Repository
                    </button>
                </motion.div>
            ) : filteredRepos.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel" 
                    style={{ padding: '3rem', textAlign: 'center' }}
                >
                    <FiSearch size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                    <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No repositories match your search</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                        Try a different search term
                    </p>
                    <button
                        onClick={() => setSearch('')}
                        style={{
                            padding: '0.625rem 1.25rem',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-main)',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Search
                    </button>
                </motion.div>
            ) : filteredRepos.length > 0 && viewMode === 'grid' ? (
                <div style={{ position: 'relative' }}>
                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderRadius: 'var(--radius-md)',
                            backdropFilter: 'blur(2px)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'var(--bg-panel)',
                                padding: '0.75rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-main)'
                            }}>
                                <FiRefreshCw 
                                    size={18} 
                                    style={{ 
                                        animation: 'spin 1s linear infinite',
                                        color: 'var(--primary)'
                                    }} 
                                />
                                <span style={{ 
                                    fontSize: '0.875rem', 
                                    color: 'var(--text-main)',
                                    fontWeight: 500
                                }}>
                                    Refreshing...
                                </span>
                            </div>
                        </div>
                    )}
                    <motion.div
                        variants={item}
                        initial="hidden"
                        animate="show"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '1.5rem',
                            opacity: isLoading ? 0.6 : 1,
                            transition: 'opacity 0.2s ease'
                        }}
                    >
                    {filteredRepos.map((repo) => (
                        <RepositoryCard 
                            key={repo.id} 
                            repo={repo} 
                            onRefresh={handleRefresh}
                            onEditNamespaces={(repo) => {
                                setEditingRepo(repo);
                                setShowEditNamespacesModal(true);
                            }}
                        />
                    ))}
                    </motion.div>
                </div>
            ) : filteredRepos.length > 0 && viewMode === 'list' ? (
                <div style={{ position: 'relative' }}>
                    {isLoading && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderRadius: 'var(--radius-md)',
                            backdropFilter: 'blur(2px)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: 'var(--bg-panel)',
                                padding: '0.75rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-main)'
                            }}>
                                <FiRefreshCw 
                                    size={18} 
                                    style={{ 
                                        animation: 'spin 1s linear infinite',
                                        color: 'var(--primary)'
                                    }} 
                                />
                                <span style={{ 
                                    fontSize: '0.875rem', 
                                    color: 'var(--text-main)',
                                    fontWeight: 500
                                }}>
                                    Refreshing...
                                </span>
                            </div>
                        </div>
                    )}
                    <motion.div variants={item} style={{ opacity: isLoading ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
                        <div className="glass-panel" style={{ overflow: 'visible' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Repository</th>
                                            <th>Language</th>
                                            <th>Framework</th>
                                            <th>Files</th>
                                            <th>Version</th>
                                            <th>Date Added</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    {filteredRepos.map((repo) => (
                                        <RepositoryRow 
                                            key={repo.id} 
                                            repo={repo} 
                                            onRefresh={handleRefresh}
                                            onEditNamespaces={(repo) => {
                                                setEditingRepo(repo);
                                                setShowEditNamespacesModal(true);
                                            }}
                                        />
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            ) : (
                // Fallback - should not reach here, but just in case
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Unexpected state. Please refresh the page.</p>
                </div>
            )}

            {/* Loading Overlay for Import */}
            {isImporting && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(2px)'
                }}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            minWidth: '200px'
                        }}
                    >
                        <FiRefreshCw 
                            size={32} 
                            style={{ 
                                animation: 'spin 1s linear infinite',
                                color: 'var(--primary)'
                            }} 
                        />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                                fontSize: '1rem', 
                                fontWeight: 500,
                                color: 'var(--text-main)',
                                marginBottom: '0.25rem'
                            }}>
                                Importing repository...
                            </div>
                            <div style={{ 
                                fontSize: '0.875rem', 
                                color: 'var(--text-muted)'
                            }}>
                                Please wait
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <ImportModal
                    key={importSource} // Force remount when source changes
                    source={importSource}
                    namespaces={namespaces}
                    onClose={() => {
                        setShowImportModal(false);
                        setImportSource(null);
                    }}
                    onImport={handleImport}
                />
            )}

            {/* Edit Namespaces Modal */}
            {showEditNamespacesModal && editingRepo && (
                <EditNamespacesModal
                    repo={editingRepo}
                    namespaces={namespaces}
                    onClose={() => {
                        setShowEditNamespacesModal(false);
                        setEditingRepo(null);
                    }}
                    onSave={async (namespaceIds) => {
                        try {
                            const token = localStorage.getItem('senfo-jwt');
                            if (!token) {
                                throw new Error('Authentication token not found');
                            }

                            const res = await fetch(`/api/super/repos/${editingRepo.id}/namespaces`, {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ namespaceIds })
                            });

                            if (!res.ok) {
                                const errorData = await res.json().catch(() => ({}));
                                throw new Error(errorData.message || 'Failed to update namespaces');
                            }

                            setShowEditNamespacesModal(false);
                            setEditingRepo(null);
                            await fetchRepositories();
                        } catch (err) {
                            debugLog('Failed to update repository namespaces:', err);
                            alert(err.message || 'Failed to update namespaces');
                        }
                    }}
                />
            )}
        </motion.div>
    );
};

// Repository Card Component (Grid View)
const RepositoryCard = ({ repo, onRefresh, onEditNamespaces }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Get namespaces from repo (handle both old and new format)
    const repoNamespaces = repo.namespaces || (repo.namespace ? [repo.namespace] : []);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return '#22c55e';
            case 'SCANNING': return '#3b82f6';
            case 'PENDING': return '#f59e0b';
            case 'FAILED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusBg = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'rgba(34, 197, 94, 0.1)';
            case 'SCANNING': return 'rgba(59, 130, 246, 0.1)';
            case 'PENDING': return 'rgba(245, 158, 11, 0.1)';
            case 'FAILED': return 'rgba(239, 68, 68, 0.1)';
            default: return 'rgba(107, 114, 128, 0.1)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return <FiCheckCircle size={14} />;
            case 'SCANNING': return <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />;
            case 'PENDING': return <FiClock size={14} />;
            case 'FAILED': return <FiXCircle size={14} />;
            default: return <FiCircle size={14} />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'Completed';
            case 'SCANNING': return 'Scanning';
            case 'PENDING': return 'Pending';
            case 'FAILED': return 'Failed';
            default: return status || 'Pending';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ padding: '1.5rem', position: 'relative' }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600', 
                        color: 'var(--text-main)',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <FiDatabase size={18} style={{ color: 'var(--primary)' }} />
                        {repo.name}
                    </h3>
                    <p style={{ 
                        fontSize: '0.75rem', 
                        color: 'var(--text-muted)',
                        wordBreak: 'break-all',
                        marginBottom: '0.75rem'
                    }}>
                        {repo.gitUrl}
                    </p>
                    {/* Namespaces */}
                    {repoNamespaces.length > 0 && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'var(--text-muted)', 
                                marginBottom: '0.5rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem'
                            }}>
                                <FiLayers size={12} />
                                Namespaces ({repoNamespaces.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {repoNamespaces.map(ns => (
                                    <span
                                        key={ns.id}
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '0.375rem 0.625rem',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-main)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--text-main)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            fontWeight: 500,
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}
                                    >
                                        <FiLayers size={12} style={{ opacity: 0.7 }} />
                                        {ns.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        style={{
                            padding: '0.5rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            borderRadius: '0.25rem'
                        }}
                    >
                        <FiMoreVertical size={18} />
                    </button>
                    {showMenu && (
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '0.25rem',
                            background: 'var(--bg-panel)',
                            border: '1px solid var(--border-main)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            minWidth: '150px',
                            overflow: 'hidden'
                        }}>
                            {onEditNamespaces && (
                                <button
                                    onClick={() => {
                                        if (onEditNamespaces) {
                                            onEditNamespaces(repo);
                                        }
                                        setShowMenu(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-main)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.875rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                    className="sidebar-link-hover"
                                >
                                    <FiLayers size={14} /> Edit Namespaces
                                </button>
                            )}
                            <button
                                onClick={async () => {
                                    setIsRefreshing(true);
                                    setShowMenu(false);
                                    try {
                                        await onRefresh();
                                    } catch (err) {
                                        debugLog('Refresh error:', err);
                                        // Don't clear the list on error, just log it
                                    } finally {
                                        setIsRefreshing(false);
                                    }
                                }}
                                disabled={isRefreshing}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: isRefreshing ? 'var(--text-muted)' : 'var(--text-main)',
                                    cursor: isRefreshing ? 'wait' : 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: isRefreshing ? 0.6 : 1
                                }}
                                className="sidebar-link-hover"
                            >
                                <FiRefreshCw 
                                    size={14} 
                                    style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} 
                                /> 
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </button>
                            <button
                                onClick={() => {
                                    window.open(repo.gitUrl, '_blank');
                                    setShowMenu(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-main)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                className="sidebar-link-hover"
                            >
                                <FiExternalLink size={14} /> Open in Git
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: '0.75rem',
                marginBottom: '1rem'
            }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Language</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <FiCode size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {repo.language || 'Unknown'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Framework</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <FiLayers size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {repo.framework || 'None'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Files</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <FiFileText size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {repo.fileCount?.toLocaleString() || '0'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Version</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
                        <FiTag size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        {repo.version || 'N/A'}
                    </div>
                </div>
            </div>

            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <FiCalendar size={12} />
                    {formatDate(repo.createdAt)}
                </div>
                <div style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: getStatusBg(repo.scanStatus),
                    color: getStatusColor(repo.scanStatus),
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    border: `1px solid ${getStatusColor(repo.scanStatus)}40`
                }}>
                    {getStatusIcon(repo.scanStatus)}
                    {getStatusLabel(repo.scanStatus)}
                </div>
            </div>
        </motion.div>
    );
};

// Repository Row Component (List View)
const RepositoryRow = ({ repo, onRefresh, onEditNamespaces }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Get namespaces from repo (handle both old and new format)
    const repoNamespaces = repo.namespaces || (repo.namespace ? [repo.namespace] : []);
    
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return '#22c55e';
            case 'SCANNING': return '#3b82f6';
            case 'PENDING': return '#f59e0b';
            case 'FAILED': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusBg = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'rgba(34, 197, 94, 0.1)';
            case 'SCANNING': return 'rgba(59, 130, 246, 0.1)';
            case 'PENDING': return 'rgba(245, 158, 11, 0.1)';
            case 'FAILED': return 'rgba(239, 68, 68, 0.1)';
            default: return 'rgba(107, 114, 128, 0.1)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return <FiCheckCircle size={14} />;
            case 'SCANNING': return <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />;
            case 'PENDING': return <FiClock size={14} />;
            case 'FAILED': return <FiXCircle size={14} />;
            default: return <FiCircle size={14} />;
        }
    };

    const getStatusLabel = (status) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'Completed';
            case 'SCANNING': return 'Scanning';
            case 'PENDING': return 'Pending';
            case 'FAILED': return 'Failed';
            default: return status || 'Pending';
        }
    };

    return (
        <tr>
            <td>
                <div>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        {repo.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        {repo.gitUrl}
                    </div>
                    {/* Namespaces */}
                    {repoNamespaces.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ 
                                fontSize: '0.65rem', 
                                color: 'var(--text-muted)', 
                                marginBottom: '0.375rem',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                <FiLayers size={10} />
                                Namespaces ({repoNamespaces.length})
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                                {repoNamespaces.map(ns => (
                                    <span
                                        key={ns.id}
                                        style={{
                                            fontSize: '0.7rem',
                                            padding: '0.25rem 0.5rem',
                                            background: 'var(--bg-panel)',
                                            border: '1px solid var(--border-main)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--text-main)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        <FiLayers size={10} style={{ opacity: 0.7 }} />
                                        {ns.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </td>
            <td>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {repo.language || 'Unknown'}
                </span>
            </td>
            <td>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {repo.framework || 'None'}
                </span>
            </td>
            <td>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {repo.fileCount?.toLocaleString() || '0'}
                </span>
            </td>
            <td>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                    {repo.version || 'N/A'}
                </span>
            </td>
            <td>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {formatDate(repo.createdAt)}
                </span>
            </td>
            <td>
                <span style={{
                    fontSize: '0.75rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    background: getStatusBg(repo.scanStatus),
                    color: getStatusColor(repo.scanStatus),
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    border: `1px solid ${getStatusColor(repo.scanStatus)}40`
                }}>
                    {getStatusIcon(repo.scanStatus)}
                    {getStatusLabel(repo.scanStatus)}
                </span>
            </td>
            <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {onEditNamespaces && (
                        <button
                            onClick={() => onEditNamespaces(repo)}
                            style={{
                                padding: '0.375rem',
                                background: 'transparent',
                                border: '1px solid var(--border-main)',
                                borderRadius: '0.25rem',
                                color: 'var(--text-muted)',
                                cursor: 'pointer'
                            }}
                            title="Edit Namespaces"
                        >
                            <FiLayers size={14} />
                        </button>
                    )}
                    <button
                        onClick={() => window.open(repo.gitUrl, '_blank')}
                        style={{
                            padding: '0.375rem',
                            background: 'transparent',
                            border: '1px solid var(--border-main)',
                            borderRadius: '0.25rem',
                            color: 'var(--text-muted)',
                            cursor: 'pointer'
                        }}
                        title="Open in Git"
                    >
                        <FiExternalLink size={14} />
                    </button>
                    <button
                        onClick={async () => {
                            setIsRefreshing(true);
                            try {
                                await onRefresh();
                            } catch (err) {
                                debugLog('Refresh error:', err);
                                // Don't clear the list on error, just log it
                            } finally {
                                setIsRefreshing(false);
                            }
                        }}
                        disabled={isRefreshing}
                        style={{
                            padding: '0.375rem',
                            background: 'transparent',
                            border: '1px solid var(--border-main)',
                            borderRadius: '0.25rem',
                            color: isRefreshing ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: isRefreshing ? 'wait' : 'pointer',
                            opacity: isRefreshing ? 0.7 : 1
                        }}
                        title={isRefreshing ? 'Refreshing...' : 'Refresh repository'}
                    >
                        <FiRefreshCw 
                            size={14} 
                            style={isRefreshing ? { animation: 'spin 1s linear infinite' } : {}} 
                        />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// Import Modal Component
const ImportModal = ({ source, namespaces, onClose, onImport }) => {
    const [formData, setFormData] = useState({
        namespaceIds: [],
        name: '',
        gitUrl: '',
        defaultBranch: 'main'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    // Reset form when component mounts or source changes
    React.useEffect(() => {
        setFormData({
            namespaceIds: [],
            name: '',
            gitUrl: '',
            defaultBranch: 'main'
        });
        setSelectedFolder(null);
        setError(null);
        setIsLoading(false);
    }, [source]);

    const handleNamespaceToggle = (namespaceId) => {
        setFormData(prev => ({
            ...prev,
            namespaceIds: prev.namespaceIds.includes(namespaceId)
                ? prev.namespaceIds.filter(id => id !== namespaceId)
                : [...prev.namespaceIds, namespaceId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!formData.namespaceIds || formData.namespaceIds.length === 0) {
            setError('Please select at least one namespace');
            return;
        }
        
        if (!formData.name) {
            setError('Please provide a repository name');
            return;
        }
        
        if (source === 'github' && !formData.gitUrl) {
            setError('Please provide a GitHub URL');
            return;
        }
        
        if (source === 'local' && !formData.gitUrl) {
            setError('Please select a folder');
            return;
        }

        setIsLoading(true);
        try {
            await onImport({
                ...formData,
                namespaceId: formData.namespaceIds[0] // Keep for backward compatibility if needed
            });
            // Modal will be closed by parent component on success
        } catch (err) {
            debugLog('Import submission error:', err);
            setError(err.message || 'Failed to import repository');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
        }}
        onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel"
                style={{
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                    Import from {source === 'github' ? 'GitHub' : 'Local File'}
                </h3>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#ef4444',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            Namespaces * (Select one or more)
                        </label>
                        <div style={{
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.75rem',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            background: 'var(--bg-subtle)'
                        }}>
                            {namespaces.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                    No namespaces available
                                </div>
                            ) : (
                                namespaces.map(ns => (
                                    <label
                                        key={ns.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-sm)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-panel)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.namespaceIds.includes(ns.id)}
                                            onChange={() => handleNamespaceToggle(ns.id)}
                                            style={{
                                                width: '1rem',
                                                height: '1rem',
                                                cursor: 'pointer',
                                                accentColor: 'var(--primary)'
                                            }}
                                        />
                                        <span style={{ color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                            {ns.name}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                        {formData.namespaceIds.length > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {formData.namespaceIds.length} namespace{formData.namespaceIds.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            Repository Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field"
                            placeholder="my-repository"
                            required
                        />
                    </div>

                    {source === 'github' && (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                    GitHub URL *
                                </label>
                                <input
                                    type="url"
                                    value={formData.gitUrl}
                                    onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
                                    className="input-field"
                                    placeholder="https://github.com/username/repo"
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                    Default Branch
                                </label>
                                <input
                                    type="text"
                                    value={formData.defaultBranch}
                                    onChange={(e) => setFormData({ ...formData, defaultBranch: e.target.value })}
                                    className="input-field"
                                    placeholder="main"
                                />
                            </div>
                        </>
                    )}

                    {source === 'local' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                Select Folder *
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                webkitdirectory=""
                                directory=""
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                        // Get the directory name from the first file's path
                                        const path = files[0].webkitRelativePath || files[0].name;
                                        const directoryName = path.split('/')[0];
                                        const folderName = directoryName || 'repository';
                                        setSelectedFolder(folderName);
                                        setFormData({ 
                                            ...formData, 
                                            gitUrl: `local://${folderName}`,
                                            name: formData.name || folderName
                                        });
                                    }
                                }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--bg-subtle)',
                                    border: '2px dashed var(--border-main)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                    e.currentTarget.style.background = 'rgba(16, 163, 127, 0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-main)';
                                    e.currentTarget.style.background = 'var(--bg-subtle)';
                                }}
                            >
                                <FiFolder size={18} />
                                {selectedFolder ? `Selected: ${selectedFolder}` : 'Choose Folder'}
                            </button>
                            {selectedFolder && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <FiCheckCircle size={12} style={{ color: '#22c55e' }} />
                                    Folder selected: {selectedFolder}
                                </p>
                            )}
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Click to browse and select a folder containing your repository files
                            </p>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                cursor: 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="primary-btn"
                            disabled={isLoading}
                            style={{
                                padding: '0.625rem 1.25rem',
                                fontSize: '0.875rem'
                            }}
                        >
                            {isLoading ? 'Importing...' : 'Import'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

// Edit Namespaces Modal Component
const EditNamespacesModal = ({ repo, namespaces, onClose, onSave }) => {
    const [selectedNamespaceIds, setSelectedNamespaceIds] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initialize with current repository namespaces
    React.useEffect(() => {
        const repoNamespaces = repo.namespaces || (repo.namespace ? [repo.namespace] : []);
        setSelectedNamespaceIds(repoNamespaces.map(ns => ns.id));
    }, [repo]);

    const handleNamespaceToggle = (namespaceId) => {
        setSelectedNamespaceIds(prev =>
            prev.includes(namespaceId)
                ? prev.filter(id => id !== namespaceId)
                : [...prev, namespaceId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (selectedNamespaceIds.length === 0) {
            setError('Please select at least one namespace');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(selectedNamespaceIds);
        } catch (err) {
            debugLog('Failed to save namespaces:', err);
            setError(err.message || 'Failed to update namespaces');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
        }}
        onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel"
                style={{
                    padding: '2rem',
                    maxWidth: '500px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '1rem' }}>
                    Edit Namespaces for {repo.name}
                </h3>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        color: '#ef4444',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '0.875rem' }}>
                            Select Namespaces * (Select one or more)
                        </label>
                        <div style={{
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            padding: '0.75rem',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            background: 'var(--bg-subtle)'
                        }}>
                            {namespaces.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                                    No namespaces available
                                </div>
                            ) : (
                                namespaces.map(ns => (
                                    <label
                                        key={ns.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-sm)',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-panel)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedNamespaceIds.includes(ns.id)}
                                            onChange={() => handleNamespaceToggle(ns.id)}
                                            style={{
                                                width: '1rem',
                                                height: '1rem',
                                                cursor: 'pointer',
                                                accentColor: 'var(--primary)'
                                            }}
                                        />
                                        <span style={{ color: 'var(--text-main)', fontSize: '0.875rem' }}>
                                            {ns.name}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                        {selectedNamespaceIds.length > 0 && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {selectedNamespaceIds.length} namespace{selectedNamespaceIds.length !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isLoading}
                            style={{
                                padding: '0.625rem 1.25rem',
                                background: 'var(--bg-subtle)',
                                border: '1px solid var(--border-main)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-main)',
                                cursor: isLoading ? 'wait' : 'pointer',
                                fontSize: '0.875rem',
                                opacity: isLoading ? 0.6 : 1
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || selectedNamespaceIds.length === 0}
                            className="primary-btn"
                            style={{
                                padding: '0.625rem 1.25rem',
                                fontSize: '0.875rem',
                                opacity: (isLoading || selectedNamespaceIds.length === 0) ? 0.6 : 1,
                                cursor: (isLoading || selectedNamespaceIds.length === 0) ? 'wait' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default SuperRepositories;

