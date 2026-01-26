"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useSafeFirestore } from "@/hooks/useSafeFirestore";
import { PermissionGroup, Tenant } from "@/types";
import { Loader2, Plus, User, RefreshCw, Save, Trash2, Shield, ShieldCheck, Check, Building, Briefcase, Globe, Edit2, XCircle, MapPin, Phone, Ban, Ticket, Copy, FolderGit2 } from "lucide-react";
import { getAllInvites, InviteCode } from "@/lib/invites";
import { createInviteAction } from "@/app/actions/invites";
import InviteWizard from "./InviteWizard";
import { updateUserClaimsFunction } from "@/lib/functions";

import { UserProfile as UserData, getRoleLevel } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTheme } from "@/hooks/useTheme";
import { getActiveProjects } from "@/lib/projects";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";

const ROLES = [
    { value: 'superadmin', label: 'Super Admin', color: 'text-indigo-500' },
    { value: 'app_admin', label: 'Admin App', color: 'text-red-500' },
    { value: 'global_pm', label: 'Global PM', color: 'text-orange-500' },
    { value: 'consultant', label: 'Consultant', color: 'text-blue-500' },
    { value: 'team_member', label: 'Team Member', color: 'text-green-500' },
    { value: 'client', label: 'Client', color: 'text-purple-500' },
];

