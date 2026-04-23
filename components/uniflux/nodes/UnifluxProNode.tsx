'use client'

import React, { memo, useState } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Settings, Copy, Trash2, Lock, Unlock, MoreHorizontal, Maximize2 } from 'lucide-react';

const UnifluxProNode = ({ data, selected, id }: any) => {
    const [isHovered, setIsHovered] = useState(false);
    
    // Configuración visual basada en el tipo de nodo
    const getStyles = () => {
        const type = data.type;
        switch (type) {
            case 'START':
                return { bg: 'bg-emerald-500', border: 'border-emerald-700', text: 'text-white', icon: '🏁' };
            case 'TERMINAL':
                return { bg: 'bg-slate-700', border: 'border-slate-900', text: 'text-white', icon: '⏹️' };
            case 'DECISION':
                return { bg: 'bg-amber-400', border: 'border-amber-600', text: 'text-slate-900', icon: '💎', shape: 'diamond' };
            case 'TASK':
                return { bg: 'bg-indigo-500', border: 'border-indigo-700', text: 'text-white', icon: '📝' };
            case 'ERROR':
                return { bg: 'bg-rose-500', border: 'border-rose-700', text: 'text-white', icon: '⚠️' };
            default:
                return { bg: 'bg-sky-500', border: 'border-sky-700', text: 'text-white', icon: '⚙️' };
        }
    };

    const styles = getStyles();
    const isLocked = data.isLocked;

    // Handle styling - Visio style (small dots)
    const handleStyle = {
        width: 8,
        height: 8,
        background: '#fff',
        border: '1.5px solid #3b82f6',
        borderRadius: '50%',
        opacity: selected || isHovered ? 1 : 0,
        transition: 'opacity 0.2s ease',
    };

    return (
        <div 
            className={cn(
                "relative transition-all duration-200 group",
                selected ? "z-10" : "z-0"
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Toolbar Contextual */}
            <NodeToolbar 
                isVisible={selected} 
                position={Position.Top}
                className="flex gap-1 p-1 bg-white shadow-xl rounded-lg border border-gray-200 mb-2"
            >
                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <Copy className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-4 bg-gray-200 my-auto mx-1" />
                <button className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </NodeToolbar>

            {/* Resizer */}
            <NodeResizer 
                isVisible={selected && !isLocked} 
                minWidth={100} 
                minHeight={60} 
                handleClassName="!bg-blue-500 !border-white !w-3 !h-3 !rounded-sm"
                lineClassName="!border-blue-500/50"
            />

            {/* Main Body */}
            <div 
                className={cn(
                    "flex flex-col items-center justify-center p-4 min-w-[140px] min-h-[70px] rounded-lg border-2 shadow-lg transition-all",
                    styles.bg, styles.border, styles.text,
                    selected ? "ring-4 ring-blue-500/30 scale-[1.02]" : "hover:shadow-xl",
                    isLocked && "opacity-80 grayscale-[30%]"
                )}
                style={{
                    width: data.width || '100%',
                    height: data.height || '100%',
                }}
            >
                {isLocked && (
                    <div className="absolute top-2 right-2 opacity-60">
                        <Lock className="w-3 h-3" />
                    </div>
                )}
                
                <div className="text-xl mb-1">{styles.icon}</div>
                <div className="font-bold text-sm text-center leading-tight px-2">
                    {data.label}
                </div>
                
                {data.description && (
                    <div className="text-[9px] mt-1 opacity-80 italic text-center">
                        {data.description}
                    </div>
                )}
            </div>

            {/* 8 Handles (Visio-style slots) */}
            {/* Top */}
            <Handle type="target" position={Position.Top} id="t1" style={{ ...handleStyle, left: '33%' }} />
            <Handle type="target" position={Position.Top} id="t2" style={{ ...handleStyle, left: '66%' }} />
            
            {/* Bottom */}
            <Handle type="source" position={Position.Bottom} id="b1" style={{ ...handleStyle, left: '33%' }} />
            <Handle type="source" position={Position.Bottom} id="b2" style={{ ...handleStyle, left: '66%' }} />
            
            {/* Left */}
            <Handle type="target" position={Position.Left} id="l1" style={{ ...handleStyle, top: '33%' }} />
            <Handle type="target" position={Position.Left} id="l2" style={{ ...handleStyle, top: '66%' }} />
            
            {/* Right */}
            <Handle type="source" position={Position.Right} id="r1" style={{ ...handleStyle, top: '33%' }} />
            <Handle type="source" position={Position.Right} id="r2" style={{ ...handleStyle, top: '66%' }} />
        </div>
    );
};

export default memo(UnifluxProNode);
