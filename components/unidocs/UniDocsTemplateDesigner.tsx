"use client";

import React, { useState, useRef, useCallback } from 'react';
import { TemplateBlock, BlockType, BlockConfig, PageMargins, BLOCK_CATALOG, DEFAULT_PAGE_MARGINS } from '@/types/unidocs';
import { X, Save, Trash2, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

// A4 dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Scale factor: how many pixels per mm on screen
const SCALE = 2.5;

interface UniDocsTemplateDesignerProps {
    initialBlocks?: TemplateBlock[];
    initialMargins?: PageMargins;
    templateName?: string;
    templateDescription?: string;
    onSave: (data: { name: string; description: string; blocks: TemplateBlock[]; pageMargins: PageMargins }) => void;
    onClose: () => void;
}

function generateId() {
    return Math.random().toString(36).substring(2, 10);
}

export default function UniDocsTemplateDesigner({
    initialBlocks = [],
    initialMargins,
    templateName = '',
    templateDescription = '',
    onSave,
    onClose,
}: UniDocsTemplateDesignerProps) {
    const [blocks, setBlocks] = useState<TemplateBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [name, setName] = useState(templateName);
    const [description, setDescription] = useState(templateDescription);
    const [margins, setMargins] = useState<PageMargins>(initialMargins || DEFAULT_PAGE_MARGINS);

    // Drag state
    const [dragging, setDragging] = useState<{ blockId: string; offsetX: number; offsetY: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

    const addBlock = (type: BlockType) => {
        const catalog = BLOCK_CATALOG.find(c => c.type === type);
        if (!catalog) return;

        const newBlock: TemplateBlock = {
            id: generateId(),
            type,
            label: catalog.label,
            x: margins.left,
            y: margins.top + blocks.length * 20,
            width: catalog.defaultWidth,
            height: catalog.defaultHeight,
            config: { ...catalog.defaultConfig },
        };

        setBlocks(prev => [...prev, newBlock]);
        setSelectedBlockId(newBlock.id);
    };

    const updateBlock = useCallback((id: string, updates: Partial<TemplateBlock>) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }, []);

    const updateBlockConfig = useCallback((id: string, configUpdates: Partial<BlockConfig>) => {
        setBlocks(prev => prev.map(b =>
            b.id === id ? { ...b, config: { ...b.config, ...configUpdates } } : b
        ));
    }, []);

    const deleteBlock = (id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id));
        if (selectedBlockId === id) setSelectedBlockId(null);
    };

    // --- Mouse drag on canvas ---
    const handleCanvasMouseDown = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        e.preventDefault();
        const block = blocks.find(b => b.id === blockId);
        if (!block || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / SCALE;
        const mouseY = (e.clientY - rect.top) / SCALE;

        setDragging({ blockId, offsetX: mouseX - block.x, offsetY: mouseY - block.y });
        setSelectedBlockId(blockId);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) / SCALE;
        const mouseY = (e.clientY - rect.top) / SCALE;

        const newX = Math.max(0, Math.min(A4_WIDTH_MM, mouseX - dragging.offsetX));
        const newY = Math.max(0, Math.min(A4_HEIGHT_MM, mouseY - dragging.offsetY));

        updateBlock(dragging.blockId, { x: Math.round(newX), y: Math.round(newY) });
    };

    const handleCanvasMouseUp = () => {
        setDragging(null);
    };

    const handleSave = () => {
        if (!name.trim()) return;
        onSave({ name, description, blocks, pageMargins: margins });
    };

    // --- Render block content preview ---
    const renderBlockPreview = (block: TemplateBlock) => {
        switch (block.type) {
            case 'logo_empresa':
                return <div className="flex items-center justify-center h-full bg-blue-50 border border-blue-200 rounded text-blue-600 text-[10px] font-bold">🏢 Logo Empresa</div>;
            case 'logo_cliente':
                return <div className="flex items-center justify-center h-full bg-amber-50 border border-amber-200 rounded text-amber-600 text-[10px] font-bold">🤝 Logo Cliente</div>;
            case 'titulo':
                return <div className="flex items-center h-full text-[11px] font-bold truncate px-1" style={{ fontFamily: block.config.fontFamily }}>Título del Documento</div>;
            case 'fecha':
                return <div className="flex items-center h-full text-[9px] text-gray-500 italic px-1">{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>;
            case 'cuerpo':
                return <div className="h-full bg-gray-50 border border-dashed border-gray-300 rounded p-1 text-[8px] text-gray-400 overflow-hidden">Contenido del documento (nota UniLeaks, feed, etc.)</div>;
            case 'pie':
                return <div className="flex items-center justify-center h-full text-[8px] text-gray-400 border-t border-gray-200">{block.config.staticText || 'Pie de página'}</div>;
            case 'texto_libre':
                return <div className="flex items-center h-full text-[9px] px-1 truncate" style={{ color: block.config.color }}>{block.config.staticText || 'Texto libre'}</div>;
            case 'separador':
                return <div className="flex items-center justify-center h-full"><hr className="w-full border-gray-300" /></div>;
            default:
                return <div className="h-full bg-gray-100 rounded" />;
        }
    };

    const getBlockBorderColor = (type: BlockType) => {
        const colors: Record<BlockType, string> = {
            logo_empresa: '#3b82f6',
            logo_cliente: '#f59e0b',
            titulo: '#8b5cf6',
            fecha: '#6b7280',
            cuerpo: '#10b981',
            pie: '#9ca3af',
            texto_libre: '#ec4899',
            separador: '#d1d5db',
        };
        return colors[type] || '#999';
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex backdrop-blur-sm">
            {/* Left: Block Palette */}
            <div className="w-64 bg-card border-r border-border flex flex-col shrink-0">
                <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-bold text-foreground mb-1">Bloques</h3>
                    <p className="text-xs text-muted-foreground">Clic para añadir al diseño</p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {BLOCK_CATALOG.map(cat => (
                        <button
                            key={cat.type}
                            onClick={() => addBlock(cat.type)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-secondary/50 hover:bg-secondary rounded-lg text-left transition-colors group"
                        >
                            <span className="text-lg">{cat.icon}</span>
                            <div>
                                <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{cat.label}</div>
                                <div className="text-[10px] text-muted-foreground">{cat.defaultWidth}×{cat.defaultHeight}mm</div>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>

                {/* Template info */}
                <div className="p-4 border-t border-border space-y-3">
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nombre</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                            placeholder="Nombre de la plantilla..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Descripción</label>
                        <input
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full mt-1 px-3 py-1.5 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-primary"
                            placeholder="Para qué se usa..."
                        />
                    </div>
                </div>
            </div>

            {/* Center: A4 Canvas */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-8 bg-neutral-900/50">
                <div
                    ref={canvasRef}
                    className="relative bg-white shadow-2xl"
                    style={{
                        width: A4_WIDTH_MM * SCALE,
                        height: A4_HEIGHT_MM * SCALE,
                        cursor: dragging ? 'grabbing' : 'default',
                    }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    onClick={() => setSelectedBlockId(null)}
                >
                    {/* Margin guides */}
                    <div
                        className="absolute border border-dashed border-blue-200 pointer-events-none"
                        style={{
                            left: margins.left * SCALE,
                            top: margins.top * SCALE,
                            width: (A4_WIDTH_MM - margins.left - margins.right) * SCALE,
                            height: (A4_HEIGHT_MM - margins.top - margins.bottom) * SCALE,
                        }}
                    />

                    {/* Blocks */}
                    {blocks.map(block => (
                        <div
                            key={block.id}
                            className={cn(
                                "absolute cursor-grab select-none transition-shadow",
                                selectedBlockId === block.id ? "ring-2 ring-primary shadow-lg z-20" : "hover:ring-1 hover:ring-primary/50 z-10"
                            )}
                            style={{
                                left: block.x * SCALE,
                                top: block.y * SCALE,
                                width: block.width * SCALE,
                                height: block.height * SCALE,
                                borderLeft: `3px solid ${getBlockBorderColor(block.type)}`,
                            }}
                            onMouseDown={e => handleCanvasMouseDown(e, block.id)}
                            onClick={e => { e.stopPropagation(); setSelectedBlockId(block.id); }}
                        >
                            {renderBlockPreview(block)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Properties Panel */}
            <div className="w-72 bg-card border-l border-border flex flex-col shrink-0">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">Propiedades</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                </div>

                {selectedBlock ? (
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {/* Block type badge */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: getBlockBorderColor(selectedBlock.type) + '20', color: getBlockBorderColor(selectedBlock.type) }}>
                                {selectedBlock.label}
                            </span>
                            <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Position */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground">X (mm)</label>
                                <input type="number" value={selectedBlock.x} onChange={e => updateBlock(selectedBlock.id, { x: Number(e.target.value) })}
                                    className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground">Y (mm)</label>
                                <input type="number" value={selectedBlock.y} onChange={e => updateBlock(selectedBlock.id, { y: Number(e.target.value) })}
                                    className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground">Ancho (mm)</label>
                                <input type="number" value={selectedBlock.width} onChange={e => updateBlock(selectedBlock.id, { width: Number(e.target.value) })}
                                    className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground">Alto (mm)</label>
                                <input type="number" value={selectedBlock.height} onChange={e => updateBlock(selectedBlock.id, { height: Number(e.target.value) })}
                                    className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary" />
                            </div>
                        </div>

                        {/* Typography (for text blocks) */}
                        {['titulo', 'fecha', 'pie', 'texto_libre', 'cuerpo'].includes(selectedBlock.type) && (
                            <>
                                <hr className="border-border" />
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-muted-foreground">Familia tipográfica</label>
                                        <select
                                            value={selectedBlock.config.fontFamily || 'Inter'}
                                            onChange={e => updateBlockConfig(selectedBlock.id, { fontFamily: e.target.value })}
                                            className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary"
                                        >
                                            <option value="Inter">Inter</option>
                                            <option value="Garamond">Garamond</option>
                                            <option value="Arial">Arial</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Georgia">Georgia</option>
                                            <option value="Courier New">Courier New</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Tamaño (pt)</label>
                                            <input type="number" value={selectedBlock.config.fontSize || 11} onChange={e => updateBlockConfig(selectedBlock.id, { fontSize: Number(e.target.value) })}
                                                className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-muted-foreground">Color</label>
                                            <input type="color" value={selectedBlock.config.color || '#000000'} onChange={e => updateBlockConfig(selectedBlock.id, { color: e.target.value })}
                                                className="w-full mt-1 h-7 bg-secondary/50 border border-border rounded cursor-pointer" />
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => updateBlockConfig(selectedBlock.id, { fontWeight: selectedBlock.config.fontWeight === 'bold' ? 'normal' : 'bold' })}
                                            className={cn("px-2 py-1 rounded text-xs font-bold transition-colors", selectedBlock.config.fontWeight === 'bold' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary')}>
                                            B
                                        </button>
                                        <button onClick={() => updateBlockConfig(selectedBlock.id, { fontStyle: selectedBlock.config.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                            className={cn("px-2 py-1 rounded text-xs italic transition-colors", selectedBlock.config.fontStyle === 'italic' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary')}>
                                            I
                                        </button>
                                        {['left', 'center', 'right'].map(align => (
                                            <button key={align} onClick={() => updateBlockConfig(selectedBlock.id, { textAlign: align as any })}
                                                className={cn("px-2 py-1 rounded text-xs transition-colors", selectedBlock.config.textAlign === align ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary')}>
                                                {align === 'left' ? '◀' : align === 'center' ? '◆' : '▶'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Static text (for texto_libre and pie) */}
                        {['texto_libre', 'pie'].includes(selectedBlock.type) && (
                            <>
                                <hr className="border-border" />
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground">Texto</label>
                                    <textarea
                                        value={selectedBlock.config.staticText || ''}
                                        onChange={e => updateBlockConfig(selectedBlock.id, { staticText: e.target.value })}
                                        rows={3}
                                        className="w-full mt-1 px-2 py-1 bg-secondary/50 border border-border rounded text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                                        placeholder="Escribe el texto..."
                                    />
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                        <div className="text-muted-foreground">
                            <GripVertical className="w-8 h-8 mx-auto mb-3 opacity-30" />
                            <p className="text-xs font-medium">Selecciona un bloque para editar sus propiedades</p>
                        </div>
                    </div>
                )}

                {/* Footer actions */}
                <div className="p-4 border-t border-border flex gap-2">
                    <button onClick={onClose} className="flex-1 px-3 py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name.trim()}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
