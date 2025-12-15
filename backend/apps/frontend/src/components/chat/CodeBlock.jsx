import React, { useState } from 'react';
import { FiClipboard, FiCheck } from 'react-icons/fi';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeBlock = ({ language, value }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            margin: '1rem 0',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            background: '#171717', // Updated color from user reference
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                background: 'transparent', // Unified background
                color: '#b4b4b4',
                fontSize: '0.75rem',
                fontWeight: 500
            }}>
                <span style={{
                    color: '#b4b4b4',
                    fontFamily: 'sans-serif'
                }}>
                    {language || 'text'}
                </span>
                <button
                    onClick={handleCopy}
                    style={{
                        background: 'none',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: copied ? '#10b981' : '#b4b4b4',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        transition: 'color 0.2s'
                    }}
                >
                    {copied ? <FiCheck size={14} /> : <FiClipboard size={14} />}
                    {copied ? 'Copied!' : 'Copy code'}
                </button>
            </div>

            {/* Code Content */}
            <SyntaxHighlighter
                language={language || 'text'}
                style={atomDark}
                customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent', // Let container bg show
                    fontSize: '0.875rem',
                    lineHeight: '1.6',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' // Updated font stack
                }}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};

export default CodeBlock;
