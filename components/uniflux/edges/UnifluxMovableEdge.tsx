'use client';

import React, { useCallback, useRef, useMemo } from 'react';
import { 
    BaseEdge, 
    EdgeProps, 
    getSmoothStepPath, 
    EdgeLabelRenderer,
    useReactFlow,
} from '@xyflow/react';

export default function UnifluxMovableEdge({
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
    const draggingRef = useRef<{ index: number } | null>(null);

    const fontStyleMap: Record<string, string> = {
        'Garamond': '"EB Garamond", Garamond, Georgia, serif',
        'Outfit': 'Outfit, sans-serif',
        'Inter': 'Inter, sans-serif',
        'Montserrat': 'Montserrat, sans-serif',
        'Playfair Display': '"Playfair Display", serif'
    };

    const textColor = (data?.textColor as string) || '#000000';
    const fontFamily = fontStyleMap[data?.fontFamily as string] || fontStyleMap['Garamond'];

    // 1. Path Calculation
    // For a truly professional look, we should route through pathPoints.
    // However, getSmoothStepPath only supports source/target.
    // For this version, we render straight segments between points to allow full control.
    const pathPoints = (data?.pathPoints as {x: number, y: number}[]) || [];
    
    const edgePath = useMemo(() => {
        if (pathPoints.length === 0) {
            const [path] = getSmoothStepPath({
                sourceX, sourceY, sourcePosition,
                targetX, targetY, targetPosition,
                borderRadius: 16,
            });
            return path;
        }

        // Custom path: Source -> P1 -> P2 -> ... -> Target
        let path = `M ${sourceX},${sourceY}`;
        pathPoints.forEach(pt => {
            path += ` L ${pt.x},${pt.y}`;
        });
        path += ` L ${targetX},${targetY}`;
        return path;
    }, [sourceX, sourceY, targetX, targetY, pathPoints]);

    const labelPos = useMemo(() => {
        if (pathPoints.length === 0) {
            const [_, x, y] = getSmoothStepPath({
                sourceX, sourceY, sourcePosition,
                targetX, targetY, targetPosition,
            });
            return { x, y };
        }
        // Place label on the middle point or middle segment
        const midIdx = Math.floor(pathPoints.length / 2);
        return pathPoints[midIdx];
    }, [sourceX, sourceY, targetX, targetY, pathPoints]);

    // Drag Logic
    const onHandleMouseDown = (event: React.MouseEvent, index: number) => {
        event.stopPropagation();
        draggingRef.current = { index };

        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!draggingRef.current) return;
            
            const flowPos = screenToFlowPosition({
                x: moveEvent.clientX,
                y: moveEvent.clientY,
            });

            setEdges((eds) => eds.map((e) => {
                if (e.id === id) {
                    const newPoints = [...((e.data?.pathPoints as any[]) || [])];
                    if (newPoints[draggingRef.current!.index]) {
                        newPoints[draggingRef.current!.index] = flowPos;
                    }
                    return { ...e, data: { ...e.data, pathPoints: newPoints } };
                }
                return e;
            }));
        };

        const onMouseUp = () => {
            draggingRef.current = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const onRemovePoint = (index: number) => {
        setEdges((eds) => eds.map((edge) => {
            if (edge.id === id) {
                const newPoints = [...pathPoints];
                newPoints.splice(index, 1);
                return { ...edge, data: { ...edge.data, pathPoints: newPoints } };
            }
            return edge;
        }));
    };

    return (
        <>
            {/* White halo — creates visual bridge where edges cross */}
            <path
                d={edgePath}
                fill="none"
                stroke="white"
                strokeWidth={selected ? 12 : 9}
                strokeLinecap="round"
                style={{ pointerEvents: 'none' }}
            />
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    strokeWidth: selected ? 4 : 2.5,
                    stroke: selected ? '#6366f1' : (style.stroke || '#94a3b8'),
                    transition: pathPoints.length === 0 ? 'stroke-width 0.2s, stroke 0.2s' : 'none',
                    cursor: 'crosshair'
                }}
            />
            
            <EdgeLabelRenderer>
                {/* Control handles for existing points */}
                {selected && pathPoints.map((pt, idx) => (
                    <div
                        key={`${id}-pt-${idx}`}
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${pt.x}px,${pt.y}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                        onMouseDown={(e) => onHandleMouseDown(e, idx)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onRemovePoint(idx);
                        }}
                    >
                        <div className="w-5 h-5 bg-white border-2 border-indigo-600 rounded-full shadow-lg cursor-move hover:scale-125 transition-transform flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                        </div>
                    </div>
                ))}
            </EdgeLabelRenderer>

            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelPos.x}px,${labelPos.y}px)`,
                            pointerEvents: 'none',
                        }}
                    >
                        <div 
                            className="bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none text-center"
                            style={{
                                color: textColor,
                                fontFamily: fontFamily,
                                borderColor: selected ? '#6366f1' : '#cbd5e1',
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
