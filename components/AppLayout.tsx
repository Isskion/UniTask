"use client";

import React, { useState } from "react";
import { SuperadminGodBar } from "@/components/SuperadminGodBar"; // Import God Bar at Top Level
import {
    Layout,
    BarChart3,
    FolderGit2,
    Users,
    Trash2,
    Search,
    Inbox,
    Briefcase,
    Bell,
    ChevronDown,
    Menu,
    X,
    LogOut,
    ClipboardList,
    Shield,
    Building,
    ListTodo
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeSelector } from "@/components/ThemeSelector";
import { NotificationBell } from "@/components/NotificationBell";
import { VersionBadge } from "@/components/VersionBadge";
import { getRoleLevel, RoleLevel } from "@/types"; // Added import

interface AppLayoutProps {
    children: React.ReactNode;
    viewMode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master';
    onViewChange: (mode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management' | 'admin-task-master') => void;
    onOpenChangelog?: () => void; // Added prop
}

import { useUI } from "@/context/UIContext"; // Import Context
import { useToast } from "@/context/ToastContext";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";



export function AppLayout({ children, viewMode, onViewChange, onOpenChangelog }: AppLayoutProps) {
    const { user, logout, userRole, tenantId } = useAuth();
    const { can } = usePermissions();
    const { toggleCommandMenu } = useUI(); // Use Context hook
    const { showToast } = useToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


    // Check if user can manage permissions (with legacy role fallback)
    const canManagePermissions = can('managePermissions', 'special') ||
        getRoleLevel(userRole) >= RoleLevel.PM;

    const NavItem = ({
        mode,
        icon: Icon,
        label,
        count
    }: {
        mode: typeof viewMode,
        icon: React.ElementType,
        label: string,
        count?: number
    }) => {
        const isActive = viewMode === mode;
        return (
            <button
                onClick={() => {
                    onViewChange(mode);
                    setIsMobileMenuOpen(false);
                }}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
            >
                <Icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                    <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                        {count}
                    </span>
                )}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
                )}
            </button>
        );
    };




    // --- GLOBAL DEADLINE CHECK ---
    React.useEffect(() => {
        // REF: Debounce to prevent React Strict Mode duplicate execution
        const timer = setTimeout(() => {
            const checkDeadlines = async () => {
                // Only run if user is logged in and tenant is ready
                if (!user || !tenantId) return;

                // THROTTLE: Prevents duplicate execution from React Strict Mode.
                const lastRun = sessionStorage.getItem('deadline_check_ts');
                if (lastRun && (Date.now() - parseInt(lastRun)) < 5000) return;
                sessionStorage.setItem('deadline_check_ts', Date.now().toString());

                try {
                    // [DEBUG] Log context to catch mismatches
                    console.log(`[Deadline Check] Running for ${user.email} (UID: ${user.uid}) in Tenant ${tenantId}`);
                    // console.log(`[Deadline Check] Claims:`, (user as any).reloadUserInfo?.customAttributes); // Optional deep debug

                    // 1. Get ACTIVE tasks assigned to CURRENT USER
                    let overdueTasks: any[] = [];
                    try {
                        console.log(`[Deadline Check] 1. Fetching Tasks for Tenant ${tenantId}...`);
                        const qT = query(
                            collection(db, "tasks"),
                            where("tenantId", "==", tenantId),
                            where("assignedTo", "==", user.uid)
                        );
                        const snapT = await getDocs(qT);

                        const now = new Date();
                        overdueTasks = snapT.docs
                            .map(d => ({ id: d.id, ...d.data() } as any))
                            .filter(t =>
                                t.tenantId === tenantId &&
                                ['pending', 'in_progress', 'review'].includes(t.status) &&
                                t.endDate && new Date(t.endDate) < now
                            );
                        console.log(`[Deadline Check] Found ${overdueTasks.length} overdue tasks.`);
                    } catch (e: any) {
                        console.error("[Deadline Check] ❌ Error fetching tasks (Step 1):", e.code, e.message);
                        return; // Stop if we can't get tasks
                    }

                    if (overdueTasks.length === 0) return;

                    // 2. Check existing notifications for current user (Strict Multi-tenancy)
                    try {
                        // FIX: Include tenantId in query to satisfy strict security rules
                        const qN = query(
                            collection(db, "notifications"),
                            where("userId", "==", user.uid),
                            where("tenantId", "==", tenantId)
                        );
                        const snapN = await getDocs(qN);

                        // In-memory filter for type
                        const notifiedTaskIds = new Set(
                            snapN.docs
                                .map(d => d.data())
                                .filter((n: any) => n.type === 'deadline_expired')
                                .map((n: any) => n.taskId)
                        );

                        for (const task of overdueTasks) {
                            if (notifiedTaskIds.has(task.id)) continue;

                            try {
                                console.log(`[Deadline Check] Notifying current user for task ${task.friendlyId}`);
                                await addDoc(collection(db, "notifications"), {
                                    userId: user.uid,
                                    tenantId: tenantId, // CRITICAL: Attribute to current tenant
                                    type: 'deadline_expired',
                                    title: 'Tarea Vencida',
                                    message: `Tu tarea ${task.friendlyId} - "${task.title}" ha alcanzado su fecha límite.`,
                                    taskId: task.id,
                                    read: false,
                                    createdAt: serverTimestamp(),
                                    link: `/?view=task-manager&taskId=${task.id}`
                                });
                            } catch (e: any) {
                                console.error(`[Deadline Check] ❌ Error creating notification for task ${task.id}:`, e.code, e.message);
                            }
                        }
                    } catch (e: any) {
                        console.error("[Deadline Check] ❌ Error fetching notifications (Step 2):", e.code, e.message);
                    }
                } catch (e: any) {
                    console.error("[Deadline Check] UNCAUGHT ERROR:", e);
                }
            }; checkDeadlines();
        }, 3000);

        return () => clearTimeout(timer);
    }, [user, tenantId]);

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
            <SuperadminGodBar />


            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR (Desktop) */}
                <aside className="w-64 flex flex-col border-r border-border bg-card/50">
                    {/* Header / User */}
                    <div className="h-14 flex items-center px-4 border-b border-border gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain theme-logo" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-sm font-bold text-foreground truncate">UniTask Controller</h1>
                            <p className="text-[10px] text-muted-foreground truncate">Consultant Workspace</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                        {/* Primary */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Workspace</p>
                            <NavItem mode="dashboard" icon={Inbox} label="Inbox / Dashboard" />
                            <NavItem mode="editor" icon={Briefcase} label="Follow-Up" />
                            <NavItem mode="projects" icon={FolderGit2} label="Projects & Bitácora" />
                            <NavItem mode="task-manager" icon={ClipboardList} label="Task Manager (ABM)" />
                            <NavItem mode="tasks" icon={Layout} label="All Tasks (Board)" />
                        </div>

                        {/* Secondary */}
                        {/* ADMINISTRATION */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Administración</p>

                            {/* Consolidated Task Master Data (Global PM+) */}
                            {getRoleLevel(userRole) >= RoleLevel.PM && (
                                <NavItem mode="admin-task-master" icon={Layout} label="Gestión de Tareas" />
                            )}

                            {canManagePermissions && (
                                <NavItem mode="users" icon={Users} label="Personas" />
                            )}
                            {canManagePermissions && (
                                <NavItem mode="user-roles" icon={Shield} label="Roles y Permisos" />
                            )}
                            {userRole === 'superadmin' && (
                                <NavItem mode="tenant-management" icon={Building} label="Tenants" />
                            )}
                        </div>

                        {/* System */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">System</p>
                            <NavItem mode="trash" icon={Trash2} label="Trash" />
                        </div>
                    </div>

                    {/* Footer User Profile */}
                    <div className="p-3 border-t border-border">
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors group cursor-pointer">
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-border" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
                                    <span className="text-xs font-bold text-muted-foreground">?</span>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{user?.displayName || 'User'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                            </div>
                            <button onClick={logout} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all" title="Logout">
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="flex-1 flex flex-col min-w-0 bg-background">

                    {/* Global Header */}
                    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-40">

                        {/* Left: Breadcrumbs / Mobile Menu */}
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className="text-muted-foreground hidden sm:inline">Workspace</span>
                                <span className="text-muted-foreground/50 hidden sm:inline">/</span>
                                <span className="text-foreground font-medium capitalize">
                                    {viewMode === 'editor' ? 'Follow-Up' : viewMode}
                                </span>
                                {/* DEBUG BADGE */}
                                <span className="text-[10px] bg-red-900/50 px-2 py-0.5 rounded text-white font-mono border border-red-500/20">
                                    {userRole || 'No Role'}
                                </span>
                                {onOpenChangelog && <VersionBadge onClick={onOpenChangelog} />}
                            </div>
                        </div>

                        {/* Center: Command Palette Trigger (Optional Visual) */}
                        {/* Center: Command Palette Trigger (Optional Visual) */}
                        <button
                            onClick={toggleCommandMenu}
                            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border transition-all w-64"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Buscar tareas (Alt+S)...</span>
                            <div className="ml-auto flex items-center gap-1">
                                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-sans text-muted-foreground">Alt</kbd>
                                <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-sans text-muted-foreground">S</kbd>
                            </div>
                        </button>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-3">
                            <ThemeSelector />
                            <NotificationBell />
                        </div>
                    </header>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-hidden relative">
                        {children}
                    </div>
                </main>

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden flex">
                        <div className="w-64 bg-[#0c0c0e] h-full p-4 flex flex-col border-r border-white/10">
                            <div className="flex justify-between items-center mb-6">
                                <span className="font-bold text-white">Menu</span>
                                <button onClick={() => setIsMobileMenuOpen(false)}>
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>
                            <div className="space-y-1">
                                <NavItem mode="dashboard" icon={Inbox} label="Inbox" />
                                <NavItem mode="editor" icon={Briefcase} label="Follow-Up" />
                                <NavItem mode="projects" icon={FolderGit2} label="Projects" />
                                <NavItem mode="users" icon={Users} label="People" />
                            </div>
                        </div>
                        <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                )}
            </div>
        </div>
    );
}
