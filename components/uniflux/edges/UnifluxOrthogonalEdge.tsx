'use client';

import React, { useRef, useMemo, useContext } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { UnifluxDirtyContext } from '../UnifluxContext';

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
    const { setEdges, screenToFlowPosition } = useReactFlow();
    const markDirty = useContext(UnifluxDirtyContext);
    const draggingRef = useRef(false);

    const fontStyleMap: Record<string, string> = {
        'Garamond': '"EB Garamond", Garamond, Georgia, serif',
        'Outfit': 'Outfit, sans-serif',
        'Inter': 'Inter, sans-serif',
        'Montserrat': 'Montserrat, sans-serif',
        'Playfair Display': '"Playfair Display", serif',
    };

    const textColor = (data?.textColor as string) || '#000000';
    const fontFamily = fontStyleMap[data?.fontFamily as string] || fontStyleMap['Garamond'];
    const bendOffset = data?.bendOffset as { x: number; y: number } | undefined;

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // When bent: quadratic bezier (responds to both X and Y drag).
    // When straight: smoothstep (current visual, orthogonal corners).
    // getSmoothStepPath centerX/centerY only affects one axis depending on edge direction,
    // so we switch to a proper bezier for full 2D control when the user bends the edge.
    const [edgePath, labelX, labelY] = useMemo((): [string, number, number] => {
        if (bendOffset) {
            const cx = midX + bendOffset.x;
            const cy = midY + bendOffset.y;
            // Bezier midpoint at t=0.5: 0.25·source + 0.5·control + 0.25·target
            const lx = 0.25 * sourceX + 0.5 * cx + 0.25 * targetX;
            const ly = 0.25 * sourceY + 0.5 * cy + 0.25 * targetY;
            return [`M ${sourceX},${sourceY} Q ${cx},${cy} ${targetX},${targetY}`, lx, ly];
        }
        return getSmoothStepPath({
            sourceX, sourceY, sourcePosition,
            targetX, targetY, targetPosition,
            borderRadius: 16,
        });
    }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, midX, midY, bendOffset]);

    // Handle sits at the control point (or geometric midpoint before first bend)
    const handleX = bendOffset ? midX + bendOffset.x : midX;
    const handleY = bendOffset ? midY + bendOffset.y : midY;

    const onHandleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        draggingRef.current = true;
        markDirty();

        const startMidX = midX;
        const startMidY = midY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!draggingRef.current) return;
            const flowPos = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
            setEdges(eds => eds.map(edge =>
                edge.id !== id ? edge : {
                    ...edge,
                    data: {
                        ...edge.data,
                        bendOffset: {
                            x: flowPos.x - startMidX,
                            y: flowPos.y - startMidY,
                        },
                    },
                }
            ));
        };

        const onMouseUp = () => {
            draggingRef.current = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onHandleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEdges(eds => eds.map(edge => {
            if (edge.id !== id) return edge;
            const { bendOffset: _removed, ...restData } = (edge.data || {}) as any;
            return { ...edge, data: restData };
        }));
        markDirty();
    };

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
                    transition: bendOffset ? 'none' : 'stroke-width 0.2s, stroke 0.2s',
                }}
            />
            {selected && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${handleX}px,${handleY}px)`,
                            pointerEvents: 'all',
                            zIndex: 30,
                        }}
                        className="nodrag nopan"
                        title="Arrastra para doblar · Doble clic para enderezar"
                        onMouseDown={onHandleMouseDown}
                        onDoubleClick={onHandleDoubleClick}
                    >
                        <div className="w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-move hover:scale-125 transition-transform flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
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
                            className="bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none text-center"
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
