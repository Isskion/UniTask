
"use client";

import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
    const { theme, changeTheme, mounted } = useTheme();

    if (!mounted) return null;

    return (
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
            <button
                onClick={() => changeTheme('dark')}
                title="Dark Mode"
                className={cn(
                    "p-1.5 rounded-full transition-all",
                    theme === 'dark' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
            >
                <Moon className="w-4 h-4" />
            </button>
            <button
                onClick={() => changeTheme('light')}
                title="Professional White"
                className={cn(
                    "p-1.5 rounded-full transition-all",
                    theme === 'light' ? "bg-white text-black shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
            >
                <Sun className="w-4 h-4" />
            </button>
            <button
                onClick={() => changeTheme('red')}
                title="Soft Red Focus"
                className={cn(
                    "p-1.5 rounded-full transition-all",
                    theme === 'red' ? "bg-[#D32F2F]/20 text-[#D32F2F] shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                )}
            >
                <Palette className="w-4 h-4" />
            </button>
        </div>
    );
}
