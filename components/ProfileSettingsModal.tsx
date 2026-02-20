"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    User,
    Camera,
    Save,
    Loader2,
    Check,
    Building,
    Mail,
    Shield
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { useFileUploader } from "@/hooks/useFileUploader";
import { db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
    const { user, userRole, tenantId, userProfile } = useAuth();
    const { updateDoc } = useSafeFirestore();
    const { uploadFile, uploading: isUploading, progress: uploadProgress } = useFileUploader();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { t } = useLanguage();

    const isLight = theme === 'light';
    const isRed = theme === 'red';

    const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || "");
    const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || user?.photoURL || "");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDisplayName(userProfile?.displayName || user?.displayName || "");
            setPhotoURL(userProfile?.photoURL || user?.photoURL || "");
        }
    }, [userProfile, user, isOpen]);

    if (!isOpen || !user) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const path = `profile_pictures/${user.uid}`;
            const result = await uploadFile(file, path);
            if (result) {
                setPhotoURL(result.url);
                showToast("Éxito", "Imagen cargada temporalmente. Recuerda guardar los cambios.", "success");
            }
        } catch (error: any) {
            console.error("Error uploading image:", error);
            showToast("Error", "No se pudo cargar la imagen: " + error.message, "error");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // [SYNC] Update Firestore Source of Truth
            await updateDoc(doc(db, "users", user.uid), {
                displayName,
                photoURL,
                lastUpdate: new Date()
            });

            // [SYNC] Update Firebase Auth Profile (Required for immediate UI reflected in 'user' object)
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    displayName,
                    photoURL
                });
                console.log("[ProfileSync] Auth profile synchronized successfully.");
            }

            showToast("Éxito", "Perfil actualizado correctamente", "success");
            onClose();
        } catch (error: any) {
            console.error("Error saving profile:", error);
            showToast("Error", "No se pudo guardar el perfil: " + error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={cn(
                "rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transition-all animate-in fade-in zoom-in duration-200",
                isLight ? "bg-white border border-zinc-200" : (isRed ? "bg-[#1a0505] border border-[#D32F2F]/30" : "bg-[#0c0c0e] border border-white/10")
            )}>
                {/* Header */}
                <div className={cn(
                    "p-4 border-b flex justify-between items-center transition-colors",
                    isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                )}>
                    <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                        <User className={cn("w-5 h-5", isRed ? "text-[#D32F2F]" : "text-primary")} />
                        {t('profile.settings_title') || "Configuración de Perfil"}
                    </h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-black/10">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className={cn(
                                "w-32 h-32 rounded-full overflow-hidden border-4 bg-muted flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105",
                                isRed ? "border-[#D32F2F]/50" : "border-primary/20"
                            )}>
                                {photoURL ? (
                                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-muted-foreground" />
                                )}

                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        <span className="text-[10px] text-white font-bold mt-1">{Math.round(uploadProgress)}%</span>
                                    </div>
                                )}
                            </div>

                            <label className={cn(
                                "absolute bottom-0 right-0 p-2.5 rounded-full cursor-pointer shadow-xl transition-all hover:scale-110 active:scale-90",
                                isRed ? "bg-[#D32F2F] text-white" : "bg-primary text-primary-foreground"
                            )}>
                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                <Camera className="w-5 h-5" />
                            </label>
                        </div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                            {t('profile.change_photo') || "Cambiar Foto de Perfil"}
                        </p>
                    </div>

                    {/* Form Fields */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3" /> {t('profile.display_name') || "Nombre para mostrar"}
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border text-sm transition-all focus:ring-2 outline-none",
                                    isLight
                                        ? "bg-white border-zinc-200 focus:ring-red-500/20 focus:border-red-500"
                                        : "bg-black/40 border-white/10 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-white"
                                )}
                                placeholder="Tu nombre..."
                            />
                        </div>

                        {/* Read-only info */}
                        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-dashed border-border/50">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <Mail className="w-4 h-4 opacity-50" />
                                <span className="font-mono">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <Shield className="w-4 h-4 opacity-50" />
                                <span className="capitalize">{userRole}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <Building className="w-4 h-4 opacity-50" />
                                <span>Tenant: <span className="font-mono text-[10px]">{tenantId}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={cn(
                    "p-4 border-t flex justify-end gap-3",
                    isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                )}>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('common.cancel') || "Cancelar"}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isUploading || !displayName}
                        className={cn(
                            "flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-50",
                            isRed
                                ? "bg-[#D32F2F] text-white shadow-red-950/20 hover:bg-[#B71C1C]"
                                : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('common.save') || "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
