'use client';

import React, { useState } from 'react';
import { NodeType } from '@/app/uniflux/core/types';
import { ChevronDown, ChevronRight, Search, GripVertical } from 'lucide-react';

interface StencilItem {
    type: NodeType;
    label: string;
    renderIcon: () => React.ReactNode;
}

const CATEGORIES: { title: string; defaultOpen?: boolean; items: StencilItem[] }[] = [
    {
        title: 'Flujo Básico',
        defaultOpen: true,
        items: [
            {
                type: 'START',
                label: 'Inicio',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <rect x="10" y="25" width="80" height="50" rx="25" fill="#dcfce7" stroke="#22c55e" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'OPERATION',
                label: 'Operación',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <rect x="10" y="25" width="80" height="50" rx="8" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'DECISION',
                label: 'Decisión',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <polygon points="50,15 85,50 50,85 15,50" fill="#fef3c7" stroke="#f59e0b" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'TERMINAL',
                label: 'Fin',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <rect x="10" y="25" width="80" height="50" rx="25" fill="#fee2e2" stroke="#ef4444" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'STATE',
                label: 'Estado',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <path d="M20,25 L80,25 L90,35 L90,75 L80,85 L20,85 L10,75 L10,35 Z" fill="#f3e8ff" stroke="#a855f7" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'ERROR',
                label: 'Error',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <polygon points="30,20 70,20 90,50 70,80 30,80 10,50" fill="#fee2e2" stroke="#ef4444" strokeWidth="4" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Datos & Sistemas',
        defaultOpen: true,
        items: [
            {
                type: 'DATA',
                label: 'Datos',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <polygon points="25,25 90,25 75,75 10,75" fill="#cffafe" stroke="#06b6d4" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'DOCUMENT',
                label: 'Documento',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <path d="M15,15 L85,15 L85,75 C65,95 35,55 15,75 Z" fill="#f1f5f9" stroke="#64748b" strokeWidth="4" />
                    </svg>
                )
            },
            {
                type: 'SUBPROCESS',
                label: 'Subproceso',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <g fill="#e0e7ff" stroke="#3b82f6" strokeWidth="4">
                            <rect x="10" y="25" width="80" height="50" rx="4" />
                            <line x1="25" y1="25" x2="25" y2="75" />
                            <line x1="75" y1="25" x2="75" y2="75" />
                        </g>
                    </svg>
                )
            },
            {
                type: 'TASK',
                label: 'Manual',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <rect x="10" y="25" width="80" height="50" rx="4" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="4" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Elementos Visuales',
        defaultOpen: true,
        items: [
            {
                type: 'ICON',
                label: 'Icono',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm text-indigo-600">
                        <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="transparent" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
                        <circle cx="50" cy="50" r="15" fill="currentColor" />
                    </svg>
                )
            },
            {
                type: 'IMAGE',
                label: 'Imagen',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm text-blue-500">
                        <rect x="10" y="15" width="80" height="70" rx="8" fill="transparent" stroke="currentColor" strokeWidth="6" />
                        <circle cx="35" cy="35" r="10" fill="currentColor" />
                        <path d="M10,85 L40,50 L65,70 L80,55 L90,65" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
                    </svg>
                )
            }
        ]
    },
    {
        title: 'Contenedores',
        defaultOpen: true,
        items: [
            {
                type: 'ENVIRONMENT',
                label: 'Entorno / Área',
                renderIcon: () => (
                    <svg viewBox="0 0 100 100" className="w-8 h-8 drop-shadow-sm">
                        <rect x="10" y="20" width="80" height="60" rx="4" fill="transparent" stroke="#94a3b8" strokeWidth="4" strokeDasharray="8 4" />
                    </svg>
                )
            }
        ]
    }
];

export default function VisioStencilPalette() {
    const [search, setSearch] = useState('');
    const [openCats, setOpenCats] = useState<Record<string, boolean>>(
        CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.title]: cat.defaultOpen ?? true }), {})
    );

    const toggleCat = (title: string) => {
        setOpenCats(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const onDragStart = (event: React.DragEvent, nodeType: NodeType, label: string) => {
        event.dataTransfer.setData('application/reactflow/type', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        event.dataTransfer.effectAllowed = 'move';
        
        // Setup visual drag ghost (optional advanced: custom ghost image)
    };

    return (
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-30">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <GripVertical className="w-4 h-4 text-slate-400" />
                    Stencils
                </h3>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar formas..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {CATEGORIES.map((cat, i) => {
                    // Filter items based on search
                    const filteredItems = cat.items.filter(item => 
                        item.label.toLowerCase().includes(search.toLowerCase()) ||
                        item.type.toLowerCase().includes(search.toLowerCase())
                    );

                    if (filteredItems.length === 0) return null;

                    const isOpen = openCats[cat.title];

                    return (
                        <div key={i} className="mb-2">
                            <button 
                                onClick={() => toggleCat(cat.title)}
                                className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-slate-500 uppercase hover:bg-slate-100 rounded-md transition-colors"
                            >
                                {cat.title}
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            
                            {isOpen && (
                                <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                                    {filteredItems.map(item => (
                                        <div
                                            key={item.type}
                                            draggable
                                            onDragStart={(e) => onDragStart(e, item.type, item.label)}
                                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 cursor-grab active:cursor-grabbing transition-all group"
                                            title={item.label}
                                        >
                                            <div className="group-hover:scale-110 transition-transform duration-200">
                                                {item.renderIcon()}
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {search && !CATEGORIES.some(c => c.items.some(i => i.label.toLowerCase().includes(search.toLowerCase()) || i.type.toLowerCase().includes(search.toLowerCase()))) && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No se encontraron formas
                    </div>
                )}
            </div>
            
            {/* Mini tooltip context */}
            <div className="p-3 bg-white border-t border-slate-200 text-[10px] text-slate-400 text-center leading-tight">
                Arrastra una forma al canvas para empezar a diseñar tu flujo.
            </div>
        </div>
    );
}
