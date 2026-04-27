'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

const UnifluxProNode = ({ data, selected }: any) => {
    const isLocked = data.isLocked || false;
    const items = data.items || []; // { key: string, value: string }
    const color = data.color || '#4f46e5';
    const [isHovered, setIsHovered] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    return (
        <div className="group">
            {!isLocked && (
                <NodeResizer
                    color={color}
                    isVisible={selected}
                    minWidth={200}
                    minHeight={100}
                    handleStyle={{ width: 10, height: 10, borderRadius: 2, background: 'white', border: `2px solid ${color}`, zIndex: 100 }}
                    onResizeStart={() => setIsResizing(true)}
                    onResizeEnd={() => setIsResizing(false)}
                />
            )}
            
            <div 
                className="bg-white rounded-xl shadow-lg border-2 border-slate-200 overflow-hidden flex flex-col transition-all group-hover:border-indigo-400 min-w-[200px]"
                style={{ borderColor: selected ? color : undefined }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                
                {/* Header */}
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between"
                     style={{ borderTop: `4px solid ${color}` }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{data.type || 'PRO NODE'}</span>
                    {data.external && <span className="bg-orange-100 text-orange-600 text-[8px] px-1.5 rounded-full font-bold uppercase">External</span>}
                </div>

                {/* Content */}
                <div className="p-3">
                    <div className="font-bold text-slate-800 text-sm mb-1">{data.label}</div>
                    {data.description && <div className="text-[10px] text-slate-500 line-clamp-2 mb-2">{data.description}</div>}
                    
                    {/* Items Table */}
                    {items.length > 0 && (
                        <div className="mt-2 space-y-1">
                            {items.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-[9px] py-1 border-b border-slate-50 last:border-0">
                                    <span className="font-mono text-slate-400 uppercase">{item.key}</span>
                                    <span className="font-bold text-slate-600">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer/Meta */}
                {data.technology && (
                    <div className="bg-slate-50/50 px-3 py-1.5 text-[9px] font-bold text-slate-400 flex items-center gap-1.5 italic">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {data.technology}
                    </div>
                )}
            </div>

            {/* Universal Handles (12 points: Sides + Midpoints) */}
            {/* Visual rule: Only show main centers on select, show all on hover, hide all on resizing */}
            {/* Top side */}
            <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '50%', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="top-c" />
            <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '25%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-25" />
            <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '75%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-75" />
            
            {/* Bottom side */}
            <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4, left: '50%', top: 'auto', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="bottom-c" />
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
    );
};

export default memo(UnifluxProNode);
