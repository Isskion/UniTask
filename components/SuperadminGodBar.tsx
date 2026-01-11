"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleLevel } from '../types';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Shield, Building2, Users, LogOut, ChevronDown } from 'lucide-react';
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

    useEffect(() => {
        const loadTenants = async () => {
            setLoadingTenants(true);
            try {
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
                                <option value={40}>Consultor</option>
                                <option value={20}>Equipo</option>
                                <option value={10}>Externo</option>
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
    if (role >= 40) return 'Consultor';
    if (role >= 20) return 'Equipo';
    return 'Externo';
}
