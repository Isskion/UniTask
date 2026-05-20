'use client';

import React, { useRef, useMemo, useContext, useState } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { UnifluxDirtyContext } from '../UnifluxContext';

const JORNADA_COLORS: Record<string, string> = {
    'completa':      '#3b82f6',
    'nocturna':      '#6366f1',
    'parcial':       '#f59e0b',
    'express':       '#10b981',
    'fin de semana': '#ec4899',
};

function jornadaColor(jornada?: string) {
    if (!jornada) return '#64748b';
    return JORNADA_COLORS[jornada.toLowerCase().trim()] ?? '#64748b';
}

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
    const { markDirty, showLogisticsLabels } = useContext(UnifluxDirtyContext);
    const draggingRef = useRef(false);
    const [hovered, setHovered] = useState(false);

    const fontStyleMap: Record<string, string> = {
        'Garamond': '"EB Garamond", Garamond, Georgia, serif',
        'Outfit': 'Outfit, sans-serif',
        'Inter': 'Inter, sans-serif',
        'Montserrat': 'Montserrat, sans-serif',
        'Playfair Display': '"Playfair Display", serif',
    };

    const textColor   = (data?.textColor   as string) || '#000000';
    const fontFamily  = fontStyleMap[data?.fontFamily as string] || fontStyleMap['Garamond'];
    const bendOffset  = data?.bendOffset   as { x: number; y: number } | undefined;
    const pickupType  = data?.pickupType   as string | undefined;
    const deliveryType= data?.deliveryType as string | undefined;
    const jornada     = data?.jornada      as string | undefined;
    const operacion   = data?.operacion    as string | undefined;

    const hasLogistics = pickupType || deliveryType || jornada || operacion;

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    const [edgePath, labelX, labelY] = useMemo((): [string, number, number, ...number[]] =>
        getSmoothStepPath({
            sourceX, sourceY, sourcePosition,
            targetX, targetY, targetPosition,
            borderRadius: 16,
            ...(bendOffset ? { centerX: midX + bendOffset.x, centerY: midY + bendOffset.y } : {}),
        }),
    [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, midX, midY, bendOffset]);

    // Chip positions: linear interpolation along source→target (close enough for any path shape)
    const srcChipX = sourceX + (targetX - sourceX) * 0.2;
    const srcChipY = sourceY + (targetY - sourceY) * 0.2;
    const tgtChipX = sourceX + (targetX - sourceX) * 0.8;
    const tgtChipY = sourceY + (targetY - sourceY) * 0.8;

    // Center chip offset: if there's also a free-text label, push logistics chip down
    const logCenterY = label ? labelY + 20 : labelY;

    const handleX = bendOffset ? midX + bendOffset.x : midX;
    const handleY = bendOffset ? midY + bendOffset.y : midY;

    // ── Bend drag ──────────────────────────────────────────────────────────────
    const onHandleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        draggingRef.current = true;
        markDirty();
        const startMidX = midX;
        const startMidY = midY;

        const onMouseMove = (mv: MouseEvent) => {
            if (!draggingRef.current) return;
            const fp = screenToFlowPosition({ x: mv.clientX, y: mv.clientY });
            setEdges(eds => eds.map(edge =>
                edge.id !== id ? edge : {
                    ...edge,
                    data: { ...edge.data, bendOffset: { x: fp.x - startMidX, y: fp.y - startMidY } },
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
            const { bendOffset: _r, ...rest } = (edge.data || {}) as any;
            return { ...edge, data: rest };
        }));
        markDirty();
    };

    // ── Chip helpers ───────────────────────────────────────────────────────────
    const chipBase: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: 'none',
        transition: 'max-width 0.15s ease, opacity 0.15s ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    const accentColor = jornadaColor(jornada);

    return (
        <>
            <g
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {/* White halo — bridge effect at crossings */}
                <path d={edgePath} fill="none" stroke="white" strokeWidth={selected ? 11 : 9}
                    strokeLinecap="round" style={{ pointerEvents: 'none' }} />
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
            </g>

            <EdgeLabelRenderer>
                {/* ── Bend handle (only when selected) ── */}
                {selected && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%,-50%) translate(${handleX}px,${handleY}px)`,
                            pointerEvents: 'all',
                            zIndex: 30,
                        }}
                        className="nodrag nopan"
                        title="Arrastra para ajustar · Doble clic para resetear"
                        onMouseDown={onHandleMouseDown}
                        onDoubleClick={onHandleDoubleClick}
                    >
                        <div className="w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md cursor-move hover:scale-125 transition-transform flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                        </div>
                    </div>
                )}

                {/* ── Free-text label ── */}
                {label && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'none',
                        }}
                        className="nodrag nopan"
                    >
                        <div
                            className="bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none text-center"
                            style={{ color: textColor, fontFamily, borderColor: selected ? '#4f46e5' : '#cbd5e1' }}
                        >
                            {label}
                        </div>
                    </div>
                )}

                {/* ── Logistics chips (only when showLogisticsLabels && any value exists) ── */}
                {showLogisticsLabels && hasLogistics && (
                    <>
                        {/* Source chip — Pickup */}
                        {pickupType && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${srcChipX}px,${srcChipY}px)`, maxWidth: hovered ? 160 : 80 }}>
                                <div
                                    className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none text-center"
                                    style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#15803d', maxWidth: hovered ? 160 : 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={`Pickup: ${pickupType}`}
                                >
                                    {hovered ? `↑ ${pickupType}` : pickupType}
                                </div>
                            </div>
                        )}

                        {/* Center chip — Jornada + Operación */}
                        {(jornada || operacion) && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${labelX}px,${logCenterY}px)`, maxWidth: hovered ? 200 : 120 }}>
                                {hovered ? (
                                    <div
                                        className="border rounded-lg px-2 py-1 text-[9px] font-semibold select-none bg-white shadow-sm"
                                        style={{ borderColor: accentColor, color: '#1e293b', minWidth: 80 }}
                                    >
                                        {jornada && <div style={{ color: accentColor }}>◈ {jornada}</div>}
                                        {operacion && <div className="text-slate-500 mt-0.5">Op: {operacion}</div>}
                                    </div>
                                ) : (
                                    <div
                                        className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none bg-white"
                                        style={{ borderColor: accentColor, color: accentColor, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                        title={[jornada, operacion ? `Op: ${operacion}` : ''].filter(Boolean).join(' · ')}
                                    >
                                        {[jornada, operacion].filter(Boolean).join(' · ')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Target chip — Delivery */}
                        {deliveryType && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${tgtChipX}px,${tgtChipY}px)`, maxWidth: hovered ? 160 : 80 }}>
                                <div
                                    className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none text-center"
                                    style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#c2410c', maxWidth: hovered ? 160 : 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={`Delivery: ${deliveryType}`}
                                >
                                    {hovered ? `↓ ${deliveryType}` : deliveryType}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
