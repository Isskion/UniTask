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
    Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ThemeSelector } from "@/components/ThemeSelector";
import { VersionBadge } from "@/components/VersionBadge";
import { getRoleLevel, RoleLevel } from "@/types"; // Added import

interface AppLayoutProps {
    children: React.ReactNode;
    viewMode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management';
    onViewChange: (mode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager' | 'user-roles' | 'tenant-management') => void;
    onOpenChangelog?: () => void; // Added prop
}

import { useUI } from "@/context/UIContext"; // Import Context
import { useToast } from "@/context/ToastContext";



export function AppLayout({ children, viewMode, onViewChange, onOpenChangelog }: AppLayoutProps) {
    const { user, logout, userRole } = useAuth();
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
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Connect</p>
                            {canManagePermissions && (
                                <NavItem mode="users" icon={Users} label="People" />
                            )}
                            {canManagePermissions && (
                                <NavItem mode="user-roles" icon={Shield} label="User Roles" />
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
                                <span className="text-muted-foreground">Workspace</span>
                                <span className="text-muted-foreground/50">/</span>
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
                            <button
                                onClick={() => showToast("UniTaskController", "El panel de notificaciones estará disponible próximamente.", "info")}
                                className="p-2 text-muted-foreground hover:text-foreground transition-colors relative"
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
                            </button>
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
