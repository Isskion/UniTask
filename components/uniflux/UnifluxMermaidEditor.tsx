'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MermaidEngine } from '@/app/uniflux/core/types';

// ---------------------------------------------------------------------------
// Mermaid CDN loader — safe for Next.js client components
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
                theme: 'dark',
                themeVariables: {
                    primaryColor: '#0f766e',
                    primaryTextColor: '#f0fdfa',
                    primaryBorderColor: '#14b8a6',
                    lineColor: '#5eead4',
                    secondaryColor: '#1e3a5f',
                    tertiaryColor: '#172554',
                    noteBkgColor: '#1e3a5f',
                    noteTextColor: '#e0f2fe',
                    noteBorderColor: '#38bdf8',
                    actorBkg: '#0f766e',
                    actorBorder: '#14b8a6',
                    actorTextColor: '#f0fdfa',
                    signalColor: '#5eead4',
                    signalTextColor: '#f0fdfa',
                    activationBkgColor: '#134e4a',
                    activationBorderColor: '#14b8a6',
                    labelBoxBkgColor: '#1e3a5f',
                    labelBoxBorderColor: '#38bdf8',
                    labelTextColor: '#e0f2fe',
                    loopTextColor: '#fbbf24',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
// Syntax highlighter (no Monaco dependency)
// ---------------------------------------------------------------------------
function highlightMermaid(code: string): string {
    return code.split('\n').map(line => {
        let h = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        h = h.replace(
            /\b(sequenceDiagram|flowchart|graph|participant|actor|activate|deactivate|Note|Note over|Note left of|Note right of|loop|alt|else|end|opt|par|and|rect|TD|LR|TB|BT|RL|style|fill|stroke|color)\b/g,
            '<span style="color:#14b8a6;font-weight:600">$1</span>'
        );
        h = h.replace(
            /(-->>|--&gt;&gt;|->>|-&gt;&gt;|-->|--&gt;|-.->|-.-&gt;|==&gt;|==>)/g,
            '<span style="color:#fbbf24;font-weight:700">$1</span>'
        );
        h = h.replace(/(\[.*?\]|\{.*?\}|\(.*?\))/g, '<span style="color:#a78bfa">$1</span>');
        h = h.replace(/\b(as)\b/g, '<span style="color:#fb923c;font-style:italic">$1</span>');
        h = h.replace(/(%%.*)/g, '<span style="color:#475569;font-style:italic">$1</span>');
        return h;
    }).join('\n');
}

// ---------------------------------------------------------------------------
// Line numbers
// ---------------------------------------------------------------------------
function LineNumbers({ count }: { count: number }) {
    return (
        <div style={{
            position: 'absolute', left: 0, top: 0, width: 44, height: '100%',
            background: '#0c1222', borderRight: '1px solid #1e293b',
            padding: '16px 0', textAlign: 'right', userSelect: 'none', zIndex: 2,
        }}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} style={{ height: 22, lineHeight: '22px', paddingRight: 12, fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                    {i + 1}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Diagram preview panel
// ---------------------------------------------------------------------------
function DiagramPanel({ code, mermaidReady }: { code: string; mermaidReady: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [svg, setSvg] = useState('');
    const renderIdRef = useRef(0);

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

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: 24 }}>
            {error ? (
                <div style={{ maxWidth: 480, padding: '20px 24px', background: 'linear-gradient(135deg,#1a0a0a,#2d1111)', border: '1px solid #7f1d1d', borderRadius: 10, fontFamily: "'JetBrains Mono',monospace" }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                        <span style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Syntax Error</span>
                    </div>
                    <pre style={{ color: '#fca5a5', fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {error.replace(/ParseError:?\s*/i, '').substring(0, 300)}
                    </pre>
                </div>
            ) : svg ? (
                <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
                <div style={{ color: '#334155', fontSize: 14, fontFamily: "'JetBrains Mono',monospace", textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◇</div>
                    Empieza a escribir para ver el diagrama
                </div>
            )}
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
// Main editor (controlled by workspace, local state for fast typing)
// ---------------------------------------------------------------------------
export default function UnifluxMermaidEditor({
    initialCode, initialEngine, onChange, onEngineChange,
}: UnifluxMermaidEditorProps) {
    const [code, setCode] = useState(initialCode);
    const [engine, setEngine] = useState<MermaidEngine>(initialEngine);
    const [debouncedCode, setDebouncedCode] = useState(initialCode);
    const [splitRatio, setSplitRatio] = useState(0.45);
    const [isDragging, setIsDragging] = useState(false);
    const mermaidReady = useMermaid();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce: diagram renders at 300ms, parent notified at same cadence
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedCode(code); onChange(code); }, 300);
        return () => clearTimeout(t);
    }, [code, onChange]);

    const handleEngineSwitch = useCallback((newEngine: MermaidEngine) => {
        if (newEngine === engine) return;
        setEngine(newEngine);
        onEngineChange(newEngine);
    }, [engine, onEngineChange]);

    // Sync scroll: highlighted overlay follows textarea scroll
    const handleScroll = useCallback(() => {
        if (highlightRef.current && textareaRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    // Tab key support
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

    // Resizable split handle
    useEffect(() => {
        if (!isDragging) return;
        const handleMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            setSplitRatio(Math.max(0.25, Math.min(0.7, (e.clientX - rect.left) / rect.width)));
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

    // Export PNG (2x resolution)
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
            ctx.fillStyle = '#0a0f1a';
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
    const mono = "'JetBrains Mono', 'Fira Code', monospace";

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#0a0f1a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Sub-toolbar: engine toggle + exports */}
            <div style={{
                height: 48, background: 'linear-gradient(180deg,#111827,#0f172a)',
                borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '0 16px', flexShrink: 0,
            }}>
                {/* Engine toggle */}
                <div style={{ display: 'flex', background: '#0c1222', borderRadius: 8, border: '1px solid #1e293b', padding: 3, gap: 2 }}>
                    {([
                        { key: 'sequence', label: 'Sequence', icon: '↔' },
                        { key: 'flowchart', label: 'Flowchart', icon: '◆' },
                    ] as { key: MermaidEngine; label: string; icon: string }[]).map(eng => (
                        <button
                            key={eng.key}
                            onClick={() => handleEngineSwitch(eng.key)}
                            style={{
                                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 5,
                                ...(engine === eng.key
                                    ? { background: 'linear-gradient(135deg,#0f766e,#134e4a)', color: '#5eead4', boxShadow: '0 0 10px rgba(20,184,166,0.2)' }
                                    : { background: 'transparent', color: '#64748b' }),
                            }}
                        >
                            <span style={{ fontSize: 11 }}>{eng.icon}</span>
                            {eng.label}
                        </button>
                    ))}
                </div>

                {/* Export buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleExportSVG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #1e293b', background: '#111827', color: '#94a3b8', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        SVG
                    </button>
                    <button onClick={handleExportPNG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #14b8a6', background: 'linear-gradient(135deg,#0f766e,#134e4a)', color: '#5eead4', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        PNG ×2
                    </button>
                </div>
            </div>

            {/* Split area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Code editor panel */}
                <div style={{ width: `${splitRatio * 100}%`, display: 'flex', flexDirection: 'column', background: '#0c1222', borderRight: '1px solid #1e293b' }}>
                    {/* Panel header */}
                    <div style={{ height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', background: '#0e1525' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#14b8a6', boxShadow: '0 0 6px #14b8a6' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: mono }}>
                                {engine}.mmd
                            </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#334155', fontFamily: mono }}>{lineCount} líneas</span>
                    </div>

                    {/* Editor area */}
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <LineNumbers count={lineCount} />
                        {/* Highlighted overlay */}
                        <pre
                            ref={highlightRef}
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: mono, fontSize: 13, lineHeight: '22px', color: '#cbd5e1', overflow: 'auto', whiteSpace: 'pre', pointerEvents: 'none', background: 'transparent', zIndex: 1 }}
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
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: mono, fontSize: 13, lineHeight: '22px', color: 'transparent', caretColor: '#14b8a6', background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflow: 'auto', whiteSpace: 'pre', zIndex: 3 }}
                        />
                    </div>
                </div>

                {/* Resize handle */}
                <div
                    onMouseDown={() => setIsDragging(true)}
                    style={{ width: 6, cursor: 'col-resize', background: isDragging ? 'linear-gradient(180deg,#14b8a6,#0f766e)' : '#1e293b', flexShrink: 0, position: 'relative', zIndex: 10 }}
                >
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 4, height: 32, borderRadius: 2, background: isDragging ? '#5eead4' : '#334155' }} />
                </div>

                {/* Diagram preview panel */}
                <div style={{ flex: 1, background: 'radial-gradient(ellipse at 50% 50%,#0f172a,#0a0f1a)', position: 'relative', overflow: 'hidden' }}>
                    {/* Grid background */}
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(20,184,166,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
                    {/* Panel header */}
                    <div style={{ height: 32, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', background: '#0e152588', backdropFilter: 'blur(8px)', position: 'relative', zIndex: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: mermaidReady ? '#14b8a6' : '#fbbf24', boxShadow: mermaidReady ? '0 0 6px #14b8a6' : '0 0 6px #fbbf24' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', fontFamily: mono }}>Preview</span>
                        </div>
                        <span style={{ fontSize: 10, color: '#334155', fontFamily: mono }}>{mermaidReady ? 'live' : 'cargando…'}</span>
                    </div>
                    {/* Diagram */}
                    <div style={{ position: 'absolute', inset: 0, top: 32, overflow: 'auto' }}>
                        {mermaidReady
                            ? <DiagramPanel code={debouncedCode} mermaidReady={mermaidReady} />
                            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155', fontSize: 13, fontFamily: mono }}>Inicializando motor Mermaid…</div>
                        }
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div style={{ height: 26, background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: '#ccfbf1', fontFamily: mono }}>Engine: {engine}</span>
                <span style={{ fontSize: 11, color: '#99f6e4', fontFamily: mono }}>Mermaid v10.9 · Uniflux DSL</span>
            </div>

            <style>{`
                textarea::selection { background: rgba(20,184,166,0.3); }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
            `}</style>
        </div>
    );
}
