import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiPaperclip, FiMic, FiUser, FiZap, FiPlus } from 'react-icons/fi';
import MessageBubble from '../components/chat/MessageBubble';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Mock AI Response with delay
        setTimeout(() => {
            const aiMsg = {
                role: 'ai',
                content: "I'm analyzing that for you. Here is a python example based on your request:",
                tools: [
                    { name: 'knowledge_retrieval', isExecuting: false }
                ]
            };

            // Append code block if relevant (mock logic)
            if (input.toLowerCase().includes('code') || input.toLowerCase().includes('python')) {
                aiMsg.content += "\n\n```python\ndef optimize_neural_net(layers):\n    return [l * 0.5 for l in layers]\n```\n\nLet me know if you need parameters tuned.";
            }

            if (input.toLowerCase().includes('chart') || input.toLowerCase().includes('diagram')) {
                aiMsg.content += "\n\n```mermaid\ngraph TD\n    A[User Input] --> B{Process}\n    B -->|Valid| C[Analysis]\n    B -->|Invalid| D[Error Log]\n    C --> E[Database]\n    E --> F[Dashboard]\n```\n\nHere is the workflow visual.";
            }

            setMessages(prev => [...prev, aiMsg]);
            setIsLoading(false);
        }, 1500);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Welcome suggestions
    const suggestions = [
        { title: "Design a database", subtitle: "for a high-scale e-commerce app" },
        { title: "Explain quantum computing", subtitle: "in simple terms" },
        { title: "Write a python script", subtitle: "to automate file organization" },
        { title: "Create a workout plan", subtitle: "for a beginner runner" }
    ];

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            position: 'relative'
        }}>
            {/* Scrollable Message Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 120px 0' }}>
                <div style={{ maxWidth: '768px', margin: '0 auto', padding: '2rem 1rem' }}>

                    {/* Welcome Screen if Empty */}
                    {messages.length === 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '60vh',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'white',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem',
                                color: 'black'
                            }}>
                                {/* Logo Icon */}
                                <FiZap size={24} fill="black" />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '2rem', color: 'var(--text-main)' }}>
                                What can I help with?
                            </h2>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, 1fr)',
                                gap: '0.75rem',
                                width: '100%',
                                maxWidth: '700px'
                            }}>
                                {suggestions.map((card, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setInput(card.title + " " + card.subtitle)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '1rem',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'transparent',
                                            color: 'var(--text-main)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.2rem',
                                            transition: 'background 0.2s',
                                            // hover handled via css class ideally, using inline for speed
                                        }}
                                        className="suggestion-card"
                                    >
                                        <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{card.title}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{card.subtitle}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <AnimatePresence>
                        {messages.map((msg, idx) => (
                            <MessageBubble key={idx} message={msg} />
                        ))}
                        {isLoading && (
                            <div style={{ display: 'flex', gap: '1rem', padding: '1rem 0', maxWidth: '800px', margin: '0 auto' }}>
                                <div style={{ width: '30px' }} /> {/* Avatar spacer */}
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Thinking...</span>
                            </div>
                        )}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area - Fixed Bottom */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '0 1rem 2rem 1rem',
                background: 'linear-gradient(to top, var(--bg-dark) 20%, transparent 100%)', // Fade out effect
            }}>
                <div style={{ maxWidth: '768px', margin: '0 auto', position: 'relative' }}>
                    <div style={{
                        background: 'var(--bg-subtle)', // Input background
                        borderRadius: '26px', // Capsule shape
                        padding: '0.75rem 1rem', // Inner padding
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border-subtle)'
                    }}>
                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                            <FiPlus size={20} />
                        </button>

                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Senfo AI..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-main)',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />

                        {!input.trim() ? (
                            <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }}>
                                <FiMic size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSend}
                                style={{
                                    background: input.trim() ? 'white' : '#444',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <FiSend size={16} color={input.trim() ? 'black' : '#888'} />
                            </button>
                        )}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '0.75rem', color: '#666', fontSize: '0.75rem' }}>
                        Senfo AI can make mistakes. Consider checking important information.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
