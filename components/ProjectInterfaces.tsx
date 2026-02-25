"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Search, Plus, ArrowLeft, Code, FileJson, FileText,
    Trash2, ExternalLink, CheckCircle2, MoreVertical,
    Save, X, Loader2, AlertCircle, FileCode, Check,
    LayoutDashboard, Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, InterfaceEntry, InterfaceVersion } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection, query, where, getDocs, doc, setDoc
} from "firebase/firestore";
import {
    getProjectInterfaces,
    saveInterface,
    deleteInterface,
    updateInterfaceVersions
} from "@/lib/interfaces";
import { InterfaceReport } from "./InterfaceReport";

interface ProjectInterfacesProps {
    project: Project;
    tenantId: string;
}

export function ProjectInterfaces({ project, tenantId }: ProjectInterfacesProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuth();
    const isLight = theme === "light";

    const [interfaces, setInterfaces] = useState<InterfaceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedInterface, setSelectedInterface] = useState<InterfaceEntry | null>(null);

    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newInterface, setNewInterface] = useState<Partial<InterfaceEntry>>({
        name: "",
        description: "",
        url: "",
        clientId: "",
        clientSecret: "",
        formatContent: "",
        formatType: "json",
        projectId: project.id,
        tenantId: tenantId,
        isActive: true,
        versions: []
    });

    const loadInterfaces = useCallback(async () => {
        setLoading(true);
        console.log("[Interfaces] Loading for project:", project.id, "tenantId:", tenantId);
        try {
            const data = await getProjectInterfaces(project.id, tenantId);
            setInterfaces(data);
        } catch (error) {
            console.error("[Interfaces] Error loading interfaces:", error);
            showToast("Interfaces", "Error al cargar interfaces", "error");
        } finally {
            setLoading(false);
        }
    }, [project.id, showToast]);

    useEffect(() => {
        loadInterfaces();
    }, [loadInterfaces]);

    const resetForm = () => {
        setNewInterface({
            name: "",
            description: "",
            url: "",
            clientId: "",
            clientSecret: "",
            formatContent: "",
            formatType: "json",
            projectId: project.id,
            tenantId: tenantId,
            isActive: true,
            versions: []
        });
        setIsEditing(false);
    };

    const handleCreate = async () => {
        if (!newInterface.name) return showToast("Interfaces", "El nombre es obligatorio", "error");
        setSaving(true);
        try {
            const finalData = { ...newInterface, projectId: project.id, tenantId };
            await saveInterface(project.id, finalData);
            showToast("Interfaces", isEditing ? "Interfaz actualizada con éxito" : "Interfaz creada con éxito", "success");
            setShowCreateModal(false);
            resetForm();
            loadInterfaces();
        } catch (error) {
            console.error("Error saving interface:", error);
            showToast("Interfaces", "Error al guardar la interfaz", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (intf: InterfaceEntry, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setNewInterface({ ...intf });
        setIsEditing(true);
        setShowCreateModal(true);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("¿Estás seguro de que quieres eliminar esta interfaz?")) return;
        try {
            await deleteInterface(project.id, id);
            showToast("Interfaces", "Interfaz eliminada", "success");
            loadInterfaces();
        } catch (error) {
            showToast("Interfaces", "Error al eliminar", "error");
        }
    };

    const toggleProduction = async (version: InterfaceVersion) => {
        if (!selectedInterface) return;

        const updatedVersions = selectedInterface.versions.map(v => ({
            ...v,
            isProduction: v.id === version.id ? !v.isProduction : false // Solo una puede ser producción
        }));

        try {
            await updateInterfaceVersions(project.id, selectedInterface.id, updatedVersions);
            setSelectedInterface({ ...selectedInterface, versions: updatedVersions });
            setInterfaces(prev => prev.map(i => i.id === selectedInterface.id ? { ...i, versions: updatedVersions } : i));
            showToast("Interfaces", "Versión de producción actualizada", "success");
        } catch (error) {
            showToast("Interfaces", "Error al actualizar versión", "error");
        }
    };

    const migrateLegacyData = async () => {
        setLoading(true);
        try {
            // Check legacy root collection
            const oldColl = collection(db, "interfaces");
            const q = query(oldColl, where("projectId", "==", project.id));
            const snapshot = await getDocs(q);

            // Check legacy project subcollection
            const subColl = collection(db, "projects", project.id, "interfaces");
            const snapSub = await getDocs(subColl);

            if (snapshot.empty && snapSub.empty) {
                showToast("Interfaces", "No se encontraron interfaces antiguas", "info");
                return;
            }

            let count = 0;
            // Migrate from legacy root
            for (const d of snapshot.docs) {
                const data = d.data();
                const newRef = doc(db, "project_interfaces", d.id);
                await setDoc(newRef, { ...data, projectId: project.id, isActive: true });
                count++;
            }
            // Migrate from project subcollection
            for (const d of snapSub.docs) {
                const data = d.data();
                const newRef = doc(db, "project_interfaces", d.id);
                await setDoc(newRef, { ...data, projectId: project.id, isActive: true });
                count++;
            }

            showToast("Interfaces", `Se recuperaron ${count} interfaces`, "success");
            loadInterfaces();
        } catch (error) {
            console.error("Migration error:", error);
            showToast("Interfaces", "Error al recuperar datos", "error");
        } finally {
            setLoading(false);
        }
    };

    const filteredInterfaces = interfaces.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedInterface) {
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Detail Header */}
                <div className={cn("p-4 border-b flex items-center justify-between", isLight ? "bg-zinc-50 border-zinc-200" : "bg-card/50 border-border")}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedInterface(null)}
                            className={cn("p-2 rounded-full hover:bg-black/5 transition-all", isLight ? "text-zinc-600" : "text-zinc-400")}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold">{selectedInterface.name}</h2>
                            <p className="text-xs text-muted-foreground">{selectedInterface.description}</p>
                            {selectedInterface.url && (
                                <a
                                    href={selectedInterface.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-1"
                                >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    {selectedInterface.url}
                                </a>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => handleEdit(selectedInterface)}
                        className={cn("p-2 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all", isLight ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-primary/20 text-primary hover:bg-primary/30")}
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar Configuración
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Credentials Banner */}
                    {(selectedInterface.clientId || selectedInterface.clientSecret) && (
                        <div className={cn("p-4 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500",
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900/50 border-white/5")}>
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedInterface.clientId && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Client ID</label>
                                        <div className="font-mono text-xs opacity-80 select-all">{selectedInterface.clientId}</div>
                                    </div>
                                )}
                                {selectedInterface.clientSecret && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground">Secret</label>
                                        <div className="font-mono text-xs opacity-80 select-all">••••••••••••••••</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Technical Spec */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className={cn("rounded-xl border overflow-hidden", isLight ? "bg-zinc-100 border-zinc-200" : "bg-zinc-900 border-zinc-800")}>
                                <div className="p-3 border-b flex items-center justify-between bg-black/5">
                                    <div className="flex items-center gap-2">
                                        <Code className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Especificación Técnica</span>
                                    </div>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary uppercase">
                                        {selectedInterface.formatType}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <pre className="text-sm font-mono whitespace-pre-wrap break-all opacity-80 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {selectedInterface.formatContent || "// Sin contenido definido"}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Attachments / Versions */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Adjuntos / Versiones
                            </h3>
                            <div className="space-y-2">
                                {selectedInterface.versions.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center opacity-40">
                                        <AlertCircle className="w-8 h-8 mb-2" />
                                        <p className="text-xs">No hay versiones cargadas</p>
                                    </div>
                                ) : (
                                    selectedInterface.versions.map(v => (
                                        <div
                                            key={v.id}
                                            className={cn(
                                                "p-3 rounded-lg border transition-all flex flex-col gap-2",
                                                v.isProduction
                                                    ? "bg-green-500/5 border-green-500/30"
                                                    : isLight ? "bg-white border-zinc-200" : "bg-card/50 border-white/5"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("p-2 rounded-lg", v.isProduction ? "bg-green-500/20 text-green-500" : "bg-primary/10 text-primary")}>
                                                        <FileCode className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold">{v.versionName}</div>
                                                        <div className="text-[10px] opacity-50">{v.fileName}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => v.fileUrl && window.open(v.fileUrl, '_blank')}
                                                        className="p-1.5 hover:bg-black/5 rounded-md transition-all text-muted-foreground hover:text-foreground"
                                                        title="Ver archivo"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => toggleProduction(v)}
                                                        className={cn(
                                                            "p-1.5 rounded-md transition-all",
                                                            v.isProduction
                                                                ? "text-green-500 bg-green-500/10"
                                                                : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                                                        )}
                                                        title={v.isProduction ? "Producción" : "Marcar como producción"}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            {v.isProduction && (
                                                <div className="text-[9px] font-bold text-green-500 uppercase flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5" /> Oficial - Producción
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Interfaces</h2>
                    <p className="text-sm text-muted-foreground">Gestión de conocimiento técnico y versiones de integración</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar interfaz..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "pl-9 pr-4 py-2 text-sm rounded-lg border bg-transparent focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all",
                                isLight ? "border-zinc-200" : "border-white/10"
                            )}
                        />
                    </div>
                    <button
                        onClick={() => setShowReport(true)}
                        className={cn(
                            "p-2 rounded-lg border transition-all flex items-center gap-2 px-4 text-sm hover:bg-black/5",
                            isLight ? "border-zinc-200 text-zinc-600" : "border-white/10 text-zinc-400"
                        )}
                    >
                        <FileText className="w-4 h-4" /> Informe
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                        className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all flex items-center gap-2 px-4 font-bold text-sm"
                    >
                        <Plus className="w-4 h-4" /> Nueva
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-40">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="text-sm animate-pulse">Cargando interfaces...</p>
                </div>
            ) : filteredInterfaces.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl opacity-40">
                    <FileJson className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">No hay interfaces registradas</p>
                    <p className="text-sm">Comienza añadiendo la primera especificación técnica</p>
                    <button
                        onClick={migrateLegacyData}
                        className="mt-6 text-primary hover:underline flex items-center gap-2 text-xs font-bold"
                    >
                        <Save className="w-3 h-3" /> Recuperar interfaces anteriores
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar pb-10">
                    {filteredInterfaces.map(i => (
                        <div
                            key={i.id}
                            onClick={() => setSelectedInterface(i)}
                            className={cn(
                                "group p-6 rounded-2xl border cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 animate-in fade-in duration-500",
                                isLight
                                    ? "bg-white border-zinc-200 hover:border-primary/30"
                                    : "bg-card/50 border-white/5 hover:bg-white/10 hover:border-primary/30"
                            )}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className={cn("p-3 rounded-xl", isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/5 text-primary")}>
                                    <NetworkIcon className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleEdit(i, e)}
                                        className="p-1.5 text-zinc-500 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(i.id, e)}
                                        className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{i.name}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8">
                                {i.description || "Sin descripción"}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                        {[...new Array(Math.min(3, i.versions.length))].map((_, idx) => (
                                            <div key={idx} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                <FileCode className="w-3 h-3 text-primary" />
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        {i.versions.length} versiones
                                    </span>
                                </div>
                                {i.versions.some(v => v.isProduction) && (
                                    <div className="px-2 py-0.5 rounded bg-green-500/10 text-green-500 text-[9px] font-bold uppercase border border-green-500/20">
                                        PROD
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className={cn(
                            "w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300",
                            isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10"
                        )}
                    >
                        <div className="p-6 border-b flex justify-between items-center bg-black/5">
                            <h3 className="text-lg font-bold">{isEditing ? `Editar: ${newInterface.name}` : "Nueva Interfaz"}</h3>
                            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-1 hover:bg-black/5 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre *</label>
                                <input
                                    type="text"
                                    value={newInterface.name}
                                    onChange={e => setNewInterface({ ...newInterface, name: e.target.value })}
                                    className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                    placeholder="ej: Syncout Orders v1"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">URL de la Interfaz</label>
                                <input
                                    type="text"
                                    value={newInterface.url}
                                    onChange={e => setNewInterface({ ...newInterface, url: e.target.value })}
                                    className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                    placeholder="https://api.servicios.com/v1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Client ID</label>
                                    <input
                                        type="text"
                                        value={newInterface.clientId}
                                        onChange={e => setNewInterface({ ...newInterface, clientId: e.target.value })}
                                        className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                        placeholder="ID de cliente"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Secret</label>
                                    <input
                                        type="password"
                                        value={newInterface.clientSecret}
                                        onChange={e => setNewInterface({ ...newInterface, clientSecret: e.target.value })}
                                        className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Descripción</label>
                                <textarea
                                    value={newInterface.description}
                                    onChange={e => setNewInterface({ ...newInterface, description: e.target.value })}
                                    className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none min-h-[80px]", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                    placeholder="Explica qué hace esta interfaz..."
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo</label>
                                    <select
                                        value={newInterface.formatType}
                                        onChange={e => setNewInterface({ ...newInterface, formatType: e.target.value as any })}
                                        className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none appearance-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                    >
                                        <option value="json">JSON</option>
                                        <option value="xml">XML</option>
                                        <option value="txt">TXT</option>
                                        <option value="other">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-muted-foreground">Contenido (Snippet)</label>
                                <textarea
                                    value={newInterface.formatContent}
                                    onChange={e => setNewInterface({ ...newInterface, formatContent: e.target.value })}
                                    className={cn("w-full border rounded-xl px-4 py-2 text-sm font-mono outline-none min-h-[150px]", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                    placeholder="Pega aquí el contenido JSON/XML..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t bg-black/5 flex justify-end gap-3">
                            <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-6 py-2 text-sm font-bold opacity-60 hover:opacity-100">Cancelar</button>
                            <button
                                onClick={handleCreate}
                                disabled={saving}
                                className="px-8 py-2 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isEditing ? "Guardar Cambios" : "Crear Interfaz"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReport && (
                <InterfaceReport
                    project={project}
                    interfaces={interfaces}
                    onClose={() => setShowReport(false)}
                />
            )}
        </div>
    );
}

function NetworkIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect x="16" y="16" width="6" height="6" rx="1" />
            <rect x="2" y="16" width="6" height="6" rx="1" />
            <rect x="9" y="2" width="6" height="6" rx="1" />
            <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
            <path d="M12 12V8" />
        </svg>
    )
}
