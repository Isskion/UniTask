'use client';
import React, { useState, useEffect } from 'react';
import { C4NodeType } from '@/app/uniflux/core/types';
import { X, Check, Lock, Unlock, Link } from 'lucide-react';

const C4_NODE_LABELS: Record<C4NodeType, string> = {
    C4_PERSON:          'Persona',
    C4_SYSTEM:          'Sistema (foco)',
    C4_SYSTEM_EXT:      'Sistema Externo',
    C4_CONTAINER_WEB:   'Web App',
    C4_CONTAINER_API:   'API / Backend',
    C4_CONTAINER_DB:    'Base de Datos',
    C4_CONTAINER_QUEUE: 'Cola de Mensajes',
    C4_COMPONENT:       'Componente',
    C4_BOUNDARY:        'Boundary',
};

const C4_TECHNOLOGY_HINTS: Partial<Record<C4NodeType, string>> = {
    C4_CONTAINER_WEB:   'Ej: Next.js 15, React 19',
    C4_CONTAINER_API:   'Ej: Node.js 22, FastAPI',
    C4_CONTAINER_DB:    'Ej: PostgreSQL 16, Firestore',
    C4_CONTAINER_QUEUE: 'Ej: Pub/Sub, Kafka',
    C4_COMPONENT:       'Ej: TypeScript, Python',
    C4_SYSTEM:          'Ej: Google Cloud, Firebase',
};

interface UnifluxC4NodeEditorProps {
    nodeId: string;
    initialLabel: string;
    initialType: C4NodeType;
    initialTechnology?: string;
    initialDescription?: string;
    initialExternal?: boolean;
    isLocked?: boolean;
    onSave: (nodeId: string, label: string, type: C4NodeType, technology: string, description: string, external: boolean, additionalData?: any) => void;
    onClose: () => void;
    onDelete: (nodeId: string) => void;
    onToggleLock?: (nodeId: string, locked: boolean) => void;
    availableFlows?: { id: string, name: string }[];
    initialData?: any;
}

export default function UnifluxC4NodeEditor({
    nodeId, initialLabel, initialType,
    initialTechnology = '', initialDescription = '', initialExternal = false,
    isLocked, onSave, onClose, onDelete, onToggleLock, availableFlows, initialData
}: UnifluxC4NodeEditorProps) {
    const [label, setLabel] = useState(initialLabel);
    const [type, setType] = useState<C4NodeType>(initialType);
    const [technology, setTechnology] = useState(initialTechnology);
    const [description, setDescription] = useState(initialDescription);
    const [external, setExternal] = useState(initialExternal);
    const [targetFlowId, setTargetFlowId] = useState(initialData?.targetFlowId || '');
    const [targetNodeId, setTargetNodeId] = useState(initialData?.targetNodeId || '');

    useEffect(() => {
        setLabel(initialLabel);
        setType(initialType);
        setTechnology(initialTechnology);
        setDescription(initialDescription);
        setExternal(initialExternal);
        setTargetFlowId(initialData?.targetFlowId || '');
        setTargetNodeId(initialData?.targetNodeId || '');
    }, [initialLabel, initialType, initialTechnology, initialDescription, initialExternal, initialData]);

    const handleSave = () => {
        onSave(nodeId, label, type, technology, description, external, {
            targetFlowId,
            targetNodeId
        });
    };

    const isBoundary = type === 'C4_BOUNDARY';
    const showTechnology = !['C4_PERSON', 'C4_BOUNDARY'].includes(type);
    const showExternal = ['C4_PERSON', 'C4_SYSTEM', 'C4_SYSTEM_EXT'].includes(type);

    return (
        <div className="absolute top-20 right-4 z-40 bg-white shadow-xl rounded-xl border border-gray-200 w-72 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
                <div className="flex flex-col">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: '#1168BD' }}></span>
                        Propiedades C4
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400 ml-4">ID: {nodeId}</span>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-md text-gray-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
                {/* Label */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nombre</label>
                    <input
                        autoFocus
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        placeholder="Ej: API de Pedidos"
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Tipo C4</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as C4NodeType)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        {(Object.entries(C4_NODE_LABELS) as [C4NodeType, string][]).map(([val, lbl]) => (
                            <option key={val} value={val}>{lbl}</option>
                        ))}
                    </select>
                </div>

                {/* Technology */}
                {showTechnology && (
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Tecnología</label>
                        <input
                            value={technology}
                            onChange={(e) => setTechnology(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder={C4_TECHNOLOGY_HINTS[type] ?? 'Ej: Node.js, PostgreSQL'}
                        />
                    </div>
                )}

                {/* Description */}
                {!isBoundary && (
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Descripción</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            placeholder="Responsabilidad del elemento..."
                        />
                    </div>
                )}

                {/* External toggle */}
                {showExternal && (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={external}
                            onChange={(e) => setExternal(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Externo al sistema</span>
                    </label>
                )}

                {/* Lock toggle — boundary/group nodes */}
                {onToggleLock && (
                    <button
                        onClick={() => onToggleLock(nodeId, !isLocked)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isLocked
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {isLocked ? 'Bloqueado — click para desbloquear' : 'Bloquear elemento'}
                    </button>
                )}

                {/* V9: Cross-flow Hyperlink */}
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 mt-2">
                    <label className="text-[10px] font-bold text-blue-600 uppercase mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Link className="w-3 h-3" />
                            Navegación Cross-Flow
                        </span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">C4 Sync</span>
                    </label>
                    <div className="flex flex-col gap-2">
                        <select
                            value={targetFlowId}
                            onChange={(e) => setTargetFlowId(e.target.value)}
                            className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="">-- Sin vinculación --</option>
                            {availableFlows?.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        {targetFlowId && (
                            <div className="relative">
                                <input
                                    value={targetNodeId}
                                    onChange={(e) => setTargetNodeId(e.target.value)}
                                    className="w-full border border-blue-100 bg-white/50 rounded-lg px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 pl-8"
                                    placeholder="Nodo destino (opcional)"
                                />
                                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400">
                                    <ListTree className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
                <button
                    onClick={() => onDelete(nodeId)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                >
                    Eliminar
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #1168BD, #438DD5)' }}
                >
                    <Check className="w-4 h-4" />
                    Aplicar
                </button>
            </div>
        </div>
    );
}
