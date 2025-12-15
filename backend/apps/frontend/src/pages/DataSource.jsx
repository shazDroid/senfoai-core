import React from 'react';
import { FiDatabase, FiGithub, FiSlack, FiHardDrive, FiLink, FiPlus, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

const ConnectorCard = ({ icon: Icon, name, description, status, connected }) => (
    <motion.div
        whileHover={{ y: -4 }}
        className={`p-6 rounded-2xl border transition-all backdrop-blur-md ${connected
                ? 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${connected ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>
                <Icon size={24} />
            </div>
            {connected && <FiCheckCircle className="text-green-400" />}
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{name}</h3>
        <p className="text-sm text-gray-400 mb-6 min-h-[40px]">{description}</p>

        <button className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${connected
                ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                : 'bg-white text-black hover:bg-gray-200'
            }`}>
            {connected ? 'Manage' : 'Connect'}
        </button>
    </motion.div>
);

const DataSource = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header>
                <div className="mb-2">
                    <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Integrations</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                    <FiDatabase className="text-blue-400" />
                    Data Sources
                </h1>
                <p className="text-gray-400 mt-2">Connect your knowledge base to external platforms.</p>
            </header>

            {/* Active Sources Status */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400 animate-pulse">
                        <FiRefreshCw />
                    </div>
                    <div>
                        <h4 className="text-white font-medium">Sync Active</h4>
                        <p className="text-sm text-gray-400">Last synced 2 minutes ago • 12,403 documents indexed</p>
                    </div>
                </div>
                <button className="text-sm text-blue-400 hover:text-blue-300 font-medium">View Logs</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ConnectorCard
                    icon={FiGithub}
                    name="GitHub"
                    description="Sync repositories, issues, and pull requests."
                    connected={true}
                />
                <ConnectorCard
                    icon={FiSlack}
                    name="Slack"
                    description="Index public channels and internal communications."
                    connected={false}
                />
                <ConnectorCard
                    icon={FiHardDrive}
                    name="Google Drive"
                    description="Connect docs, slides, and spreadsheets."
                    connected={true}
                />
                <ConnectorCard
                    icon={FiLink}
                    name="Web Crawler"
                    description="Scrape and index public documentation sites."
                    connected={false}
                />
                <ConnectorCard
                    icon={FiDatabase}
                    name="PostgreSQL"
                    description="Read structured data from SQL databases."
                    connected={false}
                />

                {/* New Custom Source */}
                <button className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/40 transition-all group min-h-[200px]">
                    <div className="p-4 rounded-full bg-white/5 text-gray-400 group-hover:scale-110 transition-transform mb-4">
                        <FiPlus size={24} />
                    </div>
                    <span className="text-white font-medium">Request Integration</span>
                </button>
            </div>
        </div>
    );
};

export default DataSource;
