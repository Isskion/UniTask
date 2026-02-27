"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    Search, Plus, ArrowLeft, Code, FileJson, FileText,
    Trash2, ExternalLink, CheckCircle2, MoreVertical,
    Save, X, Loader2, AlertCircle, FileCode, Check,
    LayoutDashboard, Edit2, CloudUpload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, InterfaceEntry, InterfaceVersion } from "@/types";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useFileUploader } from "@/hooks/useFileUploader";
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
    compact?: boolean;
}

export function ProjectInterfaces({ project, tenantId, compact }: ProjectInterfacesProps) {
    if (!project) return null;
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

    // Version Addition States
    const [isAddingVersion, setIsAddingVersion] = useState(false);
    const [versionName, setVersionName] = useState("");
    const [versionNotes, setVersionNotes] = useState("");
    const { uploadFile, uploading, progress } = useFileUploader();

    const [saving, setSaving] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

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

    const handleAddVersion = async (file: File) => {
        if (!selectedInterface || !user) return;

        try {
            const storagePath = `projects/${project.id}/interfaces/${selectedInterface.id}/${Date.now()}_${file.name}`;
            const result = await uploadFile(file, storagePath);

            if (result) {
                const newVersion: InterfaceVersion = {
                    id: crypto.randomUUID(),
                    versionName: versionName || `Version ${selectedInterface.versions.length + 1}`,
                    fileUrl: result.url,
                    fileName: file.name,
                    fileType: file.name.split('.').pop() || 'txt',
                    isProduction: false,
                    uploadedBy: user.uid,
                    uploadedAt: new Date().toISOString(),
                    notes: versionNotes
                };

                const updatedVersions = [newVersion, ...selectedInterface.versions];

                await updateInterfaceVersions(project.id, selectedInterface.id, updatedVersions);

                // Update Local State
                const updatedInterface = { ...selectedInterface, versions: updatedVersions };
                setSelectedInterface(updatedInterface);
                setInterfaces(prev => prev.map(i => i.id === selectedInterface.id ? updatedInterface : i));

                setVersionName("");
                setVersionNotes("");
                setIsAddingVersion(false);
                showToast("Interfaces", "Versión añadida correctamente", "success");
            }
        } catch (error) {
            console.error("Error adding version:", error);
            showToast("Interfaces", "Error al añadir la versión", "error");
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

    const renderModals = () => {
        if (!isClient) return null;

        const modalContent = (
            <>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div
                            className={cn(
                                "w-full flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300",
                                compact ? "max-w-md max-h-[80vh]" : "max-w-xl max-h-[90vh]",
                                isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-white/10"
                            )}
                        >
                            <div className={cn("p-6 border-b flex justify-between items-center transition-colors", compact ? "bg-primary/5 border-primary/10" : "bg-black/5")}>
                                <div className="flex items-center gap-3">
                                    {compact && <NetworkIcon className="w-5 h-5 text-primary" />}
                                    <h3 className="text-lg font-bold">
                                        {isEditing ? `Editar: ${newInterface.name}` : "Nueva Interfaz"}
                                    </h3>
                                </div>
                                <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre de la Interfaz *</label>
                                    <input
                                        type="text"
                                        value={newInterface.name}
                                        onChange={e => setNewInterface({ ...newInterface, name: e.target.value })}
                                        className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none transition-all", isLight ? "bg-zinc-50 focus:bg-white focus:border-primary/50" : "bg-white/5 border-white/10 focus:bg-white/10 focus:border-primary/50")}
                                        placeholder="ej: Syncout Orders v1"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">URL del Endpoint</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={newInterface.url}
                                            onChange={e => setNewInterface({ ...newInterface, url: e.target.value })}
                                            className={cn("w-full border rounded-xl pl-4 pr-10 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                            placeholder="https://api.servicios.com/v1"
                                        />
                                        <CloudUpload className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-20" />
                                    </div>
                                </div>

                                {compact ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Credenciales (ID / Secret)</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newInterface.clientId}
                                                    onChange={e => setNewInterface({ ...newInterface, clientId: e.target.value })}
                                                    className={cn("flex-1 border rounded-xl px-4 py-2 text-[10px] outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                                    placeholder="Client ID"
                                                />
                                                <input
                                                    type="password"
                                                    value={newInterface.clientSecret}
                                                    onChange={e => setNewInterface({ ...newInterface, clientSecret: e.target.value })}
                                                    className={cn("flex-1 border rounded-xl px-4 py-2 text-[10px] outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                                    placeholder="Secret Key"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
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
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Secret Key</label>
                                            <input
                                                type="password"
                                                value={newInterface.clientSecret}
                                                onChange={e => setNewInterface({ ...newInterface, clientSecret: e.target.value })}
                                                className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-muted-foreground">Descripción de la Integración</label>
                                    <textarea
                                        value={newInterface.description}
                                        onChange={e => setNewInterface({ ...newInterface, description: e.target.value })}
                                        className={cn("w-full border rounded-xl px-4 py-2 text-sm outline-none min-h-[80px] resize-none", isLight ? "bg-zinc-50" : "bg-white/5 border-white/10")}
                                        placeholder="Explica qué hace esta interfaz..."
                                    />
                                </div>
                            </div>
                            <div className={cn("p-6 border-t flex gap-3 transition-colors", compact ? "bg-primary/5" : "bg-black/5")}>
                                <button
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="flex-1 px-4 py-2 rounded-xl text-sm font-bold opacity-60 hover:opacity-100 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={saving || !newInterface.name}
                                    className="flex-[2] px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                                    {isEditing ? "Actualizar" : "Crear Interfaz"}
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

                {isAddingVersion && selectedInterface && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className={cn("w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4", isLight ? "bg-white" : "bg-zinc-900 border-zinc-800")}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold">Nueva Versión: {selectedInterface.name}</h3>
                                <button onClick={() => setIsAddingVersion(false)} className="text-zinc-500 hover:text-red-500 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Nombre de Versión</label>
                                    <input
                                        type="text"
                                        value={versionName}
                                        onChange={(e) => setVersionName(e.target.value)}
                                        placeholder="ej. v1.2, Release Candidate..."
                                        className={cn("w-full border rounded-xl px-4 py-2.5 text-sm outline-none", isLight ? "bg-zinc-50" : "bg-black border-zinc-800")}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Notas (Opcional)</label>
                                    <textarea
                                        value={versionNotes}
                                        onChange={(e) => setVersionNotes(e.target.value)}
                                        placeholder="¿Qué incluye esta versión?"
                                        className={cn("w-full border rounded-xl px-4 py-2.5 text-sm outline-none min-h-[80px]", isLight ? "bg-zinc-50" : "bg-black border-zinc-800")}
                                    />
                                </div>

                                <div className="pt-2">
                                    <input
                                        type="file"
                                        id="version-file-upload"
                                        className="hidden"
                                        onChange={(e) => e.target.files?.[0] && handleAddVersion(e.target.files[0])}
                                    />
                                    <label
                                        htmlFor="version-file-upload"
                                        className={cn(
                                            "w-full flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                            isLight ? "bg-zinc-50 border-zinc-200 hover:border-primary/50" : "bg-black/50 border-zinc-800 hover:border-primary/50",
                                            uploading ? "opacity-50 pointer-events-none" : ""
                                        )}
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Subiendo {Math.round(progress)}%...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CloudUpload className="w-8 h-8 mb-2 text-zinc-500" />
                                                <span className="text-sm font-medium">Click para seleccionar archivo</span>
                                                <span className="text-[10px] opacity-60 mt-1 uppercase tracking-tighter">JSON, XML, PDF, TXT...</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => setIsAddingVersion(false)}
                                    className={cn("flex-1 py-3 rounded-xl font-bold text-sm transition-colors", isLight ? "bg-zinc-100 text-zinc-600 hover:bg-zinc-200" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );

        return createPortal(modalContent, document.body);
    };

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
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Adjuntos / Versiones
                                </h3>
                                <button
                                    onClick={() => setIsAddingVersion(true)}
                                    className="p-1 px-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-all text-[10px] font-bold"
                                >
                                    <Plus className="w-3 h-3 inline mr-1" />
                                    Añadir
                                </button>
                            </div>
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
                {renderModals()}
            </div>
        );
    }
    if (compact) {
        return (
            <div className="flex flex-col h-full bg-background p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <NetworkIcon className="w-4 h-4 text-primary" />
                        Interfaces del Proyecto
                    </h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowReport(true)}
                            className={cn(
                                "p-1.5 rounded-lg border transition-all flex items-center gap-2 px-3 text-[10px] font-bold hover:bg-black/5",
                                isLight ? "border-zinc-200 text-zinc-600" : "border-white/10 text-zinc-400"
                            )}
                            title="Imprimir Informe de Interfaces"
                        >
                            <Printer className="w-3.5 h-3.5" /> {t('follow_up.print') || 'Imprimir'}
                        </button>
                        <button
                            onClick={() => {
                                resetForm();
                                setShowCreateModal(true);
                            }}
                            className="p-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all flex items-center gap-2 px-3 font-bold text-[10px]"
                        >
                            <Plus className="w-3.5 h-3.5" /> Nueva
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center opacity-40">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                ) : filteredInterfaces.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl opacity-30 py-8">
                        <FileJson className="w-8 h-8 mb-2" />
                        <p className="text-xs">No hay interfaces</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 overflow-y-auto custom-scrollbar pr-1">
                        {filteredInterfaces.map(i => (
                            <button
                                key={i.id}
                                onClick={() => handleEdit(i)}
                                className={cn(
                                    "group flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 text-center relative overflow-hidden",
                                    isLight
                                        ? "bg-white border-zinc-200 hover:border-primary/50 hover:shadow-md"
                                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/30"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-colors",
                                    isLight ? "bg-zinc-100 text-zinc-500 group-hover:bg-primary/10 group-hover:text-primary" : "bg-white/5 text-zinc-400 group-hover:text-primary"
                                )}>
                                    <FileCode className="w-4 h-4" />
                                </div>
                                <span className="text-[10px] font-bold truncate w-full px-1">{i.name}</span>
                                {i.versions.some(v => v.isProduction) && (
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" title="Producción activa" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
                {renderModals()}
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
            {renderModals()}
        </div>
    );
}

function Printer({ className }: { className?: string }) {
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
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
        </svg>
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
    );
}
