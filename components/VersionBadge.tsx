"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WhatsNewModal } from "./WhatsNewModal";

export function VersionBadge() {
    // 1. Get Version from Environment (injected by next.config.ts)
    const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0-dev";

    // 2. Determine Environment (Test vs Prod)
    const isTest = version.includes("-test") || version.includes("dev");

    // 3. Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 4. Auto-Check Logic
    useEffect(() => {
        const lastSeen = localStorage.getItem("lastSeenVersion");
        if (lastSeen !== version) {
            setIsModalOpen(true);
        }
    }, [version]);

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all hover:scale-105 active:scale-95",
                    isTest
                        ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20"
                        : "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20"
                )}
                title="Click to see what's new"
            >
                v{version}
            </button>

            {/* Modal Logic */}
            <WhatsNewModal
                version={version}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
