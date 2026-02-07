'use client';

import React, { useState } from 'react';
import { ThumbsDown, Check, X, AlertCircle } from 'lucide-react';
import { saveAiCorrection } from '@/app/actions/ai-feedback';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface AiFeedbackButtonProps {
    question: string;
    botResponse: string;
}

export function AiFeedbackButton({ question, botResponse }: AiFeedbackButtonProps) {
    const { user, tenantId } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [correction, setCorrection] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleSubmit = async () => {
        if (!correction.trim() || status === 'loading') return;

        setStatus('loading');
        const result = await saveAiCorrection(question, correction, user?.uid || "unknown", tenantId || "1");

        if (result.success) {
            setStatus('success');
            setTimeout(() => {
                setIsEditing(false);
                setStatus('idle');
            }, 2000);
        } else {
            setStatus('error');
        }
    };

    if (isEditing) {
        return (
            <div className="mt-2 p-3 bg-secondary/80 rounded-lg border border-purple-500/30 animate-in fade-in slide-in-from-top-1">
                <p className="text-[10px] font-bold text-purple-400 uppercase mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> ¿Cuál sería la respuesta correcta?
                </p>
                <textarea
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    placeholder="Escribe aquí la corrección..."
                    className="w-full bg-background border border-border rounded-md p-2 text-xs focus:ring-1 focus:ring-purple-500 outline-none resize-none h-20"
                />
                <div className="flex justify-end gap-2 mt-2">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="p-1 px-2 text-[10px] hover:bg-secondary rounded text-muted-foreground"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={status === 'loading'}
                        className={cn(
                            "p-1 px-3 text-[10px] rounded flex items-center gap-1 transition-colors",
                            status === 'success' ? "bg-green-500/20 text-green-500" : "bg-purple-500 text-white hover:bg-purple-600"
                        )}
                    >
                        {status === 'loading' ? 'Enviando...' : status === 'success' ? <><Check className="w-3 h-3" /> Guardado</> : 'Guardar Corrección'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-purple-400 transition-colors group"
            title="Corregir respuesta de la IA"
        >
            <ThumbsDown className="w-3 h-3 transition-transform group-hover:-rotate-12" />
            <span>¿Información incorrecta? Corregir</span>
        </button>
    );
}
