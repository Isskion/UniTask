'use client'

import { useState } from 'react';
import { Sparkles, Send, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
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
            const result = await generateFlowWithAI(prompt, currentGraph);

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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
            <div className={`bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 ${isOpen ? 'ring-4 ring-purple-50/50' : ''}`}>

                {/* Header / Toggle */}
                {!isOpen && (
                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Ask AI to build or modify your flow...
                    </button>
                )}

                {/* Main Input Area */}
                {isOpen && (
                    <form onSubmit={handleSubmit} className="p-1">
                        <div className="relative">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your process... (e.g., 'Receive goods, check quality, if damaged return to sender, else stock')"
                                className="w-full pl-4 pr-12 py-4 text-gray-800 placeholder-gray-400 bg-transparent resize-none focus:outline-none text-base"
                                rows={2}
                                autoFocus
                                disabled={loading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                            />

                            <div className="absolute right-2 bottom-3 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                                >
                                    <span className="text-xs">Close</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={!prompt.trim() || loading}
                                    className={`p-2 rounded-lg transition-all ${prompt.trim() && !loading
                                        ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md'
                                        : 'bg-gray-100 text-gray-300'
                                        }`}
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Status Feedback */}
                        {status && (
                            <div className={`px-4 py-2 text-sm flex items-center gap-2 border-t ${status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                {status.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                {status.message}
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
