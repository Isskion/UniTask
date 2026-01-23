"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { PermissionGroup } from "@/types";
import { Loader2, Shield, User, Check, X, Ban, Ticket, Copy, RefreshCw, Plus, Edit2, Save, XCircle, MapPin, Briefcase, Building, Globe, Phone, Trash2, AlertTriangle } from "lucide-react";
import { createInvite, getAllInvites, InviteCode } from "@/lib/invites";

import { WeeklyEntry, ProjectEntry, UserProfile as UserData } from "@/types"; // Alias for minimal refactor impact
import { formatDateId, getWeekNumber, getYearNumber, cn } from "@/lib/utils";
import { startOfWeek, addWeeks, subWeeks, isSameDay, parseISO, format, startOfISOWeekYear, getISOWeekYear, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { saveWeeklyEntry, getWeeklyEntry, getAllEntries } from "@/lib/storage";
import { auth } from "@/lib/firebase";
import { parseNotes } from "@/lib/smartParser";
import { useTheme } from "@/hooks/useTheme";

const ROLES = [
    { value: 'app_admin', label: 'Admin App', color: 'text-red-500' },
    { value: 'global_pm', label: 'Global PM', color: 'text-orange-500' },
    { value: 'consultor', label: 'Consultor', color: 'text-blue-500' },
    { value: 'usuario_base', label: 'Equipo', color: 'text-green-500' },
    { value: 'usuario_externo', label: 'Cliente', color: 'text-purple-500' },
];

export default function UserManagement() {
    const { userRole, user } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    const [users, setUsers] = useState<UserData[]>([]);
    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
    const [generatingInvite, setGeneratingInvite] = useState(false);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [formData, setFormData] = useState<Partial<UserData>>({});

    // Projects for assignment
    const [availableProjects, setAvailableProjects] = useState<{ id: string, name: string, code: string }[]>([]);

    // Permission Groups for assignment
    const [availableGroups, setAvailableGroups] = useState<PermissionGroup[]>([]);

    useEffect(() => {
        loadData();
        loadProjectsForSelect();
        loadPermissionGroups();
    }, [activeTab]);

    const loadProjectsForSelect = async () => {
        try {
            const q = query(collection(db, "projects"), orderBy("code"));
            const snap = await getDocs(q);
            setAvailableProjects(snap.docs.map(d => ({
                id: d.id,
                name: d.data().name,
                code: d.data().code
            })));
        } catch (e) {
            console.error("Error loading projects list", e);
        }
    };

    const loadPermissionGroups = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'permission_groups'));
            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as PermissionGroup[];
            setAvailableGroups(groups);
        } catch (error) {
            console.error('Error loading permission groups:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const q = query(collection(db, "user"));
                const snapshot = await getDocs(q);
                const loadedUsers: UserData[] = [];
                snapshot.forEach(doc => {
                    loadedUsers.push({ uid: doc.id, ...doc.data() } as UserData);
                });
                // Sort: Pending first, then by name
                loadedUsers.sort((a, b) => {
                    if (a.isActive === b.isActive) return a.displayName?.localeCompare(b.displayName || "") || 0;
                    return a.isActive ? 1 : -1;
                });
                setUsers(loadedUsers);
            } else {
                const loadedInvites = await getAllInvites();
                // Sort: unused first, then by timestamp descending
                loadedInvites.sort((a, b) => {
                    if (a.isUsed === b.isUsed) return b.createdAt?.seconds - a.createdAt?.seconds;
                    return a.isUsed ? 1 : -1;
                });
                setInvites(loadedInvites);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: string) => {
        if (!confirm(`┬┐Cambiar rol a ${newRole}?`)) return;
        setUpdating(uid);
        try {
            await updateDoc(doc(db, "user", uid), { role: newRole });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole as any } : u));
        } catch (error) {
            alert("Error al actualizar rol. Verifica permisos.");
        }
        setUpdating(null);
    };

    const toggleActive = async (uid: string, currentStatus: boolean) => {
        setUpdating(uid);
        try {
            await updateDoc(doc(db, "user", uid), { isActive: !currentStatus });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive: !currentStatus } : u));
        } catch (error) {
            alert("Error al cambiar estado.");
        }
        setUpdating(null);
    };

    const handleCreateInvite = async () => {
        if (!user) return;
        setGeneratingInvite(true);
        try {
            await createInvite(user.uid);
            await loadData();
        } catch (error) {
            console.error("Error creating invite:", error);
            alert("Error creando invitaci├│n. Revisa permisos.");
        } finally {
            setGeneratingInvite(false);
        }
    };

    const startEditing = (user: UserData) => {
        setEditingUser(user);
        setFormData({
            displayName: user.displayName || "",
            company: user.company || "",
            jobTitle: user.jobTitle || "",
            address: user.address || "",
            phone: user.phone || "",
            language: user.language || "es",
            role: user.role || 'usuario_base', // Fallback to avoid undefined
            assignedProjectIds: user.assignedProjectIds || [],
            permissionGroupId: user.permissionGroupId // Add permission group ID
        });
    };

    const saveUserChanges = async () => {
        if (!editingUser) return;
        setUpdating(editingUser.uid);
        try {
            // Sanitize: Remove undefined values
            const payload = Object.entries(formData).reduce((acc, [key, value]) => {
                if (value !== undefined) acc[key] = value;
                return acc;
            }, {} as any);

            await updateDoc(doc(db, "user", editingUser.uid), payload);
            setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...payload } : u));
            setEditingUser(null); // Close modal
        } catch (error) {
            console.error("Error saving user:", error);
            alert("Error al guardar cambios: " + (error as any).message);
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!editingUser) return;

        // Security Check: Only Super Admin
        if (user?.email?.toLowerCase() !== 'argoss01@gmail.com') {
            alert("Acci├│n no permitida. Solo el Super Admin puede eliminar usuarios.");
            return;
        }

        const confirmMsg = `ÔÜá´©Å PELIGRO: EST├üS A PUNTO DE ELIMINAR A:\n\n${editingUser.displayName} (${editingUser.email})\n\nEsta acci├│n borrar├í su perfil de la base de datos y revocar├í su acceso inmediatamente.\n\n┬┐Est├ís seguro de que quieres continuar?`;

        if (!confirm(confirmMsg)) return;

        // Second safety check
        if (!confirm("CONFIRMACI├ôN FINAL: Esta acci├│n es irreversible.\n┬┐Borrar usuario definitivamente?")) return;

        setUpdating(editingUser.uid);
        try {
            await deleteDoc(doc(db, "user", editingUser.uid));
            setUsers(prev => prev.filter(u => u.uid !== editingUser.uid));
            setEditingUser(null);
            alert("Usuario eliminado correctamente.");
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Error al eliminar usuario. Puede ser un problema de permisos.");
        } finally {
            setUpdating(null);
        }
    };

    const copyInviteLink = (code: string) => {
        // Always use production URL for invites, so they work when sent to users
        const baseUrl = "https://weekly-tracker-seven.vercel.app";
        const url = `${baseUrl}?invite=${code}`;
        navigator.clipboard.writeText(url);
        alert("Enlace copiado al portapapeles: " + url);
    };

    if (userRole !== 'app_admin') {
        const { loginWithGoogle, logout } = useAuth();
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-6 p-8">
                <div className="bg-red-500/10 p-6 rounded-full ring-1 ring-red-500/20">
                    <Shield className="w-16 h-16 text-[#D32F2F]" />
                </div>

                <div className="text-center max-w-md space-y-2">
                    <h2 className="text-2xl font-bold text-white">Acceso Restringido</h2>
                    <p className="text-zinc-400">Esta secci├│n es exclusiva para administradores.</p>
                </div>

                {user ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm flex flex-col items-center gap-4">
                        <div className="text-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block mb-2">Sesi├│n Actual</span>
                            <div className="text-white font-mono text-sm bg-black/40 px-3 py-1 rounded border border-white/5 mb-1">
                                {user.email}
                            </div>
                            <div className="text-[10px] text-zinc-600 font-mono break-all px-4">
                                UID: {user.uid}
                            </div>
                        </div>

                        <div className="w-full h-px bg-white/5" />

                        <div className="text-center space-y-3 w-full">
                            <p className="text-xs text-yellow-500/80 bg-yellow-900/10 p-3 rounded border border-yellow-500/10">
                                ÔÜá´©Å Si deber├¡as ser Admin, usa el bot├│n de <strong>Diagn├│stico</strong> (icono ÔÜí abajo a la derecha) para corregirlo.
                            </p>

                            <button
                                onClick={() => logout()}
                                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded text-sm font-medium transition-colors"
                            >
                                Cerrar Sesi├│n
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 w-full max-w-sm text-center">
                        <p className="text-sm text-zinc-400 mb-6">Debes iniciar sesi├│n para ver si tienes permisos.</p>
                        <button
                            onClick={() => loginWithGoogle()}
                            className="w-full bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-red-900/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                        >
                            <User className="w-5 h-5" />
                            Iniciar Sesi├│n con Google
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-4 max-w-5xl mx-auto w-full h-full relative">
            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={cn(
                        "rounded-xl w-full max-w-lg overflow-hidden shadow-2xl transition-colors",
                        isLight
                            ? "bg-white border border-zinc-200 shadow-zinc-200"
                            : (isRed
                                ? "bg-[#1a0505] border border-[#D32F2F]/30 shadow-[#D32F2F]/20"
                                : "bg-black border border-white/10 shadow-black")
                    )}>
                        <div className={cn("p-4 border-b flex justify-between items-center transition-colors",
                            isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                        )}>
                            <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                <Edit2 className={cn("w-4 h-4", isLight ? "text-red-600" : (isRed ? "text-[#D32F2F]" : "text-white"))} />
                                Editar Perfil
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-white">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                    {editingUser.photoURL ? (
                                        <img src={editingUser.photoURL} alt={editingUser.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-xl text-zinc-400">{editingUser.displayName?.substring(0, 2).toUpperCase()}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-500 font-mono mb-1">{editingUser.email}</div>
                                    <input
                                        type="text"
                                        value={formData.displayName || ""}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        className={cn(
                                            "bg-transparent border-b text-lg font-bold w-full outline-none transition-colors",
                                            isLight
                                                ? "border-zinc-300 text-zinc-900 focus:border-red-500 placeholder-zinc-400 hover:border-zinc-400"
                                                : (isRed
                                                    ? "border-white/10 text-white focus:border-[#D32F2F] placeholder-zinc-700 hover:border-white/20"
                                                    : "border-zinc-700 text-white focus:border-white/20 placeholder-zinc-600 hover:border-zinc-600")
                                        )}
                                        placeholder="Nombre completo"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Building className="w-3 h-3" /> Compa├▒├¡a
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F]"
                                        value={formData.company || ""}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Empresa S.L."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> Cargo
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F]"
                                        value={formData.jobTitle || ""}
                                        onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                        placeholder="Project Manager"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Direcci├│n
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F]"
                                        value={formData.address || ""}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Calle Principal, 123"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Tel├®fono
                                    </label>
                                    <input
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F]"
                                        value={formData.phone || ""}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+34 600..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> Idioma Pref.
                                    </label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F] appearance-none"
                                        value={formData.language || "es"}
                                        onChange={e => setFormData({ ...formData, language: e.target.value })}
                                    >
                                        <option value="es">Espa├▒ol</option>
                                        <option value="en">English</option>
                                        <option value="fr">Fran├ºais</option>
                                    </select>
                                </div>
                            </div>

                            {/* Permission Group Selection */}
                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> Grupo de Permisos
                                </label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F] appearance-none"
                                    value={formData.permissionGroupId || ""}
                                    onChange={e => setFormData({ ...formData, permissionGroupId: e.target.value || undefined })}
                                >
                                    <option value="">Sin grupo asignado (usar rol legacy)</option>
                                    {availableGroups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name} - {group.description}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-zinc-600">
                                    Los grupos de permisos tienen prioridad sobre los roles legacy. Si no se asigna grupo, se usar├í el rol seleccionado arriba.
                                </p>
                            </div>

                            {/* Project Assignment Section */}
                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" /> Proyectos Asignados
                                </label>

                                {formData.role !== 'app_admin' && formData.role !== 'global_pm' ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar bg-black/20 p-2 rounded border border-white/5">
                                        {availableProjects.map(p => {
                                            const isSelected = formData.assignedProjectIds?.includes(p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        const current = formData.assignedProjectIds || [];
                                                        const newIds = isSelected
                                                            ? current.filter(id => id !== p.id)
                                                            : [...current, p.id];
                                                        setFormData({ ...formData, assignedProjectIds: newIds });
                                                    }}
                                                    className={cn(
                                                        "cursor-pointer text-xs px-2 py-1.5 rounded border transition-all flex items-center gap-2",
                                                        isSelected
                                                            ? "bg-red-950/40 border-red-900/50 text-white"
                                                            : "bg-white/5 border-transparent text-zinc-400 hover:text-white hover:bg-white/10"
                                                    )}
                                                >
                                                    <div className={cn("w-3 h-3 rounded-full border flex items-center justify-center", isSelected ? "border-[#D32F2F] bg-[#D32F2F]" : "border-zinc-600")}>
                                                        {isSelected && <Check className="w-2 h-2 text-white" />}
                                                    </div>
                                                    <span className="truncate">{p.code} - {p.name}</span>
                                                </div>
                                            );
                                        })}
                                        {availableProjects.length === 0 && <span className="text-zinc-600 text-xs col-span-2">No hay proyectos creados.</span>}
                                    </div>
                                ) : (
                                    <div className="bg-orange-500/10 border border-orange-500/20 rounded p-3 text-xs text-orange-200 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-orange-500" />
                                        <span>
                                            Los <strong>Administradores</strong> y <strong>Global PM</strong> tienen acceso autom├ítico a
                                            <span className="font-bold underline ml-1">todos los proyectos</span>.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end gap-3 items-center">
                            {/* Super Admin ONLY Delete Button */}
                            {user?.email?.toLowerCase() === 'argoss01@gmail.com' && (
                                <button
                                    onClick={handleDeleteUser}
                                    className="mr-auto text-red-500/60 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
                                    title="Esta acci├│n es irreversible"
                                >
                                    <Trash2 className="w-3 h-3" /> Eliminar Usuario
                                </button>
                            )}

                            <button
                                onClick={() => setEditingUser(null)}
                                className="px-4 py-2 rounded uppercase text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveUserChanges}
                                disabled={updating === editingUser.uid}
                                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-6 py-2 rounded shadow-lg shadow-red-900/20 text-xs font-bold uppercase tracking-wide flex items-center gap-2"
                            >
                                {updating === editingUser.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-[#D32F2F]/10 p-2 rounded-lg">
                        <User className="w-6 h-6 text-[#D32F2F]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Panel de Administraci├│n</h2>
                        <div className="flex gap-4 mt-1 text-xs font-medium text-zinc-400">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={cn("transition-colors",
                                    activeTab === 'users'
                                        ? (isLight
                                            ? "text-red-600 underline underline-offset-4 decoration-red-600 font-bold"
                                            : (isRed ? "text-white underline underline-offset-4 decoration-[#D32F2F]" : "text-white underline underline-offset-4 decoration-white"))
                                        : (isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-white")
                                )}
                            >
                                Usuarios ({users.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('invites')}
                                className={cn("hover:text-white transition-colors", activeTab === 'invites' && "text-white underline underline-offset-4 decoration-[#D32F2F]")}
                            >
                                Invitaciones
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadData} className={cn("p-2 rounded-full transition-colors", isLight ? "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900" : "hover:bg-white/5 text-zinc-400 hover:text-white")} title="Recargar">
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto custom-scrollbar rounded-xl border relative transition-colors",
                isLight
                    ? "bg-white border-zinc-200"
                    : (isRed ? "bg-[#D32F2F]/5 border-[#D32F2F]/10" : "bg-black/20 border-white/5")
            )}>
                {loading && (
                    <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className={cn("w-8 h-8 animate-spin",
                            isLight ? "text-red-600" : (isRed ? "text-[#D32F2F]" : "text-white")
                        )} />
                    </div>
                )}

                {activeTab === 'users' ? (
                    <div className="flex flex-col gap-3 p-2">
                        {/* Header Row */}
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold text-white/70 uppercase tracking-wider">
                            <div className="col-span-5">Usuario / Perfil</div>
                            <div className="col-span-3">Email</div>
                            <div className="col-span-2">Rol / Permisos</div>
                            <div className="col-span-2 text-right">Estado</div>
                        </div>

                        {/* List Items */}
                        <div className="space-y-3">
                            {users.map(u => (
                                <div
                                    key={u.uid}
                                    className={cn(
                                        "grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all duration-200 group relative",
                                        "shadow-sm hover:shadow-lg hover:-translate-y-0.5",
                                        isLight
                                            ? "bg-white border-zinc-200 hover:border-red-200 hover:bg-red-50 text-zinc-900"
                                            : (isRed
                                                ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 hover:bg-[#D32F2F]/20 hover:border-[#D32F2F]/30 text-white"
                                                : "bg-[#18181b] border-white/5 hover:bg-[#202024] hover:border-white/10 text-zinc-200")
                                    )}
                                >
                                    {/* User Info & Avatar */}
                                    <div className="col-span-5 relative">
                                        <div onClick={() => startEditing(u)} className="flex items-center gap-4 cursor-pointer">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border transition-colors shrink-0 shadow-inner",
                                                isLight
                                                    ? "bg-zinc-100 border-zinc-200 group-hover:border-zinc-300"
                                                    : (isRed
                                                        ? "bg-black/20 border-white/20 group-hover:border-white/40"
                                                        : "bg-white/5 border-white/5 group-hover:border-white/20")
                                            )}>
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className={cn("font-bold text-sm transition-colors",
                                                        isLight ? "text-zinc-500 group-hover:text-zinc-700" : "text-white group-hover:text-white"
                                                    )}>
                                                        {u.displayName?.substring(0, 2).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={cn("font-bold flex items-center gap-2 text-sm transition-colors",
                                                    isLight ? "text-zinc-700 group-hover:text-zinc-900" : (isRed ? "text-zinc-200 group-hover:text-white" : "text-zinc-300 group-hover:text-white")
                                                )}>
                                                    <span className="truncate">{u.displayName}</span>
                                                    {!u.isActive && (
                                                        <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 border border-red-500/10">
                                                            Pendiente
                                                        </span>
                                                    )}

                                                </div>
                                                <div className={cn("text-xs flex gap-2 truncate mt-0.5",
                                                    isLight ? "text-zinc-500" : (isRed ? "text-white/80" : "text-zinc-500")
                                                )}>
                                                    {u.company ? (
                                                        <>
                                                            <span className="truncate max-w-[120px]" title={u.company}>{u.company}</span>
                                                            {u.jobTitle && <span className="opacity-50">ÔÇó</span>}
                                                            {u.jobTitle && <span className="truncate max-w-[120px]" title={u.jobTitle}>{u.jobTitle}</span>}
                                                        </>
                                                    ) : (
                                                        <span className="italic opacity-50">Sin detalles</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Edit Hint */}
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 drop-shadow-md">
                                                <div className={cn("p-1.5 rounded-md backdrop-blur-sm",
                                                    isLight ? "bg-zinc-200 text-zinc-600" : "bg-white/10 text-white"
                                                )}>
                                                    <Edit2 className="w-3 h-3" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="col-span-3">
                                        <div className={cn("text-xs font-mono truncate transition-colors select-all",
                                            isLight ? "text-zinc-600 hover:text-zinc-900" : (isRed ? "text-white/90 hover:text-white" : "text-zinc-500 hover:text-zinc-300")
                                        )} title={u.email}>
                                            {u.email}
                                        </div>
                                    </div>

                                    {/* Role Badge */}
                                    <div className="col-span-2">
                                        {(() => {
                                            const assignedGroup = availableGroups.find(g => g.id === u.permissionGroupId);
                                            if (assignedGroup) {
                                                return (
                                                    <div
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm"
                                                        style={{
                                                            backgroundColor: `${assignedGroup.color}10`,
                                                            borderColor: `${assignedGroup.color}20`,
                                                            color: assignedGroup.color
                                                        }}
                                                    >
                                                        <Shield className="w-3 h-3" />
                                                        <span className="truncate max-w-[100px]">{assignedGroup.name}</span>
                                                    </div>
                                                );
                                            } else {
                                                const roleInfo = ROLES.find(r => r.value === u.role);
                                                return (
                                                    <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800/50 border border-zinc-700/50 whitespace-nowrap shadow-sm",
                                                            roleInfo?.color
                                                        )}>
                                                            {roleInfo?.label || u.role}
                                                        </span>
                                                    </div>
                                                );
                                            }
                                        })()}
                                    </div>

                                    {/* Action Actions */}
                                    <div className="col-span-2 flex justify-end items-center gap-2">
                                        {u.isActive ? (
                                            <button
                                                disabled={updating === u.uid}
                                                onClick={() => toggleActive(u.uid, true)}
                                                className="text-zinc-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all"
                                                title="Desactivar usuario"
                                            >
                                                <Ban className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                disabled={updating === u.uid}
                                                onClick={() => toggleActive(u.uid, false)}
                                                className="bg-green-600/90 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-green-900/20 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                                            >
                                                {updating === u.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Aprobar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className={cn("text-lg font-bold", isLight ? "text-zinc-900" : "text-white")}>Invitaciones Activas</h3>
                                <p className={cn("text-sm", isLight ? "text-zinc-500" : "text-zinc-400")}>Genera enlaces de un solo uso para registro autom├ítico.</p>
                            </div>
                            <button
                                onClick={handleCreateInvite}
                                disabled={generatingInvite}
                                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
                            >
                                {generatingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Generar Nueva
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {invites.map(invite => (
                                <div key={invite.code} className={cn(
                                    "p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden transition-all",
                                    invite.isUsed
                                        ? (isLight ? "bg-zinc-50 border-zinc-200 opacity-60" : "bg-zinc-900/50 border-zinc-800 opacity-60")
                                        : (isLight
                                            ? "bg-white border-zinc-200 hover:border-red-200 hover:bg-red-50 text-zinc-900"
                                            : (isRed
                                                ? "bg-[#D32F2F]/10 border-[#D32F2F]/20 hover:bg-[#D32F2F]/20 hover:border-[#D32F2F]/30 text-white"
                                                : "bg-[#18181b] border-white/5 hover:bg-[#202024] hover:border-white/10 text-zinc-200")
                                        )
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <Ticket className={cn("w-5 h-5", invite.isUsed ? (isLight ? "text-zinc-400" : "text-zinc-600") : (isRed ? "text-[#D32F2F]" : "text-white"))} />
                                            <span className={cn("font-mono font-bold text-lg tracking-wider", isLight ? "text-zinc-900" : "text-white")}>{invite.code}</span>
                                        </div>
                                        {invite.isUsed && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full uppercase font-bold">Usada</span>}
                                    </div>

                                    {!invite.isUsed ? (
                                        <button
                                            onClick={() => copyInviteLink(invite.code)}
                                            className={cn("w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border",
                                                isLight
                                                    ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200"
                                                    : (isRed ? "bg-white/5 hover:bg-white/10 text-zinc-300 border-white/5" : "bg-white/5 hover:bg-white/10 text-zinc-400 border-white/5")
                                            )}
                                        >
                                            <Copy className="w-3 h-3" /> Copiar Enlace
                                        </button>
                                    ) : (
                                        <div className="text-xs text-zinc-500">
                                            Usada por UID: {invite.usedBy?.substring(0, 8)}...
                                        </div>
                                    )}

                                    <div className={cn("text-[10px] mt-auto pt-2 border-t flex justify-between", isLight ? "text-zinc-500 border-zinc-200" : "text-zinc-600 border-white/5")}>
                                        <span>Creada: {invite.createdAt?.seconds ? format(new Date(invite.createdAt.seconds * 1000), "dd/MM HH:mm") : "-"}</span>
                                    </div>
                                </div>
                            ))}
                            {invites.length === 0 && (
                                <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                                    <Ticket className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>No hay invitaciones generadas.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
