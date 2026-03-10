'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MermaidEngine } from '@/app/uniflux/core/types';

// ---------------------------------------------------------------------------
// Mermaid CDN loader — light theme
// ---------------------------------------------------------------------------
const MERMAID_CDN = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js";

function useMermaid(): boolean {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if ((window as any).mermaid) { setReady(true); return; }
        const s = document.createElement('script');
        s.src = MERMAID_CDN;
        s.onload = () => {
            (window as any).mermaid.initialize({
                startOnLoad: false,
                theme: 'default',
                themeVariables: {
                    primaryColor: '#e9d5ff',
                    primaryTextColor: '#1e1b4b',
                    primaryBorderColor: '#7c3aed',
                    lineColor: '#6366f1',
                    secondaryColor: '#dbeafe',
                    tertiaryColor: '#f0fdf4',
                    noteBkgColor: '#fef9c3',
                    noteTextColor: '#713f12',
                    noteBorderColor: '#fbbf24',
                    actorBkg: '#e9d5ff',
                    actorBorder: '#7c3aed',
                    actorTextColor: '#3b0764',
                    signalColor: '#6366f1',
                    signalTextColor: '#1e1b4b',
                    activationBkgColor: '#ddd6fe',
                    activationBorderColor: '#7c3aed',
                    labelBoxBkgColor: '#dbeafe',
                    labelBoxBorderColor: '#3b82f6',
                    labelTextColor: '#1e3a8a',
                    loopTextColor: '#1d4ed8',
                    fontFamily: "'Inter', 'Segoe UI', sans-serif",
                    fontSize: '14px',
                },
                sequence: { mirrorActors: false, messageMargin: 40, actorMargin: 80 },
                flowchart: { curve: 'basis', padding: 20 },
            });
            setReady(true);
        };
        document.head.appendChild(s);
    }, []);
    return ready;
}

// ---------------------------------------------------------------------------
// Syntax highlighter — light palette
// ---------------------------------------------------------------------------
function highlightMermaid(code: string): string {
    return code.split('\n').map(line => {
        let h = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        h = h.replace(
            /\b(sequenceDiagram|flowchart|graph|participant|actor|activate|deactivate|Note|Note over|Note left of|Note right of|loop|alt|else|end|opt|par|and|rect|TD|LR|TB|BT|RL|style|fill|stroke|color)\b/g,
            '<span style="color:#7c3aed;font-weight:600">$1</span>'
        );
        h = h.replace(
            /(-->>|--&gt;&gt;|->>|-&gt;&gt;|-->|--&gt;|-.->|-.-&gt;|==&gt;|==>)/g,
            '<span style="color:#dc2626;font-weight:700">$1</span>'
        );
        h = h.replace(/(\[.*?\]|\{.*?\}|\(.*?\))/g, '<span style="color:#0891b2">$1</span>');
        h = h.replace(/\b(as)\b/g, '<span style="color:#d97706;font-style:italic">$1</span>');
        h = h.replace(/(%%.*)/g, '<span style="color:#94a3b8;font-style:italic">$1</span>');
        return h;
    }).join('\n');
}

