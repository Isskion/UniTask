'use client'

import { useState, useEffect, useRef, useCallback } from 'react';
import type { MermaidEngine } from '@/app/uniflux/core/types';

const MERMAID_CDN = "https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.9.1/mermaid.min.js";

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------
type ThemeKey = 'uniflux' | 'default' | 'forest' | 'dark' | 'neutral' | 'base';

interface ThemeDef {
    key: ThemeKey;
    label: string;
    swatch: string;
    mermaidTheme: string;
    themeVariables?: Record<string, string>;
    diagramBg: string;
    isDark?: boolean;
}

const UNIFLUX_VARS: Record<string, string> = {
    primaryColor: '#e9d5ff', primaryTextColor: '#1e1b4b', primaryBorderColor: '#7c3aed',
    lineColor: '#6366f1', secondaryColor: '#dbeafe', tertiaryColor: '#f0fdf4',
    noteBkgColor: '#fef9c3', noteTextColor: '#713f12', noteBorderColor: '#fbbf24',
    actorBkg: '#e9d5ff', actorBorder: '#7c3aed', actorTextColor: '#3b0764',
    signalColor: '#6366f1', signalTextColor: '#1e1b4b',
    activationBkgColor: '#ddd6fe', activationBorderColor: '#7c3aed',
    labelBoxBkgColor: '#dbeafe', labelBoxBorderColor: '#3b82f6',
    labelTextColor: '#1e3a8a', loopTextColor: '#1d4ed8',
    fontFamily: "'Inter', 'Segoe UI', sans-serif", fontSize: '14px',
};

const THEMES: ThemeDef[] = [
    { key: 'uniflux', label: 'Uniflux', swatch: 'linear-gradient(135deg,#7c3aed,#6366f1)', mermaidTheme: 'base', themeVariables: UNIFLUX_VARS, diagramBg: '#ffffff' },
    { key: 'default', label: 'Default', swatch: '#fbbf24', mermaidTheme: 'default', diagramBg: '#ffffff' },
    { key: 'forest', label: 'Forest', swatch: '#16a34a', mermaidTheme: 'forest', diagramBg: '#ffffff' },
    { key: 'dark', label: 'Dark', swatch: '#1e293b', mermaidTheme: 'dark', diagramBg: '#1e293b', isDark: true },
    { key: 'neutral', label: 'Neutral', swatch: '#9ca3af', mermaidTheme: 'neutral', diagramBg: '#f9fafb' },
    { key: 'base', label: 'Base', swatch: '#3b82f6', mermaidTheme: 'base', diagramBg: '#ffffff' },
];

// ---------------------------------------------------------------------------
// Insert actions palette (edit mode)
// ---------------------------------------------------------------------------
const INSERT_ACTIONS: Record<MermaidEngine, { icon: string; label: string; snippet: string; hint: string }[]> = {
    sequence: [
        { icon: '→', label: 'Mensaje', hint: 'A envía a B', snippet: 'Actor1->>Actor2: descripción' },
        { icon: '↩', label: 'Respuesta', hint: 'B responde a A', snippet: 'Actor2-->>Actor1: respuesta' },
        { icon: '▶', label: 'Loop', hint: 'Repetición', snippet: 'loop Condición\n    Actor1->>Actor2: acción\nend' },
        { icon: '?', label: 'Alt / Else', hint: 'Bifurcación', snippet: 'alt Caso OK\n    Actor1->>Actor2: éxito\nelse Caso KO\n    Actor1->>Actor2: error\nend' },
        { icon: '◎', label: 'Opt', hint: 'Opcional', snippet: 'opt Condición opcional\n    Actor1->>Actor2: acción\nend' },
        { icon: '📝', label: 'Nota', hint: 'Comentario', snippet: 'Note over Actor1: texto de nota' },
        { icon: '+', label: 'Participante', hint: 'Nuevo actor', snippet: 'participant NuevoActor as Nombre' },
        { icon: '⚡', label: 'Activación', hint: 'Bloque activo', snippet: 'activate Actor1\n    Actor1->>Actor2: procesando\ndeactivate Actor1' },
    ],
    flowchart: [
        { icon: '→', label: 'Conexión', hint: 'Enlace entre nodos', snippet: 'NodoA --> NodoB' },
        { icon: '◻', label: 'Nodo', hint: 'Rectángulo', snippet: 'NuevoNodo[Etiqueta]' },
        { icon: '◆', label: 'Decisión', hint: 'Rombo if/else', snippet: 'decision{¿Condición?}' },
        { icon: '○', label: 'Redondeado', hint: 'Nodo pill', snippet: 'inicio([Inicio])' },
        { icon: '⊡', label: 'Subgraph', hint: 'Agrupación', snippet: 'subgraph Grupo\n    NodoA --> NodoB\nend' },
        { icon: '✎', label: 'Etiqueta en enlace', hint: 'Texto en flecha', snippet: 'NodoA -->|condición| NodoB' },
    ],
};

