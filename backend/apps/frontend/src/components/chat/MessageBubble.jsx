import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ToolDisplay from './ToolDisplay';
import CodeBlock from './CodeBlock';
import MermaidDiagram from './MermaidDiagram';
import { motion } from 'framer-motion';

const MessageBubble = ({ message }) => {
    const isAI = message.role === 'ai';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }} // Added subtle slide up
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                flexDirection: isAI ? 'row' : 'row-reverse', // Toggle direction
                gap: '1rem',
                padding: '1rem 0',
                // Removed borderBottom for cleaner look
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
            }}
        >
            {/* Avatar Column */}
            <div style={{ flexShrink: 0 }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%', // Circular
                    background: isAI ? '#10a37f' : '#666', // ChatGPT Green / User Grey
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'white'
                }}>
                    {isAI ? 'AI' : 'U'}
                </div>
            </div>

            {/* Content Column */}
            <div style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: isAI ? 'flex-start' : 'flex-end', // Align text content
            }}>
                <div style={{
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    marginBottom: '0.25rem',
                    color: '#b4b4b4'
                }}>
                    {isAI ? 'Senfo AI' : 'You'}
                </div>

                {/* Tool Usages */}
                {message.tools && message.tools.map((tool, idx) => (
                    <ToolDisplay key={idx} toolName={tool.name} isExecuting={tool.isExecuting} />
                ))}

                <div
                    className="markdown-content"
                    style={{
                        color: 'var(--text-main)',
                        fontSize: '1rem',
                        lineHeight: '1.6',
                        // Reverted to transparent/document style per user request
                        background: 'transparent',
                        padding: 0,
                        maxWidth: '100%'
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '')
                                const language = match ? match[1] : '';

                                if (!inline && language === 'mermaid') {
                                    return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
                                }

                                return !inline && match ? (
                                    <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                                ) : (
                                    <code className={className} {...props} style={{
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '0.2rem 0.4rem',
                                        borderRadius: '4px',
                                        fontSize: '0.875em',
                                        fontFamily: 'Consolas, monospace'
                                    }}>
                                        {children}
                                    </code>
                                )
                            }
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            </div>
        </motion.div>
    );
};

export default MessageBubble;
