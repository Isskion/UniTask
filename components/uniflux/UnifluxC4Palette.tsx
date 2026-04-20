'use client';
import React, { useState } from 'react';
import { C4NodeType } from '@/app/uniflux/core/types';

interface C4PaletteItem {
    type: C4NodeType;
    label: string;
    icon: string;
    color: string;
    levels: number[];
}

const C4_ITEMS: C4PaletteItem[] = [
    { type: 'C4_PERSON',          label: 'Persona',       icon: '👤', color: '#08427B', levels: [1, 2, 3] },
    { type: 'C4_SYSTEM',          label: 'Sistema',       icon: '🖥️',  color: '#1168BD', levels: [1] },
    { type: 'C4_SYSTEM_EXT',      label: 'Sist. Externo', icon: '🌍', color: '#999999', levels: [1, 2] },
    { type: 'C4_CONTAINER_WEB',   label: 'Web App',       icon: '🌐', color: '#438DD5', levels: [2] },
    { type: 'C4_CONTAINER_API',   label: 'API / Backend', icon: '⚙️',  color: '#438DD5', levels: [2] },
    { type: 'C4_CONTAINER_DB',    label: 'Base de Datos', icon: '🗄️',  color: '#438DD5', levels: [2] },
    { type: 'C4_CONTAINER_QUEUE', label: 'Cola Mensajes', icon: '📨', color: '#438DD5', levels: [2] },
    { type: 'C4_COMPONENT',       label: 'Componente',    icon: '🧩', color: '#85BBF0', levels: [3] },
    { type: 'C4_BOUNDARY',        label: 'Boundary',      icon: '⬜', color: '#64748b', levels: [1, 2, 3] },
];

const LEVEL_LABELS: Record<number, string> = {
    1: 'L1 · Context',
    2: 'L2 · Container',
    3: 'L3 · Component',
};

interface UnifluxC4PaletteProps {
    activeLevel: 1 | 2 | 3;
    onLevelChange: (level: 1 | 2 | 3) => void;
    onOpenTemplates?: () => void;
}

export default function UnifluxC4Palette({ activeLevel, onLevelChange, onOpenTemplates }: UnifluxC4PaletteProps) {
    const onDragStart = (event: React.DragEvent, nodeType: C4NodeType, label: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        event.dataTransfer.setData('application/reactflow/c4type', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const visibleItems = C4_ITEMS.filter(item => item.levels.includes(activeLevel));

    return (
        <div className="absolute top-20 left-4 z-40 bg-white shadow-xl rounded-xl border border-gray-200 p-2 w-48 flex flex-col gap-2">
            {/* Level selector */}
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 pt-1">
                Nivel C4
            </div>
            <div className="flex flex-col gap-1 px-1">
                {([1, 2, 3] as const).map(lvl => (
                    <button
                        key={lvl}
                        onClick={() => onLevelChange(lvl)}
                        className={`text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all text-left ${
                            activeLevel === lvl
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {LEVEL_LABELS[lvl]}
                    </button>
                ))}
            </div>

            <div className="border-t border-gray-100 pt-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">
                    Elementos
                </div>
                {visibleItems.map((item) => (
                    <div
                        key={item.type}
                        className="flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors text-sm font-medium mb-1"
                        style={{
                            borderColor: `${item.color}44`,
                            backgroundColor: `${item.color}11`,
                            color: item.color,
                        }}
                        onDragStart={(event) => onDragStart(event, item.type, item.label)}
                        draggable
                    >
                        <span>{item.icon}</span>
                        <span style={{ color: '#374151', fontSize: 12 }}>{item.label}</span>
                    </div>
                ))}
            </div>

            {onOpenTemplates && (
                <div className="border-t border-gray-100 pt-2 px-1">
                    <button
                        onClick={onOpenTemplates}
                        className="w-full flex items-center gap-2 p-2 rounded-lg border border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors text-xs font-bold text-blue-700"
                    >
                        <span>📐</span>
                        <span>Plantillas C4</span>
                    </button>
                </div>
            )}
        </div>
    );
}
