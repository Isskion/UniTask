"use client";

import React, { useEffect } from "react";
import { X, Sparkles, Database } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface WhatsNewModalProps {
    version: string;
    isOpen: boolean;
    onClose: () => void;
}

export function WhatsNewModal({ version, isOpen, onClose }: WhatsNewModalProps) {
    const { showToast } = useToast();

    // Auto-Open on New Version
    useEffect(() => {
        const lastSeen = localStorage.getItem("lastSeenVersion");
        if (lastSeen !== version) {
            // New version detected! Show modal automatically? 
            // For now, let's keep it manual or triggered by parent, 
            // BUT we update the storage when the user actually closes it
            // or we could force open it here.
            // Let's force open it via a callback or just trust the parent? 
            // Better: Component handles its own auto-open logic if passed a prop, 
            // but for simplicity, let's just use the prop passed by parent or
            // create a separate effect hook in the badge. 
            // ACTUALLY: The requirement is "Greeted with New Update".

            // NOTE: We'll handle the "Auto Open" logic inside this component 
            // but we need a way to tell the parent to show it.
            // Since props control visibility, we can't force open ourselves easily 
            // without a callback. 
            // Workaround: We'll assume the PARENT (VersionBadge) is always mounted 
            // and we can simply render this modal conditionally or check logic there.

            // SIMPLIFICATION: We will trigger the "onOpen" equivalent in parent? No.
            // Let's just create a small self-contained logic: 
            // If checking fails, user clicks badge. 
            // But we want auto-pop.
        }
    }, [version]);

    // Let's implement the "Auto Open" logic in a useEffect that calls an `onOpen` if provided?
    // Or better, move the local storage check to the BADGE component. 
    // Wait, I can't change the parent state from here without a callback.

    // REFACTOR: The Badge will handle the "Click" open. 
    // This modal will handle the "Auto" open on mount if needed? No, that's messy.
    // Let's stick to the Plan: Logic in Badge? No, Logic in Modal is better if it manages its own state?
    // Let's do this: we'll export a hook or just put the logic in the badge. 
    // BADGE is always rendered.

    return isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="relative bg-primary/10 p-6 flex flex-col items-center text-center border-b border-border/50">
                    <button
                        onClick={() => {
                            localStorage.setItem("lastSeenVersion", version);
                            onClose();
                        }}
                        className="absolute top-4 right-4 p-2 hover:bg-black/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>

                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
                        What's New in v{version}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Latest updates and improvements
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

                    {/* Placeholder Content - In future, fetch from CHANGELOG */}
                    <div className="space-y-3">
                        <div className="flex gap-3 items-start">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Multi-Tenant Architecture</p>
                                <p className="text-xs text-muted-foreground">Complete isolation of data between tenants (Unigis vs Argos).</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Superadmin Masquerading</p>
                                <p className="text-xs text-muted-foreground">Admins can now safely switch between tenants to provide support.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-foreground">Performance Improvements</p>
                                <p className="text-xs text-muted-foreground">Faster load times for the Dashboard and Calendar views.</p>
                            </div>
                        </div>
                    </div>

                    {/* Developer Tools (Only if Test) */}
                    {version.includes("test") && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                Developer Tools
                            </p>
                            <button
                                onClick={() => {
                                    if (confirm("Are you sure? This will wipe LOCAL data.")) {
                                        // TODO: Trigger seed or clear logic
                                        showToast("Dev Tool", "Database reset functionality coming soon.", "info");
                                    }
                                }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors text-xs font-medium"
                            >
                                <Database className="w-3.5 h-3.5" />
                                Reset Test Database
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-secondary/50 border-t border-border flex justify-end">
                    <button
                        onClick={() => {
                            localStorage.setItem("lastSeenVersion", version);
                            onClose();
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Awesome, let's go!
                    </button>
                </div>
            </div>
        </div>
    ) : null;
}
