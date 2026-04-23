'use client'

import React, { memo } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';

const UnifluxOrthogonalEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
    selected,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16, // Bordes suavizados para un look moderno
    });

    return (
        <>
            <BaseEdge 
                path={edgePath} 
                markerEnd={markerEnd} 
                style={{
                    ...style,
                    strokeWidth: selected ? 3 : 2,
                    stroke: selected ? '#3b82f6' : '#94a3b8',
                    transition: 'stroke-width 0.2s, stroke 0.2s',
                }} 
            />
            
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            background: 'white',
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default memo(UnifluxOrthogonalEdge);
