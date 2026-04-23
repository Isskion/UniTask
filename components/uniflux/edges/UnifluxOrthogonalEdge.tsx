'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

export default function UnifluxOrthogonalEdge({
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
    labelStyle,
    labelBgStyle,
    labelBgPadding,
    labelBgBorderRadius,
    selected,
}: EdgeProps) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16, // Softer turns
    });

    return (
        <>
            <BaseEdge 
                path={edgePath} 
                markerEnd={markerEnd} 
                style={{
                    ...style,
                    strokeWidth: selected ? 3.5 : 2.5,
                    stroke: selected ? '#4f46e5' : (style.stroke || '#94a3b8'),
                    transition: 'stroke-width 0.2s, stroke 0.2s',
                }} 
            />
            {label && (
                <text
                    x={labelX}
                    y={labelY}
                    style={{
                        ...labelStyle,
                        fontSize: 10,
                        fontWeight: 700,
                        fill: selected ? '#4f46e5' : '#64748b',
                        textAnchor: 'middle',
                        dominantBaseline: 'central',
                    }}
                >
                    <tspan 
                        style={{ 
                            ...labelBgStyle, 
                            fill: '#fff', 
                            stroke: selected ? '#4f46e5' : '#e2e8f0',
                            strokeWidth: 1,
                        }}
                        dx={0} 
                        dy={0}
                    >
                        {label}
                    </tspan>
                </text>
            )}
        </>
    );
}
