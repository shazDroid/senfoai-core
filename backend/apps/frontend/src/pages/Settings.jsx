import React, { useState } from 'react';
import { FiSettings, FiDatabase, FiCpu, FiUser, FiSave, FiCheck, FiSearch, FiGlobe, FiShield, FiKey, FiServer, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const tabs = [
        { id: 'general', label: 'General', icon: FiUser },
        { id: 'database', label: 'Databases & Graph', icon: FiDatabase },
        { id: 'llm', label: 'LLM & AI', icon: FiCpu },
        { id: 'security', label: 'Security', icon: FiShield },
    ];

    const handleSave = async () => {
        setIsSaving(true);
        setSaveSuccess(false);
        // Simulate save
        await new Promise(r => setTimeout(r, 1000));
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    const SettingCard = ({ children, title, description, icon: Icon, status }) => (
        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {Icon && (
                        <div style={{ padding: '0.625rem', background: 'rgba(16, 163, 127, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                            <Icon size={18} />
                        </div>
                    )}
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.125rem' }}>{title}</h3>
                        {description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</p>}
                    </div>
                </div>
                {status && (
                    <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        background: status === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                        color: status === 'connected' ? '#22c55e' : 'var(--text-muted)',
                        border: `1px solid ${status === 'connected' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`
                    }}>
                        {status === 'connected' ? 'Connected' : 'Not Configured'}
                    </span>
                )}
            </div>
            {children}
        </div>
    );

    const InputField = ({ label, type = 'text', placeholder, defaultValue, disabled, style }) => (
        <div style={{ marginBottom: '1rem', ...style }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                defaultValue={defaultValue}
                disabled={disabled}
                className="input-field"
                style={{
                    opacity: disabled ? 0.5 : 1,
                    cursor: disabled ? 'not-allowed' : 'text'
                }}
            />
        </div>
    );

    const SelectField = ({ label, options, defaultValue }) => (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
            <select
                defaultValue={defaultValue}
                style={{
                    width: '100%',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-main)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                }}
            >
                {options.map((opt, i) => (
                    <option key={i} value={opt.value || opt} style={{ background: 'var(--bg-panel)', color: 'var(--text-main)' }}>
                        {opt.label || opt}
                    </option>
                ))}
            </select>
        </div>
    );

    const Toggle = ({ enabled, onChange }) => (
        <button
            onClick={onChange}
            style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                background: enabled ? 'var(--primary)' : 'var(--bg-subtle)',
                border: `1px solid ${enabled ? 'var(--primary)' : 'var(--border-main)'}`,
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: enabled ? '22px' : '2px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
        </button>
    );

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            style={{ padding: '2rem 3rem', width: '100%', maxWidth: '1200px' }}
        >
            {/* Header */}
            <motion.div variants={item} style={{ marginBottom: '2rem' }}>
                <span className="text-overline">Configuration</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <FiSettings style={{ color: 'var(--primary)' }} />
                            System Settings
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Configure system-wide connections and preferences.</p>
                    </div>
                    {saveSuccess && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: 'var(--radius-md)',
                            color: '#22c55e',
                            fontSize: '0.875rem'
                        }}>
                            <FiCheck size={16} /> Settings saved successfully
                        </div>
                    )}
                </div>
            </motion.div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Sidebar Navigation */}
                <motion.nav variants={item} style={{ width: '220px', flexShrink: 0 }}>
                    <div className="glass-panel" style={{ padding: '0.5rem' }}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.875rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 500,
                                    fontSize: '0.875rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: activeTab === tab.id ? 'rgba(16, 163, 127, 0.15)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                                    marginBottom: '0.25rem'
                                }}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </motion.nav>

                {/* Content Area */}
                <motion.div variants={item} style={{ flex: 1, minWidth: '300px' }}>
                    {activeTab === 'general' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <SettingCard title="Profile Information" description="Your account details" icon={FiUser}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <InputField label="Display Name" defaultValue="Super Admin" />
                                    <InputField label="Email" type="email" defaultValue="super@senfo.ai" disabled />
                                </div>
                            </SettingCard>

                            <SettingCard title="Organization" description="Your organization settings" icon={FiGlobe}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <InputField label="Organization Name" defaultValue="Senfo AI" />
                                    <SelectField 
                                        label="Auth Mode" 
                                        options={['SSO_MANAGED', 'IAM_GROUPS', 'HYBRID']} 
                                        defaultValue="SSO_MANAGED" 
                                    />
                                </div>
                            </SettingCard>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="primary-btn" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'database' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <SettingCard title="MongoDB Atlas" description="Primary database for application data" icon={FiDatabase} status="connected">
                                <InputField label="Connection String" type="password" placeholder="mongodb+srv://..." defaultValue="••••••••••••••••" />
                            </SettingCard>

                            <SettingCard title="Neo4j Graph DB" description="Knowledge graph storage" icon={FiDatabase} status="connected">
                                <InputField label="URI" placeholder="neo4j+s://instance.databases.neo4j.io" />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <InputField label="Username" placeholder="neo4j" style={{ marginBottom: 0 }} />
                                    <InputField label="Password" type="password" placeholder="••••••" style={{ marginBottom: 0 }} />
                                </div>
                            </SettingCard>

                            <SettingCard title="Zoekt Code Search" description="Trigram-based regex code search engine" icon={FiSearch} status="connected">
                                <InputField label="Endpoint URL" placeholder="http://zoekt-webserver:6070" />
                            </SettingCard>

                            <SettingCard title="Vector Store" description="Embeddings storage for semantic search" icon={FiServer}>
                                <SelectField 
                                    label="Provider" 
                                    options={['Pinecone', 'Weaviate', 'Qdrant', 'Milvus']} 
                                    defaultValue="Pinecone" 
                                />
                                <InputField label="API Key" type="password" placeholder="Enter API key" />
                            </SettingCard>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="primary-btn" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'llm' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <SettingCard title="AI Provider Configuration" description="Configure your language model settings" icon={FiCpu}>
                                <SelectField 
                                    label="Default Provider" 
                                    options={['OpenAI', 'Anthropic', 'Google AI', 'Azure OpenAI', 'Ollama (Local)']} 
                                    defaultValue="OpenAI" 
                                />
                                <InputField label="API Key" type="password" placeholder="sk-..." />
                                <InputField label="Model Name" defaultValue="gpt-4o" />
                            </SettingCard>

                            <SettingCard title="Embedding Model" description="Model used for code embeddings" icon={FiCpu}>
                                <SelectField 
                                    label="Embedding Provider" 
                                    options={['OpenAI', 'Cohere', 'Voyage AI', 'Local']} 
                                    defaultValue="OpenAI" 
                                />
                                <InputField label="Model" defaultValue="text-embedding-3-large" />
                            </SettingCard>

                            <SettingCard title="Rate Limits" description="API call rate limiting" icon={FiServer}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <InputField label="Requests per Minute" type="number" defaultValue="60" style={{ marginBottom: 0 }} />
                                    <InputField label="Max Tokens per Request" type="number" defaultValue="8000" style={{ marginBottom: 0 }} />
                                </div>
                            </SettingCard>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="primary-btn" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                            <SettingCard title="Authentication" description="SSO and identity provider settings" icon={FiShield}>
                                <SelectField 
                                    label="Identity Provider" 
                                    options={['Google', 'Microsoft Entra ID', 'Okta', 'Auth0', 'LDAP']} 
                                    defaultValue="Google" 
                                />
                                <InputField label="Client ID" placeholder="Enter OAuth client ID" />
                                <InputField label="Client Secret" type="password" placeholder="Enter OAuth client secret" />
                            </SettingCard>

                            <SettingCard title="Session Settings" description="User session configuration" icon={FiKey}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <InputField label="Session Duration (hours)" type="number" defaultValue="24" style={{ marginBottom: 0 }} />
                                    <InputField label="Refresh Token Lifetime (days)" type="number" defaultValue="7" style={{ marginBottom: 0 }} />
                                </div>
                            </SettingCard>

                            <SettingCard title="Security Options" description="Additional security settings" icon={FiShield}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Require 2FA for Superusers</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enforce two-factor authentication</div>
                                        </div>
                                        <Toggle enabled={true} onChange={() => {}} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>Audit All API Calls</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Log all API requests for compliance</div>
                                        </div>
                                        <Toggle enabled={true} onChange={() => {}} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                                        <div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-main)' }}>IP Allowlist</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Restrict access by IP address</div>
                                        </div>
                                        <Toggle enabled={false} onChange={() => {}} />
                                    </div>
                                </div>
                            </SettingCard>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button className="primary-btn" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FiSave size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Settings;
