'use client'

import React, { memo } from 'react';
import { NodeResizer } from '@xyflow/react';
import { ExternalLink } from 'lucide-react';

const UnifluxC4BoundaryNode = ({ data, selected }: any) => {
    const isLocked = data.isLocked || false;
    const isSystem = data.c4Level === 1 || data.c4Level === 2;
    const borderColor = isSystem ? '#1168BD' : '#438DD5';
    const labelBg = isSystem ? '#1168BD' : '#438DD5';

    return (
        <>
            {!isLocked && (
                <NodeResizer
                    color={borderColor}
                    isVisible={selected}
                    minWidth={180}
                    minHeight={140}
                />
            )}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    border: `2px dashed ${borderColor}`,
                    borderRadius: 10,
                    pointerEvents: 'none',
                }}
            />
            <div className="absolute top-2 left-3 right-3 pointer-events-none select-none flex items-center gap-1.5">
                <span style={{
                    background: labelBg,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                    {data.label}
                </span>
                {isLocked && (
                    <span style={{ fontSize: 9, color: '#94a3b8', background: '#f1f5f9', padding: '1px 5px', borderRadius: 3, border: '1px solid #e2e8f0' }}>
                        Bloqueado
                    </span>
                )}
                {/* V9: Navigation Link */}
                {data.targetFlowId && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onNavigate) data.onNavigate(data.targetFlowId, data.targetNodeId);
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50 border-2 border-white pointer-events-auto"
                        title="Ver flujo relacionado"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </>
    );
};

export default memo(UnifluxC4BoundaryNode);
