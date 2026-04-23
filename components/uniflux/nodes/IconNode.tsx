'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Copy, Trash, icons, LucideProps } from 'lucide-react';

const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

const IconNode = ({ id, data, selected }: any) => {
    const { setNodes, setEdges } = useReactFlow();
    
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

    return (
        <>
            <NodeToolbar 
                isVisible={selected && !isLocked} 
                position={Position.Top} 
                className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-slate-200"
            >
                <button onClick={duplicateNode} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Duplicar">
                    <Copy className="w-4 h-4" />
                </button>
                <button onClick={deleteNode} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title="Eliminar">
                    <Trash className="w-4 h-4" />
                </button>
            </NodeToolbar>

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
            </div>
        </>
    );
};

export default memo(IconNode);
