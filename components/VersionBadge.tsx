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
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border",
                "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30 animate-pulse"
            )}
            title="VERIFIED CLEAN BUILD"
        >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            v{APP_VERSION}-CLEAN
        </button>
    );
}
