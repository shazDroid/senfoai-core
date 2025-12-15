import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { FiZoomIn, FiZoomOut, FiMaximize, FiDownload, FiRefreshCw, FiCode, FiX, FiMinimize } from 'react-icons/fi';
import { toPng, toSvg } from 'html-to-image';

mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Söhne, ui-sans-serif, system-ui, sans-serif',
});

const MermaidDiagram = ({ code }) => {
    const [svg, setSvg] = useState('');
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef(null);
    const elementId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`).current;

    useEffect(() => {
        const renderDiagram = async () => {
            try {
                const { svg } = await mermaid.render(elementId, code);
                setSvg(svg);
                setError(null);
            } catch (err) {
                console.error('Mermaid Render Error:', err);
                setError('Failed to render diagram. Syntax might be invalid.');
            }
        };
        renderDiagram();
    }, [code, elementId]);

    const handleDownload = async () => {
        if (containerRef.current) {
            // We target the SVG inside the transform component
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
                const dataUrl = await toPng(svgElement, { backgroundColor: '#1e1e1e' });
                const link = document.createElement('a');
                link.download = 'chart.png';
                link.href = dataUrl;
                link.click();
            }
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    const ControlButton = ({ onClick, icon: Icon, title }) => (
        <button
            onClick={onClick}
            title={title}
            style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '6px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
            <Icon size={16} />
        </button>
    );

    const containerStyle = isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem'
    } : {
        background: '#111',
        border: '1px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
        marginTop: '1rem',
        marginBottom: '1rem'
    };

    if (error) {
        return (
            <div style={{ padding: '1rem', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}>
                {error}
                <pre style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#fca5a5' }}>{code}</pre>
            </div>
        )
    }

    return (
        <div style={containerStyle}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #333',
                background: 'rgba(255,255,255,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="text-overline" style={{ marginBottom: 0, fontSize: '0.7rem' }}>MERMAID CHART</span>
                </div>

                {/* Controls injected via Wrapper props usually, but we are outside wrapper here.
                 We need to access the controls via ref or context? 
                 Actually TransformWrapper provides a render prop with controls. */}
            </div>

            <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                centerOnInit
            >
                {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                        {/* Floating Controls inside the relative container */}
                        <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            justifyContent: 'flex-end',
                            background: '#111',
                            borderBottom: '1px solid #333'
                        }}>
                            <ControlButton onClick={() => zoomIn()} icon={FiZoomIn} title="Zoom In" />
                            <ControlButton onClick={() => zoomOut()} icon={FiZoomOut} title="Zoom Out" />
                            <ControlButton onClick={() => resetTransform()} icon={FiRefreshCw} title="Reset" />
                            <div style={{ width: '1px', height: '20px', background: '#333', margin: '0 0.5rem' }} />
                            <ControlButton onClick={handleDownload} icon={FiDownload} title="Export PNG" />
                            <ControlButton onClick={toggleFullscreen} icon={isFullscreen ? FiMinimize : FiMaximize} title="Fullscreen" />
                        </div>

                        <div style={{
                            flex: 1,
                            minHeight: isFullscreen ? '100%' : '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            cursor: 'grab'
                        }} ref={containerRef}>
                            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                                <div
                                    dangerouslySetInnerHTML={{ __html: svg }}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </TransformComponent>
                        </div>
                    </>
                )}
            </TransformWrapper>
        </div>
    );
};

export default MermaidDiagram;
