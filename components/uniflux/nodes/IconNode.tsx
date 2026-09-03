'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import { Handle, Position, NodeResizer, NodeToolbar, useReactFlow } from '@xyflow/react';
import { Copy, Trash, icons, LucideProps, Palette, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, ExternalLink } from 'lucide-react';

const handleStyle = {
    width: 8,
    height: 8,
    background: '#8b5cf6',
    border: '2px solid white',
    opacity: 0,
    transition: 'opacity 0.2s',
};

// La etiqueta vive DENTRO del marco del nodo (pegada justo debajo del icono, no flotando lejos)
// para que las flechas que llegan por abajo aterricen debajo del texto y no lo tapen. Los handles
// Bottom se empujan ese mismo alto extra para que el punto de conexión quede debajo de la etiqueta.
const LABEL_GAP = 4;    // separación entre el icono y la etiqueta
const LABEL_HEIGHT = 20; // alto aprox. de la píldora de la etiqueta (10px + padding + borde)
const BOTTOM_HANDLE_OFFSET = LABEL_GAP + LABEL_HEIGHT + 4; // +4 = mismo "sobresalir" que ya tenían

const PRESET_COLORS = [
    '#4f46e5', // Indigo
    '#0ea5e9', // Blue
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#ef4444', // Red
    '#a855f7', // Purple
    '#64748b', // Slate
];

