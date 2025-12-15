import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiX, FiGrid, FiCheck } from 'react-icons/fi';

const NamespaceSearch = ({ 
    namespaces, 
    selectedNamespace, 
    onSelect, 
    placeholder = "Search namespaces...",
    disabled = false 
}) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredNamespaces = namespaces.filter(ns =>
        ns.name.toLowerCase().includes(search.toLowerCase()) ||
        ns.slug?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (namespace) => {
        onSelect(namespace);
        setSearch('');
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setSearch('');
    };

    const selectedNs = namespaces.find(ns => ns.id === selectedNamespace);

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Selected namespace display or search input */}
            {selectedNs && !isOpen ? (
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-main)',
                        borderRadius: 'var(--radius-md)',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.6 : 1,
                        height: '38px',
                        boxSizing: 'border-box'
                    }}
                    onClick={() => !disabled && setIsOpen(true)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiGrid size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ color: 'var(--text-main)', fontWeight: 500, fontSize: '0.875rem' }}>{selectedNs.name}</span>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleClear(); }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.25rem',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FiX size={14} />
                    </button>
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    <FiSearch 
                        size={14} 
                        style={{ 
                            position: 'absolute', 
                            left: '0.75rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: 'var(--text-muted)',
                            pointerEvents: 'none'
                        }} 
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        disabled={disabled}
                        style={{ 
                            width: '100%', 
                            paddingLeft: '2.25rem',
                            paddingRight: '0.75rem',
                            paddingTop: '0.5rem',
                            paddingBottom: '0.5rem',
                            opacity: disabled ? 0.6 : 1,
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-main)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-main)',
                            fontSize: '0.875rem',
                            height: '38px',
                            boxSizing: 'border-box',
                            outline: 'none'
                        }}
                    />
                </div>
            )}

            {/* Dropdown */}
            {isOpen && !disabled && (
                <div 
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '0.25rem',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-main)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        zIndex: 100,
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}
                >
                    {/* None option */}
                    <div
                        onClick={() => handleSelect(null)}
                        style={{
                            padding: '0.75rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            background: !selectedNamespace ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                            borderBottom: '1px solid var(--border-subtle)'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={(e) => e.target.style.background = !selectedNamespace ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                    >
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                        {!selectedNamespace && <FiCheck size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                    </div>

                    {filteredNamespaces.length === 0 ? (
                        <div style={{ 
                            padding: '1rem', 
                            textAlign: 'center', 
                            color: 'var(--text-muted)',
                            fontSize: '0.875rem'
                        }}>
                            No namespaces found
                        </div>
                    ) : (
                        filteredNamespaces.map(ns => (
                            <div
                                key={ns.id}
                                onClick={() => handleSelect(ns)}
                                style={{
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    cursor: 'pointer',
                                    background: selectedNamespace === ns.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = selectedNamespace === ns.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
                            >
                                <FiGrid size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ 
                                        color: 'var(--text-main)', 
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {ns.name}
                                    </div>
                                    {ns.slug && (
                                        <div style={{ 
                                            fontSize: '0.75rem', 
                                            color: 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {ns.slug}
                                        </div>
                                    )}
                                </div>
                                {selectedNamespace === ns.id && (
                                    <FiCheck size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NamespaceSearch;

