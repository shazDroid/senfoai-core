import { useState, useEffect } from 'react';
import { debugLog } from '../utils/debugLog';

/**
 * Common hook for repository management
 * Used by both Admin and Super user pages
 * 
 * @param {string} apiBasePath - Base API path ('/api/admin/repos' or '/api/super/repos')
 * @param {Function} fetchNamespacesFn - Function to fetch namespaces (role-specific)
 */
export const useRepositoryManagement = (apiBasePath, fetchNamespacesFn) => {
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [showImportModal, setShowImportModal] = useState(false);
    const [importSource, setImportSource] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [editingRepo, setEditingRepo] = useState(null);
    const [showEditNamespacesModal, setShowEditNamespacesModal] = useState(false);
    const [namespaces, setNamespaces] = useState([]);

    // Mock language detection
    const detectLanguage = (name, gitUrl) => {
        const url = (gitUrl || '').toLowerCase();
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
        const url = (gitUrl || '').toLowerCase();
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

    // Fetch repositories
    const fetchRepositories = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                debugLog('No authentication token found');
                setIsLoading(false);
                return;
            }

            const res = await fetch(apiBasePath, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const repos = await res.json();
                const reposArray = Array.isArray(repos) ? repos : (repos.repositories || repos.data || []);
                debugLog('Fetched repositories:', reposArray.length, reposArray);
                setRepositories((reposArray || []).map(repo => ({
                    ...repo,
                    language: detectLanguage(repo.name, repo.gitUrl),
                    framework: detectFramework(repo.name, repo.gitUrl),
                    fileCount: Math.floor(Math.random() * 5000) + 100, // Mock
                    version: '1.0.0', // Mock
                    scanStatus: repo.scanStatus || 'PENDING',
                    // Preserve progress info if available
                    progress: repo.progress,
                    currentStep: repo.currentStep,
                    details: repo.details
                })));
            } else {
                const errorData = await res.json().catch(() => ({}));
                debugLog('Failed to fetch repositories:', res.statusText, errorData);
            }
        } catch (err) {
            debugLog('Failed to fetch repositories:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Refresh repositories (without loading state)
    const handleRefresh = async () => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                debugLog('No authentication token found');
                return;
            }

            const res = await fetch(apiBasePath, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const repos = await res.json();
                const reposArray = Array.isArray(repos) ? repos : (repos.repositories || repos.data || []);
                debugLog('Refreshed repositories:', reposArray.length, reposArray);
                setRepositories((reposArray || []).map(repo => ({
                    ...repo,
                    language: detectLanguage(repo.name, repo.gitUrl),
                    framework: detectFramework(repo.name, repo.gitUrl),
                    fileCount: Math.floor(Math.random() * 5000) + 100, // Mock
                    version: '1.0.0', // Mock
                    scanStatus: repo.scanStatus || 'PENDING',
                    // Preserve progress info if available
                    progress: repo.progress,
                    currentStep: repo.currentStep,
                    details: repo.details
                })));
            } else {
                const errorData = await res.json().catch(() => ({}));
                debugLog('Failed to refresh repositories:', res.statusText, errorData);
            }
        } catch (err) {
            debugLog('Failed to refresh repositories:', err);
        }
    };

    // Fetch namespaces (role-specific)
    const fetchNamespaces = async () => {
        if (fetchNamespacesFn) {
            try {
                const namespacesList = await fetchNamespacesFn();
                setNamespaces(namespacesList || []);
            } catch (err) {
                debugLog('Failed to fetch namespaces:', err);
                setNamespaces([]);
            }
        }
    };

    // Handle import
    const handleImport = async (data) => {
        setIsImporting(true);
        try {
            const token = localStorage.getItem('senfo-jwt');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const res = await fetch(apiBasePath, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: data.name,
                    gitUrl: data.gitUrl,
                    defaultBranch: data.defaultBranch || 'main',
                    namespaceIds: data.namespaceIds || [data.namespaceId],
                    realtimeSyncEnabled: data.realtimeSyncEnabled || false,
                    syncIntervalMinutes: data.syncIntervalMinutes || 5
                })
            });

            const responseData = await res.json().catch(() => ({}));

            if (res.ok) {
                setShowImportModal(false);
                setImportSource(null);
                await fetchRepositories();
            } else {
                throw new Error(responseData.message || `Failed to import repository: ${res.status} ${res.statusText}`);
            }
        } catch (err) {
            debugLog('Import error:', err);
            throw err;
        } finally {
            setIsImporting(false);
        }
    };

    // Handle start import/indexing
    const handleStartImport = async (repoId) => {
        let pollInterval;
        try {
            const token = localStorage.getItem('senfo-jwt');

            // Start polling for progress updates
            pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/repos/${repoId}/index/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();
                        // Update local state to reflect progress immediately with detailed info
                        setRepositories(prevRepos => prevRepos.map(r =>
                            r.id === repoId ? { 
                                ...r, 
                                ...statusData,
                                // Preserve existing data if new data doesn't have it
                                progress: statusData.progress !== undefined ? statusData.progress : r.progress,
                                currentStep: statusData.currentStep || r.currentStep,
                                details: statusData.details || r.details
                            } : r
                        ));
                    }
                } catch (e) {
                    // Ignore polling errors
                    debugLog('Polling error:', e);
                }
            }, 1000); // Poll every second for real-time updates

            const res = await fetch(`/api/repos/${repoId}/index/run`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Stop polling once request completes
            if (pollInterval) clearInterval(pollInterval);

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to start import');
            }

            // Final refresh
            await fetchRepositories();
        } catch (err) {
            if (pollInterval) clearInterval(pollInterval);
            debugLog('Start import error:', err);
            throw err;
        }
    };

    // Toggle realtime sync
    const handleToggleSync = async (repoId, enabled) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/repos/${repoId}/sync/settings`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ realtimeSyncEnabled: enabled })
            });
            if (res.ok) {
                await fetchRepositories();
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to toggle sync');
            }
        } catch (err) {
            debugLog('Toggle sync error:', err);
            throw err;
        }
    };

    // Manual sync
    const handleSyncNow = async (repoId) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`/api/repos/${repoId}/sync/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                await fetchRepositories();
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to sync');
            }
        } catch (err) {
            debugLog('Sync now error:', err);
            throw err;
        }
    };

    // Update repository namespaces
    const handleUpdateNamespaces = async (repoId, namespaceIds) => {
        try {
            const token = localStorage.getItem('senfo-jwt');
            const res = await fetch(`${apiBasePath}/${repoId}/namespaces`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ namespaceIds })
            });
            if (res.ok) {
                await fetchRepositories();
                setShowEditNamespacesModal(false);
                setEditingRepo(null);
            } else {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to update namespaces');
            }
        } catch (err) {
            debugLog('Update namespaces error:', err);
            throw err;
        }
    };

    // Initialize
    useEffect(() => {
        fetchRepositories();
        fetchNamespaces();
    }, []);

    // Auto-poll for active repositories
    useEffect(() => {
        const activeStatuses = ['CLONING', 'UPLOADING_TO_FTP', 'SCANNING_NAMESPACES', 'PARSING_FILES', 'GENERATING_GRAPH', 'INDEXING', 'SCANNING'];
        const hasActiveRepo = repositories.some(r => activeStatuses.includes(r.scanStatus?.toUpperCase()));

        if (hasActiveRepo) {
            const interval = setInterval(() => {
                handleRefresh();
            }, 3000); // Poll every 3 seconds

            return () => clearInterval(interval);
        }
    }, [repositories]);

    const filteredRepos = repositories.filter(repo =>
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        repo.gitUrl.toLowerCase().includes(search.toLowerCase())
    );

    return {
        // State
        repositories,
        isLoading,
        search,
        setSearch,
        viewMode,
        setViewMode,
        showImportModal,
        setShowImportModal,
        importSource,
        setImportSource,
        isImporting,
        editingRepo,
        setEditingRepo,
        showEditNamespacesModal,
        setShowEditNamespacesModal,
        namespaces,
        filteredRepos,
        
        // Actions
        fetchRepositories,
        handleRefresh,
        handleImport,
        handleStartImport,
        handleToggleSync,
        handleSyncNow,
        handleUpdateNamespaces,
        handleImportClick: (source) => {
            setImportSource(source);
            setShowImportModal(true);
        }
    };
};