// ---------------------------------------------------------------------------
// Line numbers — light
// ---------------------------------------------------------------------------
function LineNumbers({ count }: { count: number }) {
    return (
        <div style={{
            position: 'absolute', left: 0, top: 0, width: 44, height: '100%',
            background: '#f1f5f9', borderRight: '1px solid #e2e8f0',
            padding: '16px 0', textAlign: 'right', userSelect: 'none', zIndex: 2,
        }}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} style={{ height: 22, lineHeight: '22px', paddingRight: 12, fontSize: 12, color: '#94a3b8', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
                    {i + 1}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Diagram preview with zoom + pan
// ---------------------------------------------------------------------------
function DiagramPanel({ code, mermaidReady }: { code: string; mermaidReady: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [svg, setSvg] = useState('');
    const renderIdRef = useRef(0);

    // Zoom / pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!mermaidReady || !code.trim()) { setSvg(''); setError(null); return; }
        const id = ++renderIdRef.current;
        (async () => {
            try {
                const elId = `mermaid-render-${id}-${Date.now()}`;
                const { svg: rendered } = await (window as any).mermaid.render(elId, code.trim());
                if (id === renderIdRef.current) { setSvg(rendered); setError(null); }
            } catch (err: any) {
                if (id === renderIdRef.current) { setError(err?.message || 'Syntax error'); setSvg(''); }
                document.querySelectorAll('[id^="mermaid-render-"]').forEach(el => {
                    if (el.parentNode && el.parentNode !== containerRef.current) el.remove();
                });
            }
        })();
    }, [code, mermaidReady]);

    // Reset zoom/pan when diagram changes
    useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [svg]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(z => Math.max(0.2, Math.min(5, z * delta)));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        isPanningRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }, []);

    const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);

    const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Zoom controls */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 20, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>+</button>
                <span onClick={resetView} style={{ fontSize: 11, color: '#6b7280', width: 40, textAlign: 'center', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }} title="Click para resetear">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid #e2e8f0', background: 'white', color: '#374151', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>−</button>
                <div style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 2px' }} />
                <button onClick={resetView} style={{ width: 26, height: 26, borderRadius: 5, border: '1px solid #e2e8f0', background: 'white', color: '#6b7280', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }} title="Resetear vista">⊙</button>
            </div>

            {/* Hint when there's a diagram */}
            {svg && !error && (
                <div style={{ position: 'absolute', top: 8, right: 12, zIndex: 20, fontSize: 10, color: '#94a3b8', background: 'rgba(255,255,255,0.8)', borderRadius: 4, padding: '2px 6px', pointerEvents: 'none' }}>
                    Rueda = zoom · Arrastrar = mover
                </div>
            )}

            {/* Pannable / zoomable area */}
            <div
                ref={containerRef}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ width: '100%', height: '100%', cursor: isPanningRef.current ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center', transition: isPanningRef.current ? 'none' : 'transform 0.05s ease' }}>
                    {error ? (
                        <div style={{ maxWidth: 440, padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Syntax Error</span>
                            </div>
                            <pre style={{ color: '#991b1b', fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'JetBrains Mono', monospace" }}>
                                {error.replace(/ParseError:?\s*/i, '').substring(0, 300)}
                            </pre>
                        </div>
                    ) : svg ? (
                        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    ) : (
                        <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center' }}>
                            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◇</div>
                            Empieza a escribir para ver el diagrama
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface UnifluxMermaidEditorProps {
    initialCode: string;
    initialEngine: MermaidEngine;
    onChange: (code: string) => void;
    onEngineChange: (engine: MermaidEngine) => void;
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------
export default function UnifluxMermaidEditor({
    initialCode, initialEngine, onChange, onEngineChange,
}: UnifluxMermaidEditorProps) {
    const [code, setCode] = useState(initialCode);
    const [engine, setEngine] = useState<MermaidEngine>(initialEngine);
    const [debouncedCode, setDebouncedCode] = useState(initialCode);
    const [splitRatio, setSplitRatio] = useState(0.42);
    const [isDragging, setIsDragging] = useState(false);
    const mermaidReady = useMermaid();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const mono = "'JetBrains Mono', 'Fira Code', monospace";

    useEffect(() => {
        const t = setTimeout(() => { setDebouncedCode(code); onChange(code); }, 300);
        return () => clearTimeout(t);
    }, [code, onChange]);

    const handleEngineSwitch = useCallback((newEngine: MermaidEngine) => {
        if (newEngine === engine) return;
        setEngine(newEngine);
        onEngineChange(newEngine);
    }, [engine, onEngineChange]);

    const handleScroll = useCallback(() => {
        if (highlightRef.current && textareaRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const { selectionStart, selectionEnd } = e.currentTarget;
            const newVal = code.substring(0, selectionStart) + '    ' + code.substring(selectionEnd);
            setCode(newVal);
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = selectionStart + 4;
                }
            });
        }
    }, [code]);

    // Resizable split
    useEffect(() => {
        if (!isDragging) return;
        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSplitRatio(Math.max(0.2, Math.min(0.72, (e.clientX - rect.left) / rect.width)));
        };
        const handleUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    }, [isDragging]);

    // Export SVG
    const handleExportSVG = useCallback(() => {
        const svgEl = document.querySelector('[id^="mermaid-render-"]');
        if (!svgEl) return;
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' })),
            download: `uniflux-${engine}.svg`,
        });
        a.click();
    }, [engine]);

    // Export PNG (2x)
    const handleExportPNG = useCallback(() => {
        const svgEl = document.querySelector('[id^="mermaid-render-"]') as SVGSVGElement | null;
        if (!svgEl) return;
        const svgStr = new XMLSerializer().serializeToString(svgEl);
        const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width * 2; canvas.height = img.height * 2;
            const ctx = canvas.getContext('2d')!;
            ctx.scale(2, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, img.width, img.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(blob => {
                if (!blob) return;
                const a = Object.assign(document.createElement('a'), {
                    href: URL.createObjectURL(blob),
                    download: `uniflux-${engine}.png`,
                });
                a.click();
            });
            URL.revokeObjectURL(url);
        };
        img.src = url;
    }, [engine]);

    const lineCount = code.split('\n').length;

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Toolbar */}
            <div style={{
                height: 46, background: '#ffffff', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 16px', flexShrink: 0, gap: 12,
            }}>
                {/* Engine toggle */}
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0', padding: 3, gap: 2 }}>
                    {([
                        { key: 'sequence', label: 'Sequence', icon: '↔' },
                        { key: 'flowchart', label: 'Flowchart', icon: '◆' },
                    ] as { key: MermaidEngine; label: string; icon: string }[]).map(eng => (
                        <button
                            key={eng.key}
                            onClick={() => handleEngineSwitch(eng.key)}
                            style={{
                                padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                                ...(engine === eng.key
                                    ? { background: '#ffffff', color: '#7c3aed', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderColor: '#e9d5ff' }
                                    : { background: 'transparent', color: '#94a3b8', border: '1px solid transparent' }),
                            }}
                        >
                            <span style={{ fontSize: 11 }}>{eng.icon}</span>
                            {eng.label}
                        </button>
                    ))}
                </div>

                {/* Title */}
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                    Uniflux · Mermaid DSL
                </span>

                {/* Export buttons */}
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={handleExportSVG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        SVG
                    </button>
                    <button onClick={handleExportPNG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd6fe', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        PNG ×2
                    </button>
                </div>
            </div>

            {/* Split area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Code editor panel */}
                <div style={{ width: `${splitRatio * 100}%`, display: 'flex', flexDirection: 'column', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                    {/* Panel header */}
                    <div style={{ height: 30, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: mono }}>
                                {engine}.mmd
                            </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontFamily: mono }}>{lineCount} líneas</span>
                    </div>

                    {/* Editor area */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <LineNumbers count={lineCount} />
                        {/* Highlighted overlay */}
                        <pre
                            ref={highlightRef}
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: mono, fontSize: 13, lineHeight: '22px', color: '#374151', overflow: 'auto', whiteSpace: 'pre', pointerEvents: 'none', background: 'transparent', zIndex: 1 }}
                            dangerouslySetInnerHTML={{ __html: highlightMermaid(code) }}
                        />
                        {/* Editable textarea */}
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            onScroll={handleScroll}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: mono, fontSize: 13, lineHeight: '22px', color: 'transparent', caretColor: '#7c3aed', background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflow: 'auto', whiteSpace: 'pre', zIndex: 3 }}
                        />
                    </div>
                </div>

                {/* Resize handle */}
                <div
                    onMouseDown={() => setIsDragging(true)}
                    style={{ width: 5, cursor: 'col-resize', background: isDragging ? '#7c3aed' : '#e2e8f0', flexShrink: 0, position: 'relative', zIndex: 10, transition: 'background 0.15s' }}
                >
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 3, height: 28, borderRadius: 2, background: isDragging ? '#c4b5fd' : '#cbd5e1' }} />
                </div>

                {/* Diagram preview panel */}
                <div style={{ flex: 1, background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
                    {/* Light grid background */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(99,102,241,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.04) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
                    {/* Panel header */}
                    <div style={{ height: 30, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative', zIndex: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: mermaidReady ? '#10b981' : '#f59e0b' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: mono }}>Preview</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontFamily: mono }}>{mermaidReady ? 'live' : 'cargando…'}</span>
                    </div>
                    {/* Diagram */}
                    <div style={{ position: 'absolute', inset: 0, top: 30, overflow: 'hidden' }}>
                        {mermaidReady
                            ? <DiagramPanel code={debouncedCode} mermaidReady={mermaidReady} />
                            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13, fontFamily: mono }}>Inicializando motor Mermaid…</div>
                        }
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div style={{ height: 24, background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: mono }}>Engine: {engine}</span>
                <span style={{ fontSize: 10, color: '#c4b5fd', fontFamily: mono }}>Mermaid v10.9 · Uniflux DSL</span>
            </div>

            <style>{`
                textarea::selection { background: rgba(124,58,237,0.15); }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
}
