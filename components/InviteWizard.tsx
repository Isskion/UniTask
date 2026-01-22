"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { createInvite } from "@/lib/invites";
import { createInviteAction } from "@/app/actions/invites"; // Secure Server Action
import { createOrganization } from "@/lib/organizations";
import { createProject } from "@/lib/projects"; // Added import
import { getActiveProjects } from "@/lib/projects";
import { Organization, RoleLevel, getRoleLevel } from "@/types";
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
    { value: 'app_admin', label: 'App Admin', icon: Crown, desc: 'Organization Administrator' },
];

export default function InviteWizard({ isOpen, onClose, onSuccess }: InviteWizardProps) {
    const { user, userRole, tenantId: organizationId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const isRed = theme === 'red';

    // --- STATE ---
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);

    // Data
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [projects, setProjects] = useState<{ id: string, name: string, code: string }[]>([]);

    // Selection
    const [selectedOrganization, setSelectedOrganization] = useState<string>(organizationId || "1");
    const [selectedRole, setSelectedRole] = useState<string>("client");
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

    // New Organization State
    const [isNewOrganization, setIsNewOrganization] = useState(false);
    const [newOrganizationName, setNewOrganizationName] = useState("");

    // --- LOAD DATA ---
    useEffect(() => {
        if (!isOpen) return;
        setStep(1);
        setGeneratedCode(null);
        setSelectedProjects([]);
        setIsNewOrganization(false);
        setNewOrganizationName("");

        // Initial setup based on current user
        if (getRoleLevel(userRole) < 100) {
            // Standard users start at Role selection (Step 1 now), but have fixed organization
            setSelectedOrganization(organizationId || "1");
        } else {
            loadOrganizations();
        }
    }, [isOpen]);

    // Load projects whenever Organization changes (AND we are not creating a new one)
    useEffect(() => {
        if (selectedOrganization && !isNewOrganization && step === 3) {
            loadProjects();
        }
    }, [selectedOrganization, step, isNewOrganization]);

    const loadOrganizations = async () => {
        try {
            const q = query(collection(db, "tenants"), orderBy("name"));
            const snapshot = await getDocs(q);
            setOrganizations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization)));
        } catch (e) {
            console.error("Error loading organizations", e);
        }
    };

    const loadProjects = async () => {
        setLoading(true);
        try {
            const rawProjects = await getActiveProjects(selectedOrganization);
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
            let targetOrganizationId = selectedOrganization;
            let finalSelectedProjects = selectedProjects;

            // 1. Create Organization if needed
            if (isNewOrganization && newOrganizationName) {
                // A. Create Organization
                const newOrganizationId = await createOrganization({
                    name: newOrganizationName,
                    code: newOrganizationName.toLowerCase().replace(/\s+/g, '-'),
                    isActive: true
                });
                targetOrganizationId = newOrganizationId;

                // B. Auto-Create Project (Same Name)
                const newProjectCode = newOrganizationName.toUpperCase().substring(0, 3) + "-001";
                const newProjectId = await createProject({
                    name: newOrganizationName, // Project name same as organization
                    code: newProjectCode,
                    clientName: newOrganizationName,
                    status: 'active',
                    health: 'healthy',
                    isActive: true,
                    organizationId: newOrganizationId, // Explicitly link to new organization
                    teamIds: [], // Empty initially
                });

                // C. Auto-assign this project to the invite
                finalSelectedProjects = [newProjectId];
            }

            // --- SECURE SERVER ACTION ---
            const token = await user.getIdToken();
            const result = await createInviteAction(
                token,
                targetOrganizationId,
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
                                { num: 2, label: "Organization" }, // Swapped
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
                                                    // Reset new organization state if they switch away from admin, 
                                                    // but better to keep it sticky or reset on next step?
                                                    // Let's reset isNewOrganization if they pick a non-admin role later?
                                                    // For now, keep simple.
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

                        {/* STEP 2: ORGANIZATION SELECT (MOVED FROM 1) */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Select Organization</h3>
                                <p className={textMuted}>Define which organization this new user will belong to.</p>

                                {/* New Organization Toggle Logic - Only if Admin role selected in Step 1 */}
                                {((selectedRole === 'app_admin' || selectedRole === 'global_pm') && getRoleLevel(userRole) >= 100) && (
                                    <div className="mb-6 p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-blue-400">Create New Organization?</h4>
                                            <p className="text-xs text-zinc-400">This user will be the administrator of a new organization.</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-bold", !isNewOrganization ? "text-zinc-500" : "text-zinc-600")}>No</span>
                                            <button
                                                onClick={() => setIsNewOrganization(!isNewOrganization)}
                                                className={cn("w-12 h-6 rounded-full p-1 transition-colors relative", isNewOrganization ? "bg-blue-500" : "bg-zinc-700")}
                                            >
                                                <div className={cn("w-4 h-4 rounded-full bg-white transition-transform", isNewOrganization ? "translate-x-6" : "translate-x-0")} />
                                            </button>
                                            <span className={cn("text-xs font-bold", isNewOrganization ? "text-blue-400" : "text-zinc-600")}>Yes</span>
                                        </div>
                                    </div>
                                )}

                                {isNewOrganization ? (
                                    <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-xl space-y-4 animate-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3 text-blue-400">
                                            <Building className="w-6 h-6" />
                                            <h4 className="font-bold text-lg">New Organization</h4>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs uppercase font-bold text-zinc-500">Organization Name</label>
                                            <input
                                                autoFocus
                                                value={newOrganizationName}
                                                onChange={e => setNewOrganizationName(e.target.value)}
                                                placeholder="e.g. Acme Corp, StartUp Inc..."
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500 text-white placeholder-zinc-600"
                                            />
                                        </div>
                                        <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20 text-xs text-blue-300 flex gap-2">
                                            <Info className="w-4 h-4 flex-shrink-0" />
                                            <p>
                                                When creating the organization, an initial project named <strong>{newOrganizationName || "..."}</strong> will be automatically generated.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    organizations.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2">
                                            {organizations.map((org: Organization) => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => setSelectedOrganization(org.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-lg border text-left transition-all",
                                                        selectedOrganization === org.id
                                                            ? (isRed ? "bg-red-900/20 border-[#D32F2F]" : "bg-zinc-800 border-white")
                                                            : (isLight ? "bg-white hover:bg-zinc-50 border-zinc-200" : "bg-black/20 hover:bg-white/5 border-white/10")
                                                    )}
                                                >
                                                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-xl">🏢</div>
                                                    <div>
                                                        <div className={cn("font-bold", textBase)}>{org.name}</div>
                                                        <div className="text-xs text-zinc-500">{org.code}</div>
                                                    </div>
                                                    {selectedOrganization === org.id && (
                                                        <div className="ml-auto text-green-500"><Check /></div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-xl border border-dashed border-zinc-700 bg-white/5 text-center">
                                            <Building className="w-8 h-8 mx-auto mb-2 text-zinc-500" />
                                            <p className="text-zinc-400 font-medium">Assigned to your current Organization</p>
                                            <div className="text-xs text-zinc-600 mt-1 font-mono">{organizationId}</div>

                                            {/* Debug Option for SuperAdmins who see empty list */}
                                            {getRoleLevel(userRole) >= 100 && (
                                                <button
                                                    onClick={loadOrganizations}
                                                    className="mt-4 text-xs text-blue-400 hover:text-blue-300 underline"
                                                >
                                                    Are you a SuperAdmin? Retry loading organizations
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {/* STEP 3: PROJECT SELECT (Skipped if New Organization) */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <h3 className={cn("text-2xl font-bold", textBase)}>Assign Projects</h3>
                                <p className={textMuted}>Select the projects visible for this user.</p>

                                {loading && (
                                    <div className="flex items-center gap-2 text-zinc-500 py-4">
                                        <Loader2 className="animate-spin" /> Loading projects...
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                    {projects.length === 0 && !loading && (
                                        <div className="col-span-2 text-center py-10 text-zinc-500 border border-dashed border-zinc-700 rounded-lg">
                                            No active projects in this organization.
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
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in zoom-in-95 duration-300">
                                <div className={cn(
                                    "w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-4",
                                    isRed ? "bg-[#D32F2F] text-white" : "bg-white text-black"
                                )}>
                                    🎉
                                </div>
                                <h3 className={cn("text-3xl font-bold", textBase)}>Invitation Ready!</h3>
                                <p className="text-zinc-400 max-w-md">
                                    The link has been generated with all security and access settings applied.
                                </p>

                                {/* New Organization Feedback */}
                                {isNewOrganization && (
                                    <div className="bg-blue-900/20 text-blue-200 p-3 rounded-lg text-sm border border-blue-500/20 max-w-md">
                                        Organization <strong>{newOrganizationName}</strong> and its initial project were created.
                                    </div>
                                )}

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
                                        // Finalize (Existing Organization Flow)
                                        handleGenerate();
                                    } else if (step === 2) {
                                        // Organization Step
                                        if (isNewOrganization) {
                                            if (!newOrganizationName.trim()) {
                                                alert("Enter a name for the organization.");
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
                                {(step === 3 || (step === 2 && isNewOrganization)) ? "Generate Invitation" : "Next"}
                                {step !== 3 && !(step === 2 && isNewOrganization) && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
