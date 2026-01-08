"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    title: string;
    description?: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((title: string, description?: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, title, description, type };

        setToasts(prev => [...prev, newToast]);

        // Auto dismiss
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none pr-4 sm:pr-0">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={cn(
                            "pointer-events-auto flex w-full transform rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-right-full fade-in",
                            isLight
                                ? "bg-white/95 backdrop-blur-md border-zinc-200 shadow-zinc-200/50"
                                : "bg-zinc-950/90 backdrop-blur-md border-zinc-800 hover:border-zinc-700"
                        )}
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0 mr-3">
                            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <h4 className={cn("text-sm font-bold mb-0.5 leading-none", isLight ? "text-zinc-900" : "text-white")}>
                                {toast.title}
                            </h4>
                            {toast.description && (
                                <p className={cn("text-xs leading-relaxed mt-1", isLight ? "text-zinc-600" : "text-zinc-400")}>
                                    {toast.description}
                                </p>
                            )}
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => removeToast(toast.id)}
                            className={cn("flex-shrink-0 ml-3 transition-colors", isLight ? "text-zinc-400 hover:text-zinc-600" : "text-zinc-500 hover:text-white")}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
