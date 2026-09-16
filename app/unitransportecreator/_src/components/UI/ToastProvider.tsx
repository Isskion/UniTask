"use client";
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    detail?: string;
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (type: ToastType, message: string, options?: { detail?: string; duration?: number }) => void;
    removeToast: (id: string) => void;
    success: (msg: string, detail?: string) => void;
    error: (msg: string, detail?: string) => void;
    warning: (msg: string, detail?: string) => void;
    info: (msg: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, message: string, options?: { detail?: string; duration?: number }) => {
        const id = `toast-${++counterRef.current}-${Date.now()}`;
        const duration = options?.duration ?? (type === 'error' ? 6000 : 3500);
        const toast: Toast = { id, type, message, detail: options?.detail, duration };

        setToasts((prev) => [...prev.slice(-4), toast]); // Max 5 toasts

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((msg: string, detail?: string) => addToast('success', msg, { detail }), [addToast]);
    const error = useCallback((msg: string, detail?: string) => addToast('error', msg, { detail, duration: 8000 }), [addToast]);
    const warning = useCallback((msg: string, detail?: string) => addToast('warning', msg, { detail }), [addToast]);
    const info = useCallback((msg: string, detail?: string) => addToast('info', msg, { detail }), [addToast]);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

// ─── Toast Container (renders at top-right) ─────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-3 right-3 z-[200] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 380 }}>
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

// ─── Individual Toast ───────────────────────────────────────────────────────────

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: '✅', text: 'text-emerald-800' },
    error:   { bg: 'bg-red-50',     border: 'border-red-300',     icon: '❌', text: 'text-red-800' },
    warning: { bg: 'bg-amber-50',   border: 'border-amber-300',   icon: '⚠️', text: 'text-amber-800' },
    info:    { bg: 'bg-indigo-50',  border: 'border-indigo-300',  icon: 'ℹ️', text: 'text-indigo-800' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const style = TOAST_STYLES[toast.type];

    return (
        <div
            className={`pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg shadow-slate-900/10 ${style.bg} ${style.border} animate-slide-in-right`}
            style={{ animation: 'slideInRight 0.3s ease-out' }}
        >
            <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${style.text}`}>{toast.message}</p>
                {toast.detail && (
                    <p className={`text-xs mt-0.5 opacity-70 ${style.text} truncate`}>{toast.detail}</p>
                )}
            </div>
            <button
                className="shrink-0 text-slate-400 hover:text-slate-600 text-sm font-bold leading-none mt-0.5"
                onClick={() => onRemove(toast.id)}
            >
                ×
            </button>
        </div>
    );
}
