'use client';
import React, { useState, useEffect } from 'react';
import { NodeType } from '@/app/uniflux/core/types';
import { X, Check, Lock, Unlock } from 'lucide-react';

interface UnifluxNodeEditorProps {
    nodeId: string;
    initialLabel: string;
    initialType: NodeType;
    initialData?: any;
    isLocked?: boolean;
    onSave: (nodeId: string, label: string, type: NodeType, additionalData?: any) => void;
    onClose: () => void;
    onDelete: (nodeId: string) => void;
    onToggleLock?: (nodeId: string, locked: boolean) => void;
}

export default function UnifluxNodeEditor({ nodeId, initialLabel, initialType, initialData, isLocked, onSave, onClose, onDelete, onToggleLock }: UnifluxNodeEditorProps) {
    const [label, setLabel] = useState(initialLabel);
    const [type, setType] = useState<NodeType>(initialType);
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
    const [iconName, setIconName] = useState(initialData?.iconName || 'Box');
    const [color, setColor] = useState(initialData?.color || '#4f46e5');

    // Sync if props change
    useEffect(() => {
        setLabel(initialLabel);
        setType(initialType);
        setImageUrl(initialData?.imageUrl || '');
        setIconName(initialData?.iconName || 'Box');
        setColor(initialData?.color || '#4f46e5');
    }, [initialLabel, initialType, initialData]);

    const handleSave = () => {
        onSave(nodeId, label, type, { imageUrl, iconName, color });
    };

    const nodeTypes: { value: NodeType; label: string }[] = [
        { value: 'START', label: 'Inicio' },
        { value: 'OPERATION', label: 'Operación' },
        { value: 'DECISION', label: 'Decisión' },
        { value: 'STATE', label: 'Estado' },
        { value: 'TASK', label: 'Tarea Manual' },
        { value: 'ERROR', label: 'Error' },
        { value: 'TERMINAL', label: 'Fin' },
        { value: 'ENVIRONMENT', label: 'Entorno' },
        { value: 'ICON', label: 'Icono' },
        { value: 'IMAGE', label: 'Imagen' },
    ];

    return (
        <div className="absolute top-20 right-4 z-40 bg-white shadow-xl rounded-xl border border-gray-200 w-72 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    Propiedades del Nodo
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-md text-gray-500 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nombre / Etiqueta</label>
                    <input
                        autoFocus
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        placeholder="Ej: Validar Pago"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Tipo de Nodo</label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as NodeType)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    >
                        {nodeTypes.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {type === 'IMAGE' && (
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">URL de la Imagen</label>
                        <input
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                            placeholder="https://ejemplo.com/imagen.png"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Pega una URL o un texto en Base64.</p>
                    </div>
                )}

                {type === 'ICON' && (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nombre del Icono</label>
                            <input
                                value={iconName}
                                onChange={(e) => setIconName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                placeholder="Ej: Box, User, Settings"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Nombres de Lucide React</p>
                        </div>
                        <div className="w-1/3">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Color</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-full h-[38px] border border-gray-200 rounded-lg cursor-pointer"
                            />
                        </div>
                    </div>
                )}

                {/* Lock toggle — only shown when onToggleLock is provided (e.g. ENVIRONMENT nodes) */}
                {onToggleLock && (
                    <button
                        onClick={() => onToggleLock(nodeId, !isLocked)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${isLocked
                            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {isLocked ? 'Entorno bloqueado — click para desbloquear' : 'Bloquear entorno'}
                    </button>
                )}
            </div>

            <div className="p-3 border-t bg-gray-50 flex items-center justify-between">
                <button
                    onClick={() => onDelete(nodeId)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors"
                >
                    Eliminar Nodo
                </button>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Check className="w-4 h-4" />
                    Aplicar
                </button>
            </div>
        </div>
    );
}