export default function UserManagement() {
    const { userRole, user, tenantId } = useAuth();
    const { updateDoc, deleteDoc } = useSafeFirestore();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { t } = useLanguage();
    const isLight = theme === 'light';
    const isRed = theme === 'red';
    const [users, setUsers] = useState<UserData[]>([]);
    const [invites, setInvites] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users');
    const [showInviteWizard, setShowInviteWizard] = useState(false);

    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [formData, setFormData] = useState<Partial<UserData>>({});

    const [securityPrompt, setSecurityPrompt] = useState<{
        isOpen: boolean;
        uid: string;
        pendingRole: string;
        verificationInput: string;
        isModal: boolean;
    }>({ isOpen: false, uid: '', pendingRole: '', verificationInput: '', isModal: false });

    const [availableProjects, setAvailableProjects] = useState<{ id: string, name: string, code: string }[]>([]);
    const [availableGroups, setAvailableGroups] = useState<PermissionGroup[]>([]);
    const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

    useEffect(() => {
        if (getRoleLevel(userRole) < 70) {
            setLoading(false);
            return;
        }

        loadData();
        loadProjectsForSelect();
        loadPermissionGroups();
        if (getRoleLevel(userRole) >= 100) {
            loadTenants();
        }
    }, [activeTab, userRole, tenantId]);

    const loadTenants = async () => {
        try {
            const q = query(collection(db, "tenants"), orderBy("name"));
            const snapshot = await getDocs(q);
            const tenants = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Tenant[];
            setAvailableTenants(tenants);
        } catch (error) {
            console.error('Error loading tenants:', error);
        }
    };

    const loadProjectsForSelect = async () => {
        try {
            const userLevel = getRoleLevel(userRole);
            const targetTenant = (userLevel >= 100) ? "ALL" : (tenantId || "1");
            const projects = await getActiveProjects(targetTenant);
            setAvailableProjects(projects.map(p => ({
                id: p.id,
                name: p.name,
                code: p.code
            })));
        } catch (e) {
            console.error("Error loading projects list", e);
            setAvailableProjects([]);
        }
    };

    const loadPermissionGroups = async () => {
        try {
            const targetTenant = tenantId || "1";
            const q = query(collection(db, 'permission_groups'), where('tenantId', '==', targetTenant));
            const snapshot = await getDocs(q);
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
                let q;
                if (getRoleLevel(userRole) >= 100) {
                    q = query(collection(db, "users"));
                } else if (tenantId) {
                    q = query(collection(db, "users"), where("tenantId", "==", tenantId));
                } else {
                    setUsers([]);
                    setLoading(false);
                    return;
                }
                const snapshot = await getDocs(q);
                const loadedUsers: UserData[] = [];
                snapshot.forEach(doc => {
                    loadedUsers.push({ uid: doc.id, ...doc.data() } as UserData);
                });
                loadedUsers.sort((a, b) => getRoleLevel(b.role) - getRoleLevel(a.role));
                setUsers(loadedUsers);
            } else {
                // Fetch invites: Superadmin sees everything, others see their tenant
                const userLevel = getRoleLevel(userRole);
                const queryTenant = userLevel >= 100 ? undefined : (tenantId || "1");

                let loadedInvites = await getAllInvites(queryTenant);

                // Sort by date descending (handle missing/invalid dates)
                loadedInvites.sort((a, b) => {
                    const dateA = a.createdAt?.seconds || 0;
                    const dateB = b.createdAt?.seconds || 0;
                    return dateB - dateA;
                });

                setInvites(loadedInvites);
            }
        } catch (error: any) {
            console.error("Error loading data:", error);
            showToast("Error", "Error al cargar datos: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (uid: string, newRole: string, isConfirmed = false) => {
        if (!isConfirmed) {
            if (newRole === 'superadmin') {
                setSecurityPrompt({ isOpen: true, uid, pendingRole: newRole, verificationInput: '', isModal: false });
                return;
            }
            if (!confirm(`Change role to ${newRole}?`)) return;
        }

        setUpdating(uid);
        try {
            const updates: any = { role: newRole, roleLevel: getRoleLevel(newRole) };
            if (newRole === 'superadmin') {
                updates.tenantId = '1';
                updates.permissionGroupId = null;
            }
            await updateDoc(doc(db, "users", uid), updates);
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));

            // Trigger claims update for quick role change
            console.log("[UserManagement] Quick Role Change: Triggering claims for", uid);
            updateUserClaimsFunction({ targetUserId: uid, newRole, newTenantId: updates.tenantId || null })
                .then(() => console.log("[UserManagement] Quick Claims Update Success"))
                .catch(e => console.error("[UserManagement] Quick Claims Update Failed", e));
        } catch (error) {
            console.error(error);
        }
        setUpdating(null);
    };

    const toggleActive = async (uid: string, currentStatus: boolean) => {
        setUpdating(uid);
        try {
            await updateDoc(doc(db, "users", uid), { isActive: !currentStatus });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isActive: !currentStatus } : u));
        } catch (error) {
            console.error(error);
        }
        setUpdating(null);
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
            role: user.role || 'team_member',
            tenantId: user.tenantId || "",
            assignedProjectIds: user.assignedProjectIds || [],
            permissionGroupId: user.permissionGroupId || ""
        });
    };

    const saveUserChanges = async () => {
        if (!editingUser) return;
        setUpdating(editingUser.uid);
        try {
            const payload = { ...formData };
            if (payload.role) {
                payload.roleLevel = getRoleLevel(payload.role);
            }
            await updateDoc(doc(db, "users", editingUser.uid), payload);

            // [CRITICAL] Trigger Custom Claims Update in Background
            // This ensures the JWT token is refreshed with the new role/tenant
            if (payload.role || payload.tenantId) {
                console.log("[UserManagement] Triggering claims update for:", editingUser.uid);
                const claimsParams = {
                    targetUserId: editingUser.uid,
                    newRole: payload.role || editingUser.role,
                    newTenantId: payload.tenantId || editingUser.tenantId
                };

                // Primary Regional Call (EU)
                updateUserClaimsFunction(claimsParams)
                    .then((res) => {
                        console.log("[UserManagement] Claims updated successfully:", res);
                        showToast("Success", "Permisos actualizados en el sistema (EU)", "success");
                        alert("✅ PERMISOS SINCRONIZADOS (Cloud Function EU)\n\nIMPORTANTE: Ahora debes hacer LOGOUT y volver a entrar para que tu navegador reconozca el nuevo rol.");
                    })
                    .catch(e => {
                        console.error("[UserManagement] Region call failed:", e);
                        showToast("Error", "Fallo al sincronizar permisos: " + e.message, "error");
                        alert("❌ FALLO EN CLOUD FUNCTION (Región Europa):\n" + e.message + "\n\nVerifica que la función esté desplegada en europe-west1.");
                    });
            }

            setUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...payload } : u));
            setEditingUser(null);
            showToast("Éxito", "Usuario actualizado correctamente", "success");
        } catch (error) {
            console.error(error);
            alert("Error saving: " + (error as any).message);
        } finally {
            setUpdating(null);
        }
    };

    const handleFixRole = async (targetUser: UserData) => {
        const expected = getRoleLevel(targetUser.role);
        setUpdating(targetUser.uid);
        try {
            await updateDoc(doc(db, "users", targetUser.uid), { roleLevel: expected });
            setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, roleLevel: expected } : u));
        } catch (error) {
            console.error(error);
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteUser = async () => {
        if (!editingUser) return;
        if (user?.email?.toLowerCase() !== 'argoss01@gmail.com') return;
        if (!confirm("Delete user permanently?")) return;
        setUpdating(editingUser.uid);
        try {
            await deleteDoc(doc(db, "users", editingUser.uid));
            setUsers(prev => prev.filter(u => u.uid !== editingUser.uid));
            setEditingUser(null);
        } catch (error) {
            console.error(error);
        } finally {
            setUpdating(null);
        }
    };

    const copyInviteLink = (code: string) => {
        const url = `${window.location.origin}?invite=${code}`;
        navigator.clipboard.writeText(url);
        showToast("Copied", "Link copied to clipboard", "success");
    };

    if (getRoleLevel(userRole) < 70) {
        return <div className="p-8 text-center text-zinc-500">Restricted Access</div>;
    }

    return (
        <div className="flex-1 overflow-hidden flex flex-col gap-4 max-w-5xl mx-auto w-full h-full relative p-4">
            {/* Modal & UI Logic... (Simplified for this pass to ensure build passes) */}
            {/* Standard UI implementation continues below */}
            <div className={cn("flex justify-between items-center border-b pb-6", isLight ? "border-zinc-200" : "border-white/10")}>
                <div className="flex flex-col gap-1">
                    <h2 className={cn("text-2xl font-black tracking-tighter flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                        <User className="w-6 h-6 text-[#D32F2F]" />
                        {t('user_management.title')}
                    </h2>
                    <p className="text-xs text-zinc-500 font-medium tracking-wide uppercase opacity-70">Control access & organization</p>
                </div>

                <div className="flex items-center gap-6">
                    <div className={cn("flex gap-1 p-1 rounded-2xl", isLight ? "bg-zinc-100" : "bg-white/5")}>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === 'users'
                                    ? "bg-[#D32F2F] text-white shadow-lg shadow-red-900/30"
                                    : (isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-white")
                            )}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Users
                        </button>
                        <button
                            onClick={() => setActiveTab('invites')}
                            className={cn(
                                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                activeTab === 'invites'
                                    ? "bg-[#D32F2F] text-white shadow-lg shadow-red-900/30"
                                    : (isLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-white")
                            )}
                        >
                            <Ticket className="w-3.5 h-3.5" />
                            Invites
                        </button>
                    </div>

                    {activeTab === 'invites' && (
                        <button
                            onClick={() => setShowInviteWizard(true)}
                            className="flex items-center gap-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-red-900/40 transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            New Invite
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'users' ? (
                    <div className="space-y-2">
                        {users.map(u => (
                            <div key={u.uid} className={cn(
                                "border p-4 rounded-xl flex justify-between items-center group transition-all",
                                isLight
                                    ? "bg-white border-zinc-200 hover:border-red-500/30 hover:shadow-md shadow-zinc-100"
                                    : "bg-white/5 border-white/5 hover:border-white/20"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                                        isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/5 text-zinc-400"
                                    )}>
                                        {u.displayName?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className={cn("font-bold text-sm", isLight ? "text-zinc-900" : "text-white")}>{u.displayName}</div>
                                        <div className={cn("text-xs font-mono", isLight ? "text-zinc-500" : "text-zinc-500")}>{u.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                                        isLight ? "bg-zinc-100 text-zinc-600 border border-zinc-200" : "bg-zinc-800 text-zinc-400"
                                    )}>
                                        {u.role}
                                    </span>
                                    <button
                                        onClick={() => startEditing(u)}
                                        className={cn(
                                            "p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full",
                                            isLight ? "text-zinc-400 hover:text-red-600 hover:bg-red-50" : "text-zinc-500 hover:text-white"
                                        )}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {invites.length === 0 ? (
                            <div className="text-center py-12 opacity-50">No invites found.</div>
                        ) : (
                            <div className="grid gap-3">
                                {invites.map(inv => {
                                    const roleInfo = ROLES.find(r => r.value === inv.role);
                                    return (
                                        <div key={inv.code} className={cn(
                                            "border p-5 rounded-2xl flex justify-between items-center group transition-all duration-300",
                                            isLight
                                                ? "bg-white border-zinc-200 hover:border-red-500/30 hover:shadow-xl shadow-zinc-100"
                                                : "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                                        )}>
                                            <div className="flex items-center gap-6">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center font-mono text-center transition-all group-hover:scale-110",
                                                    inv.isUsed
                                                        ? (isLight ? "bg-zinc-100 text-zinc-400" : "bg-white/5 text-zinc-600")
                                                        : "bg-[#D32F2F]/10 text-[#D32F2F] border border-[#D32F2F]/20 shadow-[0_0_15px_rgba(211,47,47,0.1)]"
                                                )}>
                                                    <span className="text-[10px] uppercase opacity-50 leading-none mb-1">Code</span>
                                                    <span className="text-sm font-black tracking-tighter">{inv.code}</span>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "font-black text-base tracking-tight",
                                                            roleInfo ? roleInfo.color : (isLight ? "text-zinc-900" : "text-white")
                                                        )}>
                                                            {roleInfo?.label || inv.role}
                                                        </span>
                                                        {inv.isUsed ? (
                                                            <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full uppercase font-black border border-green-500/10">Used</span>
                                                        ) : (
                                                            <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full uppercase font-black border border-amber-500/10 animate-pulse">Pending</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 text-[11px] font-medium text-zinc-500">
                                                        <div className="flex items-center gap-1.5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                            <Building className="w-3.5 h-3.5" />
                                                            <span className="font-mono">{inv.tenantId}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 opacity-60">
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                            <span>{inv.createdAt?.seconds ? format(new Date(inv.createdAt.seconds * 1000), 'dd MMM yyyy') : 'No date'}</span>
                                                        </div>
                                                        {inv.assignedProjectIds && inv.assignedProjectIds.length > 0 && (
                                                            <div className="flex items-center gap-1.5 text-[#D32F2F]/60 group-hover:text-[#D32F2F] transition-colors">
                                                                <FolderGit2 className="w-3.5 h-3.5" />
                                                                <span>{inv.assignedProjectIds.length} Projects</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!inv.isUsed && (
                                                    <button
                                                        onClick={() => copyInviteLink(inv.code)}
                                                        className={cn(
                                                            "p-2.5 rounded-xl transition-all flex items-center gap-2 text-xs font-bold",
                                                            isLight
                                                                ? "text-zinc-500 hover:text-red-600 hover:bg-red-50"
                                                                : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5"
                                                        )}
                                                        title="Copy Link"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Copy Link</span>
                                                    </button>
                                                )}
                                                {getRoleLevel(userRole) >= 100 && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Delete this invite?")) return;
                                                            setUpdating(inv.code);
                                                            try {
                                                                await deleteDoc(doc(db, "invites", inv.code));
                                                                setInvites(prev => prev.filter(i => i.code !== inv.code));
                                                                showToast("Success", "Invite deleted", "success");
                                                            } catch (e: any) {
                                                                showToast("Error", e.message, "error");
                                                            } finally {
                                                                setUpdating(null);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "p-2.5 rounded-xl transition-all opacity-0 group-hover:opacity-100",
                                                            isLight
                                                                ? "text-zinc-400 hover:text-red-600 hover:bg-red-50"
                                                                : "text-zinc-500 hover:text-white hover:bg-red-500/20 hover:text-red-500"
                                                        )}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Invite Wizard Overlay */}
            <InviteWizard
                isOpen={showInviteWizard}
                onClose={() => setShowInviteWizard(false)}
                onSuccess={() => loadData()}
            />

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className={cn(
                        "rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl transition-colors flex flex-col max-h-[90vh]",
                        isLight
                            ? "bg-white border border-zinc-200 shadow-zinc-200"
                            : (isRed
                                ? "bg-[#1a0505] border border-[#D32F2F]/30 shadow-[#D32F2F]/20"
                                : "bg-black border border-white/10 shadow-black")
                    )}>
                        <div className={cn("p-4 border-b flex justify-between items-center transition-colors shrink-0",
                            isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                        )}>
                            <h3 className={cn("text-lg font-bold flex items-center gap-2", isLight ? "text-zinc-900" : "text-white")}>
                                <Edit2 className={cn("w-4 h-4", isLight ? "text-red-600" : (isRed ? "text-[#D32F2F]" : "text-white"))} />
                                Edit User
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-zinc-400 hover:text-white transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                    {editingUser.photoURL ? (
                                        <img src={editingUser.photoURL} alt={editingUser.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-xl text-zinc-400">{editingUser.displayName?.substring(0, 2).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-zinc-500 font-mono mb-1">{editingUser.email}</div>
                                    <input
                                        type="text"
                                        value={formData.displayName || ""}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        className={cn(
                                            "bg-transparent border-b text-xl font-bold w-full outline-none transition-colors",
                                            isLight
                                                ? "border-zinc-300 text-zinc-900 focus:border-red-500 placeholder-zinc-400"
                                                : (isRed
                                                    ? "border-white/10 text-white focus:border-[#D32F2F] placeholder-zinc-700"
                                                    : "border-zinc-700 text-white focus:border-white/20 placeholder-zinc-600")
                                        )}
                                        placeholder="Display Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Shield className="w-3 h-3" /> Role
                                    </label>
                                    <select
                                        className={cn(
                                            "w-full border rounded px-3 py-2 text-sm outline-none appearance-none transition-colors",
                                            isLight
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500"
                                                : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                        )}
                                        value={formData.role || ""}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                    >
                                        {ROLES.map(r => <option key={r.value} value={r.value} className={isLight ? "text-black" : "text-white"}>{r.label}</option>)}
                                    </select>
                                </div>

                                {getRoleLevel(userRole) >= 100 && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                            <Building className="w-3 h-3" /> Tenant
                                        </label>
                                        <select
                                            className={cn(
                                                "w-full border rounded px-3 py-2 text-sm outline-none appearance-none transition-colors",
                                                isLight
                                                    ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500"
                                                    : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                            )}
                                            value={formData.tenantId || ""}
                                            onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                                        >
                                            <option value="">Select Tenant</option>
                                            {availableTenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Building className="w-3 h-3" /> Company
                                    </label>
                                    <input
                                        className={cn(
                                            "w-full border rounded px-3 py-2 text-sm outline-none transition-colors",
                                            isLight
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500 placeholder-zinc-400"
                                                : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                        )}
                                        value={formData.company || ""}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Company name"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> Job Title
                                    </label>
                                    <input
                                        className={cn(
                                            "w-full border rounded px-3 py-2 text-sm outline-none transition-colors",
                                            isLight
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500 placeholder-zinc-400"
                                                : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                        )}
                                        value={formData.jobTitle || ""}
                                        onChange={e => setFormData({ ...formData, jobTitle: e.target.value })}
                                        placeholder="Project Manager"
                                    />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> Address
                                    </label>
                                    <input
                                        className={cn(
                                            "w-full border rounded px-3 py-2 text-sm outline-none transition-colors",
                                            isLight
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500 placeholder-zinc-400"
                                                : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                        )}
                                        value={formData.address || ""}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Street, City, Country"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Phone
                                    </label>
                                    <input
                                        className={cn(
                                            "w-full border rounded px-3 py-2 text-sm outline-none transition-colors",
                                            isLight
                                                ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500 placeholder-zinc-400"
                                                : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                        )}
                                        value={formData.phone || ""}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+1 234..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                        <Globe className="w-3 h-3" /> Language
                                    </label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-[#D32F2F] appearance-none"
                                        value={formData.language || "es"}
                                        onChange={e => setFormData({ ...formData, language: e.target.value })}
                                    >
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="fr">Français</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Permission Group
                                </label>
                                <select
                                    className={cn(
                                        "w-full border rounded px-3 py-2 text-sm outline-none appearance-none transition-colors",
                                        isLight
                                            ? "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-red-500"
                                            : "bg-black/40 border-white/10 text-zinc-200 focus:border-[#D32F2F]"
                                    )}
                                    value={formData.permissionGroupId || ""}
                                    onChange={e => setFormData({ ...formData, permissionGroupId: e.target.value || "" })}
                                >
                                    <option value="">No group assigned (Legacy Role)</option>
                                    {availableGroups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name} - {group.description}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/5">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                                    <FolderGit2 className="w-3 h-3" /> Assigned Projects
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar bg-black/20 p-2 rounded border border-white/5">
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
                                </div>
                            </div>
                        </div>

                        <div className={cn("p-4 border-t flex justify-end gap-3 items-center shrink-0",
                            isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-[#D32F2F]/10 border-[#D32F2F]/20" : "bg-white/5 border-white/10")
                        )}>
                            {user?.email?.toLowerCase() === 'argoss01@gmail.com' && (
                                <button
                                    onClick={handleDeleteUser}
                                    className="mr-auto text-red-500/60 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-2"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete User
                                </button>
                            )}
                            <button onClick={() => setEditingUser(null)} className="px-4 py-2 font-bold text-zinc-400 hover:text-white transition-colors">Cancel</button>
                            <button
                                onClick={saveUserChanges}
                                disabled={updating === editingUser.uid}
                                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-6 py-2 rounded font-bold shadow-lg shadow-red-900/20 flex items-center gap-2 min-w-[100px] justify-center transition-all active:scale-95"
                            >
                                {updating === editingUser.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
