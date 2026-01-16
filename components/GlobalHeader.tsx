"use client";

import { useAuth } from "@/context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { VersionBadge } from "./VersionBadge";
import { Command } from "lucide-react";
import { useUI } from "@/context/UIContext";

export function GlobalHeader() {
    const { user, loading } = useAuth();
    const { toggleCommandMenu } = useUI();

    if (loading || !user) return null;

    return (
        <header className="h-14 border-b border-white/10 bg-[#121214] flex items-center justify-between px-4 sticky top-0 z-40">
            {/* Left: Brand / Logo Area */}
            <div className="flex items-center gap-4">
                {/* Reserved for future Menu Toggle or Breadcrumbs */}
                <div className="font-bold text-lg tracking-tight text-white/90 font-mono">
                    UniTask <span className="text-indigo-500">Controller</span>
                </div>
                <VersionBadge />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={toggleCommandMenu}
                    className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-colors text-xs text-zinc-400 mr-2"
                    title="Abrir Menú de Comandos (Alt+S)"
                >
                    <Command className="w-3.5 h-3.5" />
                    <span>Comandos</span>
                    <span className="bg-black/40 px-1 rounded text-[10px]">Alt+S</span>
                </button>

                <NotificationBell />

                {/* User Avatar (Mini) */}
                <div
                    className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white border border-white/10 ml-2 shadow-inner"
                    title={user.email || ""}
                >
                    {user.email?.substring(0, 2).toUpperCase()}
                </div>
            </div>
        </header>
    );
}
