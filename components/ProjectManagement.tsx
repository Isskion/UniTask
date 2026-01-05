"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Shield, FolderGit2, Plus, Edit2, Save, XCircle, Search, Trash2, Building, Mail, Phone, MapPin, Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types";

export default function ProjectManagement() {
    const { userRole, user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    // Edit/Create Modal State
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
    const [isNew, setIsNew] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "projects"), orderBy("code"));
            const snapshot = await getDocs(q);
            const loaded: Project[] = [];
            snapshot.forEach(doc => {
                loaded.push({ id: doc.id, ...doc.data() } as Project);
            });
            setProjects(loaded);
        } catch (error) {
            console.error("Error loading projects:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (project: Project) => {
        setEditingProject({ ...project });
        setIsNew(false);
    };

    const handleCreate = () => {
        setEditingProject({
            isActive: true,
            code: "",
            name: "",
            email: "",
            phone: "",
            address: ""
        });
        setIsNew(true);
    };

    const saveProject = async () => {
        if (!editingProject || !editingProject.name || !editingProject.code) {
            alert("Código y Nombre son obligatorios");
            return;
        }

        // Simple duplicate code check
        if (isNew && projects.some(p => p.code === editingProject.code)) {
            alert("Ya existe un proyecto con ese código.");
            return;
        }

        setUpdating("saving");
        try {
            if (isNew) {
                await addDoc(collection(db, "projects"), {
                    ...editingProject,
                    createdAt: serverTimestamp()
                });
            } else if (editingProject.id) {
                const { id, ...data } = editingProject;
                await updateDoc(doc(db, "projects", id!), data);
            }
            await loadProjects();
            setEditingProject(null);
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Error al guardar proyecto.");
        } finally {
            setUpdating(null);
        }
    };

    const toggleActive = async (project: Project) => {
        setUpdating(project.id);
        try {
            await updateDoc(doc(db, "projects", project.id), { isActive: !project.isActive });
            setProjects(prev => prev.map(p => p.id === project.id ? { ...p, isActive: !p.isActive } : p));
        } catch (error) {
            console.error("Error changing status:", error);
        } finally {
            setUpdating(null);
        }
    };

    if (userRole !== 'app_admin' && userRole !== 'global_pm') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Shield className="w-12 h-12 mb-4 text-orange-500 opacity-50" />
                <h2 className="text-xl font-bold text-white mb-2">Acceso Restringido</h2>
                <p>Solo Admins y Global PM pueden gestionar proyectos.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-4 max-w-5xl mx-auto w-full h-full relative">

            {/* Modal */}
            {editingProject && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-[#121212] border border-white/10 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FolderGit2 className="w-4 h-4 text-orange-500" />
                                {isNew ? "Nuevo Proyecto" : "Editar Proyecto"}
                            </h3>
                            <button onClick={() => setEditingProject(null)} className="text-zinc-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1 col-span-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Código</label>
                                    <input
                                        autoFocus
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500 font-mono"
                                        value={editingProject.code || ""}
                                        onChange={e => setEditingProject({ ...editingProject, code: e.target.value.toUpperCase() })}
                                        placeholder="ABC-001"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500">Empresa / Nombre</label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500 font-bold"
                                        value={editingProject.name || ""}
                                        onChange={e => setEditingProject({ ...editingProject, name: e.target.value })}
                                        placeholder="Nombre del Proyecto"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Email Contacto
                                </label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500"
                                    value={editingProject.email || ""}
                                    onChange={e => setEditingProject({ ...editingProject, email: e.target.value })}
                                    placeholder="contacto@empresa.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Teléfono
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500"
                                        value={editingProject.phone || ""}
                                        onChange={e => setEditingProject({ ...editingProject, phone: e.target.value })}
                                        placeholder="+34..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        Estado Inicial
                                    </label>
                                    <div className="flex items-center gap-2 h-9">
                                        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingProject.isActive}
                                                onChange={e => setEditingProject({ ...editingProject, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 checked:bg-orange-500"
                                            />
                                            Activo
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Dirección
                                </label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-orange-500"
                                    value={editingProject.address || ""}
                                    onChange={e => setEditingProject({ ...editingProject, address: e.target.value })}
                                    placeholder="Dirección fiscal..."
                                />
                            </div>

                            <div className="space-y-1 col-span-2">
                                <label className="text-[10px] uppercase font-bold text-zinc-500">Color Identificativo</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
                                        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
                                        "#f43f5e", "#71717a"
                                    ].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setEditingProject({ ...editingProject, color: c })}
                                            className={cn(
                                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110",
                                                editingProject.color === c ? "border-white scale-110 shadow-[0_0_10px_currentColor]" : "border-transparent opacity-50 hover:opacity-100"
                                            )}
                                            style={{ backgroundColor: c, color: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingProject(null)}
                                className="px-4 py-2 rounded uppercase text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveProject}
                                disabled={updating === "saving"}
                                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded shadow-lg shadow-orange-900/20 text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                            >
                                {updating === "saving" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-lg">
                        <FolderGit2 className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Gestión de Proyectos</h2>
                        <p className="text-sm text-zinc-400">Administra los proyectos globales disponibles.</p>
                    </div>
                </div>
                <button
                    onClick={handleCreate}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Proyecto
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl border border-white/5 p-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(p => (
                            <div key={p.id} className={cn("group p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden transition-all hover:border-orange-500/30", p.isActive ? "bg-white/5 border-white/10" : "bg-black/40 border-white/5 opacity-60")}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-mono text-xs font-bold text-orange-500 mb-1">{p.code}</div>
                                        <div className="font-bold text-lg text-white leading-tight">{p.name}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(p)}
                                            className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mt-2">
                                    {p.email && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <Mail className="w-3 h-3" /> {p.email}
                                        </div>
                                    )}
                                    {p.phone && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <Phone className="w-3 h-3" /> {p.phone}
                                        </div>
                                    )}
                                    {p.address && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-400 truncate" title={p.address}>
                                            <MapPin className="w-3 h-3 shrink-0" /> {p.address}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center">
                                    <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded", p.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500")}>
                                        {p.isActive ? "Activo" : "Inactivo"}
                                    </span>

                                    <button
                                        onClick={() => toggleActive(p)}
                                        disabled={updating === p.id}
                                        className={cn("text-[10px] font-bold uppercase transition-colors flex items-center gap-1", p.isActive ? "text-zinc-500 hover:text-red-400" : "text-green-500 hover:text-green-400")}
                                    >
                                        {updating === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (p.isActive ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                                        {p.isActive ? "Desactivar" : "Activar"}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>No hay proyectos creados.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
