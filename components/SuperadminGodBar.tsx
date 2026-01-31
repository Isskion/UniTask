"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleLevel } from '../types';
import { collection, getDocs, doc, updateDoc, writeBatch, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useTheme } from '@/hooks/useTheme';
import { useSprints } from "@/hooks/useSprints";
import { Shield, Zap, Database, Download, Upload, X, Terminal, Trash2, RefreshCw, Ghost, Building2, Users, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SuperadminGodBar: React.FC = () => {
    const { identity, viewContext, resetSimulation, updateSimulation } = useAuth();
    const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
    const [loadingTenants, setLoadingTenants] = useState(false);

    // Solo se renderiza si la identidad REAL en el token es Superadmin
    if (!identity || Number(identity.realRole) < RoleLevel.SUPERADMIN) return null;

    const FALLBACK_TENANTS = [
        { id: "1", name: "System (Global)" },
        { id: "2", name: "Demo Tenant" },
        { id: "3", name: "Unigis" },
        { id: "4", name: "Test Corp" },
        { id: "5", name: "Dev Team" }
    ];

    const { sprints } = useSprints(); // Get current valid sprints

    useEffect(() => {
        const loadTenants = async () => {
            setLoadingTenants(true);
            try {
                // Collections are still named 'tenants' in Firestore for data safety
                const q = query(collection(db, "tenants"), orderBy("name"));
                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({ id: d.id, name: d.data().name }));

                if (list.length > 0) {
                    setTenants(list);
                } else {
                    // If fetch returns empty (e.g. permission error), use fallback
                    setTenants(FALLBACK_TENANTS);
                }
            } catch (e) {
                console.error("SuperadminBar: Failed to load tenants, using fallback", e);
                setTenants(FALLBACK_TENANTS);
            } finally {
                setLoadingTenants(false);
            }
        };
        loadTenants();
    }, []);

    // [FIX] Rescue Orphaned Tasks (Tasks pointing to deleted sprints)
    const handleRescueOrphans = async () => {
        if (!viewContext?.activeTenantId) {
            alert("Please select a tenant first.");
            return;
        }
        if (!confirm("🛡️ Scan and rescue tasks stuck in deleted sprints for the current tenant?\n\nThis will move them back to the Backlog.")) return;

        try {
            const tenantId = viewContext.activeTenantId;
            // 1. Get all valid sprint IDs
            const validSprintIds = new Set(sprints.map(s => s.id));

            // 2. Scan ALL tasks (or tasks with sprintId != null if index exists, but scan all is safer for God Mode)
            const q = query(collection(db, "tasks"), where("tenantId", "==", tenantId));
            const snapshot = await getDocs(q);

            let rescuedCount = 0;
            const batch = writeBatch(db);
            const BATCH_SIZE = 450; // Firestore batch limit is 500
            let batchCount = 0;

            for (const docSnap of snapshot.docs) {
                const t = docSnap.data();
                if (t.sprintId && !validSprintIds.has(t.sprintId)) {
                    // FOUND ORPHAN!
                    const ref = doc(db, "tasks", docSnap.id);

                    const updates: any = {
                        sprintId: null,
                        needsRollover: null,
                        updatedAt: serverTimestamp()
                    };

                    // Revert status if needed (Active -> Pending)
                    if (t.status === 'in_progress') {
                        updates.status = 'pending';
                    }

                    batch.update(ref, updates);
                    rescuedCount++;
                    batchCount++;

                    if (batchCount >= BATCH_SIZE) {
                        await batch.commit();
                        batchCount = 0;
                        console.log(`Batch committed for tenant ${tenantId}. Rescued: ${rescuedCount}`);
                        // Start a new batch
                        // batch = writeBatch(db); // No need to re-declare, just re-assign
                    }
                }
            }

            if (batchCount > 0) { // Commit any remaining operations
                await batch.commit();
            }

            if (rescuedCount > 0) {
                alert(`✅ Rescued ${rescuedCount} ghost tasks for tenant ${tenantId}! Returned to Backlog.`);
            } else {
                alert("👍 No orphaned tasks found for this tenant. Database is clean.");
            }
        } catch (e: any) {
            console.error("Rescue failed:", e);
            alert("Error: " + e.message);
        }
    };

    // Previous handlers...
    const handleFixDates = async () => {
        // Placeholder for handleFixDates logic
        alert("Fix Dates functionality not yet implemented.");
    };

    const handleRefreshToken = async () => {
        if (!auth.currentUser) return;
        try {
            await auth.currentUser.getIdToken(true);
            alert("✅ Token Refreshed! Permissions updated.\nTry the button again.");
            window.location.reload();
        } catch (e: any) {
            alert("Error refreshing token: " + e.message);
        }
    };

    const handleCheckClaims = async () => {
        if (!auth.currentUser) return;
        const token = await auth.currentUser.getIdTokenResult();
        console.log("CLAIMS:", token.claims);
        alert(`🔎 Claims:\nRole: ${token.claims.roleLevel}\nTenant: ${token.claims.tenantId}\nUID: ${auth.currentUser.uid}`);
    };

    const isSimulating = viewContext?.isMasquerading;

    return (
        <div className="relative z-[9999] w-full bg-zinc-950 border-b border-amber-500/30 text-amber-500 shadow-xl shadow-amber-900/10 font-sans">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />

            <div className="flex items-center justify-between px-6 py-2 text-xs font-medium relative">

                {/* LEFT: Status Status */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                        <Shield className={cn("w-3.5 h-3.5", isSimulating ? "text-amber-400 animate-pulse" : "text-amber-600")} />
                        <span className="tracking-wider font-bold text-amber-100">GOD MODE</span>
                    </div>

                    <div className="h-4 w-px bg-amber-500/20" />

                    <div className="flex items-center gap-2 text-zinc-400">
                        <span>Viewing as:</span>
                        <div className="flex items-center gap-1.5 text-amber-200">
                            <Users className="w-3 h-3" />
                            <span className="font-bold">{getRoleLabel(viewContext?.activeRole)}</span>
                        </div>
                        <span className="mx-1">in</span>
                        <div className="flex items-center gap-1.5 text-amber-200">
                            <Building2 className="w-3 h-3" />
                            <span className="font-bold">
                                {tenants.find(t => t.id === viewContext?.activeTenantId)?.name || viewContext?.activeTenantId || 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>


                {/* RIGHT: Controls */}
                <div className="flex items-center gap-4">

                    {/* Utility Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRescueOrphans}
                            className="flex items-center gap-1 hover:text-white transition-colors text-amber-300"
                            title="Rescue tasks from deleted sprints"
                        >
                            <Ghost className="w-4 h-4" />
                            <span className="hidden sm:inline">Rescue Ghosts</span>
                        </button>

                        <div className="h-4 w-px bg-white/20 mx-2" />

                        <button
                            onClick={handleFixDates}
                            className="flex items-center gap-1 hover:text-white transition-colors text-amber-300"
                            title="Fix incorrect dates (e.g., sprint start/end)"
                        >
                            <Shield className="w-4 h-4" />
                            <span className="hidden sm:inline">Fix Dates</span>
                        </button>

                        <div className="h-4 w-px bg-white/20 mx-2" />

                        <button
                            onClick={handleRefreshToken}
                            className="flex items-center gap-1 hover:text-white transition-colors text-zinc-400 hover:text-amber-300"
                            title="Force Refresh Permissions (Fix Access Denied)"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>

                        <div className="h-4 w-px bg-white/20 mx-2" />

                        <button
                            onClick={handleCheckClaims}
                            className="flex items-center gap-1 hover:text-white transition-colors text-zinc-400 hover:text-cyan-300"
                            title="Inspect Token Claims"
                        >
                            <Terminal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="h-4 w-px bg-amber-500/20" />

                    {/* Role Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Role</label>
                        <div className="relative group">
                            <select
                                value={viewContext?.activeRole}
                                onChange={(e) => updateSimulation({ activeRole: Number(e.target.value) })}
                                className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 rounded pl-3 pr-8 py-1 hover:border-amber-500/50 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                            >
                                <option value={100}>Superadmin</option>
                                <option value={80}>Admin</option>
                                <option value={60}>Global PM</option>
                                <option value={40}>Consultant</option>
                                <option value={20}>Team Member</option>
                                <option value={10}>External</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-amber-500" />
                        </div>
                    </div>

                    {/* Tenant Selector */}
                    <div className="flex items-center gap-2">
                        <label className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Tenant</label>
                        <div className="relative group min-w-[140px]">
                            <select
                                value={viewContext?.activeTenantId}
                                onChange={(e) => updateSimulation({ activeTenantId: e.target.value })}
                                className="w-full appearance-none bg-zinc-900 border border-zinc-800 text-zinc-200 rounded pl-3 pr-8 py-1 hover:border-amber-500/50 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer truncated"
                                disabled={loadingTenants}
                            >
                                {loadingTenants ? (
                                    <option>Loading...</option>
                                ) : (
                                    tenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))
                                )}
                            </select>
                            <ChevronDown className="w-3 h-3 text-zinc-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none group-hover:text-amber-500" />
                        </div>
                    </div>

                    {/* Exit Button */}
                    {isSimulating && (
                        <button
                            onClick={resetSimulation}
                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded shadow-lg shadow-amber-500/20 transition-all hover:scale-105 ml-2 text-xs"
                        >
                            <LogOut className="w-3 h-3" />
                            EXIT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

function getRoleLabel(role?: number) {
    if (!role) return 'Unknown';
    if (role >= 100) return 'Superadmin';
    if (role >= 80) return 'Admin';
    if (role >= 60) return 'Global PM';
    if (role >= 40) return 'Consultant';
    if (role >= 20) return 'Team Member';
    return 'External';
}
