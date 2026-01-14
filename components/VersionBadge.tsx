"use client";

import { APP_VERSION } from "@/lib/version";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionBadgeProps {
    onClick?: () => void;
}

export function VersionBadge({ onClick }: VersionBadgeProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border",
                "bg-indigo-500/10 text-indigo-500 border-indigo-500/20 hover:bg-indigo-500/20"
            )}
        >
            <Sparkles className="w-3 h-3" />
            v{APP_VERSION}
        </button>
    );
}
