'use client'

import { useState } from 'react';
import { Sparkles, Send, Loader2, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { generateFlowWithAI } from '@/app/actions/uniflux-ai';
import { FlowGraph, ValidationResult } from '@/app/uniflux/core/types';

interface UnifluxToolbarProps {
    currentGraph: FlowGraph;
    onGraphUpdate: (newGraph: FlowGraph) => void;
}

export default function UnifluxToolbar({ currentGraph, onGraphUpdate }: UnifluxToolbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setStatus(null);

        try {
            const hasExistingNodes = currentGraph.nodes.length > 0;
            const systemRefinement = hasExistingNodes
                ? `INSTRUCCIONES CRÍTICAS — FLUJO EXISTENTE EN MARCHA:
(1) NO elimines ningún nodo sin instrucción explícita del usuario.
(2) Mantén los IDs de nodos existentes tal cual; solo modifica label/type si se pide.
(3) Para nodos nuevos, continúa la numeración desde el ID más alto existente (actual máximo: ${Math.max(...currentGraph.nodes.map(n => parseInt(n.id) || 0), 0)}).
(4) Devuelve SIEMPRE el grafo COMPLETO: nodos existentes + nuevos cambios.
(5) Mantén todas las conexiones existentes a menos que el usuario pida explícitamente borrarlas.
(6) Si el usuario pide "añadir", "conectar" o "modificar", opera sobre el grafo actual. Si pide "crear desde cero" o "resetear", puedes reemplazar.
SOLICITUD DEL USUARIO: `
                : "";

            const result = await generateFlowWithAI(systemRefinement + prompt, currentGraph);

            if (result.success && result.graph) {
                onGraphUpdate(result.graph);
                setStatus({ type: 'success', message: 'Flow generated successfully!' });
                setPrompt('');
            } else {
                setStatus({ type: 'error', message: result.error || 'Failed to generate flow.' });
            }
        } catch (error: any) {
            setStatus({ type: 'error', message: error.message || 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute bottom-6 left-6 z-50 flex flex-col items-start gap-3">
            {/* Main AI Container */}
            <div 
                className={`bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/20 overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen 
                        ? 'w-[350px] md:w-[450px] opacity-100 translate-y-0' 
                        : 'w-0 h-0 opacity-0 translate-y-10 pointer-events-none'
                }`}
            >
                {/* Main Input Area */}
                {isOpen && (
                    <form onSubmit={handleSubmit} className="flex flex-col">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Uniflux AI Assistant</span>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-md text-gray-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your process... (e.g., 'Add a step to check quality after production')"
                                className="w-full py-2 text-gray-800 placeholder-gray-400 bg-transparent resize-none focus:outline-none text-sm min-h-[100px]"
                                autoFocus
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />

                            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                                <button
                                    type="submit"
                                    disabled={!prompt.trim() || loading}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                        prompt.trim() && !loading
                                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:scale-105'
                                            : 'bg-gray-100 text-gray-300'
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            Enviar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Status Feedback */}
                        {status && (
                            <div className={`px-4 py-3 text-[11px] flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 ${
                                status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                                {status.type === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                <span className="font-medium">{status.message}</span>
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Toggle Button (Floating Bubble) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
                    isOpen 
                        ? 'bg-gray-800 text-white rotate-90' 
                        : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white'
                }`}
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <>
                        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce" />
                    </>
                )}
            </button>
        </div>
    );
}
