'use client';

import React, { useContext, useState, useRef } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath, EdgeLabelRenderer, useReactFlow, Position } from '@xyflow/react';
import { UnifluxDirtyContext } from '../UnifluxContext';

// Radio de las esquinas redondeadas y largo del tramo recto que sale de cada handle antes de
// girar — mismos valores que se usaban al llamar a getSmoothStepPath (16 / default 20 de
// @xyflow/system), para que el trazado se vea igual tanto si se puede arrastrar como si no.
const CORNER_RADIUS = 16;
const STUB_GAP = 20;

const HANDLE_DIR: Record<string, { x: number; y: number }> = {
    [Position.Left]:   { x: -1, y: 0 },
    [Position.Right]:  { x: 1,  y: 0 },
    [Position.Top]:    { x: 0,  y: -1 },
    [Position.Bottom]: { x: 0,  y: 1 },
};

type Pt = { x: number; y: number };
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

// Mismo cálculo de esquina redondeada que usa @xyflow/system internamente (getBend, no
// exportado) — es matemática pura sin dependencias, segura de portar tal cual.
function roundedCorner(a: Pt, b: Pt, c: Pt, size: number): string {
    const bendSize = Math.min(dist(a, b) / 2, dist(b, c) / 2, size);
    const { x, y } = b;
    if ((a.x === x && x === c.x) || (a.y === y && y === c.y)) return `L${x} ${y}`;
    if (a.y === y) {
        const xDir = a.x < c.x ? -1 : 1;
        const yDir = a.y < c.y ? 1 : -1;
        return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
    }
    const xDir = a.x < c.x ? 1 : -1;
    const yDir = a.y < c.y ? -1 : 1;
    return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}

