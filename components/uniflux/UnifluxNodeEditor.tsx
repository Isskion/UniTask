'use client';
import React, { useState, useEffect } from 'react';
import { NodeType } from '@/app/uniflux/core/types';
import { X, Check, Lock, Unlock, Upload, Search, Link, icons as LucideIcons } from 'lucide-react';

const POPULAR_ICONS = [
    'Box', 'User', 'Settings', 'Database', 'Cloud', 'Server', 'Globe', 'Mail', 'Phone', 'MapPin',
    'Calendar', 'Clock', 'Shield', 'Zap', 'Award', 'Star', 'Heart', 'Smile', 'MessageSquare', 'Send',
    'Truck', 'ShoppingCart', 'CreditCard', 'Wallet', 'Briefcase', 'HardDrive', 'Monitor', 'Smartphone',
    'Laptop', 'Camera', 'Music', 'Film', 'Book', 'File', 'Folder', 'Image', 'Bell', 'Play',
    'Lock', 'Unlock', 'Key', 'Eye', 'Check', 'AlertCircle', 'Info', 'HelpCircle', 'X', 'Zap',
    'Router', 'Wifi', 'Cpu', 'Activity', 'Terminal', 'Layers', 'Share2', 'Link', 'Anchor', 'Target'
];

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
    availableFlows?: { id: string, name: string }[];
}

export default function UnifluxNodeEditor({ nodeId, initialLabel, initialType, initialData, isLocked, onSave, onClose, onDelete, onToggleLock, availableFlows }: UnifluxNodeEditorProps) {
    const [label, setLabel] = useState(initialLabel);
    const [type, setType] = useState<NodeType>(initialType);
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
    const [iconName, setIconName] = useState(initialData?.iconName || 'Box');
    const [color, setColor] = useState(initialData?.color || '#4f46e5');
    const [items, setItems] = useState<{ key: string, value: string }[]>(initialData?.items || []);
    const [newItemKey, setNewItemKey] = useState('');
    const [newItemValue, setNewItemValue] = useState('');
    const [targetFlowId, setTargetFlowId] = useState(initialData?.targetFlowId || '');
    const [targetNodeId, setTargetNodeId] = useState(initialData?.targetNodeId || '');

    // Sync if props change
    useEffect(() => {
        setLabel(initialLabel);
        setType(initialType);
        setImageUrl(initialData?.imageUrl || '');
        setIconName(initialData?.iconName || 'Box');
        setColor(initialData?.color || '#4f46e5');
        setItems(initialData?.items || []);
        setTargetFlowId(initialData?.targetFlowId || '');
        setTargetNodeId(initialData?.targetNodeId || '');
    }, [initialLabel, initialType, initialData]);

    const handleSave = () => {
        onSave(nodeId, label, type, { 
            imageUrl, 
            iconName, 
            color, 
            items,
            targetFlowId,
            targetNodeId
        });
    };

    const addItem = () => {
        if (!newItemKey || !newItemValue) return;
        setItems(prev => [...prev, { key: newItemKey, value: newItemValue }]);
        setNewItemKey('');
        setNewItemValue('');
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
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
        { value: 'PRO_NODE', label: 'Tabla Pro' },
    ];

    return (
        <div className="absolute top-20 right-4 z-40 bg-white shadow-xl rounded-xl border border-gray-200 w-72 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50/50">
                <div className="flex flex-col">
                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Propiedades del Nodo
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400 ml-4">ID: {nodeId}</span>
                </div>
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
                    <div className="flex flex-col gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Subir desde PC</label>
                            <label className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all text-gray-500 hover:text-purple-600 group">
                                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-medium">Seleccionar imagen</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-100"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-2 text-gray-400">O URL externa</span>
                            </div>
                        </div>
                        <div>
                            <input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                placeholder="https://ejemplo.com/imagen.png"
                            />
                        </div>
                        {imageUrl && (
                            <div className="mt-1 flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded bg-white border overflow-hidden shrink-0">
                                        <img src={imageUrl} alt="preview" className="w-full h-full object-contain" />
                                    </div>
                                    <span className="text-[10px] text-gray-400 truncate">Vista previa</span>
                                </div>
                                <button onClick={() => setImageUrl('')} className="text-red-400 hover:text-red-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {type === 'ICON' && (
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Nombre del Icono</label>
                                <input
                                    value={iconName}
                                    onChange={(e) => setIconName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                    placeholder="Ej: Box, User, Settings"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Color</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full h-[38px] border border-gray-200 rounded-lg cursor-pointer p-1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Seleccionar Icono</label>
                            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-100 rounded-xl bg-gray-50 custom-scrollbar">
                                {POPULAR_ICONS.map(name => {
                                    const Icon = (LucideIcons as any)[name];
                                    const isSelected = iconName === name;
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setIconName(name)}
                                            className={`flex items-center justify-center p-2 rounded-lg transition-all ${isSelected
                                                ? 'bg-purple-600 text-white shadow-md'
                                                : 'bg-white text-gray-400 hover:text-purple-600 hover:shadow-sm border border-transparent hover:border-purple-100'}`}
                                            title={name}
                                        >
                                            {Icon ? <Icon size={18} strokeWidth={isSelected ? 2.5 : 2} /> : <span>?</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {type === 'PRO_NODE' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Color Tema</label>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-full h-8 border border-gray-200 rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        <div className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Datos de la Tabla</label>
                            
                            <div className="space-y-2 mb-3">
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white p-1.5 rounded-md shadow-sm border border-slate-100">
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-bold text-slate-400 uppercase">{item.key}</div>
                                            <div className="text-[10px] font-bold text-slate-600 truncate">{item.value}</div>
                                        </div>
                                        <button onClick={() => removeItem(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex gap-1">
                                    <input
                                        value={newItemKey}
                                        onChange={(e) => setNewItemKey(e.target.value.toUpperCase())}
                                        className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-[10px] uppercase font-mono"
                                        placeholder="CLAVE"
                                    />
                                    <input
                                        value={newItemValue}
                                        onChange={(e) => setNewItemValue(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-[10px]"
                                        placeholder="VALOR"
                                    />
                                </div>
                                <button
                                    onClick={addItem}
                                    disabled={!newItemKey || !newItemValue}
                                    className="w-full py-1 text-[10px] font-bold bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-all"
                                >
                                    + Añadir Fila
                                </button>
                            </div>
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

                {/* V9: Cross-flow Hyperlink */}
                <div className="border-t border-gray-100 pt-4 mt-2">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <Link className="w-3 h-3" />
                        Vincular a otro Flujo
                    </label>
                    <div className="flex flex-col gap-2">
                        <select
                            value={targetFlowId}
                            onChange={(e) => setTargetFlowId(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                            <option value="">-- Seleccionar Flujo --</option>
                            {availableFlows?.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        {targetFlowId && (
                            <input
                                value={targetNodeId}
                                onChange={(e) => setTargetNodeId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                placeholder="ID del Nodo (opcional)"
                            />
                        )}
                    </div>
                </div>
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
