"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { X, Send, LifeBuoy, Loader2, User, Building, Mail, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
    viewContext: string;
}

export default function SupportModal({ isOpen, onClose, viewContext }: SupportModalProps) {
    const { user, tenantId } = useAuth();
    const { theme } = useTheme();
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const isLight = theme === 'light';
    const isRed = theme === 'red';

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSending(true);
        try {
            // Use Server Action to bypass client-side permission restrictions (listing users, cross-notify)
            const { submitSupportAction } = await import("@/app/actions/support");

            const result = await submitSupportAction({
                userId: user?.uid || "anonymous",
                userName: user?.displayName || "User",
                userEmail: user?.email || "N/A",
                tenantId: tenantId || "1",
                message: message.trim(),
                context: viewContext
            });

            if (result.success) {
                showToast("Success", "Your message has been sent successfully. We will contact you soon.", "success");
                setMessage("");
                onClose();
            } else {
                throw new Error(result.error || "Error desconocido en el servidor");
            }
        } catch (error: any) {
            console.error("Error creating support ticket:", error);
            showToast("Error", "No se pudo enviar el mensaje. " + (error.message || ""), "error");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-lg rounded-xl flex flex-col overflow-hidden shadow-2xl transition-all border animate-in zoom-in-95 duration-200",
                isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10"
            )}>
                {/* Header */}
                <div className={cn(
                    "p-6 flex items-center justify-between border-b",
                    isRed ? "bg-red-500/10 border-red-500/20" : (isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10")
                )}>
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg",
                            isRed ? "bg-red-500 text-white" : "bg-indigo-500 text-white"
                        )}>
                            <LifeBuoy className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className={cn("text-lg font-bold", isLight ? "text-zinc-900" : "text-white")}>
                                {t('support.title')}
                            </h2>
                            <p className={cn("text-xs", isLight ? "text-zinc-500" : "text-zinc-400")}>
                                {t('support.subtitle')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Readonly Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <User className="w-3 h-3 text-primary" /> {t('support.user')}
                            </label>
                            <div className={cn(
                                "p-2 rounded-lg text-xs font-medium border",
                                isLight ? "bg-zinc-100 border-zinc-200 text-zinc-700" : "bg-white/5 border-white/10 text-zinc-300"
                            )}>
                                {user?.displayName}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Building className="w-3 h-3 text-primary" /> {t('support.tenant')}
                            </label>
                            <div className={cn(
                                "p-2 rounded-lg text-xs font-medium border",
                                isLight ? "bg-zinc-100 border-zinc-200 text-zinc-700" : "bg-white/5 border-white/10 text-zinc-300"
                            )}>
                                {tenantId || "1"}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-primary" /> {t('support.email')}
                            </label>
                            <div className={cn(
                                "p-2 rounded-lg text-xs font-medium border truncate",
                                isLight ? "bg-zinc-100 border-zinc-200 text-zinc-700" : "bg-white/5 border-white/10 text-zinc-300"
                            )}>
                                {user?.email}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Layout className="w-3 h-3 text-primary" /> {t('support.context')}
                            </label>
                            <div className={cn(
                                "p-2 rounded-lg text-xs font-medium border capitalize",
                                isLight ? "bg-zinc-100 border-zinc-200 text-zinc-700" : "bg-white/5 border-white/10 text-zinc-300"
                            )}>
                                {viewContext}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={cn("text-sm font-semibold", isLight ? "text-zinc-700" : "text-zinc-300")}>
                            {t('support.description')}
                        </label>
                        <textarea
                            autoFocus
                            required
                            className={cn(
                                "w-full h-32 p-3 rounded-lg text-sm border focus:outline-none focus:ring-2 transition-all resize-none custom-scrollbar",
                                isLight
                                    ? "bg-white border-zinc-300 text-zinc-900 focus:ring-primary/20 focus:border-primary"
                                    : "bg-white/5 border-white/10 text-white focus:ring-primary/20 focus:border-primary"
                            )}
                            placeholder={t('support.placeholder')}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "flex-1 py-2.5 rounded-lg text-sm font-bold transition-all border",
                                isLight ? "hover:bg-zinc-100 border-zinc-200" : "hover:bg-white/5 border-white/10"
                            )}
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={sending || !message.trim()}
                            className={cn(
                                "flex-[2] py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                                isRed
                                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20",
                                (sending || !message.trim()) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {sending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {t('support.send')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
