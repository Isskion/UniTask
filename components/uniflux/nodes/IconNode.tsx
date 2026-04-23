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

            {/* Quick Connect Handles (Styled as Arrows) */}
            {selected && !isLocked && (
                <div className="absolute inset-0 pointer-events-none z-[60]">
                    <Handle 
                        type="source"
                        position={Position.Right}
                        id="right-c"
                        className="!absolute -right-10 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-400 pointer-events-auto transition-all hover:scale-125 active:scale-95 flex items-center justify-center !w-8 !h-8 !opacity-100"
                        onClick={(e) => { e.stopPropagation(); quickConnect('right'); }}
                        title="Clic para clonar / Arrastra para conectar"
                    >
                        <ArrowRight className="w-4 h-4 pointer-events-none" />
                    </Handle>
                    <Handle 
                        type="source"
                        position={Position.Bottom}
                        id="bottom-c"
                        className="!absolute -bottom-10 left-1/2 -translate-x-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-400 pointer-events-auto transition-all hover:scale-125 active:scale-95 flex items-center justify-center !w-8 !h-8 !opacity-100"
                        onClick={(e) => { e.stopPropagation(); quickConnect('bottom'); }}
                        title="Clic para clonar / Arrastra para conectar"
                    >
                        <ArrowDown className="w-4 h-4 pointer-events-none" />
                    </Handle>
                    <Handle 
                        type="source"
                        position={Position.Left}
                        id="left-c"
                        className="!absolute -left-10 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-400 pointer-events-auto transition-all hover:scale-125 active:scale-95 flex items-center justify-center !w-8 !h-8 !opacity-100"
                        onClick={(e) => { e.stopPropagation(); quickConnect('left'); }}
                        title="Clic para clonar / Arrastra para conectar"
                    >
                        <ArrowLeft className="w-4 h-4 pointer-events-none" />
                    </Handle>
                    <Handle 
                        type="source"
                        position={Position.Top}
                        id="top-c"
                        className="!absolute -top-10 left-1/2 -translate-x-1/2 p-1.5 bg-white border border-slate-200 rounded-full shadow-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-400 pointer-events-auto transition-all hover:scale-125 active:scale-95 flex items-center justify-center !w-8 !h-8 !opacity-100"
                        onClick={(e) => { e.stopPropagation(); quickConnect('top'); }}
                        title="Clic para clonar / Arrastra para conectar"
                    >
                        <ArrowUp className="w-4 h-4 pointer-events-none" />
                    </Handle>
                </div>
            )}

            {!isLocked && (
                <NodeResizer
                    color={color}
                    isVisible={selected}
                    minWidth={32}
                    minHeight={32}
                    keepAspectRatio={true}
                    handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
                />
            )}

            <div className="w-full h-full relative group flex items-center justify-center pointer-events-auto cursor-pointer">
                <IconComponent 
                    color={color} 
                    strokeWidth={1.5}
                    className="w-full h-full"
                    style={{ filter: selected ? `drop-shadow(0 0 8px ${color}66)` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />

                {/* Universal Handles (16 points: Sides + Corners + Midpoints) */}
                {/* Top side */}
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '50%' }} id="top-c" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: 0 }} id="top-l" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '100%' }} id="top-r" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '25%' }} id="top-25" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '75%' }} id="top-75" className="opacity-0 group-hover:opacity-100" />
                
                {/* Bottom side */}
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '50%', top: 'auto' }} id="bottom-c" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: 0, top: 'auto' }} id="bottom-l" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '100%', top: 'auto' }} id="bottom-r" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '25%', top: 'auto' }} id="bottom-25" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '75%', top: 'auto' }} id="bottom-75" className="opacity-0 group-hover:opacity-100" />

                {/* Left side */}
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '25%' }} id="left-25" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '50%' }} id="left-c" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '75%' }} id="left-75" className="opacity-0 group-hover:opacity-100" />

                {/* Right side */}
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '25%', left: 'auto' }} id="right-25" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '50%', left: 'auto' }} id="right-c" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '75%', left: 'auto' }} id="right-75" className="opacity-0 group-hover:opacity-100" />
                
                {/* Node Label */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-600 bg-white/60 backdrop-blur-[2px] px-2 py-0.5 rounded-full border border-slate-100/50 shadow-sm pointer-events-none">
                    {data.label || 'Icono'}
                </div>
            </div>
        </>
    );
};

export default memo(IconNode);
