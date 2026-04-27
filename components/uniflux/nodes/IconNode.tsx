'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Copy, Trash, icons, LucideProps, Palette, ArrowRight, ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';

const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

const PRESET_COLORS = [
    '#4f46e5', // Indigo
    '#0ea5e9', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#a855f7', // Purple
    '#64748b', // Slate
];

const IconNode = ({ id, data, selected }: any) => {
    const { updateNodeData, setNodes, setEdges } = useReactFlow();
    
    const [showColors, setShowColors] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const iconName = data.iconName || 'Box';
    const color = data.color || '#4f46e5';
    const isLocked = data.isLocked || false;

    // Get the icon component dynamically
    const IconComponent = (icons as any)[iconName] || icons.Box;

    const duplicateNode = () => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            const newId = `icon-${Date.now()}`;
            const newNode = {
                ...nodeToCopy,
                id: newId,
                position: {
                    x: nodeToCopy.position.x + 50,
                    y: nodeToCopy.position.y + 50,
                },
                selected: true,
            };
            return nds.map(n => ({...n, selected: false})).concat(newNode);
        });
    };

    const deleteNode = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    const handleColorChange = (c: string) => {
        updateNodeData(id, { color: c });
        setShowColors(false);
    };

    const quickConnect = (dir: 'top' | 'bottom' | 'left' | 'right') => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            
            const newId = `icon-${Date.now()}`;
            const offset = 150;
            const newPosition = {
                x: nodeToCopy.position.x + (dir === 'left' ? -offset : dir === 'right' ? offset : 0),
                y: nodeToCopy.position.y + (dir === 'top' ? -offset : dir === 'bottom' ? offset : 0),
            };

            const newNode = {
                ...nodeToCopy,
                id: newId,
                position: newPosition,
                selected: true,
            };

            setTimeout(() => {
                setEdges((eds) => [
                    ...eds,
                    {
                        id: `e-${id}-${newId}`,
                        source: id,
                        target: newId,
                        sourceHandle: `${dir}-c`,
                        targetHandle: dir === 'top' ? 'bottom-c' : dir === 'bottom' ? 'top-c' : dir === 'left' ? 'right-c' : 'left-c',
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#94a3b8', strokeWidth: 2 },
                        markerEnd: { 
                            type: 'arrowclosed' as any,
                            width: 20,
                            height: 20,
                            color: '#94a3b8'
                        },
                    }
                ]);
            }, 0);

            return nds.map(n => ({...n, selected: false})).concat(newNode);
        });
    };

    return (
        <>
            <NodeToolbar 
                isVisible={selected && !isLocked} 
                position={Position.Top} 
                className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-slate-200"
            >
                <div className="relative">
                    <button onClick={() => setShowColors(!showColors)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Cambiar color">
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColors && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg shadow-xl border border-slate-200 flex gap-1 z-50">
                            {PRESET_COLORS.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleColorChange(c)}
                                    className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                                    style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.1)' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={duplicateNode} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Duplicar">
                    <Copy className="w-4 h-4" />
                </button>
                <button onClick={deleteNode} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title="Eliminar">
                    <Trash className="w-4 h-4" />
                </button>
            </NodeToolbar>

            {/* Connection Handles (Standard dots for manual drag) */}
            <Handle type="source" position={Position.Right} id="right-c" className="!bg-indigo-500/40 !w-2.5 !h-2.5 !border-none hover:!bg-indigo-500 hover:scale-150 transition-all" />
            <Handle type="source" position={Position.Bottom} id="bottom-c" className="!bg-indigo-500/40 !w-2.5 !h-2.5 !border-none hover:!bg-indigo-500 hover:scale-150 transition-all" />
            <Handle type="source" position={Position.Left} id="left-c" className="!bg-indigo-500/40 !w-2.5 !h-2.5 !border-none hover:!bg-indigo-500 hover:scale-150 transition-all" />
            <Handle type="source" position={Position.Top} id="top-c" className="!bg-indigo-500/40 !w-2.5 !h-2.5 !border-none hover:!bg-indigo-500 hover:scale-150 transition-all" />

            {/* Quick Spawn Buttons (Floating translucent arrows) */}
            {selected && !isLocked && (
                <div className="absolute inset-0 pointer-events-none z-[60]">
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('right'); }}
                        className="absolute -right-11 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar a la derecha"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('bottom'); }}
                        className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar abajo"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('left'); }}
                        className="absolute -left-11 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar a la izquierda"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('top'); }}
                        className="absolute -top-11 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar arriba"
                    >
                        <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {!isLocked && (
                <NodeResizer
                    color={color}
                    isVisible={selected}
                    minWidth={32}
                    minHeight={32}
                    keepAspectRatio={true}
                    handleStyle={{ width: 10, height: 10, borderRadius: 2, background: 'white', border: `2px solid ${color}`, zIndex: 100 }}
                    onResizeStart={() => setIsResizing(true)}
                    onResizeEnd={() => setIsResizing(false)}
                />
            )}

            <div 
                className="w-full h-full relative group flex items-center justify-center pointer-events-auto cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <IconComponent 
                    color={color} 
                    strokeWidth={1.5}
                    className="w-full h-full"
                    style={{ filter: selected ? `drop-shadow(0 0 8px ${color}66)` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />

                {/* Universal Handles (16 points: Sides + Corners + Midpoints) */}
                {/* Visual rule: Only show main centers on select, show all on hover, hide all on resizing */}
                {/* Top side */}
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '50%', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="top-c" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: 0, opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-l" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '100%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-r" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '25%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-25" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '75%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-75" />
                
                {/* Bottom side */}
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '50%', top: 'auto', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="bottom-c" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: 0, top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-l" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '100%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-r" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '25%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-25" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '75%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-75" />

                {/* Left side */}
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '25%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="left-25" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '50%', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="left-c" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '75%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="left-75" />

                {/* Right side */}
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '25%', left: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="right-25" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '50%', left: 'auto', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="right-c" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '75%', left: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="right-75" />
            </div>

            {/* Node Label (OUTSIDE for consistency) */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-600 bg-white/80 backdrop-blur-[2px] px-2 py-0.5 rounded-full border border-slate-200/50 shadow-sm pointer-events-none z-10">
                {data.label || 'Icono'}
            </div>

        </>
    );
};

export default memo(IconNode);
