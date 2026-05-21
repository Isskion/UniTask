"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { createConsultant, updateConsultant, SAMRegion, SAMDivision } from "@/lib/agenda";
import { AgendaConsultant } from "@/types/agenda";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import {
    Users, Plus, Check, X, GripVertical, Globe, ChevronDown, Loader2, UserCheck, UserX,
} from "lucide-react";

interface TenantUser {
    uid: string;
    displayName: string;
    email: string;
    photoURL?: string;
    accessScopes?: {
        regionIds?: string[];
        divisionIds?: string[];
    };
}

interface Props {
    consultants: AgendaConsultant[];
    tenantId: string;
    samRegions: SAMRegion[];
    samDivisions: SAMDivision[];
    onClose: () => void;
}

export function AgendaConsultantsManager({ consultants, tenantId, samRegions, samDivisions, onClose }: Props) {
    const { user } = useAuth();
    const { t } = useLanguage();

    const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // ── Load all users in this tenant ────────────────────────────────────────
    useEffect(() => {
        if (!tenantId) return;
        setLoadingUsers(true);
        getDocs(query(collection(db, "users"), where("tenantId", "==", tenantId)))
            .then(snap => {
                const users = snap.docs
                    .map(d => {
                        const data = d.data();
                        return {
                            uid:         d.id,
                            displayName: data.displayName || data.email || d.id,
                            email:       data.email || '',
                            photoURL:    data.photoURL,
                            accessScopes: data.accessScopes,
                            role:        data.role,
                        };
                    })
                    .filter(u => {
                        const r = (u.role || '').toLowerCase();
                        return r !== 'client' && r !== 'usuario_externo';
                    });

                const seenNames = new Set<string>();
                const dedupedUsers = [];
                for (const u of users) {
                    const norm = (u.displayName || '').trim().toLowerCase();
                    if (!seenNames.has(norm)) {
                        seenNames.add(norm);
                        dedupedUsers.push(u);
                    }
                }
                setTenantUsers(dedupedUsers);
            })
            .catch(err => console.error("[agenda] load users:", err))
            .finally(() => setLoadingUsers(false));
    }, [tenantId]);

    const consultantByUserId = new Map(consultants.map(c => [c.userId, c]));

    // ── Toggle consultant ────────────────────────────────────────────────────
    async function toggleConsultant(u: TenantUser) {
        if (!user) return;
        const existing = consultantByUserId.get(u.uid);
        setSaving(u.uid);
        try {
            if (existing) {
                // Deactivate / Reactivate
                const nextActive = !existing.isActive;
                const updateData: any = { isActive: nextActive };

                // If we are reactivating and the old doc has no region, set a default one
                if (nextActive && !existing.region) {
                    const userRegions = u.accessScopes?.regionIds || [];
                    let detectedRegion = '';
                    if (userRegions.length > 0 && !userRegions.includes('*')) {
                        const matchedRegion = samRegions.find(r => r.id === userRegions[0]);
                        detectedRegion = matchedRegion ? matchedRegion.name : userRegions[0];
                    } else {
                        detectedRegion = samRegions[0]?.name ?? '';
                    }
                    updateData.region = detectedRegion;
                }

                // Always sync divisions from the user's current accessScopes so changes
                // in UserManagement are reflected without needing to re-add the consultant.
                const rawDivIds = (u.accessScopes?.divisionIds || []).filter(id => id !== '*');
                if (rawDivIds.length > 0) {
                    updateData.divisions = rawDivIds.map(id => {
                        const match = samDivisions.find(d => d.id === id);
                        return match ? match.name : id;
                    });
                } else if (!existing.divisions?.length) {
                    updateData.divisions = ['Consultoría'];
                }

                await updateConsultant(existing.id, updateData);
            } else {
                // Add — sortOrder = next in line
                const maxOrder = consultants.reduce((m, c) => Math.max(m, c.sortOrder), 0);

                // Detección automática de la región del perfil del usuario
                const userRegions = u.accessScopes?.regionIds || [];
                let detectedRegion = '';

                if (userRegions.length > 0 && !userRegions.includes('*')) {
                    const matchedRegion = samRegions.find(r => r.id === userRegions[0]);
                    detectedRegion = matchedRegion ? matchedRegion.name : userRegions[0];
                } else {
                    detectedRegion = samRegions[0]?.name ?? '';
                }

                // Resolve division IDs → names using the SAM catalog.
                // accessScopes.divisionIds contains IDs (e.g. 'abc123'), not display names.
                // If the catalog hasn't loaded yet or a division is unknown, keep the ID as fallback.
                const rawDivIds = (u.accessScopes?.divisionIds || []).filter(id => id !== '*');
                const detectedDivisions = rawDivIds.length > 0
                    ? rawDivIds.map(id => {
                        const match = samDivisions.find(d => d.id === id);
                        return match ? match.name : id;
                    })
                    : ['Consultoría'];

                await createConsultant({
                    tenantId,
                    userId:     u.uid,
                    name:       u.displayName.toUpperCase(),
                    sortOrder:  maxOrder + 1,
                    region:     detectedRegion,
                    divisions:  detectedDivisions,
                    isActive:   true,
                });
            }
        } catch (e) {
            console.error("[agenda] toggle consultant:", e);
        } finally {
            setSaving(null);
        }
    }

    async function changeRegion(consultant: AgendaConsultant, region: string) {
        setSaving(consultant.id);
        try {
            await updateConsultant(consultant.id, { region });
        } finally {
            setSaving(null);
        }
    }

    async function changeOrder(consultant: AgendaConsultant, delta: number) {
        const newOrder = Math.max(1, consultant.sortOrder + delta);
        setSaving(consultant.id);
        try {
            await updateConsultant(consultant.id, { sortOrder: newOrder });
        } finally {
            setSaving(null);
        }
    }

    const activeConsultants = useMemo(() => {
        const active = consultants.filter(c => c.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder);
        const seenNames = new Set<string>();
        const deduped = [];
        for (const c of active) {
            const norm = (c.name || '').trim().toLowerCase();
            if (!seenNames.has(norm)) {
                seenNames.add(norm);
                deduped.push(c);
            }
        }
        return deduped;
    }, [consultants]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/8 shrink-0">
                    <div>
                        <h2 className="text-white font-semibold text-base flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            {t('agenda.manageTitle')}
                        </h2>
                        <p className="text-zinc-500 text-xs mt-0.5">
                            {t('agenda.manageHint')}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">

                    {/* Active consultants in order */}
                    {activeConsultants.length > 0 && (
                        <div className="p-5 border-b border-white/5">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
                                {t('agenda.activeInAgenda')} ({activeConsultants.length})
                            </p>
                            <div className="space-y-1.5">
                                {activeConsultants.map((c, idx) => (
                                    <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
                                        {/* Order */}
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => changeOrder(c, -1)}
                                                disabled={idx === 0 || saving === c.id}
                                                className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                            >
                                                <ChevronDown className="w-3 h-3 rotate-180" />
                                            </button>
                                            <span className="text-[10px] text-zinc-600 text-center w-3">{c.sortOrder}</span>
                                            <button
                                                onClick={() => changeOrder(c, 1)}
                                                disabled={idx === activeConsultants.length - 1 || saving === c.id}
                                                className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20 transition-colors"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Name */}
                                        <span className="flex-1 text-sm font-medium text-zinc-200">{c.name}</span>

                                        {/* Region select */}
                                        <div className="flex flex-col items-end gap-0.5">
                                            <select
                                                value={c.region}
                                                disabled={saving === c.id}
                                                onChange={e => changeRegion(c, e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded text-[10px] font-bold text-indigo-300 px-1.5 py-0.5 cursor-pointer disabled:opacity-40"
                                            >
                                                {samRegions.length === 0
                                                    ? <option value={c.region}>{c.region}</option>
                                                    : <>
                                                        {!samRegions.some(r => r.name === c.region || r.id === c.region) && (
                                                            <option value={c.region} disabled>⚠ {c.region || '(vacío)'}</option>
                                                        )}
                                                        {samRegions.map(r => (
                                                            <option key={r.id} value={r.name}>{r.name}</option>
                                                        ))}
                                                      </>
                                                }
                                            </select>
                                            <span className="text-[8px] text-zinc-600 font-mono">bd:{c.region || '∅'}</span>
                                        </div>

                                        {/* Remove */}
                                        <button
                                            onClick={() => toggleConsultant({ uid: c.userId, displayName: c.name, email: '' })}
                                            disabled={saving === c.id}
                                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                                            title={t('agenda.removeFromSchedule')}
                                        >
                                            {saving === c.id
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <UserX className="w-3.5 h-3.5" />
                                            }
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All tenant users */}
                    <div className="p-5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
                            {t('agenda.tenantUsers')}
                        </p>

                        {loadingUsers ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
                            </div>
                        ) : tenantUsers.length === 0 ? (
                            <p className="text-xs text-zinc-600 py-4 text-center">
                                {t('agenda.noUsers')}
                            </p>
                        ) : (
                            <div className="space-y-1.5">
                                {tenantUsers.map(u => {
                                    const existing = consultantByUserId.get(u.uid);
                                    const isActive = existing?.isActive === true;
                                    const isSav   = saving === u.uid;

                                    return (
                                        <button
                                            key={u.uid}
                                            onClick={() => toggleConsultant(u)}
                                            disabled={isSav}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                                                isActive
                                                    ? "bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/15"
                                                    : "bg-white/3 border-white/5 hover:bg-white/6"
                                            )}
                                        >
                                            {/* Avatar */}
                                            {u.photoURL ? (
                                                <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full border border-white/10" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-300">
                                                    {u.displayName.slice(0, 2).toUpperCase()}
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-zinc-200 font-medium truncate">{u.displayName}</p>
                                                <p className="text-[10px] text-zinc-500 truncate">{u.email}</p>
                                            </div>

                                            {/* Status */}
                                            {isSav ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-zinc-500 shrink-0" />
                                            ) : isActive ? (
                                                <span className="flex items-center gap-1 text-[10px] text-indigo-400 shrink-0">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    {t('agenda.inSchedule')}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-zinc-600 shrink-0 flex items-center gap-1">
                                                    <Plus className="w-3 h-3" />
                                                    {t('agenda.addToSchedule')}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/8 shrink-0 flex justify-between items-center">
                    <p className="text-[10px] text-zinc-600">
                        {t('agenda.manageFooter')}
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                    >
                        {t('agenda.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
