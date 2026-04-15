"use client";

import { useState, useEffect } from "react";
import { Plus, FileJson, FileCode, FileText, CheckCircle2, History, Trash2, CloudUpload, Loader2, ExternalLink, Edit2, X } from "lucide-react";
import { InterfaceEntry, InterfaceVersion, Project } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { useToast } from "@/context/ToastContext";
import { usePermissions } from "@/hooks/usePermissions";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { AttachmentManager } from "@/components/AttachmentManager";
import { useFileUploader } from "@/hooks/useFileUploader";

interface InterfaceManagerProps {
    projectId: string;
    projectName: string;
}

export default function InterfaceManager({ projectId, projectName }: InterfaceManagerProps) {
    const { user, tenantId } = useAuth();
    const { can } = usePermissions();
    const { addDoc, updateDoc, deleteDoc } = useSafeFirestore();
    const { showToast } = useToast();
    const { uploadFile, uploading, progress } = useFileUploader();

    const isTechnical = can('viewTechnicalInfo', 'special');

    const [interfaces, setInterfaces] = useState<InterfaceEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingInterface, setEditingInterface] = useState<InterfaceEntry | null>(null);

    // Form States
    const [newName, setNewName] = useState("");
    const [description, setDescription] = useState("");
    const [url, setUrl] = useState("");
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [formatContent, setFormatContent] = useState("");
    const [formatType, setFormatType] = useState<"json" | "xml" | "txt">("json");

    const [selectedInterface, setSelectedInterface] = useState<InterfaceEntry | null>(null);
    const [isAddingVersion, setIsAddingVersion] = useState(false);
    const [versionName, setVersionName] = useState("");
    const [versionNotes, setVersionNotes] = useState("");

    // Reset Form
    const resetForm = () => {
        setNewName("");
        setDescription("");
        setUrl("");
        setClientId("");
        setClientSecret("");
        setFormatContent("");
        setFormatType("json");
        setIsCreating(false);
        setEditingInterface(null);
    };

    // --- FETCH INTERFACES ---
    useEffect(() => {
        if (!projectId || !tenantId) return;

        console.log(`[InterfaceManager] Subscribing to interfaces for project: ${projectId}`);
        const q = query(
            collection(db, "project_interfaces"),
            where("projectId", "==", projectId),
            where("tenantId", "==", tenantId),
            where("isActive", "==", true),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as InterfaceEntry));
            setInterfaces(list);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching interfaces:", error);
            showToast("Error", "No se pudieron cargar las interfaces", "error");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [projectId, tenantId]);

    // --- CREATE/UPDATE INTERFACE ---
    const handleSaveInterface = async () => {
        if (!newName.trim() || !user) return;

        try {
            const interfaceData = {
                name: newName,
                description: description,
                url: url,
                clientId: clientId,
                clientSecret: clientSecret,
                formatContent: formatContent,
                formatType: formatType,
                updatedAt: serverTimestamp()
            };

            if (editingInterface) {
                await updateDoc(doc(db, "project_interfaces", editingInterface.id), interfaceData);
                showToast("Éxito", "Interfaz actualizada correctamente", "success");
            } else {
                await addDoc(collection(db, "project_interfaces"), {
                    ...interfaceData,
                    projectId,
                    tenantId: tenantId || "1",
                    versions: [],
                    isActive: true,
                    createdAt: serverTimestamp()
                });
                showToast("Éxito", "Interfaz creada correctamente", "success");
            }
            resetForm();
        } catch (error) {
            console.error("Error saving interface:", error);
            showToast("Error", "No se pudo guardar la interfaz", "error");
        }
    };

    const handleEditInterface = (intf: InterfaceEntry) => {
        setEditingInterface(intf);
        setNewName(intf.name || "");
        setDescription(intf.description || "");
        setUrl(intf.url || "");
        setClientId(intf.clientId || "");
        setClientSecret(intf.clientSecret || "");
        setFormatContent(intf.formatContent || "");
        setFormatType((intf.formatType as any) || "json");
        setIsCreating(true);
    };

    // --- DELETE INTERFACE ---
    const handleDeleteInterface = async (id: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar esta interfaz y todas sus versiones?")) return;

        try {
            await updateDoc(doc(db, "project_interfaces", id), {
                isActive: false,
                updatedAt: serverTimestamp()
            });
            showToast("Éxito", "Interfaz eliminada", "success");
        } catch (error) {
            console.error("Error deleting interface:", error);
            showToast("Error", "No se pudo eliminar la interfaz", "error");
        }
    };

    // --- ADD VERSION ---
    const handleAddVersion = async (file: File) => {
        if (!selectedInterface || !user) return;

        try {
            const storagePath = `projects/${projectId}/interfaces/${selectedInterface.id}/${Date.now()}_${file.name}`;
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

                await updateDoc(doc(db, "project_interfaces", selectedInterface.id), {
                    versions: updatedVersions,
                    updatedAt: serverTimestamp()
                });

                setVersionName("");
                setVersionNotes("");
                setIsAddingVersion(false);
                showToast("Éxito", "Versión añadida correctamente", "success");
            }
        } catch (error) {
            console.error("Error adding version:", error);
            showToast("Error", "No se pudo añadir la versión", "error");
        }
    };

    // --- MARK PRODUCTION ---
    const handleMarkProduction = async (interfaceId: string, versionId: string) => {
        const intf = interfaces.find(i => i.id === interfaceId);
        if (!intf) return;

        try {
            const updatedVersions = intf.versions.map(v => ({
                ...v,
                isProduction: v.id === versionId
            }));

            await updateDoc(doc(db, "project_interfaces", interfaceId), {
                versions: updatedVersions,
                updatedAt: serverTimestamp()
            });
            showToast("Éxito", "Versión de producción actualizada", "success");
        } catch (error) {
            console.error("Error marking production:", error);
            showToast("Error", "No se pudo actualizar la versión de producción", "error");
        }
    };

    // --- UI HELPERS ---
    const getFileIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'json': return <FileJson className="w-5 h-5 text-yellow-500" />;
            case 'xml': return <FileCode className="w-5 h-5 text-blue-500" />;
            default: return <FileText className="w-5 h-5 text-zinc-400" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Add New */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        Interfaces: {projectName}
                    </h2>
                    <p className="text-sm text-zinc-500">Repositorio de versiones y documentación de interfaces del proyecto.</p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setIsCreating(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Interfaz
                </button>
            </div>

            {/* Create/Edit Form Modalish */}
            {isCreating && (
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 shadow-xl animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-2">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
                            {editingInterface ? `Editar Interfaz: ${editingInterface.name}` : "Definir Nueva Interfaz"}
                        </h3>
                        <button onClick={resetForm} className="text-zinc-500 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nombre de la Interfaz</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="ej. SAP Sync, Client XML Feed..."
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Descripción / Notas</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describa brevemente el propósito de esta interfaz..."
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none min-h-[80px] transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">URL / Endpoint (Opcional)</label>
                            <input
                                type="text"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://api.example.com/v1/sync"
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Client ID / Key</label>
                            <input
                                type="text"
                                value={isTechnical ? clientId : '••••••••'}
                                onChange={(e) => isTechnical && setClientId(e.target.value)}
                                disabled={!isTechnical}
                                placeholder="ID de autenticación"
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Client Secret / Pass</label>
                            <input
                                type="password"
                                value={isTechnical ? clientSecret : '••••••••'}
                                onChange={(e) => isTechnical && setClientSecret(e.target.value)}
                                disabled={!isTechnical}
                                placeholder="••••••••••••"
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <div className="flex items-center justify-between ml-1 mb-1">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Especificación Técnica / JSON</label>
                                <select
                                    value={formatType}
                                    onChange={(e) => setFormatType(e.target.value as any)}
                                    className="text-[10px] bg-black border border-zinc-800 text-zinc-300 rounded-md px-2 py-1 outline-none"
                                >
                                    <option value="json">JSON</option>
                                    <option value="xml">XML</option>
                                    <option value="txt">TEXT</option>
                                </select>
                            </div>
                            <textarea
                                value={formatContent}
                                onChange={(e) => setFormatContent(e.target.value)}
                                placeholder='{&#10;  "ejemplo": "datos"&#10;}'
                                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono ring-primary focus:ring-1 outline-none min-h-[150px] resize-y custom-scrollbar"
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                        <button
                            onClick={handleSaveInterface}
                            className="flex-1 py-3 bg-primary text-black rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                        >
                            {editingInterface ? "Guardar Cambios" : "Crear Interfaz"}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-6 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {interfaces.length === 0 && !isCreating && (
                <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-2xl">
                    <CloudUpload className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-zinc-500 font-medium">No hay interfaces registradas</h3>
                    <p className="text-zinc-600 text-sm">Empieza añadiendo la primera interfaz para este proyecto.</p>
                </div>
            )}

            {/* Interface List */}
            <div className="grid gap-4">
                {interfaces.map((intf) => (
                    <div key={intf.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden group/card hover:border-zinc-700 transition-all shadow-lg">
                        <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-zinc-800 rounded-xl text-primary group-hover/card:scale-110 transition-transform">
                                    <FileCode className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-lg">{intf.name}</h3>
                                        {intf.url && <span className="text-[8px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md font-mono uppercase tracking-tighter">API</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{intf.versions?.length || 0} Versiones</p>
                                        {intf.clientId && <p className="text-[10px] text-primary/60 uppercase tracking-widest font-bold">Credentialed</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEditInterface(intf)}
                                    className="p-2.5 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-xl transition-all"
                                    title="Editar Configuración"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setSelectedInterface(intf);
                                        setIsAddingVersion(true);
                                    }}
                                    className="p-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl transition-all"
                                    title="Subir Nueva Versión"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteInterface(intf.id)}
                                    className="p-2.5 bg-zinc-800 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                    title="Eliminar Interfaz"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Summary / Description */}
                        {intf.description && (
                            <div className="px-4 py-2 border-b border-zinc-800/50">
                                <p className="text-xs text-zinc-400 italic line-clamp-1">{intf.description}</p>
                            </div>
                        )}

                        {/* Versions Sub-list */}
                        <div className="p-2 space-y-1">
                            {intf.versions.length === 0 ? (
                                <p className="text-[10px] text-zinc-600 text-center py-4 italic">Sin versiones cargadas</p>
                            ) : (
                                intf.versions.map((version) => (
                                    <div
                                        key={version.id}
                                        className={cn(
                                            "group flex items-center justify-between p-3 rounded-xl border border-transparent transition-all",
                                            version.isProduction ? "bg-emerald-950/20 border-emerald-900/50" : "hover:bg-zinc-800/30"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            {getFileIcon(version.fileType)}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-zinc-200">{version.versionName}</span>
                                                    {version.isProduction && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-500 text-[8px] font-black text-black rounded uppercase">Producción</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-zinc-500">{version.fileName} • {new Date(version.uploadedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={version.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
                                                title="Descargar/Ver"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                            <button
                                                onClick={() => handleMarkProduction(intf.id, version.id)}
                                                className={cn(
                                                    "p-1.5 rounded-lg transition-colors",
                                                    version.isProduction ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400 hover:text-emerald-500"
                                                )}
                                                title={version.isProduction ? "Version de Producción" : "Marcar como Producción"}
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Version Modal (Native Dialog or Simple Overlay) */}
            {isAddingVersion && selectedInterface && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Nueva Versión: {selectedInterface.name}</h3>
                            <button onClick={() => setIsAddingVersion(false)} className="text-zinc-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Nombre de Versión</label>
                                <input
                                    type="text"
                                    value={versionName}
                                    onChange={(e) => setVersionName(e.target.value)}
                                    placeholder="ej. 1.0.1 o Release Final"
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Notas de la Versión</label>
                                <textarea
                                    value={versionNotes}
                                    onChange={(e) => setVersionNotes(e.target.value)}
                                    placeholder="¿Qué ha cambiado?"
                                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm ring-primary focus:ring-1 outline-none min-h-[80px]"
                                />
                            </div>

                            <div className="pt-2">
                                <input
                                    type="file"
                                    id="version-file"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && handleAddVersion(e.target.files[0])}
                                />
                                <label
                                    htmlFor="version-file"
                                    className={cn(
                                        "w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-zinc-500 hover:text-primary",
                                        uploading ? "opacity-50 pointer-events-none" : ""
                                    )}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                            <span className="text-xs">Subiendo {Math.round(progress)}%...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CloudUpload className="w-8 h-8 mb-2" />
                                            <span className="text-sm font-medium">Seleccionar archivo (JSON, XML, TXT)</span>
                                            <span className="text-[10px] opacity-60 mt-1 uppercase tracking-tighter">Click para explorar</span>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => setIsAddingVersion(false)}
                                className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold text-sm hover:bg-zinc-700 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

