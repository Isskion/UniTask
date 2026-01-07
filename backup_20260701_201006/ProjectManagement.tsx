"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Shield, FolderGit2, Plus, Edit2, Save, XCircle, Search, Mail, Phone, MapPin, Check, Ban, LayoutTemplate, PenSquare, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project } from "@/types";

// New Components
import ProjectActivityFeed from "./ProjectActivityFeed";
import TodaysWorkbench from "./TodaysWorkbench";

export default function ProjectManagement() {
    const { userRole, user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null); // For assignedProjectIds

    // Selection state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [userTab, setUserTab] = useState<'feed' | 'settings'>('feed');

    // Editing/Creation state
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [isNew, setIsNew] = useState(false);

    const [showCompose, setShowCompose] = useState(false);
    const [saving, setSaving] = useState(false);

    // Permissions Helper
    const canCreate = userRole === 'app_admin' || userRole === 'global_pm';
    const canEdit = userRole === 'app_admin' || userRole === 'global_pm';

    useEffect(() => {
        // Fetch User Profile if we need it for filtering
        if (user && userRole !== 'app_admin' && userRole !== 'global_pm') {
            getDocs(query(collection(db, "user"), where("__name__", "==", user.uid)))
                .then(snap => {
                    if (!snap.empty) {
                        setUserProfile(snap.docs[0].data());
                    }
                });
        }
        loadProjects();
    }, [user, userRole]);

    const loadProjects = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "projects"), orderBy("name"));
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

    // Filtered Projects for List
    const visibleProjects = projects.filter(p => {
        if (canCreate) return true; // Admins see all
        if (!userProfile?.assignedProjectIds) return false;
        return userProfile.assignedProjectIds.includes(p.id);
    });


    // --- HANDLERS ---

    // 1. Open Project Journal (Feed)
    const handleSelectProject = (project: Project) => {
        setSelectedProject(project);
        setUserTab('feed');
        setIsNew(false);
        setFormData({}); // Clear form
    };

    // 2. Open Full Edit Form (Pencil)
    const handleEditClick = (project: Project, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!canEdit) return; // Guard
        setSelectedProject(project);
        setFormData({ ...project }); // Pre-fill form
        setIsNew(false);
        setUserTab('settings');
    };

    // 3. Open Create Form (+)
    const handleCreateClick = () => {
        if (!canCreate) return; // Guard
        const newTemplate: Partial<Project> = {
            name: "",
            code: "",
            color: "#71717a",
            isActive: true,
            email: "",
            phone: ""
        };
        // We set selectedProject to a "Ghost" for the UI to render the Detail View structure
        setSelectedProject({ id: 'new', ...newTemplate } as Project);
        setFormData(newTemplate);
        setIsNew(true);
        setUserTab('settings');
    };

    // 4. Save (Create or Update)
    const handleSave = async () => {
        if (!canCreate && !canEdit) return; // Guard

        if (!formData.name || !formData.code) return alert("Nombre y Código son obligatorios");
        setSaving(true);
        try {
            if (isNew) {
                // Create
                const docRef = await addDoc(collection(db, "projects"), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
                // Reload and Select
                await loadProjects();
                const createdProject = { id: docRef.id, ...formData } as Project;

                // Update local (showing all for now until reload filters kick in fully, but filtered view uses 'visibleProjects')
                // Ideally we refetch or careful state manips. Let's rely on simple update:
                setProjects(prev => [...prev.filter(p => p.id !== docRef.id), createdProject].sort((a, b) => a.name.localeCompare(b.name)));

                setSelectedProject(createdProject);
                setIsNew(false);
                setUserTab('feed');

            } else {
                // Update
                if (selectedProject?.id) {
                    const { id, ...data } = formData; // Exclude ID from data
                    await updateDoc(doc(db, "projects", selectedProject.id), data as any);

                    // Update Local State
                    setSelectedProject({ ...selectedProject, ...data } as Project);
                    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...data } as Project : p));

                    alert("Guardado");
                }
            }
        } catch (e) {
            console.error("Error saving:", e);
            alert("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    // 5. Cancel / Back
    const handleBack = () => {
        if (isNew) {
            setSelectedProject(null); // Go back to empty state
        } else {
            setUserTab('feed'); // Go back to feed
        }
    };

    // 6. Delete (Optional: Soft Delete / Archive)
    const handleToggleActive = async () => {
        if (!canEdit) return; // Guard
        if (!selectedProject?.id) return;
        const newState = !selectedProject.isActive;

        // Optimistic
        setFormData(prev => ({ ...prev, isActive: newState })); // Update form
        setSelectedProject(prev => prev ? { ...prev, isActive: newState } : null); // Update header

        try {
            await updateDoc(doc(db, "projects", selectedProject.id), { isActive: newState });
            setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, isActive: newState } : p));
        } catch (e) {
            console.error(e);
            alert("Error cambiando estado");
        }
    };

    // --- RENDER ---

    const ProjectList = () => (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0c0c0e]">
                <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Proyectos ({visibleProjects.length})</h2>
                {canCreate && (
                    <button
                        onClick={handleCreateClick}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md shadow-lg shadow-indigo-900/20 transition-all"
                        title="Nuevo Proyecto"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {visibleProjects.map(p => (
                    <div
                        key={p.id}
                        onClick={() => handleSelectProject(p)}
                        className={cn(
                            "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                            selectedProject?.id === p.id
                                ? "bg-indigo-500/10 border-indigo-500/50"
                                : "bg-[#121212] border-transparent hover:bg-white/5 hover:border-white/5"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#555' }} />
                            <div>
                                <div className={cn("text-sm font-bold", selectedProject?.id === p.id ? "text-white" : "text-zinc-300 group-hover:text-white")}>
                                    {p.name}
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono">{p.code}</div>
                            </div>
                        </div>
                        {/* Edit Button: Goes to Settings Tab */}
                        {canEdit && (
                            <button
                                onClick={(e) => handleEditClick(p, e)}
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"
                                title="Editar Detalles"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex h-full bg-[#09090b]">

            {/* Left Sidebar */}
            <div className={cn(
                "w-80 border-r border-white/5 bg-[#09090b] flex-shrink-0",
                selectedProject ? "hidden lg:block" : "w-full lg:w-80"
            )}>
                <ProjectList />
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-[#0c0c0e]",
                !selectedProject ? "hidden lg:flex" : "flex"
            )}>
                {!selectedProject ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600">
                        <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                        <p>Selecciona un proyecto para ver su actividad.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full relative">

                        {/* Main Header */}
                        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#0c0c0e] shrink-0">
                            <div className="flex items-center gap-3">
                                <button className="lg:hidden text-zinc-400" onClick={() => setSelectedProject(null)}>
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                {isNew ? (
                                    <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                        <Plus className="w-5 h-5 text-indigo-500" />
                                        Creando Nuevo Proyecto
                                    </h1>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-lg font-bold text-white tracking-tight">{selectedProject.name}</h1>
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-mono uppercase", selectedProject.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500")}>
                                            {selectedProject.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-2">
                                {userTab === 'feed' && !isNew && (
                                    <button
                                        onClick={() => setShowCompose(!showCompose)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all",
                                            showCompose ? "bg-zinc-800 text-zinc-400" : "bg-indigo-600 text-white hover:bg-indigo-500"
                                        )}
                                    >
                                        {showCompose ? <XCircle className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
                                        {showCompose ? "Cancelar" : "Nuevo Update"}
                                    </button>
                                )}

                                {userTab === 'settings' && (
                                    <button
                                        onClick={handleBack}
                                        className="text-xs text-zinc-500 hover:text-white font-medium px-3"
                                    >
                                        {isNew ? "Cancelar Creación" : "Volver a Bitácora"}
                                    </button>
                                )}
                            </div>
                        </header>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#0c0c0e]">

                            {/* VIEW 1: JOURNAL / FEED */}
                            {userTab === 'feed' && !isNew && (
                                <>
                                    {showCompose && (
                                        <TodaysWorkbench
                                            project={selectedProject}
                                            onUpdatePosted={() => setShowCompose(false)}
                                            onCancel={() => setShowCompose(false)}
                                        />
                                    )}
                                    <h2 className="text-xl font-bold text-white mb-4 px-4">Bitácora</h2>
                                    <ProjectActivityFeed
                                        key={selectedProject.id + (showCompose ? '_fresh' : '')}
                                        projectId={selectedProject.id}
                                    />
                                </>
                            )}

                            {/* VIEW 2: FORM / SETTINGS */}
                            {userTab === 'settings' && (
                                <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">

                                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                <FolderGit2 className="w-5 h-5 text-indigo-500" />
                                                {isNew ? "Definir nuevo proyecto" : "Configuración del Proyecto"}
                                            </h3>
                                            {!isNew && canEdit && (
                                                <button
                                                    onClick={handleToggleActive}
                                                    className={cn("px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase flex items-center gap-2 transition-all", formData.isActive ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20")}
                                                >
                                                    {formData.isActive ? <Check className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                                    {formData.isActive ? "Proyecto Activo" : "Proyecto Inactivo"}
                                                </button>
                                            )}
                                        </div>

                                        {/* Name & Code */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-zinc-500">Código (Corto)</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:border-indigo-500 outline-none uppercase disabled:opacity-50"
                                                    value={formData.code || ""}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    placeholder="ABC"
                                                    maxLength={5}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-zinc-500">Nombre Completo</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 font-bold focus:border-indigo-500 outline-none disabled:opacity-50"
                                                    value={formData.name || ""}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Nombre del Cliente..."
                                                />
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1"><Mail className="w-3 h-3" /> Email Contacto</label>
                                            <input
                                                disabled={!canEdit}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 focus:border-indigo-500 outline-none disabled:opacity-50"
                                                value={formData.email || ""}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="cliente@empresa.com"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-zinc-200 focus:border-indigo-500 outline-none disabled:opacity-50"
                                                    value={formData.phone || ""}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="+34..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-zinc-500">Color Identificativo</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#71717a", "#a855f7", "#ec4899"].map(c => (
                                                        <button
                                                            key={c}
                                                            disabled={!canEdit}
                                                            onClick={() => setFormData({ ...formData, color: c })}
                                                            style={{ backgroundColor: c }}
                                                            className={cn("w-6 h-6 rounded-full border-2 transition-transform disabled:opacity-30 disabled:cursor-not-allowed", formData.color === c ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100 hover:scale-110")}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-white/5 flex items-center justify-end gap-3">
                                            <button
                                                onClick={handleBack}
                                                className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium"
                                            >
                                                Cancelar
                                            </button>
                                            {canEdit && (
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-900/40 flex items-center gap-2 transform active:scale-95 transition-all"
                                                >
                                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    {isNew ? "Crear Proyecto" : "Guardar Cambios"}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Additional Info Box */}
                                    <div className="text-center">
                                        <p className="text-xs text-zinc-600">
                                            ID del Sistema: <span className="font-mono text-zinc-500">{selectedProject.id}</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
