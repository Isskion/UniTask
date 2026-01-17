"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, where, updateDoc } from "firebase/firestore";
import { getActiveProjects, createProject } from "@/lib/projects";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTheme } from "@/hooks/useTheme";
import { Loader2, FolderGit2, Plus, Edit2, Save, XCircle, Search, Mail, Phone, Check, Ban, LayoutTemplate, PenSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Project, Tenant, getRoleLevel, RoleLevel } from "@/types";
import { useToast } from "@/context/ToastContext";

// New Components
import ProjectActivityFeed from "./ProjectActivityFeed";
import TodaysWorkbench from "./TodaysWorkbench";

export default function ProjectManagement({ autoFocusCreate = false }: { autoFocusCreate?: boolean }) {
    const { userRole, user, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const { showToast } = useToast();
    const { can } = usePermissions();
    const [projects, setProjects] = useState<Project[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
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
    const [searchQuery, setSearchQuery] = useState(""); // Search State

    // Permissions Helper - now using usePermissions hook
    const canCreate = can('create', 'project');
    const canEdit = can('edit', 'project');

    // Auto-trigger creation if requested
    useEffect(() => {
        if (autoFocusCreate && canCreate && !isNew) {
            handleCreateClick();
        }
    }, [autoFocusCreate, canCreate]);

    useEffect(() => {
        // Fetch User Profile if we need it for filtering (Assume Admin/PM doesn't need assignment filtering)
        const roleLevel = getRoleLevel(userRole);

        if (user && roleLevel < RoleLevel.PM) {
            getDocs(query(collection(db, "users"), where("__name__", "==", user.uid)))
                .then(snap => {
                    if (!snap.empty) {
                        setUserProfile(snap.docs[0].data());
                    }
                });
        }
        if (userRole === 'superadmin') {
            loadTenants();
        }
        loadProjects();
    }, [user, userRole]);

    const loadTenants = async () => {
        try {
            const snap = await getDocs(query(collection(db, "tenants"), orderBy("name")));
            setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tenant)));
        } catch (e) {
            console.error("Error loading tenants", e);
        }
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            // Use centralized loader (handles ALL for superadmin)
            const targetTenant = (userRole === 'superadmin') ? "ALL" : (tenantId || "1");
            const projs = await getActiveProjects(targetTenant);
            setProjects(projs);
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
        setSearchQuery(""); // Clear search on project switch
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
        // if (!canCreate) return; // Guard logic should be handled by caller or UI hiding
        // Allow calling it, but UI won't show save if unauthorized? 
        // Better to allow it to initialize state so valid users can see it.

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

        if (!formData.name || !formData.code) return showToast("UniTaskController", "Nombre y Código son obligatorios", "error");
        setSaving(true);
        try {
            if (isNew) {
                // Create using centralized function with proper tenant assignment
                const docId = await createProject({
                    ...formData,
                    tenantId: formData.tenantId || tenantId || "1", // Use selected tenant if available (SuperAdmin)
                    isActive: true, // Legacy
                    status: "active", // New Standard
                    health: "healthy", // Required
                    name: formData.name!,
                    code: formData.code!,
                    color: formData.color || '#71717a',
                    clientName: formData.clientName || "",
                    teamIds: formData.teamIds || [],
                    email: formData.email || "",
                    phone: formData.phone || "",
                    address: formData.address || ""
                });

                // Reload
                await loadProjects();

                // Optimistic Update
                const createdProject = { id: docId, ...formData, tenantId: tenantId || "1" } as Project;
                setProjects(prev => [...prev.filter(p => p.id !== docId), createdProject].sort((a, b) => a.name.localeCompare(b.name)));
                setSelectedProject(createdProject);
                setIsNew(false);
                setUserTab('feed');

            } else {
                // Update
                if (selectedProject?.id) {
                    const { id, ...data } = formData; // Exclude ID
                    await updateDoc(doc(db, "projects", selectedProject.id), data as any);

                    // Update Local State
                    setSelectedProject({ ...selectedProject, ...data } as Project);
                    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, ...data } as Project : p));

                    showToast("UniTaskController", "Guardado", "success");
                    setUserTab('feed'); // Close form
                }
            }
        } catch (e) {
            console.error("Error saving:", e);
            showToast("UniTaskController", "Error al guardar", "error");
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
            showToast("UniTaskController", "Error cambianto estado", "error");
        }
    };

    // --- RENDER ---

    const ProjectList = () => (
        <div className="h-full flex flex-col">
            <div className={cn("p-4 border-b flex justify-between items-center", isLight ? "bg-zinc-50 border-zinc-200" : "bg-muted/10 border-border")}>
                <h2 className={cn("text-sm font-bold uppercase tracking-wider", isLight ? "text-zinc-900" : "text-foreground")}>Proyectos ({visibleProjects.length})</h2>
                {canCreate && (
                    <button
                        onClick={handleCreateClick}
                        className="p-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-lg shadow-primary/20 transition-all"
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
                                ? (isLight ? "bg-zinc-200 border-zinc-300 shadow-sm" : "bg-primary/10 border-primary/50")
                                : (isLight ? "bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50" : "bg-card/50 border-transparent hover:bg-primary/5 hover:border-primary/10")
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full ring-2 ring-white/10" style={{ backgroundColor: p.color || '#555' }} />
                            <div>
                                <div className={cn("text-sm font-bold",
                                    selectedProject?.id === p.id
                                        ? (isLight ? "text-foreground" : "text-foreground")
                                        : (isLight ? "text-zinc-900" : "text-zinc-200 group-hover:text-foreground")
                                )}>
                                    {p.name}
                                </div>
                                <div className="text-[10px] text-zinc-400 font-mono">{p.code}</div>
                                {userRole === 'superadmin' && p.tenantId && (
                                    <div className="text-[9px] text-indigo-400 font-mono mt-0.5">
                                        🏢 {tenants.find(t => t.id === p.tenantId)?.name || p.tenantId}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Edit Button: Goes to Settings Tab */}
                        {canEdit && (
                            <button
                                onClick={(e) => handleEditClick(p, e)}
                                className={cn("opacity-0 group-hover:opacity-100 p-2 rounded-full transition-all", isLight ? "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900" : "hover:bg-white/10 text-zinc-300 hover:text-foreground")}
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
        <div className="flex h-full bg-background">

            {/* Left Sidebar */}
            <div className={cn(
                "w-80 border-r border-border bg-card/30 flex-shrink-0",
                selectedProject ? "hidden lg:block" : "w-full lg:w-80"
            )}>
                <ProjectList />
            </div>

            {/* Main Content */}
            <div className={cn(
                "flex-1 flex flex-col min-w-0 bg-background",
                !selectedProject ? "hidden lg:flex" : "flex"
            )}>
                {!selectedProject ? (
                    <div className={cn("flex-1 flex flex-col items-center justify-center", isLight ? "text-zinc-400" : "text-foreground")}>
                        <LayoutTemplate className="w-16 h-16 mb-4 opacity-80" />
                        <p className={cn("font-medium text-lg", isLight ? "text-zinc-500" : "text-foreground")}>Selecciona un proyecto para ver su actividad.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col h-full relative">

                        {/* Main Header */}
                        <header className={cn("h-14 border-b flex items-center justify-between px-6 shrink-0 transition-colors",
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-card/50 border-border"
                        )}>
                            <div className="flex items-center gap-3">
                                <button className={cn("lg:hidden hover:text-foreground", isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400")} onClick={() => setSelectedProject(null)}>
                                    <ArrowLeft className="w-5 h-5" />
                                </button>

                                {isNew ? (
                                    <h1 className={cn("text-lg font-bold tracking-tight flex items-center gap-2", isLight ? "text-zinc-900" : "text-foreground")}>
                                        <Plus className="w-5 h-5 text-primary" />
                                        Creando Nuevo Proyecto
                                    </h1>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <h1 className={cn("text-lg font-bold tracking-tight", isLight ? "text-zinc-900" : "text-foreground")}>{selectedProject.name}</h1>
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-mono uppercase", selectedProject.isActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500")}>
                                            {selectedProject.isActive ? "Activo" : "Inactivo"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Header Actions */}
                            <div className="flex items-center gap-2">
                                {/* SEARCH BAR */}
                                {userTab === 'feed' && !isNew && (
                                    <div className={cn("relative flex items-center transition-all duration-300 group mr-2",
                                        searchQuery ? "w-64" : "w-10 focus-within:w-64"
                                    )}>
                                        <Search className={cn("w-4 h-4 absolute left-3 z-10 transition-colors cursor-pointer",
                                            isLight ? "text-zinc-400 group-focus-within:text-zinc-600" : "text-zinc-400 group-focus-within:text-zinc-300"
                                        )} />
                                        <input
                                            type="text"
                                            placeholder="Buscar en bitácora..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className={cn("w-full pl-9 pr-4 py-1.5 text-xs rounded-full border bg-transparent transition-all outline-none",
                                                searchQuery ? "opacity-100" : "opacity-0 focus:opacity-100 group-focus-within:opacity-100 cursor-pointer focus:cursor-text",
                                                isLight
                                                    ? "border-zinc-200 focus:border-zinc-400 focus:bg-white placeholder:text-zinc-400 text-zinc-900"
                                                    : "border-white/10 focus:border-white/20 focus:bg-white/5 placeholder:text-zinc-600 text-zinc-200"
                                            )}
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery("")} className="absolute right-3 text-zinc-400 hover:text-zinc-600">
                                                <XCircle className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {userTab === 'feed' && !isNew && (
                                    <button
                                        onClick={() => setShowCompose(!showCompose)}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all",
                                            showCompose ? "bg-zinc-800 text-zinc-400" : "bg-primary text-primary-foreground hover:bg-primary/90"
                                        )}
                                    >
                                        {showCompose ? <XCircle className="w-4 h-4" /> : <PenSquare className="w-4 h-4" />}
                                        {showCompose ? "Cancelar" : "Nuevo Update"}
                                    </button>
                                )}

                                {userTab === 'settings' && (
                                    <button
                                        onClick={handleBack}
                                        className={cn("text-xs font-medium px-3", isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-foreground")}
                                    >
                                        {isNew ? "Cancelar Creación" : "Volver a Bitácora"}
                                    </button>
                                )}
                            </div>
                        </header>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-background">

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
                                    <h2 className={cn("text-xl font-bold mb-4 px-4 pt-4", isLight ? "text-zinc-900" : "text-foreground")}>Bitácora</h2>
                                    <ProjectActivityFeed
                                        key={selectedProject.id + (showCompose ? '_fresh' : '')}
                                        projectId={selectedProject.id}
                                        searchQuery={searchQuery}
                                    />
                                </>
                            )}

                            {/* VIEW 2: FORM / SETTINGS */}
                            {userTab === 'settings' && (
                                <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
                                    <div className={cn("border rounded-2xl p-6 space-y-6", isLight ? "bg-white border-zinc-200" : "bg-white/5 border-white/10")}>

                                        <div className={cn("flex items-center justify-between border-b pb-4", isLight ? "border-zinc-100" : "border-white/5")}>
                                            <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-foreground")}>
                                                <FolderGit2 className={cn("w-5 h-5", isLight ? "text-zinc-900" : "text-primary")} />
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

                                        {/* Tenant Selector (SuperAdmin Only) */}
                                        {userRole === 'superadmin' && (
                                            <div className={cn("p-4 rounded-lg border", isLight ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10")}>
                                                <label className={cn("text-[10px] uppercase font-bold mb-2 block", isLight ? "text-zinc-700" : "text-foreground")}>
                                                    Organización (Tenant)
                                                </label>
                                                <select
                                                    value={formData.tenantId || ""}
                                                    onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                                                    className={cn("w-full border rounded-lg px-3 py-2 text-sm focus:border-primary outline-none appearance-none",
                                                        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200"
                                                    )}
                                                >
                                                    <option value="">-- Sin Asignar --</option>
                                                    {tenants.map(t => (
                                                        <option key={t.id} value={t.id}>
                                                            🏢 {t.name} ({t.id})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    ⚠️ Cambiar esto moverá el proyecto a otra organización.
                                                </p>
                                            </div>
                                        )}


                                        {/* Name & Code */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-700" : "text-foreground")}>Código (Corto)</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className={cn("w-full border rounded-lg px-3 py-2 font-mono focus:border-primary outline-none uppercase disabled:opacity-50",
                                                        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200"
                                                    )}
                                                    value={formData.code || ""}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                                    placeholder="ABC"
                                                    maxLength={4}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-700" : "text-foreground")}>Nombre Completo</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className={cn("w-full border rounded-lg px-3 py-2 font-bold focus:border-primary outline-none disabled:opacity-50",
                                                        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200"
                                                    )}
                                                    value={formData.name || ""}
                                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    placeholder="Nombre del Cliente..."
                                                />
                                            </div>
                                        </div>

                                        {/* Contact Info */}
                                        <div className="space-y-2">
                                            <label className={cn("text-[10px] uppercase font-bold flex items-center gap-1", isLight ? "text-zinc-700" : "text-foreground")}><Mail className="w-3 h-3" /> Email Contacto</label>
                                            <input
                                                disabled={!canEdit}
                                                className={cn("w-full border rounded-lg px-3 py-2 focus:border-primary outline-none disabled:opacity-50",
                                                    isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200"
                                                )}
                                                value={formData.email || ""}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="cliente@empresa.com"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className={cn("text-[10px] uppercase font-bold flex items-center gap-1", isLight ? "text-zinc-700" : "text-foreground")}><Phone className="w-3 h-3" /> Teléfono</label>
                                                <input
                                                    disabled={!canEdit}
                                                    className={cn("w-full border rounded-lg px-3 py-2 focus:border-primary outline-none disabled:opacity-50",
                                                        isLight ? "bg-white border-zinc-300 text-zinc-900" : "bg-black/50 border-white/10 text-zinc-200"
                                                    )}
                                                    value={formData.phone || ""}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="+34..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className={cn("text-[10px] uppercase font-bold", isLight ? "text-zinc-700" : "text-foreground")}>Color Identificativo</label>
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

                                        <div className={cn("pt-6 border-t flex items-center justify-end gap-3", isLight ? "border-zinc-100" : "border-white/5")}>
                                            <button
                                                onClick={handleBack}
                                                className={cn("px-4 py-2 text-sm font-medium", isLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-foreground")}
                                            >
                                                Cancelar
                                            </button>
                                            {canEdit && (
                                                <button
                                                    onClick={handleSave}
                                                    disabled={saving}
                                                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/40 flex items-center gap-2 transform active:scale-95 transition-all"
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
