"use client";

import { useState } from "react";
import { Server, User, Key, Globe, Save, ExternalLink, Loader2, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/useTheme";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface ProjectConnectionsProps {
    project: Project;
}

export function ProjectConnections({ project }: ProjectConnectionsProps) {
    const { showToast } = useToast();
    const { theme } = useTheme();
    const isLight = theme === "light";
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        prodIP: project.connections?.prodIP || "",
        prodUser: project.connections?.prodUser || "",
        prodPass: project.connections?.prodPass || "",
        prodUrl: project.connections?.prodUrl || "",
        testIP: project.connections?.testIP || "",
        testUser: project.connections?.testUser || "",
        testPass: project.connections?.testPass || "",
        testUrl: project.connections?.testUrl || "",
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            const projectRef = doc(db, "projects", project.id);
            await updateDoc(projectRef, {
                connections: formData
            });
            showToast("Conexión", "Datos de conexión actualizados correctamente", "success");
        } catch (error) {
            console.error("Error saving connections:", error);
            showToast("Conexión", "Error al guardar los datos", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenUrl = (url: string) => {
        if (!url) return;
        const finalUrl = url.startsWith("http") ? url : `https://${url}`;
        window.open(finalUrl, "_blank");
    };

    const inputClasses = cn(
        "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all",
        isLight 
            ? "bg-zinc-50 focus:bg-white focus:border-primary/50" 
            : "bg-white/5 border-white/10 focus:bg-white/10 focus:border-primary/50 text-zinc-200"
    );

    const labelClasses = "text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5";

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with Save Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                    <h2 className={cn("text-2xl font-bold tracking-tight", isLight ? "text-zinc-900" : "text-foreground")}>
                        Datos de Conexión
                    </h2>
                    <p className="text-sm text-muted-foreground">Credenciales y accesos directos para entornos del proyecto</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 shrink-0"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Cambios
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* PROD SECTION */}
                <div className={cn("p-6 rounded-2xl border space-y-6 transition-all", isLight ? "bg-white border-zinc-200 shadow-sm" : "bg-white/5 border-white/10")}>
                    <div className={cn("flex items-center gap-3 border-b pb-4", isLight ? "border-zinc-100" : "border-white/5")}>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-foreground")}>Entorno: Producción</h3>
                            <p className="text-[10px] text-orange-500 uppercase font-black tracking-wider">Crítico / Live</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClasses}><Server className="w-3 h-3" /> Host / IP Producción</label>
                            <input 
                                className={inputClasses}
                                value={formData.prodIP}
                                onChange={e => setFormData({...formData, prodIP: e.target.value})}
                                placeholder="p.ej. 192.168.1.10"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}><User className="w-3 h-3" /> Usuario Producción</label>
                            <input 
                                className={inputClasses}
                                value={formData.prodUser}
                                onChange={e => setFormData({...formData, prodUser: e.target.value})}
                                placeholder="root, admin..."
                            />
                        </div>
                        <div>
                            <label className={labelClasses}><Key className="w-3 h-3" /> Clave / SSH Key</label>
                            <input 
                                type="password"
                                className={inputClasses}
                                value={formData.prodPass}
                                onChange={e => setFormData({...formData, prodPass: e.target.value})}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="pt-2">
                            <label className={labelClasses}><Globe className="w-3 h-3" /> URL de Producción</label>
                            <div className="relative group">
                                <input 
                                    className={cn(inputClasses, "pr-12")}
                                    value={formData.prodUrl}
                                    onChange={e => setFormData({...formData, prodUrl: e.target.value})}
                                    placeholder="https://..."
                                />
                                <button 
                                    onClick={() => handleOpenUrl(formData.prodUrl)}
                                    disabled={!formData.prodUrl}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary/20 text-primary rounded-lg transition-all opacity-40 group-hover:opacity-100 disabled:opacity-0"
                                    title="Abrir URL"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TEST SECTION */}
                <div className={cn("p-6 rounded-2xl border space-y-6 transition-all", isLight ? "bg-white border-zinc-200 shadow-sm" : "bg-white/5 border-white/10")}>
                    <div className={cn("flex items-center gap-3 border-b pb-4", isLight ? "border-zinc-100" : "border-white/5")}>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                            <Server className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-foreground")}>Entorno: Test</h3>
                            <p className="text-[10px] text-blue-500 uppercase font-black tracking-wider">Sandbox / Testing</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className={labelClasses}><Server className="w-3 h-3" /> Host / IP Test</label>
                            <input 
                                className={inputClasses}
                                value={formData.testIP}
                                onChange={e => setFormData({...formData, testIP: e.target.value})}
                                placeholder="p.ej. 10.0.0.5"
                            />
                        </div>
                        <div>
                            <label className={labelClasses}><User className="w-3 h-3" /> Usuario Test</label>
                            <input 
                                className={inputClasses}
                                value={formData.testUser}
                                onChange={e => setFormData({...formData, testUser: e.target.value})}
                                placeholder="testuser, dev..."
                            />
                        </div>
                        <div>
                            <label className={labelClasses}><Key className="w-3 h-3" /> Clave / SSH Key</label>
                            <input 
                                type="password"
                                className={inputClasses}
                                value={formData.testPass}
                                onChange={e => setFormData({...formData, testPass: e.target.value})}
                                placeholder="••••••••"
                            />
                        </div>
                        <div className="pt-2">
                            <label className={labelClasses}><Globe className="w-3 h-3" /> URL de Test</label>
                            <div className="relative group">
                                <input 
                                    className={cn(inputClasses, "pr-12")}
                                    value={formData.testUrl}
                                    onChange={e => setFormData({...formData, testUrl: e.target.value})}
                                    placeholder="https://test..."
                                />
                                <button 
                                    onClick={() => handleOpenUrl(formData.testUrl)}
                                    disabled={!formData.testUrl}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary/20 text-primary rounded-lg transition-all opacity-40 group-hover:opacity-100 disabled:opacity-0"
                                    title="Abrir URL"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