function buildBentPath(points: Pt[], radius: number): string {
    return points.reduce((res, p, i) => {
        const segment = (i > 0 && i < points.length - 1)
            ? roundedCorner(points[i - 1], p, points[i + 1], radius)
            : `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`;
        return res + segment;
    }, '');
}

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
    const { showLogisticsLabels, onQuickAddMessage, onRemoveEdgeMessage, onSetEdgeBend } = useContext(UnifluxDirtyContext);
    const { screenToFlowPosition } = useReactFlow();
    const [hovered, setHovered] = useState(false);

    // Lane offset (px) precalculado en UnifluxWorkspace para familias de aristas paralelas o muy
    // próximas — ver laneOffsetByEdgeId ahí. 0 para el caso normal (arista sin "hermanas").
    const laneOffset = (data?.__laneOffset as number) || 0;

    // Mensajes múltiples sobre esta misma arista (varias interfaces entre los mismos dos
    // sistemas sin tener que crear una arista por cada una) — ver EdgeMessage en core/types.ts.
    // Se muestran TODOS por defecto (para poder imprimir/exportar el diagrama con todo el texto
    // visible sin tener que pasar el mouse por cada línea); colapsar a un único resumen con
    // contador es una acción manual y explícita del usuario, no automática por hover.
    const messages = (data?.messages as { id: string; text: string }[] | undefined) || [];
    const [collapsed, setCollapsed] = useState(false);

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

    // Arrastrar el segmento largo (central) de la arista — "oxigenar" el dibujo estirando los
    // lados en vez de dejar que la ruta automática decida. SOLO cuando origen y destino están en
    // el MISMO eje (Left/Right con Left/Right, o Top/Bottom con Top/Bottom): ahí hay un único
    // segmento recto central bien definido para agarrar. Con ejes mixtos (p.ej. Bottom→Left) el
    // ruteo automático de @xyflow/system resuelve un ángulo distinto en cada caso — no hay un
    // "lado largo" estable, así que se deja tal cual el auto-ruteo de la librería (sin control
    // manual ahí, para no repetir el bug de centerX/centerY ignorado en silencio).
    const targetIsHorizontal = targetPosition === Position.Left || targetPosition === Position.Right;
    const canBend = isHorizontalFlow === targetIsHorizontal;

    // bendOffset persistido (data, ver core/types.ts); mientras se arrastra se previsualiza con
    // estado local propio y solo se confirma (onSetEdgeBend) al soltar el mouse.
    const savedBendOffset = data?.bendOffset as { x: number; y: number } | undefined;
    const [dragBend, setDragBend] = useState<{ x: number; y: number } | null>(null);
    const dragBendRef = useRef<{ x: number; y: number } | null>(null);
    const bendOffset = dragBend ?? savedBendOffset ?? { x: 0, y: 0 };

    let edgePath: string;
    let labelX: number;
    let labelY: number;
    let bendLine: { x1: number; y1: number; x2: number; y2: number } | null = null;

    if (canBend) {
        const source: Pt = { x: offSourceX, y: offSourceY };
        const target: Pt = { x: offTargetX, y: offTargetY };
        const sourceGapped: Pt = { x: source.x + HANDLE_DIR[sourcePosition].x * STUB_GAP, y: source.y + HANDLE_DIR[sourcePosition].y * STUB_GAP };
        const targetGapped: Pt = { x: target.x + HANDLE_DIR[targetPosition].x * STUB_GAP, y: target.y + HANDLE_DIR[targetPosition].y * STUB_GAP };

        let bend1: Pt, bend2: Pt;
        if (isHorizontalFlow) {
            const bendX = (sourceGapped.x + targetGapped.x) / 2 + bendOffset.x;
            bend1 = { x: bendX, y: sourceGapped.y };
            bend2 = { x: bendX, y: targetGapped.y };
        } else {
            const bendY = (sourceGapped.y + targetGapped.y) / 2 + bendOffset.y;
            bend1 = { x: sourceGapped.x, y: bendY };
            bend2 = { x: targetGapped.x, y: bendY };
        }
        edgePath = buildBentPath([source, sourceGapped, bend1, bend2, targetGapped, target], CORNER_RADIUS);
        labelX = (bend1.x + bend2.x) / 2;
        labelY = (bend1.y + bend2.y) / 2;
        bendLine = { x1: bend1.x, y1: bend1.y, x2: bend2.x, y2: bend2.y };
    } else {
        const [path, lx, ly] = getSmoothStepPath({
            sourceX: offSourceX, sourceY: offSourceY, sourcePosition,
            targetX: offTargetX, targetY: offTargetY, targetPosition,
            borderRadius: CORNER_RADIUS,
        });
        edgePath = path; labelX = lx; labelY = ly;
    }

    // Mousedown sobre el segmento central: arranca un drag a nivel documento (mismo patrón que
    // los puntos de UnifluxMovableEdge), en coordenadas de flow (screenToFlowPosition) para que
    // funcione igual con cualquier zoom/pan. Solo persiste (onSetEdgeBend) al soltar — durante el
    // arrastre solo actualiza estado local, para no disparar autosave/history en cada frame.
    const onBendMouseDown = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        const startFlow = screenToFlowPosition({ x: evt.clientX, y: evt.clientY });
        const base = savedBendOffset ?? { x: 0, y: 0 };

        const onMouseMove = (moveEvt: MouseEvent) => {
            const flowPos = screenToFlowPosition({ x: moveEvt.clientX, y: moveEvt.clientY });
            const dx = flowPos.x - startFlow.x;
            const dy = flowPos.y - startFlow.y;
            const next = isHorizontalFlow ? { x: base.x + dx, y: 0 } : { x: 0, y: base.y + dy };
            dragBendRef.current = next;
            setDragBend(next);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            if (dragBendRef.current) onSetEdgeBend(id, dragBendRef.current);
            dragBendRef.current = null;
            setDragBend(null);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

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

                {/* Agarre del segmento largo — solo con la arista seleccionada y solo cuando hay
                    un segmento central estable para arrastrar (ver `canBend`). Área de clic ancha
                    e invisible + un grip visible en el punto medio. */}
                {canBend && bendLine && selected && (
                    <>
                        <line
                            x1={bendLine.x1} y1={bendLine.y1} x2={bendLine.x2} y2={bendLine.y2}
                            stroke="transparent" strokeWidth={16}
                            style={{ cursor: isHorizontalFlow ? 'ew-resize' : 'ns-resize', pointerEvents: 'stroke' }}
                            className="nodrag nopan"
                            onMouseDown={onBendMouseDown}
                        />
                        <circle
                            cx={(bendLine.x1 + bendLine.x2) / 2} cy={(bendLine.y1 + bendLine.y2) / 2}
                            r={5} fill="#4f46e5" stroke="white" strokeWidth={1.5}
                            style={{ cursor: isHorizontalFlow ? 'ew-resize' : 'ns-resize', pointerEvents: 'all' }}
                            className="nodrag nopan"
                            onMouseDown={onBendMouseDown}
                        />
                    </>
                )}
            </g>

            <EdgeLabelRenderer>
                {/* Botón "+" para añadir/duplicar un mensaje sin abrir el panel de edición —
                    solo con la arista seleccionada, justo encima del stack/label. */}
                {selected && (
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%,-100%) translate(${labelX}px,${labelY - (messages.length > 0 ? 16 : 10)}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onQuickAddMessage(id); }}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow leading-none"
                            title="Añadir mensaje a esta conexión"
                        >+</button>
                    </div>
                )}

                {messages.length > 0 ? (
                    /* Stack de mensajes: varias interfaces sobre la MISMA arista, en vez de una
                       arista por mensaje. Expandido por defecto (para imprimir/exportar con todo
                       el texto visible); colapsar a un resumen con contador es una acción manual
                       (botón "－", solo con más de un mensaje) — nunca automática por hover. */
                    <div
                        style={{ position: 'absolute', transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
                        className="nodrag nopan flex flex-col items-center gap-1"
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                    >
                        {collapsed ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
                                className="flex items-center gap-1 bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none whitespace-nowrap"
                                style={{ color: textColor, fontFamily, borderColor: selected ? '#4f46e5' : '#cbd5e1' }}
                                title="Mostrar todos los mensajes"
                            >
                                <span>{messages.length} mensajes</span>
                                <span className="text-slate-400 text-[9px]">▸</span>
                            </button>
                        ) : (
                            <>
                                {messages.length > 1 && (hovered || selected) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCollapsed(true); }}
                                        className="text-[9px] font-bold text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-full w-4 h-4 flex items-center justify-center shadow-sm leading-none"
                                        title="Colapsar a un resumen"
                                    >－</button>
                                )}
                                {messages.map((msg) => (
                                    <div key={msg.id}
                                        className="group flex items-center gap-1 bg-white border px-2 py-0.5 rounded shadow-sm text-[11px] font-bold select-none whitespace-nowrap"
                                        style={{ color: textColor, fontFamily, borderColor: selected ? '#4f46e5' : '#cbd5e1' }}
                                    >
                                        <span>{msg.text}</span>
                                        {selected && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveEdgeMessage(id, msg.id); }}
                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-[10px] leading-none"
                                                title="Quitar mensaje"
                                            >✕</button>
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                ) : label && (
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
