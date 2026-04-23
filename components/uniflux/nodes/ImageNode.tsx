'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Copy, Trash, Image as ImageIcon } from 'lucide-react';

const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

const ImageNode = ({ id, data, selected }: any) => {
    const { setNodes, setEdges } = useReactFlow();
    
    const imageUrl = data.imageUrl || '';
    const isLocked = data.isLocked || false;

    const duplicateNode = () => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            const newId = `image-${Date.now()}`;
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
                    color="#3b82f6"
                    isVisible={selected}
                    minWidth={50}
                    minHeight={50}
                    keepAspectRatio={true}
                    handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
                />
            )}

            <div 
                className="w-full h-full relative group flex items-center justify-center cursor-pointer pointer-events-auto rounded-lg overflow-hidden border border-transparent hover:border-blue-200 transition-colors"
                style={{ 
                    boxShadow: selected ? '0 0 0 2px #3b82f6' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    backgroundColor: imageUrl ? 'transparent' : '#f8fafc'
                }}
            >
                {imageUrl ? (
                    <img 
                        src={imageUrl} 
                        alt="Node image" 
                        className="w-full h-full object-contain pointer-events-none" 
                        draggable={false}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center pointer-events-none">
                        <ImageIcon className="w-8 h-8 mb-1 opacity-50" />
                        <span className="text-[10px] font-medium opacity-80">Sin imagen</span>
                    </div>
                )}

                {/* Universal Handles (8 points: Sides + Corners) */}
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4 }} id="top" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4 }} id="right" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4 }} id="bottom" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4 }} id="left" className="opacity-0 group-hover:opacity-100" />
                
                {/* Corner Handles */}
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: -4 }} id="top-left" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, right: -4, left: 'auto' }} id="top-right" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: -4, top: 'auto' }} id="bottom-left" className="opacity-0 group-hover:opacity-100" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, right: -4, top: 'auto', left: 'auto' }} id="bottom-right" className="opacity-0 group-hover:opacity-100" />
            </div>
        </>
    );
};

export default memo(ImageNode);
