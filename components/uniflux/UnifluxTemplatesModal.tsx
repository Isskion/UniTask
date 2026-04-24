'use client';
import React, { useState } from 'react';
import { FlowNode, FlowEdge } from '@/app/uniflux/core/types';
import { C4_TEMPLATES } from './UnifluxC4Templates';
import { LayoutGrid, Box, Sparkles, Plus, Minus } from 'lucide-react';

interface UnifluxTemplatesModalProps {
    onApplyTemplate: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onGenerateAreas: (count: number) => void;
    onOpenAIWizard: () => void;
    onClose: () => void;
    docType: string;
}

export default function UnifluxTemplatesModal({ 
    onApplyTemplate, 
    onGenerateAreas, 
    onOpenAIWizard,
    onClose,
    docType 
}: UnifluxTemplatesModalProps) {
    const [systemCount, setSystemCount] = useState(2);

    const handleGenerate = () => {
        onGenerateAreas(systemCount);
        onClose();
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b bg-gradient-to-r from-slate-50 to-white">
                    <div>
                        <h2 className="font-black text-slate-900 text-2xl tracking-tight flex items-center gap-3">
                            <LayoutGrid className="w-6 h-6 text-blue-600" />
                            Centro de Plantillas y Generación
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Configura tu lienzo rápidamente o usa plantillas predefinidas</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Section 1: Dynamic Generator */}
                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                                    <Box className="w-5 h-5" />
                                    Generador de Áreas de Sistema
                                </h3>
                                <p className="text-xs text-blue-700/70 mb-6">
                                    Crea automáticamente contenedores para cada sistema que participará en el flujo.
                                </p>

                                <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-blue-200 mb-6">
                                    <span className="text-sm font-bold text-slate-700">Número de sistemas:</span>
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setSystemCount(Math.max(0, systemCount - 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-xl font-black text-blue-600 w-8 text-center">{systemCount}</span>
                                        <button 
                                            onClick={() => setSystemCount(Math.min(12, systemCount + 1))}
                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleGenerate}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                >
                                    Generar {systemCount} Áreas
                                </button>
                            </div>

                            <div className="p-6 rounded-2xl bg-purple-50 border border-purple-100 shadow-sm">
                                <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Asistente Inteligente (IA)
                                </h3>
                                <p className="text-xs text-purple-700/70 mb-6">
                                    Describe tu flujo y deja que la IA genere toda la arquitectura inicial por ti.
                                </p>
                                <button 
                                    onClick={() => { onOpenAIWizard(); onClose(); }}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 transition-all active:scale-[0.98]"
                                >
                                    Abrir Asistente IA
                                </button>
                            </div>
                        </div>

                        {/* Section 2: Static Templates */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 px-2 uppercase text-xs tracking-widest">
                                Plantillas Predefinidas
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {C4_TEMPLATES.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => {
                                            const nodes: FlowNode[] = template.nodes.map((n, i) => ({ ...n, id: String(i + 1) }));
                                            const edges: FlowEdge[] = template.edges.map((e, i) => ({ ...e, id: `e${i + 1}` }));
                                            onApplyTemplate(nodes, edges);
                                            onClose();
                                        }}
                                        className="text-left p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:shadow-md transition-all group bg-white flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl group-hover:bg-blue-50 transition-colors">
                                            {template.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors truncate">{template.label}</div>
                                            <p className="text-[10px] text-slate-500 truncate">{template.description}</p>
                                        </div>
                                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
                                            L{template.c4Level}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="px-8 py-4 border-t bg-slate-50 text-[11px] text-slate-400 text-center">
                    Las áreas de sistema te ayudan a organizar los componentes de cada actor en el flujo. Puedes moverlos y redimensionarlos libremente después de generarlos.
                </div>
            </div>
        </div>
    );
}
