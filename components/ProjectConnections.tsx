"use client";

import { useState, useEffect } from "react";
import { Server, User, Key, Globe, Save, ExternalLink, Loader2, Database, Copy, Check, Plus, Trash2, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, ProjectEnvironment } from "@/types";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/hooks/useTheme";
import { usePermissions } from "@/hooks/usePermissions";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

interface ProjectConnectionsProps {
    project: Project;
}

const FORBIDDEN_EMAIL = "daniel.delamo@unigis.com";

const maskCredential = (val: string | undefined): string => {
    if (!val) return "";
    if (val.toLowerCase() === FORBIDDEN_EMAIL.toLowerCase()) return "";
    return val;
};

export function ProjectConnections({ project }: ProjectConnectionsProps) {
    const { showToast } = useToast();
    const { theme } = useTheme();
    const { can } = usePermissions();
    const isLight = theme === "light";
    const [saving, setSaving] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const isTechnical = can('viewTechnicalInfo', 'special');
    
    // Initialize environments from existing data or legacy connections
    const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);

    useEffect(() => {
        if (project.environments && project.environments.length > 0) {
            // Apply sanitization mask on load
            const sanitized = project.environments.map(env => ({
                ...env,
                user: maskCredential(env.user),
                mapiToken: env.mapiToken || ""
            }));
            setEnvironments(sanitized);
        } else if (project.connections) {
            // Legacy Migration with masking
            const legacyEnvironments: ProjectEnvironment[] = [
                {
                    id: "prod",
                    name: "Producción",
                    isProduction: true,
                    ip: project.connections.prodIP || "",
                    user: maskCredential(project.connections.prodUser),
                    pass: project.connections.prodPass || "",
                    url: project.connections.prodUrl || "",
                    mapiToken: "",
                },
                {
                    id: "test",
                    name: "Test",
                    isProduction: false,
                    ip: project.connections.testIP || "",
                    user: maskCredential(project.connections.testUser),
                    pass: project.connections.testPass || "",
                    url: project.connections.testUrl || "",
                    mapiToken: "",
                }
            ];
            setEnvironments(legacyEnvironments);
        } else {
            // New defaults
            setEnvironments([
                { id: "prod", name: "Producción", isProduction: true, ip: "", user: "", pass: "", url: "", mapiToken: "" },
                { id: "test", name: "Test", isProduction: false, ip: "", user: "", pass: "", url: "", mapiToken: "" }
            ]);
        }
    }, [project.environments, project.connections]);

    const handleSave = async () => {
        if (!isTechnical) return;
        setSaving(true);
        try {
            const projectRef = doc(db, "projects", project.id);
            await updateDoc(projectRef, {
                environments: environments
            });
            showToast("Conexión", "Entornos actualizados correctamente", "success");
        } catch (error) {
            console.error("Error saving environments:", error);
            showToast("Conexión", "Error al guardar los entornos", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleAddEnvironment = () => {
        if (!isTechnical) return;
        const newEnv: ProjectEnvironment = {
            id: crypto.randomUUID(),
            name: "Nuevo Entorno",
            isProduction: false,
            ip: "",
            user: "",
            pass: "",
            url: "",
            mapiToken: ""
        };
        setEnvironments([...environments, newEnv]);
        showToast("Entorno", "Nuevo entorno de pruebas añadido", "success");
    };

    const handleRemoveEnvironment = (id: string) => {
        if (!isTechnical) return;
        const envToRemove = environments.find(e => e.id === id);
        if (envToRemove?.isProduction) return;
        
        setEnvironments(environments.filter(e => e.id !== id));
        showToast("Entorno", "Entorno eliminado", "info");
    };

    const handleUpdateField = (id: string, field: keyof ProjectEnvironment, value: any) => {
        if (!isTechnical) return;
        
        let finalValue = value;
        if (field === 'user' && typeof value === 'string') {
            finalValue = maskCredential(value);
        }

        setEnvironments(prev => prev.map(env => 
            env.id === id ? { ...env, [field]: finalValue } : env
        ));
    };

    const handleCopy = (text: string, fieldId: string) => {
        if (!text || !isTechnical) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
        showToast("Copiado", "Copiado al portapapeles", "success");
    };

    const handleOpenUrl = (url: string) => {
        if (!url || !isTechnical) return;
        const finalUrl = url.startsWith("http") ? url : `https://${url}`;
        window.open(finalUrl, "_blank");
    };

    const inputClasses = cn(
        "w-full border rounded-xl px-4 py-2.5 text-sm outline-none transition-all pr-10",
        isLight 
            ? "bg-zinc-50 focus:bg-white focus:border-primary/50" 
            : "bg-white/5 border-white/10 focus:bg-white/10 focus:border-primary/50 text-zinc-200"
    );

    const labelClasses = "text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5 mb-1.5";

    const CopyButton = ({ text, fieldId }: { text: string, fieldId: string }) => (
        <button 
            onClick={() => handleCopy(text, fieldId)}
            disabled={!text || !isTechnical}
            className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all",
                copiedField === fieldId 
                    ? "text-green-500 bg-green-500/10" 
                    : "text-zinc-500 hover:bg-primary/10 hover:text-primary opacity-40 hover:opacity-100",
                !isTechnical && "hidden"
            )}
            title="Copiar"
        >
            {copiedField === fieldId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header section with Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10 sticky top-0 bg-background/80 backdrop-blur-md z-10">
                <div>
                    <h2 className={cn("text-2xl font-bold tracking-tight", isLight ? "text-zinc-900" : "text-foreground")}>
                        Entornos del Proyecto
                    </h2>
                    <p className="text-sm text-muted-foreground">Configuración de servidores y accesos para producción y pruebas</p>
                </div>
                {isTechnical && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAddEnvironment}
                            className="px-4 py-2.5 bg-zinc-800 text-white rounded-xl flex items-center gap-2 font-bold hover:bg-zinc-700 transition-all border border-zinc-700 shadow-lg"
                        >
                            <Plus className="w-4 h-4" />
                            Añadir Entorno
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl flex items-center gap-2 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 shrink-0"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Guardar Cambios
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
                {environments.map((env) => (
                    <div 
                        key={env.id} 
                        className={cn(
                            "p-6 rounded-2xl border space-y-6 transition-all relative group",
                            isLight ? "bg-white border-zinc-200 shadow-sm" : "bg-white/5 border-white/10",
                            env.isProduction && (isLight ? "ring-2 ring-orange-500/20" : "ring-1 ring-orange-500/30")
                        )}
                    >
                        {/* Header Context */}
                        <div className={cn("flex items-center justify-between border-b pb-4", isLight ? "border-zinc-100" : "border-white/5")}>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                    env.isProduction ? "bg-orange-500/20 text-orange-500" : "bg-blue-500/20 text-blue-500"
                                )}>
                                    {env.isProduction ? <Database className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                                </div>
                                <div>
                                    <input 
                                        className={cn(
                                            "font-bold text-lg bg-transparent border-none outline-none focus:ring-2 focus:ring-primary/20 rounded px-1 -ml-1 transition-all",
                                            isLight ? "text-zinc-900" : "text-foreground",
                                            (env.isProduction || !isTechnical) && "pointer-events-none"
                                        )}
                                        value={env.name}
                                        onChange={e => handleUpdateField(env.id, 'name', e.target.value)}
                                        placeholder="Nombre del entorno..."
                                        disabled={env.isProduction || !isTechnical}
                                    />
                                    <p className={cn(
                                        "text-[10px] uppercase font-black tracking-wider",
                                        env.isProduction ? "text-orange-500" : "text-blue-500"
                                    )}>
                                        {env.isProduction ? "Crítico / Live" : "Sandbox / Pruebas"}
                                    </p>
                                </div>
                            </div>
                            
                            {!env.isProduction && isTechnical && (
                                <button 
                                    onClick={() => handleRemoveEnvironment(env.id)}
                                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Eliminar entorno"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Fields */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClasses}><Server className="w-3 h-3" /> Host / IP</label>
                                    <div className="relative">
                                        <input 
                                            className={inputClasses}
                                            value={isTechnical ? env.ip : '••••••••'}
                                            onChange={e => handleUpdateField(env.id, 'ip', e.target.value)}
                                            placeholder="p.ej. 192.168.1.1"
                                            disabled={!isTechnical}
                                        />
                                        <CopyButton text={env.ip || ""} fieldId={`${env.id}-ip`} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClasses}><User className="w-3 h-3" /> Usuario</label>
                                    <div className="relative">
                                        <input 
                                            className={inputClasses}
                                            value={isTechnical ? env.user : '••••••••'}
                                            onChange={e => handleUpdateField(env.id, 'user', e.target.value)}
                                            placeholder="root, admin..."
                                            disabled={!isTechnical}
                                        />
                                        <CopyButton text={env.user || ""} fieldId={`${env.id}-user`} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}><Key className="w-3 h-3" /> Clave / SSH Key</label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        className={inputClasses}
                                        value={isTechnical ? env.pass : '••••••••'}
                                        onChange={e => handleUpdateField(env.id, 'pass', e.target.value)}
                                        placeholder="••••••••"
                                        disabled={!isTechnical}
                                    />
                                    <CopyButton text={env.pass || ""} fieldId={`${env.id}-pass`} />
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}><Fingerprint className="w-3 h-3" /> Mapi token</label>
                                <div className="relative">
                                    <input 
                                        className={inputClasses}
                                        value={isTechnical ? (env.mapiToken || "") : '••••••••'}
                                        onChange={e => handleUpdateField(env.id, 'mapiToken', e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                        placeholder="p.ej. A1B2C3D4E5F6G7H8I9J0KLMNOPQRST"
                                        maxLength={30}
                                        disabled={!isTechnical}
                                    />
                                    <CopyButton text={env.mapiToken || ""} fieldId={`${env.id}-mapiToken`} />
                                </div>
                            </div>
                            <div className="pt-2">
                                <label className={labelClasses}><Globe className="w-3 h-3" /> URL del Entorno</label>
                                <div className="relative group/url">
                                    <input 
                                        className={cn(inputClasses, "pr-12")}
                                        value={isTechnical ? env.url : '••••••••'}
                                        onChange={e => handleUpdateField(env.id, 'url', e.target.value)}
                                        placeholder="https://..."
                                        disabled={!isTechnical}
                                    />
                                    <button 
                                        onClick={() => handleOpenUrl(env.url || "")}
                                        disabled={!env.url || !isTechnical}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-primary/20 text-primary rounded-lg transition-all opacity-40 group-hover/url:opacity-100 disabled:opacity-0"
                                        title="Abrir URL"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* ADD BUTTON AS CARD */}
                {isTechnical && (
                    <button 
                        onClick={handleAddEnvironment}
                        className={cn(
                            "p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-4 group transition-all h-[340px]",
                            isLight 
                                ? "bg-zinc-50/50 border-zinc-200 hover:bg-white hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5" 
                                : "bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-primary/50"
                        )}
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                            <Plus className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <p className={cn("font-bold text-lg", isLight ? "text-zinc-900" : "text-foreground")}>Añadir más Entornos</p>
                            <p className="text-sm text-muted-foreground">Homologación, Staging, QA...</p>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
