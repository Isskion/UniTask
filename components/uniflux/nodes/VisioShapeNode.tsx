'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { NodeType } from '@/app/uniflux/core/types';
import { Check, Edit2, Palette, Copy, Trash } from 'lucide-react';

// Common handle style
const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

// SVG shapes paths based on a viewBox of "0 0 100 100" (preserveAspectRatio="none")
const getShapeProps = (type: string) => {
    switch (type) {
        case 'START':
        case 'TERMINAL':
            // Stadium shape
            return {
                svg: <rect x="5" y="5" width="90" height="90" rx="45" ry="45" />,
                baseColor: type === 'START' ? '#dcfce7' : '#fee2e2',
                strokeColor: type === 'START' ? '#22c55e' : '#ef4444'
            };
        case 'DECISION':
            // Diamond
            return {
                svg: <polygon points="50,5 95,50 50,95 5,50" />,
                baseColor: '#fef3c7',
                strokeColor: '#f59e0b'
            };
        case 'DATA':
            // Parallelogram
            return {
                svg: <polygon points="15,5 95,5 85,95 5,95" />,
                baseColor: '#cffafe',
                strokeColor: '#06b6d4'
            };
        case 'SUBPROCESS':
            // Rectangle with inner lines
            return {
                svg: (
                    <>
                        <rect x="5" y="5" width="90" height="90" rx="8" />
                        <line x1="15" y1="5" x2="15" y2="95" />
                        <line x1="85" y1="5" x2="85" y2="95" />
                    </>
                ),
                baseColor: '#e0e7ff',
                strokeColor: '#3b82f6'
            };
        case 'DOCUMENT':
            // Document with wavy bottom
            return {
                svg: <path d="M10,5 L90,5 L90,85 C70,105 30,65 10,85 Z" />,
                baseColor: '#f1f5f9',
                strokeColor: '#64748b'
            };
        case 'ERROR':
            // Hexagon
            return {
                svg: <polygon points="30,5 70,5 95,50 70,95 30,95 5,50" />,
                baseColor: '#fee2e2',
                strokeColor: '#ef4444'
            };
        case 'STATE':
            // Rounded rectangle with cut corners
            return {
                svg: <path d="M15,5 L85,5 L95,15 L95,85 L85,95 L15,95 L5,85 L5,15 Z" />,
                baseColor: '#f3e8ff',
                strokeColor: '#a855f7'
            };
        case 'TASK':
            // Standard rounded rectangle (Operation is similar but different color maybe)
            return {
                svg: <rect x="5" y="5" width="90" height="90" rx="8" />,
                baseColor: '#e0e7ff',
                strokeColor: '#4f46e5'
            };
        case 'OPERATION':
        default:
            // Standard rounded rectangle
            return {
                svg: <rect x="5" y="5" width="90" height="90" rx="8" />,
                baseColor: '#e0f2fe',
                strokeColor: '#0ea5e9'
            };
    }
};

const PRESET_COLORS = [
    { bg: '#f1f5f9', border: '#64748b' }, // Gray
    { bg: '#fee2e2', border: '#ef4444' }, // Red
    { bg: '#fef3c7', border: '#f59e0b' }, // Yellow
    { bg: '#dcfce7', border: '#22c55e' }, // Green
    { bg: '#e0f2fe', border: '#0ea5e9' }, // Light Blue
    { bg: '#e0e7ff', border: '#3b82f6' }, // Blue
    { bg: '#f3e8ff', border: '#a855f7' }, // Purple
];

const VisioShapeNode = ({ id, data, selected }: any) => {
    const { updateNodeData, setNodes, setEdges } = useReactFlow();
    
    const [isEditing, setIsEditing] = useState(false);
    const [showColors, setShowColors] = useState(false);
    const [editText, setEditText] = useState(data.label || '');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const shapeProps = getShapeProps(data.type);
    
    // User can override colors
    const bgColor = data.bgColor || shapeProps.baseColor;
    const strokeColor = data.strokeColor || shapeProps.strokeColor;
    
    const isLocked = data.isLocked || false;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSaveText = () => {
        setIsEditing(false);
        updateNodeData(id, { label: editText });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSaveText();
        }
        if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(data.label);
        }
    };

    const handleChangeColor = (c: {bg: string, border: string}) => {
        updateNodeData(id, { bgColor: c.bg, strokeColor: c.border });
        setShowColors(false);
    };

    const duplicateNode = () => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            const newId = `duplicate-${Date.now()}`;
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

    return (
        <>
            <NodeToolbar 
                isVisible={selected && !isLocked} 
                position={Position.Top} 
                className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-slate-200"
            >
                <button onClick={() => { setIsEditing(true); setShowColors(false); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Editar texto">
                    <Edit2 className="w-4 h-4" />
                </button>
                <div className="relative">
                    <button onClick={() => setShowColors(!showColors)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Cambiar color">
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColors && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg shadow-xl border border-slate-200 flex gap-1 z-50">
                            {PRESET_COLORS.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleChangeColor(c)}
                                    className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                                    style={{ backgroundColor: c.bg, borderColor: c.border }}
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

            {!isLocked && (
                <NodeResizer
                    color={strokeColor}
                    isVisible={selected}
                    minWidth={80}
                    minHeight={40}
                    handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
                />
            )}

            {/* Shape Container */}
            <div 
                className={`w-full h-full relative group ${!isEditing ? 'cursor-pointer' : ''}`}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
            >
                {/* SVG Background */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 z-0 overflow-visible"
                    style={{ filter: selected ? `drop-shadow(0 0 8px ${strokeColor}66)` : 'drop-shadow(0 4px 6px rgba(0,0,0,0.05))' }}
                >
                    <g 
                        fill={bgColor} 
                        stroke={strokeColor} 
                        strokeWidth="2" 
                        vectorEffect="non-scaling-stroke"
                        className="transition-all duration-200"
                    >
                        {shapeProps.svg}
                    </g>
                </svg>

                {/* Content Overlay */}
                <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                    {isEditing ? (
                        <textarea
                            ref={inputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSaveText}
                            className="w-full h-full bg-transparent border-none outline-none resize-none text-center flex items-center justify-center font-medium overflow-hidden"
                            style={{ color: '#0f172a', fontSize: '13px' }}
                        />
                    ) : (
                        <div 
                            className="text-center font-medium select-none flex-1 overflow-hidden pointer-events-none" 
                            style={{ 
                                color: '#1e293b', 
                                fontSize: '13px', 
                                WebkitLineClamp: 3, 
                                display: '-webkit-box', 
                                WebkitBoxOrient: 'vertical',
                                textShadow: '0 1px 2px rgba(255,255,255,0.8)'
                            }}
                        >
                            {data.label}
                        </div>
                    )}
                </div>

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
            </div>
        </>
    );
};

export default memo(VisioShapeNode);