// ---------------------------------------------------------------------------
// CDN loader
// ---------------------------------------------------------------------------
function useMermaid(): boolean {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        if ((window as any).mermaid) { setReady(true); return; }
        const s = document.createElement('script');
        s.src = MERMAID_CDN;
        s.onload = () => {
            (window as any).mermaid.initialize({
                startOnLoad: false,
                theme: 'base',
                themeVariables: UNIFLUX_VARS,
                sequence: { mirrorActors: true, messageMargin: 35, actorMargin: 60, height: 60, useMaxWidth: false },
                flowchart: { curve: 'basis', padding: 20 },
            });
            setReady(true);
        };
        document.head.appendChild(s);
    }, []);
    return ready;
}

// ---------------------------------------------------------------------------
// Syntax highlighter
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
// Line numbers
// ---------------------------------------------------------------------------
const MONO = "'JetBrains Mono', 'Fira Code', monospace";

function LineNumbers({ count }: { count: number }) {
    return (
        <div style={{
            position: 'absolute', left: 0, top: 0, width: 44, height: '100%',
            background: '#f1f5f9', borderRight: '1px solid #e2e8f0',
            padding: '16px 0', textAlign: 'right', userSelect: 'none', zIndex: 2,
        }}>
            {Array.from({ length: count }, (_, i) => (
                <div key={i} style={{ height: 22, lineHeight: '22px', paddingRight: 12, fontSize: 12, color: '#94a3b8', fontFamily: MONO }}>
                    {i + 1}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Diagram preview with zoom + pan + edit mode
// ---------------------------------------------------------------------------
interface DiagramPanelProps {
    code: string;
    mermaidReady: boolean;
    activeTheme: ThemeDef;
    handMode: boolean;
    engine: MermaidEngine;
    onInsertSnippet: (snippet: string) => void;
}

function DiagramPanel({ code, mermaidReady, activeTheme, handMode, engine, onInsertSnippet }: DiagramPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [svg, setSvg] = useState('');
    const renderIdRef = useRef(0);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanningRef = useRef(false);
    const didMoveRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const dk = activeTheme.isDark;

    useEffect(() => {
        if (!mermaidReady || !code.trim()) { setSvg(''); setError(null); return; }
        const id = ++renderIdRef.current;
        (async () => {
            try {
                (window as any).mermaid.initialize({
                    startOnLoad: false,
                    theme: activeTheme.mermaidTheme,
                    ...(activeTheme.themeVariables ? { themeVariables: activeTheme.themeVariables } : {}),
                    sequence: { mirrorActors: true, messageMargin: 35, actorMargin: 60, height: 60, useMaxWidth: false },
                    flowchart: { curve: 'basis', padding: 20 },
                });
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
    }, [code, mermaidReady, activeTheme]);

    useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [svg]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!handMode) return;
        e.preventDefault();
        setZoom(z => Math.max(0.2, Math.min(5, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    }, [handMode]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!handMode || e.button !== 0) return;
        isPanningRef.current = true;
        didMoveRef.current = false;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
    }, [handMode]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanningRef.current) return;
        const dx = e.clientX - lastPosRef.current.x;
        const dy = e.clientY - lastPosRef.current.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didMoveRef.current = true;
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    }, []);

    const handleMouseUp = useCallback(() => { isPanningRef.current = false; }, []);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (handMode || didMoveRef.current) return;
        const target = e.target as Element;

        // Detect by SVG text element (works across all Mermaid SVG structures)
        const textEl = target.tagName === 'text' ? target
            : target.closest('text')
            ?? target.closest('g')?.querySelector('text')
            ?? null;

        if (textEl?.textContent?.trim()) {
            const name = textEl.textContent.trim().replace(/\n/g, ' ').trim();
            if (engine === 'sequence') {
                onInsertSnippet(`${name}->>${name}: `);
            } else {
                onInsertSnippet(`${name.replace(/\s+/g, '')} --> `);
            }
            return;
        }

        // Fallback: click in empty area — insert generic template
        onInsertSnippet(engine === 'sequence' ? `Actor1->>Actor2: ` : `NuevoNodo[Etiqueta]`);
    }, [handMode, engine, onInsertSnippet]);

    const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

    const zoomBtnBase = {
        width: 26, height: 26, borderRadius: 5, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
        border: `1px solid ${dk ? '#475569' : '#e2e8f0'}`,
        background: dk ? '#0f172a' : 'white',
        color: dk ? '#94a3b8' : '#374151',
    } as const;

    return (
        <div
            className={!handMode ? 'uniflux-edit-mode' : undefined}
            style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: activeTheme.diagramBg }}
        >
            {/* Grid */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(${dk ? 'rgba(148,163,184,0.05)' : 'rgba(99,102,241,0.04)'} 1px,transparent 1px),linear-gradient(90deg,${dk ? 'rgba(148,163,184,0.05)' : 'rgba(99,102,241,0.04)'} 1px,transparent 1px)`,
                backgroundSize: '32px 32px',
            }} />

            {/* Edit mode — floating insert palette */}
            {!handMode && (
                <div style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 25,
                    background: dk ? '#0f172a' : 'white',
                    border: `1px solid ${dk ? '#334155' : '#e9d5ff'}`,
                    borderRadius: 12, boxShadow: '0 4px 20px rgba(124,58,237,0.15)',
                    padding: '10px 10px 8px', width: 196,
                }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>✏</span> Insertar en código
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {INSERT_ACTIONS[engine].map(action => (
                            <button
                                key={action.label}
                                onClick={(e) => { e.stopPropagation(); onInsertSnippet(action.snippet); }}
                                title={action.hint}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                                    border: `1px solid ${dk ? '#1e293b' : '#f3f4f6'}`,
                                    background: dk ? '#1e293b' : '#fafafa',
                                    fontSize: 12, color: dk ? '#cbd5e1' : '#374151', fontWeight: 500,
                                    transition: 'all 0.1s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = dk ? '#1e3a5f' : '#f5f3ff';
                                    (e.currentTarget as HTMLElement).style.borderColor = '#ddd6fe';
                                    (e.currentTarget as HTMLElement).style.color = '#7c3aed';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = dk ? '#1e293b' : '#fafafa';
                                    (e.currentTarget as HTMLElement).style.borderColor = dk ? '#1e293b' : '#f3f4f6';
                                    (e.currentTarget as HTMLElement).style.color = dk ? '#cbd5e1' : '#374151';
                                }}
                            >
                                <span style={{
                                    width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                                    background: 'linear-gradient(135deg,#7c3aed,#6366f1)',
                                    color: 'white', fontSize: 11, fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {action.icon}
                                </span>
                                <span style={{ flex: 1 }}>{action.label}</span>
                                <span style={{ fontSize: 9, color: '#94a3b8', flexShrink: 0 }}>{action.hint}</span>
                            </button>
                        ))}
                    </div>
                    <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${dk ? '#1e293b' : '#f3f4f6'}`, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
                        O haz click en el diagrama
                    </div>
                </div>
            )}

            {/* Zoom controls */}
            <div style={{
                position: 'absolute', bottom: 12, right: 12, zIndex: 20,
                display: 'flex', alignItems: 'center', gap: 4,
                background: dk ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(8px)', border: `1px solid ${dk ? '#334155' : '#e2e8f0'}`,
                borderRadius: 8, padding: '4px 6px', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            }}>
                <button onClick={() => setZoom(z => Math.min(5, z * 1.2))} style={{ ...zoomBtnBase, fontSize: 16 }}>+</button>
                <span onClick={resetView} style={{ fontSize: 11, color: dk ? '#64748b' : '#6b7280', width: 40, textAlign: 'center', cursor: 'pointer', fontWeight: 500, userSelect: 'none' }} title="Click para resetear">
                    {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom(z => Math.max(0.2, z * 0.8))} style={{ ...zoomBtnBase, fontSize: 16 }}>−</button>
                <div style={{ width: 1, height: 16, background: dk ? '#334155' : '#e2e8f0', margin: '0 2px' }} />
                <button onClick={resetView} style={{ ...zoomBtnBase, fontSize: 11 }} title="Resetear vista">⊙</button>
            </div>

            {/* Mode hint */}
            {svg && !error && (
                <div style={{
                    position: 'absolute', top: 8, right: 12, zIndex: 20, fontSize: 10,
                    color: dk ? '#475569' : '#94a3b8',
                    background: dk ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)',
                    borderRadius: 4, padding: '2px 6px', pointerEvents: 'none',
                }}>
                    {handMode ? 'Rueda = zoom · Arrastrar = mover' : '✏ Click en el diagrama para insertar código'}
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
                onClick={handleClick}
                style={{ width: '100%', height: '100%', cursor: !handMode ? 'crosshair' : 'grab', userSelect: 'none' }}
            >
                <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isPanningRef.current ? 'none' : 'transform 0.05s ease',
                }}>
                    {error ? (
                        <div style={{ maxWidth: 440, padding: '16px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} />
                                <span style={{ color: '#b91c1c', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>Syntax Error</span>
                            </div>
                            <pre style={{ color: '#991b1b', fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: MONO }}>
                                {error.replace(/ParseError:?\s*/i, '').substring(0, 300)}
                            </pre>
                        </div>
                    ) : svg ? (
                        <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    ) : (
                        <div style={{ color: dk ? '#475569' : '#94a3b8', fontSize: 14, textAlign: 'center' }}>
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
    onConvertToVisual?: (nodes: import('@/app/uniflux/core/types').FlowNode[], edges: import('@/app/uniflux/core/types').FlowEdge[]) => void;
}

// ---------------------------------------------------------------------------
// Main editor
// ---------------------------------------------------------------------------
export default function UnifluxMermaidEditor({
    initialCode, initialEngine, onChange, onEngineChange, onConvertToVisual,
}: UnifluxMermaidEditorProps) {
    const [code, setCode] = useState(initialCode);
    const [engine, setEngine] = useState<MermaidEngine>(initialEngine);
    const [debouncedCode, setDebouncedCode] = useState(initialCode);
    const [splitRatio, setSplitRatio] = useState(0.42);
    const [isDragging, setIsDragging] = useState(false);
    const [activeThemeKey, setActiveThemeKey] = useState<ThemeKey>('uniflux');
    const [showThemePicker, setShowThemePicker] = useState(false);
    const [handMode, setHandMode] = useState(true);
    const [copiedMMD, setCopiedMMD] = useState(false);
    const [convertFeedback, setConvertFeedback] = useState<'idle' | 'ok' | 'empty'>('idle');
    const mermaidReady = useMermaid();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeTheme = THEMES.find(t => t.key === activeThemeKey) ?? THEMES[0];

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

    // Export PNG ×2
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
            ctx.fillStyle = activeTheme.diagramBg;
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
    }, [engine, activeTheme]);

    // Export MMD — download + copy to clipboard
    const handleExportMMD = useCallback(async () => {
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' })),
            download: `uniflux-${engine}.mmd`,
        });
        a.click();
        try {
            await navigator.clipboard.writeText(code);
            setCopiedMMD(true);
            setTimeout(() => setCopiedMMD(false), 2000);
        } catch { /* clipboard may be restricted */ }
    }, [code, engine]);

    // Convert Mermaid → Visual flow
    const handleConvert = useCallback(async () => {
        if (!onConvertToVisual) return;
        const { parseMermaidToVisual } = await import('@/app/uniflux/core/mermaidToVisual');
        const { nodes: vNodes, edges: vEdges } = parseMermaidToVisual(code);
        if (vNodes.length === 0) { setConvertFeedback('empty'); setTimeout(() => setConvertFeedback('idle'), 2500); return; }
        onConvertToVisual(vNodes, vEdges);
        setConvertFeedback('ok');
        setTimeout(() => setConvertFeedback('idle'), 2500);
    }, [code, onConvertToVisual]);

    // Insert snippet from edit-mode diagram click
    const insertSnippet = useCallback((snippet: string) => {
        setCode(prev => prev.trimEnd() + '\n' + snippet);
        requestAnimationFrame(() => {
            const ta = textareaRef.current;
            if (ta) { ta.selectionStart = ta.selectionEnd = ta.value.length; ta.focus(); }
        });
    }, []);

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
                                padding: '4px 14px', borderRadius: 6, cursor: 'pointer',
                                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                                ...(engine === eng.key
                                    ? { background: '#ffffff', color: '#7c3aed', border: '1px solid #e9d5ff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                                    : { background: 'transparent', color: '#94a3b8', border: '1px solid transparent' }),
                            }}
                        >
                            <span style={{ fontSize: 11 }}>{eng.icon}</span>
                            {eng.label}
                        </button>
                    ))}
                </div>

                {/* Title */}
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, flexShrink: 0 }}>
                    Uniflux · Mermaid DSL
                </span>

                {/* Right controls */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>

                    {/* Theme picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowThemePicker(v => !v)}
                            title="Cambiar tema"
                            style={{
                                width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
                                border: `1px solid ${showThemePicker ? '#ddd6fe' : '#e2e8f0'}`,
                                background: showThemePicker ? '#f5f3ff' : 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                            }}
                        >
                            <span style={{ width: 16, height: 16, borderRadius: 3, display: 'block', background: activeTheme.swatch, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                        </button>
                        {showThemePicker && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowThemePicker(false)} />
                                <div style={{
                                    position: 'absolute', top: 34, right: 0, zIndex: 50,
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
                                    padding: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 170,
                                }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6, padding: '0 4px' }}>
                                        Tema del diagrama
                                    </div>
                                    {THEMES.map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => { setActiveThemeKey(t.key); setShowThemePicker(false); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                                                padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                                textAlign: 'left', background: activeThemeKey === t.key ? '#f5f3ff' : 'transparent',
                                            }}
                                        >
                                            <span style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'block', background: t.swatch, border: '1px solid rgba(0,0,0,0.1)' }} />
                                            <span style={{ fontSize: 12, fontWeight: activeThemeKey === t.key ? 600 : 400, color: activeThemeKey === t.key ? '#7c3aed' : '#374151' }}>
                                                {t.label}
                                            </span>
                                            {activeThemeKey === t.key && <span style={{ marginLeft: 'auto', color: '#7c3aed', fontSize: 12 }}>✓</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Hand / Edit mode toggle */}
                    <button
                        onClick={() => setHandMode(v => !v)}
                        title={handMode ? 'Modo mano activo · Click para edición' : 'Modo edición · Click en diagrama inserta código'}
                        style={{
                            width: 30, height: 30, borderRadius: 6, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                            border: handMode ? '1.5px solid #ddd6fe' : '1.5px solid #bbf7d0',
                            background: handMode ? '#f5f3ff' : '#f0fdf4',
                            transition: 'all 0.15s',
                        }}
                    >
                        {handMode ? '✋' : '✏️'}
                    </button>

                    {/* Separator */}
                    <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 2px' }} />

                    {/* Convert to visual flow */}
                    {onConvertToVisual && (
                        <button
                            onClick={handleConvert}
                            title="Convertir este diagrama a flujo visual editable"
                            style={{
                                padding: '5px 11px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                border: `1px solid ${convertFeedback === 'ok' ? '#bbf7d0' : convertFeedback === 'empty' ? '#fecaca' : '#d1fae5'}`,
                                background: convertFeedback === 'ok' ? '#f0fdf4' : convertFeedback === 'empty' ? '#fef2f2' : '#f0fdf4',
                                color: convertFeedback === 'ok' ? '#16a34a' : convertFeedback === 'empty' ? '#dc2626' : '#059669',
                                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.3s',
                            }}
                        >
                            <span style={{ fontSize: 13 }}>
                                {convertFeedback === 'ok' ? '✓' : convertFeedback === 'empty' ? '!' : '⇄'}
                            </span>
                            {convertFeedback === 'ok' ? 'Creado' : convertFeedback === 'empty' ? 'Sin contenido' : 'Convertir'}
                        </button>
                    )}

                    {/* SVG */}
                    <button onClick={handleExportSVG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>
                        SVG
                    </button>

                    {/* PNG */}
                    <button onClick={handleExportPNG} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ddd6fe', background: 'linear-gradient(135deg,#7c3aed,#6366f1)', color: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        PNG ×2
                    </button>

                    {/* MMD */}
                    <button
                        onClick={handleExportMMD}
                        title="Descargar .mmd y copiar al portapapeles"
                        style={{
                            padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            border: `1px solid ${copiedMMD ? '#bbf7d0' : '#bfdbfe'}`,
                            background: copiedMMD ? '#f0fdf4' : 'white',
                            color: copiedMMD ? '#16a34a' : '#3b82f6',
                            transition: 'all 0.3s',
                        }}
                    >
                        {copiedMMD ? '✓ Copiado' : 'MMD'}
                    </button>
                </div>
            </div>

            {/* Split area */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Code editor panel */}
                <div style={{ width: `${splitRatio * 100}%`, display: 'flex', flexDirection: 'column', background: '#fafafa', borderRight: '1px solid #e2e8f0' }}>
                    <div style={{ height: 30, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c3aed' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: MONO }}>
                                {engine}.mmd
                            </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontFamily: MONO }}>{lineCount} líneas</span>
                    </div>

                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <LineNumbers count={lineCount} />
                        <pre
                            ref={highlightRef}
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: MONO, fontSize: 13, lineHeight: '22px', color: '#374151', overflow: 'auto', whiteSpace: 'pre', pointerEvents: 'none', background: 'transparent', zIndex: 1 }}
                            dangerouslySetInnerHTML={{ __html: highlightMermaid(code) }}
                        />
                        <textarea
                            ref={textareaRef}
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            onScroll={handleScroll}
                            onKeyDown={handleKeyDown}
                            spellCheck={false}
                            style={{ position: 'absolute', left: 44, top: 0, width: 'calc(100% - 44px)', height: '100%', margin: 0, padding: 16, fontFamily: MONO, fontSize: 13, lineHeight: '22px', color: 'transparent', caretColor: '#7c3aed', background: 'transparent', border: 'none', outline: 'none', resize: 'none', overflow: 'auto', whiteSpace: 'pre', zIndex: 3 }}
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
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: 30, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', position: 'relative', zIndex: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: mermaidReady ? '#10b981' : '#f59e0b' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: 0.6, textTransform: 'uppercase', fontFamily: MONO }}>
                                Preview · {activeTheme.label}
                            </span>
                        </div>
                        <span style={{ fontSize: 10, color: '#cbd5e1', fontFamily: MONO }}>{mermaidReady ? 'live' : 'cargando…'}</span>
                    </div>
                    <div style={{ position: 'absolute', inset: 0, top: 30, overflow: 'hidden' }}>
                        {mermaidReady
                            ? <DiagramPanel
                                code={debouncedCode}
                                mermaidReady={mermaidReady}
                                activeTheme={activeTheme}
                                handMode={handMode}
                                engine={engine}
                                onInsertSnippet={insertSnippet}
                              />
                            : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 13, fontFamily: MONO }}>Inicializando motor Mermaid…</div>
                        }
                    </div>
                </div>
            </div>

            {/* Status bar */}
            <div style={{ height: 24, background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: MONO }}>
                    Engine: {engine} · Tema: {activeTheme.label} · {handMode ? '✋ Mano' : '✏ Edición'}
                </span>
                <span style={{ fontSize: 10, color: '#c4b5fd', fontFamily: MONO }}>Mermaid v10.9 · Uniflux DSL</span>
            </div>

            <style>{`
                textarea::selection { background: rgba(124,58,237,0.15); }
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }

                /* Edit mode — SVG element hover highlighting */
                .uniflux-edit-mode svg { pointer-events: all; }
                .uniflux-edit-mode svg text {
                    cursor: pointer !important;
                    transition: opacity 0.15s;
                }
                .uniflux-edit-mode svg text:hover {
                    opacity: 0.6;
                    fill: #7c3aed !important;
                }
                .uniflux-edit-mode svg rect:not([style*="fill:none"]):hover,
                .uniflux-edit-mode svg polygon:hover,
                .uniflux-edit-mode svg circle:hover {
                    stroke: #7c3aed !important;
                    stroke-width: 2.5px !important;
                    cursor: pointer !important;
                    opacity: 0.85;
                }
            `}</style>
        </div>
    );
}
