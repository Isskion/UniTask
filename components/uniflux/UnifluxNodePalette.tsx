'use client';
import React from 'react';
import { NodeType } from '@/app/uniflux/core/types';
import { PlayCircle, Square, Hexagon, Diamond, Activity, AlertCircle, Circle } from 'lucide-react';

export default function UnifluxNodePalette() {
    const onDragStart = (event: React.DragEvent, nodeType: NodeType, label: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        event.dataTransfer.effectAllowed = 'move';
    };

    const nodeTypes: { type: NodeType; label: string; icon: React.ReactNode; color: string }[] = [
        { type: 'START', label: 'Inicio', icon: <PlayCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100' },
        { type: 'OPERATION', label: 'Operación', icon: <Square className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' },
        { type: 'DECISION', label: 'Decisión', icon: <Diamond className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100' },
        { type: 'STATE', label: 'Estado', icon: <Circle className="w-4 h-4" />, color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
        { type: 'TASK', label: 'Tarea Manual', icon: <Activity className="w-4 h-4" />, color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
        { type: 'ERROR', label: 'Error', icon: <AlertCircle className="w-4 h-4" />, color: 'text-red-500 bg-red-50 border-red-200 hover:bg-red-100' },
        { type: 'TERMINAL', label: 'Fin', icon: <Square className="w-4 h-4 fill-current" />, color: 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100' },
        { type: 'ENVIRONMENT', label: 'Entorno', icon: <Hexagon className="w-4 h-4" />, color: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100 dashed' },
    ];

    return (
        <div className="absolute top-20 left-4 z-40 bg-white shadow-xl rounded-xl border border-gray-200 p-2 w-48 flex flex-col gap-2">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-2 pt-1 mb-1">
                Herramientas
            </div>
            {nodeTypes.map((item) => (
                <div
                    key={item.type}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing transition-colors text-sm font-medium ${item.color}`}
                    onDragStart={(event) => onDragStart(event, item.type, item.label)}
                    draggable
                >
                    {item.icon}
                    {item.label}
                </div>
            ))}
        </div>
    );
}
