"use client";

import React, { useState } from "react";
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
    ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AppLayoutProps {
    children: React.ReactNode;
    viewMode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager';
    onViewChange: (mode: 'editor' | 'trash' | 'users' | 'projects' | 'dashboard' | 'tasks' | 'task-manager') => void;
}

export function AppLayout({ children, viewMode, onViewChange }: AppLayoutProps) {
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                )}
            >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span>{label}</span>
                {count !== undefined && count > 0 && (
                    <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">
                        {count}
                    </span>
                )}
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#D32F2F] rounded-r-full" />
                )}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-[#09090b] text-zinc-200 overflow-hidden font-sans selection:bg-[#D32F2F]/30">

            {/* SIDEBAR (Desktop) */}
            <aside className="w-64 flex flex-col border-r border-white/5 bg-[#0c0c0e]">
                {/* Header / User */}
                <div className="h-14 flex items-center px-4 border-b border-white/5 gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D32F2F] to-orange-600 flex items-center justify-center shadow-lg shadow-red-900/20">
                        <span className="font-bold text-white text-xs">UTC</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-sm font-bold text-white truncate">UniTask Controller</h1>
                        <p className="text-[10px] text-zinc-500 truncate">Consultant Workspace</p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">

                    {/* Primary */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Workspace</p>
                        <NavItem mode="dashboard" icon={Inbox} label="Inbox / Dashboard" />
                        <NavItem mode="editor" icon={Briefcase} label="Follow-Up" />
                        <NavItem mode="projects" icon={FolderGit2} label="Projects" />
                        <NavItem mode="task-manager" icon={ClipboardList} label="Task Manager (ABM)" />
                        <NavItem mode="tasks" icon={Layout} label="All Tasks (Board)" />
                    </div>

                    {/* Secondary */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">Connect</p>
                        <NavItem mode="users" icon={Users} label="People" />
                    </div>

                    {/* System */}
                    <div className="space-y-1">
                        <p className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-2">System</p>
                        <NavItem mode="trash" icon={Trash2} label="Trash" />
                    </div>
                </div>

                {/* Footer User Profile */}
                <div className="p-3 border-t border-white/5">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-white/10" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                <span className="text-xs font-bold text-zinc-400">?</span>
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{user?.displayName || 'User'}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                        </div>
                        <button onClick={logout} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#09090b]">

                {/* Global Header */}
                <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40">

                    {/* Left: Breadcrumbs / Mobile Menu */}
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="text-zinc-600">Workspace</span>
                            <span className="text-zinc-700">/</span>
                            <span className="text-white font-medium capitalize">
                                {viewMode === 'editor' ? 'Follow-Up' : viewMode}
                            </span>
                        </div>
                    </div>

                    {/* Center: Command Palette Trigger (Optional Visual) */}
                    <button
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true } as any))}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-white/5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/10 transition-all w-64"
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search tasks...</span>
                        <div className="ml-auto flex items-center gap-1">
                            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-sans">Cmd</kbd>
                            <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] font-sans">K</kbd>
                        </div>
                    </button>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => alert("Notificaciones: Próximamente")}
                            className="p-2 text-zinc-500 hover:text-white transition-colors relative"
                        >
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#09090b]"></span>
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
    );
}
