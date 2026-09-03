'use client';

import React, { useContext, useState, useMemo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow, useEdges, Position } from '@xyflow/react';
import { UnifluxDirtyContext } from '../UnifluxContext';

// Separación (px) entre corredores cuando varias aristas comparten el mismo par de nodos.
const PARALLEL_OFFSET_STEP = 24;

const JORNADA_COLORS: Record<string, string> = {
    'completa':      '#3b82f6',
    'nocturna':      '#6366f1',
    'parcial':       '#f59e0b',
    'express':       '#10b981',
    'fin de semana': '#ec4899',
};
function jornadaColor(j?: string) {
    return j ? (JORNADA_COLORS[j.toLowerCase().trim()] ?? '#64748b') : '#64748b';
}

function LabeledValue({ label, value, color = '#475569' }: { label: string; value: string; color?: string }) {
    return (
        <span style={{ color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
              title={`${label}: ${value}`}>
            <span style={{ opacity: 0.6, fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}: </span>
            {value}
        </span>
    );
}

export default function UnifluxOrthogonalEdge({
    id, source, target, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    style = {}, markerEnd, label, selected, data,
}: EdgeProps) {
    const { showLogisticsLabels } = useContext(UnifluxDirtyContext);
    const [hovered, setHovered] = useState(false);
    const allEdges = useEdges();

    // Aristas "paralelas": comparten el mismo par de nodos (en cualquier dirección).
    // Se les asigna un índice estable (por id) para separar sus corredores y que
    // las etiquetas no queden pisadas cuando hay varias interfaces entre los mismos dos nodos.
    const parallelOffset = useMemo(() => {
        const pairKey = [source, target].sort().join('___');
        const siblings = allEdges
            .filter((e) => [e.source, e.target].sort().join('___') === pairKey)
            .sort((a, b) => a.id.localeCompare(b.id));
        if (siblings.length <= 1) return 0;
        const index = siblings.findIndex((e) => e.id === id);
        const mid = (siblings.length - 1) / 2;
        return (index - mid) * PARALLEL_OFFSET_STEP;
    }, [allEdges, source, target, id]);

    const fontStyleMap: Record<string, string> = {
        'Garamond': '"EB Garamond", Garamond, Georgia, serif',
        'Outfit': 'Outfit, sans-serif',
        'Inter': 'Inter, sans-serif',
        'Montserrat': 'Montserrat, sans-serif',
        'Playfair Display': '"Playfair Display", serif',
    };

    const textColor    = (data?.textColor    as string) || '#000000';
    const fontFamily   = fontStyleMap[data?.fontFamily as string] || fontStyleMap['Garamond'];
    const pickupType   = data?.pickupType    as string | undefined;
    const deliveryType = data?.deliveryType  as string | undefined;
    const jornada      = data?.jornada       as string | undefined;
    const operacion    = data?.operacion     as string | undefined;
    const estadoPedido = data?.estadoPedido  as string | undefined;
    const fecha        = data?.fecha         as string | undefined;

    const centerFields = [estadoPedido, jornada, operacion, fecha].filter(Boolean);
    const hasLogistics = pickupType || deliveryType || centerFields.length > 0;

    // Con layout horizontal (handles Left/Right) el tramo compartido es el segmento
    // vertical del medio → desplazamos centerY. Con layout vertical (Top/Bottom) es
    // el segmento horizontal del medio → desplazamos centerX.
    const isHorizontalFlow = sourcePosition === Position.Left || sourcePosition === Position.Right;
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 16,
        ...(parallelOffset !== 0 && isHorizontalFlow ? { centerY: (sourceY + targetY) / 2 + parallelOffset } : {}),
        ...(parallelOffset !== 0 && !isHorizontalFlow ? { centerX: (sourceX + targetX) / 2 + parallelOffset } : {}),
    });

    // Chip positions: linear interpolation along source→target
    const srcX = sourceX + (targetX - sourceX) * 0.2;
    const srcY = sourceY + (targetY - sourceY) * 0.2;
    const tgtX = sourceX + (targetX - sourceX) * 0.8;
    const tgtY = sourceY + (targetY - sourceY) * 0.8;
    const logCenterY = label ? labelY + 22 : labelY;
    const accentColor = jornadaColor(jornada);

    const chipBase: React.CSSProperties = {
        position: 'absolute',
        pointerEvents: 'none',
        transition: 'max-width 0.15s ease',
    };

    return (
        <>
            <g onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
                {/* White halo — bridge effect at crossings */}
                <path d={edgePath} fill="none" stroke="white"
                    strokeWidth={selected ? 11 : 9} strokeLinecap="round"
                    style={{ pointerEvents: 'none' }} />
                <BaseEdge path={edgePath} markerEnd={markerEnd} style={{
                    ...style,
                    strokeWidth: selected ? 3.5 : 2.5,
                    stroke: selected ? '#4f46e5' : (style.stroke || '#94a3b8'),
                    transition: 'stroke-width 0.2s, stroke 0.2s',
                }} />
            </g>

            <EdgeLabelRenderer>
                {/* Free-text label */}
                {label && (
                    <div style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none' }} className="nodrag nopan">
                        <div className="bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none text-center"
                            style={{ color: textColor, fontFamily, borderColor: selected ? '#4f46e5' : '#cbd5e1' }}>
                            {label}
                        </div>
                    </div>
                )}

                {/* Logistics chips */}
                {showLogisticsLabels && hasLogistics && (
                    <>
                        {pickupType && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${srcX}px,${srcY}px)`, maxWidth: hovered ? 160 : 100 }}>
                                <div className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none"
                                    style={{ backgroundColor: '#f0fdf4', borderColor: '#86efac', color: '#15803d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={`Pickup: ${pickupType}`}>
                                    <LabeledValue label="Pickup" value={pickupType} color="#15803d" />
                                </div>
                            </div>
                        )}

                        {centerFields.length > 0 && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${labelX}px,${logCenterY}px)`, maxWidth: hovered ? 220 : 150 }}>
                                {hovered ? (
                                    <div className="border rounded-lg px-2 py-1.5 text-[9px] font-semibold select-none bg-white shadow-sm flex flex-col gap-0.5"
                                        style={{ borderColor: accentColor, minWidth: 100 }}>
                                        {estadoPedido && <LabeledValue label="Estado"    value={estadoPedido} color="#7c3aed" />}
                                        {jornada      && <LabeledValue label="Jornada"   value={jornada}      color={accentColor} />}
                                        {operacion    && <LabeledValue label="Operación" value={operacion}    color="#475569" />}
                                        {fecha        && <LabeledValue label="Fecha"     value={fecha}        color="#0369a1" />}
                                    </div>
                                ) : (
                                    <div className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none bg-white flex flex-col gap-0"
                                        style={{ borderColor: accentColor, overflow: 'hidden' }}
                                        title={[
                                            estadoPedido ? `Estado: ${estadoPedido}` : '',
                                            jornada      ? `Jornada: ${jornada}`     : '',
                                            operacion    ? `Op: ${operacion}`        : '',
                                            fecha        ? `Fecha: ${fecha}`         : '',
                                        ].filter(Boolean).join(' · ')}>
                                        {estadoPedido && <LabeledValue label="Estado"   value={estadoPedido} color="#7c3aed" />}
                                        {jornada      && <LabeledValue label="Jornada"  value={jornada}      color={accentColor} />}
                                        {operacion    && <LabeledValue label="Op"       value={operacion}    color="#475569" />}
                                        {fecha        && <LabeledValue label="Fecha"    value={fecha}        color="#0369a1" />}
                                    </div>
                                )}
                            </div>
                        )}

                        {deliveryType && (
                            <div style={{ ...chipBase, transform: `translate(-50%,-50%) translate(${tgtX}px,${tgtY}px)`, maxWidth: hovered ? 160 : 100 }}>
                                <div className="border rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none"
                                    style={{ backgroundColor: '#fff7ed', borderColor: '#fdba74', color: '#c2410c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    title={`Delivery: ${deliveryType}`}>
                                    <LabeledValue label="Delivery" value={deliveryType} color="#c2410c" />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </EdgeLabelRenderer>
        </>
    );
}
