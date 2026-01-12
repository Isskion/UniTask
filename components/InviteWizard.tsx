"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { createInvite } from "@/lib/invites";
import { getActiveProjects } from "@/lib/projects";
import { Tenant, RoleLevel, getRoleLevel } from "@/types";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Clipboard, Loader2, X, Building, Shield, Crown, Briefcase, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ROLES = [
    { value: 'usuario_externo', label: 'Cliente (Externo)', icon: ExternalLink, desc: 'Acceso limitado solo a vista' },
    { value: 'usuario_base', label: 'Equipo Base', icon: Briefcase, desc: 'Ejecución de tareas básicas' },
    { value: 'consultor', label: 'Consultor', icon: Shield, desc: 'Gestión operativa completa' },
    { value: 'global_pm', label: 'Global PM', icon: Crown, desc: 'Gestión multiproyecto' },
];

export default function InviteWizard({ isOpen, onClose, onSuccess }: InviteWizardProps) {
    const { user, userRole, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    // --- STATE ---
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Data
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [projects, setProjects] = useState<{ id: string, name: string, code: string }[]>([]);

    // Selection
    const [selectedTenant, setSelectedTenant] = useState<string>(tenantId || "1");
    const [selectedRole, setSelectedRole] = useState<string>("usuario_externo");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    // --- LOAD DATA ---
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setGeneratedCode(null);
        setSelectedProjects([]);

        // Initial setup based on current user
        if (getRoleLevel(userRole) < 100) {
            setSelectedTenant(tenantId || "1");
            // Skip step 1 for non-superadmins
            setStep(2);
        } else {
            loadTenants();
        }
    }, [isOpen]);

    // Load projects whenever Tenant changes
    useEffect(() => {
        if (selectedTenant && step >= 2) {
            loadProjects();
        }
    }, [selectedTenant, step]);

    const loadTenants = async () => {
        try {
            const q = query(collection(db, "tenants"), orderBy("name"));
            const snapshot = await getDocs(q);
            setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
        } catch (e) {
            console.error("Error loading tenants", e);
        }
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            const rawProjects = await getActiveProjects(selectedTenant);
            setProjects(rawProjects.map(p => ({ id: p.id, name: p.name, code: p.code })));
        } finally {
            setLoading(false);
        }
    };

    // --- ACTIONS ---

    const handleGenerate = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const code = await createInvite(
                user.uid,
                selectedTenant,
                selectedRole,
                selectedProjects
            );
            setGeneratedCode(code);
            setStep(4); // Success Step
            onSuccess(); // Triggers reload in parent if needed
        } catch (e) {
            alert("Error generando invitación");
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        const url = `${window.location.origin}?invite=${generatedCode}`;
        navigator.clipboard.writeText(url);
        // Simple visual feedback could go here
    };

    if (!isOpen) return null;

    // --- STYLES ---
    const bgBase = isLight ? "bg-white" : (isRed ? "bg-[#1a0505]" : "bg-black");
    const borderBase = isLight ? "border-zinc-200" : (isRed ? "border-red-900/30" : "border-zinc-800");
    const textBase = isLight ? "text-zinc-900" : "text-white";
    const textMuted = isLight ? "text-zinc-500" : "text-zinc-400";
    const accentColor = isRed ? "text-[#D32F2F]" : (isLight ? "text-red-600" : "text-red-500");
    const primaryBtn = isRed ? "bg-[#D32F2F] hover:bg-[#B71C1C]" : "bg-white text-black hover:bg-zinc-200";

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className={cn(
                "w-full max-w-4xl h-[600px] rounded-xl flex overflow-hidden shadow-2xl border transition-colors",
                bgBase, borderBase
            )}>

                {/* SIDEBAR STEPPER */}
                <div className={cn(
                    "w-64 flex-shrink-0 border-r p-8 flex flex-col justify-between",
                    isLight ? "bg-zinc-50 border-zinc-200" : (isRed ? "bg-red-950/10 border-red-900/20" : "bg-zinc-900/30 border-white/5")
                )}>
                    <div>
                        <h2 className={cn("text-xl font-bold mb-8 flex items-center gap-2", textBase)}>
                            <Briefcase className={accentColor} />
                            Invitación
                        </h2>

                        <div className="space-y-6 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-800 z-0"></div>

                            {[
                                { num: 1, label: "Organización" },
                                { num: 2, label: "Rol" },
                                { num: 3, label: "Accesos" },
                                { num: 4, label: "Confirmar" }
                            ].map((s) => (
                                <div key={s.num} className="relative z-10 flex items-center gap-4">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-all",
                                        step === s.num
                                            ? (isRed ? "bg-[#D32F2F] border-[#D32F2F] text-white" : "bg-white text-black border-white")
                                            : (step > s.num
                                                ? "bg-green-500 border-green-500 text-white" // Completed
                                                : "bg-black border-zinc-700 text-zinc-500")
                                    )}>
                                        {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                                    </div>
                                    <span className={cn(
                                        "font-medium transition-colors",
                                        step === s.num ? textBase : textMuted
                                    )}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={onClose} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm">
                        <ArrowLeft className="w-4 h-4" /> Cancelar
                    </button>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 p-8 overflow-y-auto">

                        {/* STEP 1: TENANT SELECT (Superadmin only usually) */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Selecciona la Organización</h3>
                                <p className={textMuted}>Define a qué Tenant pertenecerá este nuevo usuario.</p>

                                <div className="grid grid-cols-1 gap-4">
                                    {tenants.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setSelectedTenant(t.id)}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                                                selectedTenant === t.id
                                                    ? (isRed ? "bg-red-900/20 border-[#D32F2F]" : "bg-zinc-800 border-white")
                                                    : (isLight ? "bg-white hover:bg-zinc-50 border-zinc-200" : "bg-black/20 hover:bg-white/5 border-white/10")
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xl">🏢</div>
                                            <div>
                                                <div className={cn("font-bold", textBase)}>{t.name}</div>
                                                <div className="text-xs text-zinc-500">{t.code}</div>
                                            </div>
                                            {selectedTenant === t.id && (
                                                <div className="ml-auto text-green-500"><Check /></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: ROLE SELECT */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Define su Rol</h3>
                                <p className={textMuted}>¿Qué nivel de permisos tendrá en el sistema?</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {ROLES.map(role => {
                                        const Icon = role.icon;
                                        const isSelected = selectedRole === role.value;
                                        return (
                                            <button
                                                key={role.value}
                                                onClick={() => setSelectedRole(role.value)}
                                                className={cn(
                                                    "p-6 rounded-lg border text-left flex flex-col gap-4 transition-all hover:scale-[1.02]",
                                                    isSelected
                                                        ? (isRed ? "bg-red-900/20 border-[#D32F2F]" : "bg-zinc-800 border-white")
                                                        : (isLight ? "bg-white border-zinc-200 hover:shadow-lg" : "bg-black/20 border-white/10 hover:bg-white/5")
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                                    isSelected ? (isRed ? "bg-[#D32F2F] text-white" : "bg-white text-black") : "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className={cn("font-bold text-lg", textBase)}>{role.label}</div>
                                                    <div className="text-sm text-zinc-500 mt-1">{role.desc}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PROJECT SELECT */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Asignar Proyectos</h3>
                                <p className={textMuted}>Selecciona los proyectos visibles para este usuario.</p>

                                {loading && (
                                    <div className="flex items-center gap-2 text-zinc-500 py-4">
                                        <Loader2 className="animate-spin" /> Cargando proyectos...
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                    {projects.length === 0 && !loading && (
                                        <div className="col-span-2 text-center py-10 text-zinc-500 border border-dashed border-zinc-700 rounded-lg">
                                            No hay proyectos activos en este Tenant.
                                        </div>
                                    )}
                                    {projects.map(p => {
                                        const isSelected = selectedProjects.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedProjects(prev => prev.filter(id => id !== p.id));
                                                    } else {
                                                        setSelectedProjects(prev => [...prev, p.id]);
                                                    }
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 p-4 rounded border text-left transition-all",
                                                    isSelected
                                                        ? (isRed ? "bg-red-900/20 border-[#D32F2F]" : "bg-zinc-800 border-white")
                                                        : (isLight ? "bg-white border-zinc-200" : "bg-black/20 border-white/10")
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    isSelected
                                                        ? (isRed ? "bg-[#D32F2F] border-[#D32F2F]" : "bg-white border-white")
                                                        : "border-zinc-500"
                                                )}>
                                                    {isSelected && <Check className={cn("w-3 h-3", isRed ? "text-white" : "text-black")} />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={cn("font-bold text-sm", textBase)}>{p.name}</div>
                                                    <div className="text-[10px] font-mono text-zinc-500">{p.code}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setSelectedProjects(projects.map(p => p.id))}
                                        className="text-xs text-zinc-500 hover:text-white underline"
                                    >
                                        Seleccionar Todos
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95 duration-300">
                                <div className={cn(
                                    "w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4",
                                    isRed ? "bg-[#D32F2F] text-white" : "bg-white text-black"
                                )}>
                                    🎉
                                </div>
                                <h3 className={cn("text-3xl font-bold", textBase)}>¡Invitación Lista!</h3>
                                <p className="text-zinc-400 max-w-md">
                                    El enlace ha sido generado con todas las configuraciones de seguridad y acceso aplicadas.
                                </p>

                                <div className="w-full max-w-md bg-black/50 border border-white/10 rounded-lg p-4 flex items-center gap-3">
                                    <code className="flex-1 bg-transparent text-sm font-mono text-zinc-300 truncate">
                                        {window.location.origin}?invite={generatedCode}
                                    </code>
                                    <button
                                        onClick={copyLink}
                                        className="p-2 hover:bg-white/10 rounded text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <Clipboard className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "px-8 py-3 rounded-full font-bold transition-transform hover:scale-105",
                                        primaryBtn
                                    )}
                                >
                                    Finalizar
                                </button>
                            </div>
                        )}

                    </div>

                    {/* FOOTER NAV */}
                    {step < 4 && (
                        <div className={cn(
                            "p-6 border-t flex justify-between items-center",
                            isLight ? "bg-zinc-50 border-zinc-200" : "bg-transparent border-white/10"
                        )}>
                            <button
                                onClick={() => setStep(prev => Math.max(1, prev - 1))}
                                disabled={step === 1 || (step === 2 && getRoleLevel(userRole) < 100)}
                                className="px-6 py-2 rounded text-sm font-medium hover:bg-white/5 disabled:opacity-30 text-zinc-400"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={() => {
                                    if (step === 3) handleGenerate();
                                    else setStep(prev => prev + 1);
                                }}
                                disabled={loading}
                                className={cn(
                                    "px-8 py-2 rounded font-bold flex items-center gap-2 transition-all",
                                    primaryBtn,
                                    loading && "opacity-70 cursor-wait"
                                )}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {step === 3 ? "Generar Invitación" : "Siguiente"}
                                {step !== 3 && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
