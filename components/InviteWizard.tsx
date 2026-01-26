"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { createInvite } from "@/lib/invites";
import { createInviteAction } from "@/app/actions/invites"; // Secure Server Action
import { createTenant } from "@/lib/tenants";
import { createProject } from "@/lib/projects"; // Added import
import { getActiveProjects } from "@/lib/projects";
import { Tenant, RoleLevel, getRoleLevel } from "@/types";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Clipboard, Loader2, X, Building, Shield, Crown, Briefcase, ExternalLink, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InviteWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ROLES = [
    { value: 'client', label: 'Client (External)', icon: ExternalLink, desc: 'Limited view-only access' },
    { value: 'team_member', label: 'Team Member', icon: Briefcase, desc: 'Basic task execution' },
    { value: 'consultant', label: 'Consultant', icon: Shield, desc: 'Full operational management' },
    { value: 'global_pm', label: 'Global PM', icon: Crown, desc: 'Multi-project management' },
    { value: 'app_admin', label: 'App Admin', icon: Crown, desc: 'Tenant Administrator' },
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
    const [selectedRole, setSelectedRole] = useState<string>("client");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    // New Tenant State
    const [isNewTenant, setIsNewTenant] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");

    // --- LOAD DATA ---
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setGeneratedCode(null);
        setSelectedProjects([]);
        setIsNewTenant(false);
        setNewTenantName("");

        // Initial setup based on current user
        if (getRoleLevel(userRole) < 100) {
            // Standard users start at Role selection (Step 1 now), but have fixed tenant
            setSelectedTenant(tenantId || "1");
        } else {
            loadTenants();
        }
    }, [isOpen]);

    // Load projects whenever Tenant changes (AND we are not creating a new one)
    useEffect(() => {
        if (selectedTenant && !isNewTenant && step === 3) {
            loadProjects();
        }
    }, [selectedTenant, step, isNewTenant]);

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
            let targetTenantId = selectedTenant;
            let finalSelectedProjects = selectedProjects;

            // 1. Create Tenant if needed
            if (isNewTenant && newTenantName) {
                // A. Create Tenant
                const newTenantId = await createTenant({
                    name: newTenantName,
                    code: newTenantName.toLowerCase().replace(/\s+/g, '-'),
                    isActive: true
                });
                targetTenantId = newTenantId;

                // B. Auto-Create Project (Same Name)
                const newProjectCode = newTenantName.toUpperCase().substring(0, 3) + "-001";
                const newProjectId = await createProject({
                    name: newTenantName, // Project name same as tenant
                    code: newProjectCode,
                    clientName: newTenantName,
                    status: 'active',
                    health: 'healthy',
                    isActive: true,
                    tenantId: newTenantId, // Correctly link to new tenant
                    teamIds: [], // Empty initially
                });

                // C. Auto-assign this project to the invite
                finalSelectedProjects = [newProjectId];
            }

            // --- SECURE SERVER ACTION ---
            const token = await user.getIdToken();
            const result = await createInviteAction(
                token,
                targetTenantId,
                selectedRole,
                finalSelectedProjects
            );

            if (!result.success) {
                throw new Error(result.error || "Error creating invitation (Server)");
            }

            setGeneratedCode(result.code!);
            setStep(4); // Success Step
            onSuccess();
        } catch (e: any) {
            console.error(e);
            alert(e.message || "Error generating invitation");
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
    const textBase = isLight ? "text-zinc-900" : "text-foreground";
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
                            Invitation
                        </h2>

                        <div className="space-y-6 relative">
                            {/* Connecting Line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-zinc-800 z-0"></div>

                            {[
                                { num: 1, label: "Role" }, // Swapped
                                { num: 2, label: "Tenant" }, // Swapped
                                { num: 3, label: "Access" },
                                { num: 4, label: "Confirm" }
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
                        <ArrowLeft className="w-4 h-4" /> Cancel
                    </button>
                </div>

                {/* MAIN CONTENT */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 p-8 overflow-y-auto">

                        {/* STEP 1: ROLE SELECT (MOVED FROM 2) */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Define Role</h3>
                                <p className={textMuted}>What level of permissions will they have in the system?</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {ROLES.map(role => {
                                        const Icon = role.icon;
                                        const isSelected = selectedRole === role.value;
                                        return (
                                            <button
                                                key={role.value}
                                                onClick={() => {
                                                    setSelectedRole(role.value);
                                                    // Reset new tenant state if they switch away from admin
                                                }}
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

                        {/* STEP 2: TENANT SELECT (MOVED FROM 1) */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Select Tenant</h3>
                                <p className={textMuted}>Define which tenant this new user will belong to.</p>

                                {/* New Tenant Toggle Logic - Only if Admin role selected in Step 1 */}
                                {((selectedRole === 'app_admin' || selectedRole === 'global_pm') && getRoleLevel(userRole) >= 100) && (
                                    <div className="mb-6 p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-blue-400">Create New Tenant?</h4>
                                            <p className="text-xs text-zinc-400">This user will be the administrator of a new tenant.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-bold", !isNewTenant ? "text-zinc-500" : "text-zinc-600")}>No</span>
                                            <button
                                                onClick={() => setIsNewTenant(!isNewTenant)}
                                                className={cn("w-12 h-6 rounded-full p-1 transition-colors relative", isNewTenant ? "bg-blue-500" : "bg-zinc-700")}
                                            >
                                                <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", isNewTenant ? "translate-x-6" : "translate-x-0")} />
                                            </button>
                                            <span className={cn("text-xs font-bold", isNewTenant ? "text-blue-400" : "text-zinc-600")}>Yes</span>
                                        </div>
                                    </div>
                                )}

                                {isNewTenant ? (
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3 text-blue-400">
                                            <Building className="w-6 h-6" />
                                            <h4 className="font-bold text-lg">New Tenant</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase font-bold text-zinc-500">Tenant Name</label>
                                            <input
                                                autoFocus
                                                value={newTenantName}
                                                onChange={e => setNewTenantName(e.target.value)}
                                                placeholder="e.g. Acme Corp..."
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 text-white placeholder-zinc-600"
                                            />
                                        </div>
                                        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20 text-xs text-blue-300 flex gap-2">
                                            <Info className="w-4 h-4 flex-shrink-0" />
                                            <p>
                                                When creating the tenant, an initial project named <strong>{newTenantName || "..."}</strong> will be automatically generated.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    tenants.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
                                            {tenants.map((t: Tenant) => (
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
                                    ) : (
                                        <div className="p-6 rounded-xl border border-dashed border-zinc-700 bg-white/5 text-center">
                                            <Building className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                                            <p className="text-zinc-400 font-medium">Assigned to your current Tenant</p>
                                            <div className="text-xs text-zinc-600 mt-1 font-mono">{tenantId}</div>

                                            {/* Debug Option for SuperAdmins who see empty list */}
                                            {getRoleLevel(userRole) >= 100 && (
                                                <button
                                                    onClick={loadTenants}
                                                    className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
                                                >
                                                    Are you a SuperAdmin? Retry loading tenants
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* STEP 3: PROJECT SELECT (Skipped if New Tenant) */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Assign Projects</h3>
                                <p className={textMuted}>Select the projects visible for this user in this tenant.</p>

                                {loading && (
                                    <div className="flex items-center gap-2 text-zinc-500 py-4">
                                        <Loader2 className="animate-spin" /> Loading projects...
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                    {projects.length === 0 && !loading && (
                                        <div className="col-span-2 text-center py-10 text-zinc-500 border border-dashed border-zinc-700 rounded-lg">
                                            No active projects in this tenant.
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
                                        Select All
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="relative">
                                    <div className={cn(
                                        "w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-2xl transition-all animate-bounce",
                                        isRed ? "bg-[#D32F2F] text-white shadow-red-900/40" : "bg-white text-black shadow-white/10"
                                    )}>
                                        <Check className="w-12 h-12 stroke-[4px]" />
                                    </div>
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-[#1a0505]">
                                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className={cn("text-4xl font-black tracking-tighter", textBase)}>Invitation Ready!</h3>
                                    <p className={cn("text-base max-w-sm mx-auto", textMuted)}>
                                        The link has been generated with all security and access settings applied.
                                    </p>
                                </div>

                                {/* New Tenant Feedback */}
                                {isNewTenant && (
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-center gap-4 max-w-md animate-in slide-in-from-bottom-4 duration-700">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0">
                                            <Building className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs font-black uppercase tracking-widest text-blue-400 leading-tight">New Organization</div>
                                            <div className="text-sm font-bold text-white">{newTenantName} created successfully</div>
                                        </div>
                                    </div>
                                )}

                                <div className={cn(
                                    "w-full max-w-md p-1 rounded-2xl border flex items-center gap-2 pr-4 transition-all hover:scale-[1.02]",
                                    isLight ? "bg-zinc-50 border-zinc-200" : "bg-white/5 border-white/10"
                                )}>
                                    <div className={cn(
                                        "px-4 py-3 rounded-xl font-mono text-sm truncate flex-1",
                                        isLight ? "bg-white border border-zinc-200 text-zinc-600" : "bg-black/50 border border-white/5 text-zinc-300"
                                    )}>
                                        {window.location.origin}?invite={generatedCode}
                                    </div>
                                    <button
                                        onClick={copyLink}
                                        className={cn(
                                            "p-3 rounded-xl transition-all group flex items-center gap-2",
                                            isRed ? "bg-[#D32F2F] hover:bg-[#B71C1C] text-white" : "bg-white text-black hover:bg-zinc-200"
                                        )}
                                    >
                                        <Clipboard className="w-5 h-5 group-active:scale-90 transition-transform" />
                                        <span className="text-sm font-black uppercase">Copy</span>
                                    </button>
                                </div>

                                <button
                                    onClick={onClose}
                                    className={cn(
                                        "px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl transition-all hover:scale-105 active:scale-95",
                                        isLight ? "bg-zinc-900 text-white" : (isRed ? "bg-white text-[#D32F2F]" : "bg-white text-black")
                                    )}
                                >
                                    Finish
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
                                onClick={() => {
                                    setStep(prev => Math.max(1, prev - 1));
                                }}
                                disabled={step === 1}
                                className="px-6 py-2 rounded text-sm font-medium hover:bg-white/5 disabled:opacity-30 text-zinc-400"
                            >
                                Back
                            </button>
                            <button
                                onClick={async () => {
                                    // LOGIC:
                                    // Step 1: Role -> Go to 2.
                                    // Step 2: Organization. 
                                    //   If New Organization -> Skip 3 (Projects create async), Go to 4 (in background via handleGenerate).
                                    //   If Existing -> Go to 3.
                                    // Step 3: Projects -> handleGenerate().

                                    if (step === 3) {
                                        // Finalize (Existing Tenant Flow)
                                        handleGenerate();
                                    } else if (step === 2) {
                                        // Tenant Step
                                        if (isNewTenant) {
                                            if (!newTenantName.trim()) {
                                                alert("Enter a name for the tenant.");
                                                return;
                                            }
                                            // SKIP STEP 3 -> AUTO GENERATE
                                            await handleGenerate();
                                        } else {
                                            // Existing Tenant -> Go to Projects
                                            setStep(3);
                                        }
                                    } else {
                                        // Step 1 -> Go to 2
                                        setStep(prev => prev + 1);
                                    }
                                }}
                                disabled={loading}
                                className={cn(
                                    "px-8 py-2 rounded font-bold flex items-center gap-2 transition-all",
                                    primaryBtn,
                                    loading && "opacity-70 cursor-wait"
                                )}
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {(step === 3 || (step === 2 && isNewTenant)) ? "Generate Invitation" : "Next"}
                                {step !== 3 && !(step === 2 && isNewTenant) && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
