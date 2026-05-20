'use client';

import React from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';

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
    selected,
    data,
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

    const fontStyleMap: Record<string, string> = {
        'Garamond': '"EB Garamond", Garamond, Georgia, serif',
        'Outfit': 'Outfit, sans-serif',
        'Inter': 'Inter, sans-serif',
        'Montserrat': 'Montserrat, sans-serif',
        'Playfair Display': '"Playfair Display", serif'
    };

    const textColor = (data?.textColor as string) || '#000000';
    const fontFamily = fontStyleMap[data?.fontFamily as string] || fontStyleMap['Garamond'];

    return (
        <>
            {/* White halo — creates visual bridge where edges cross */}
            <path
                d={edgePath}
                fill="none"
                stroke="white"
                strokeWidth={selected ? 11 : 9}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
            />
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
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'none',
                        }}
                        className="nodrag nopan"
                    >
                        <div 
                            className="bg-white/95 backdrop-blur-sm border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none text-center"
                            style={{
                                color: textColor,
                                fontFamily: fontFamily,
                                borderColor: selected ? '#4f46e5' : '#cbd5e1',
                            }}
                        >
                            {label}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
