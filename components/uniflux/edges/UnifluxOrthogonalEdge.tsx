'use client';

import React, { useContext, useState } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow, Position } from '@xyflow/react';
import { UnifluxDirtyContext } from '../UnifluxContext';

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
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    style = {}, markerEnd, label, selected, data,
}: EdgeProps) {
    const { showLogisticsLabels } = useContext(UnifluxDirtyContext);
    const [hovered, setHovered] = useState(false);

    // Lane offset (px) precalculado en UnifluxWorkspace para familias de aristas paralelas o muy
    // próximas — ver laneOffsetByEdgeId ahí. 0 para el caso normal (arista sin "hermanas").
    const laneOffset = (data?.__laneOffset as number) || 0;

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

    // Desplazamos las coordenadas REALES (no `centerX`/`centerY`: @xyflow/system las ignora en
    // silencio cuando source/target no tienen handles "opuestos" — p.ej. dos nodos muy cerca uno
    // de otro — y ahí es justo donde más hace falta separar; ver bug reportado). Con layout
    // horizontal (handles Left/Right) el eje perpendicular es Y; con vertical (Top/Bottom) es X.
    // Fuente y destino se desplazan en el MISMO sentido para que el corredor quede paralelo en
    // todo su recorrido, no solo en el tramo central.
    const isHorizontalFlow = sourcePosition === Position.Left || sourcePosition === Position.Right;
    const offSourceX = sourceX + (isHorizontalFlow ? 0 : laneOffset);
    const offSourceY = sourceY + (isHorizontalFlow ? laneOffset : 0);
    const offTargetX = targetX + (isHorizontalFlow ? 0 : laneOffset);
    const offTargetY = targetY + (isHorizontalFlow ? laneOffset : 0);
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX: offSourceX, sourceY: offSourceY, sourcePosition,
        targetX: offTargetX, targetY: offTargetY, targetPosition,
        borderRadius: 16,
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