const IconNode = ({ id, data, selected }: any) => {
    const { updateNodeData, setNodes, setEdges } = useReactFlow();
    
    const [showColors, setShowColors] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    
    const iconName = data.iconName || 'Box';
    const color = data.color || '#4f46e5';
    const isLocked = data.isLocked || false;

    // Get the icon component dynamically
    const IconComponent = (icons as any)[iconName] || icons.Box;

    const duplicateNode = () => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;

            const numericIds = nds
                .map(n => parseInt(n.id))
                .filter(id => !isNaN(id));
            const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
            const newId = (maxId + 1).toString();

            // Update label if it starts with the old ID prefix (e.g., "5. Icon")
            let newLabel = nodeToCopy.data.label as string;
            const oldIdPrefix = new RegExp(`^${nodeToCopy.id}\\.\\s*`);
            if (oldIdPrefix.test(newLabel)) {
                newLabel = newLabel.replace(oldIdPrefix, `${newId}. `);
            }

            const newNode = {
                ...nodeToCopy,
                id: newId,
                data: {
                    ...nodeToCopy.data,
                    label: newLabel,
                },
                position: {
                    x: nodeToCopy.position.x + 50,
                    y: nodeToCopy.position.y + 50,
                },
                selected: true,
            };
            return nds.map(n => ({ ...n, selected: false })).concat(newNode);
        });
    };

    const deleteNode = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    const handleColorChange = (c: string) => {
        updateNodeData(id, { color: c });
        setShowColors(false);
    };

    const quickConnect = (dir: 'top' | 'bottom' | 'left' | 'right') => {
        setNodes((nds) => {
            const nodeToCopy = nds.find((n) => n.id === id);
            if (!nodeToCopy) return nds;
            
            const numericIds = nds
                .map(n => parseInt(n.id))
                .filter(id => !isNaN(id));
            const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
            const newId = (maxId + 1).toString();

            const offset = 150;
            const newPosition = {
                x: nodeToCopy.position.x + (dir === 'left' ? -offset : dir === 'right' ? offset : 0),
                y: nodeToCopy.position.y + (dir === 'top' ? -offset : dir === 'bottom' ? offset : 0),
            };

            // Update label for the new node
            let newLabel = nodeToCopy.data.label as string;
            const oldIdPrefix = new RegExp(`^${nodeToCopy.id}\\.\\s*`);
            if (oldIdPrefix.test(newLabel)) {
                newLabel = newLabel.replace(oldIdPrefix, `${newId}. `);
            }

            const newNode = {
                ...nodeToCopy,
                id: newId,
                data: {
                    ...nodeToCopy.data,
                    label: newLabel,
                },
                position: newPosition,
                selected: true,
            };

            setTimeout(() => {
                setEdges((eds) => [
                    ...eds,
                    {
                        id: `e-${id}-${newId}`,
                        source: id,
                        target: newId,
                        sourceHandle: `${dir}-c`,
                        targetHandle: dir === 'top' ? 'bottom-c' : dir === 'bottom' ? 'top-c' : dir === 'left' ? 'right-c' : 'left-c',
                        type: 'smoothstep',
                        animated: false,
                        style: { stroke: '#94a3b8', strokeWidth: 2 },
                        markerEnd: { 
                            type: 'arrowclosed' as any,
                            width: 20,
                            height: 20,
                            color: '#94a3b8'
                        },
                    }
                ]);
            }, 0);

            return nds.map(n => ({...n, selected: false})).concat(newNode);
        });
    };

    return (
        <>
            <NodeToolbar 
                isVisible={selected && !isLocked} 
                position={Position.Top} 
                className="flex items-center gap-1 bg-white p-1 rounded-lg shadow-xl border border-slate-200"
            >
                <div className="relative">
                    <button onClick={() => setShowColors(!showColors)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Cambiar color">
                        <Palette className="w-4 h-4" />
                    </button>
                    {showColors && (
                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white p-2 rounded-lg shadow-xl border border-slate-200 flex gap-1 z-50">
                            {PRESET_COLORS.map((c, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleColorChange(c)}
                                    className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                                    style={{ backgroundColor: c, borderColor: 'rgba(0,0,0,0.1)' }}
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={duplicateNode} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors" title="Duplicar">
                    <Copy className="w-4 h-4" />
                </button>
                <button onClick={deleteNode} className="p-1.5 hover:bg-red-50 rounded text-red-500 transition-colors" title="Eliminar">
                    <Trash className="w-4 h-4" />
                </button>
            </NodeToolbar>

            {/* Nota: este bloque tenía un segundo set de handles "top-c/bottom-c/left-c/right-c"
                SIN estilo propio (posición default de React Flow, pegada al borde real del icono)
                que duplicaba el id de los del set de 16 puntos de más abajo (con el offset de la
                etiqueta aplicado). Con dos handles con el mismo id, no está garantizado cuál usa
                React Flow para anclar las aristas — podía dejar el fix de la etiqueta sin efecto
                en algunos casos. Se quitó: los 4 centros ya están cubiertos por el set de abajo. */}

            {/* Quick Spawn Buttons (Floating translucent arrows) */}
            {selected && !isLocked && (
                <div className="absolute inset-0 pointer-events-none z-[60]">
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('right'); }}
                        className="absolute -right-11 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar a la derecha"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('bottom'); }}
                        className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar abajo"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('left'); }}
                        className="absolute -left-11 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar a la izquierda"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); quickConnect('top'); }}
                        className="absolute -top-11 left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center bg-white/60 hover:bg-white backdrop-blur-sm border border-slate-200/50 rounded-full shadow-md text-slate-400 hover:text-indigo-600 pointer-events-auto transition-all hover:scale-110 active:scale-90 z-20"
                        title="Clonar arriba"
                    >
                        <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {!isLocked && (
                <NodeResizer
                    color={color}
                    isVisible={selected}
                    minWidth={32}
                    minHeight={32}
                    keepAspectRatio={true}
                    handleStyle={{ width: 10, height: 10, borderRadius: 2, background: 'white', border: `2px solid ${color}`, zIndex: 100 }}
                    onResizeStart={() => setIsResizing(true)}
                    onResizeEnd={() => setIsResizing(false)}
                />
            )}

            <div 
                className="w-full h-full relative group flex items-center justify-center pointer-events-auto cursor-pointer"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <IconComponent 
                    color={color} 
                    strokeWidth={1.5}
                    className="w-full h-full"
                    style={{ filter: selected ? `drop-shadow(0 0 8px ${color}66)` : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />

                {/* V9: Navigation Link */}
                {data.targetFlowId && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onNavigate) data.onNavigate(data.targetFlowId, data.targetNodeId);
                        }}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-[70] border-2 border-white"
                        title="Ver flujo relacionado"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </button>
                )}

                {/* Universal Handles (16 points: Sides + Corners + Midpoints) */}
                {/* Visual rule: Only show main centers on select, show all on hover, hide all on resizing */}
                {/* Top side */}
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '50%', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="top-c" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: 0, opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-l" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '100%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-r" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '25%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-25" />
                <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: -4, left: '75%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="top-75" />
                
                {/* Bottom side — empujados debajo de la etiqueta (ver BOTTOM_HANDLE_OFFSET) para
                    que las flechas lleguen justo debajo del texto, no por encima tapándolo. */}
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -BOTTOM_HANDLE_OFFSET, left: '50%', top: 'auto', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="bottom-c" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -BOTTOM_HANDLE_OFFSET, left: 0, top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-l" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -BOTTOM_HANDLE_OFFSET, left: '100%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-r" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -BOTTOM_HANDLE_OFFSET, left: '25%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-25" />
                <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -BOTTOM_HANDLE_OFFSET, left: '75%', top: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="bottom-75" />

                {/* Left side */}
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '25%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="left-25" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '50%', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="left-c" />
                <Handle type="source" position={Position.Left} style={{ ...handleStyle, left: -4, top: '75%', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="left-75" />

                {/* Right side */}
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '25%', left: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="right-25" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '50%', left: 'auto', opacity: isResizing ? 0 : (isHovered || selected ? 1 : 0) }} id="right-c" />
                <Handle type="source" position={Position.Right} style={{ ...handleStyle, right: -4, top: '75%', left: 'auto', opacity: isResizing ? 0 : (isHovered ? 1 : 0) }} id="right-75" />

                {/* Node Label — DENTRO del marco: pegada justo debajo del icono (no flotando a
                    -32px como antes), para que las flechas por abajo aterricen debajo del texto. */}
                <div
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-slate-600 bg-white/80 backdrop-blur-[2px] px-2 py-0.5 rounded-full border border-slate-200/50 shadow-sm pointer-events-none z-10"
                    style={{ top: `calc(100% + ${LABEL_GAP}px)` }}
                >
                    {data.label || 'Icono'}
                </div>
            </div>
        </>
    );
};

export default IconNode;
