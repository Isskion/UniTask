"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../lib/firebase'; // Fixed path to lib/firebase
import { onIdTokenChanged, User, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { RoleLevel, getRoleLevel, UserProfile } from '../types'; // Imported from types.ts (DRY)

// --- DEFINICIÓN DE TIPOS (Strict Typing) ---

// 1. IDENTIDAD REAL (Inmutable, viene del Token)
export interface UserIdentity {
    uid: string;
    email: string | null;
    realRole: RoleLevel;
    realTenantId: string;
}

// 2. CONTEXTO DE VISUALIZACIÓN (Mutable, para UI)
export interface ViewContext {
    activeRole: RoleLevel;
    activeTenantId: string;
    isMasquerading: boolean; // Flag explícito de simulación
}

interface AuthContextType {
    identity: UserIdentity | null;
    viewContext: ViewContext | null;
    loading: boolean;
    user: User | null; // Compatibility with legacy code
    userRole: string; // Legacy: mapped from viewContext (active context)
    tenantId: string | null; // Legacy: mapped from viewContext (active context)
    userProfile: UserProfile | null; // [NEW] Expose full profile as Source of Truth

    // Métodos de control
    updateSimulation: (updates: Partial<ViewContext>) => void;
    resetSimulation: () => void;

    // Legacy Auth Methods (Stubbed or proxied if needed)
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (e: string, p: string) => Promise<void>;
    registerWithEmail: (e: string, p: string, name?: string) => Promise<void>;
    requestRegistration: (e: string, p: string, name: string, inviteCode: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- COMPONENTE PROVIDER ---

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [identity, setIdentity] = useState<UserIdentity | null>(null);
    const [viewContext, setViewContext] = useState<ViewContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [syncError, setSyncError] = useState<{ type: 'SYNC_ERROR' | 'CRITICAL_ERROR', message: string, debugInfo: string, canRepair: boolean } | null>(null);

    // Ref to track the profile listener unsubscribe function
    const profileUnsubRef = React.useRef<(() => void) | null>(null);

    // --- REPAIR FUNCTION ---
    const handleRepair = async () => {
        if (!user || !user.email) return;

        try {
            const res = await fetch('/api/admin/fix-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    problemUid: user.uid
                })
            });
            const fixData = await res.json();
            alert(`✅ Reparación completada. Recargando...`);
            window.location.reload();
        } catch (e: any) {
            setSyncError({
                type: 'CRITICAL_ERROR',
                message: `Fallo técnico en reparación: ${e.message}`,
                debugInfo: JSON.stringify(e, null, 2),
                canRepair: false
            });
        }
    };

    useEffect(() => {
        console.log("[AuthContext] VERSION CHECK: 13.4.10-CLEAN-BUILD-UI-FIX");
        // Escuchamos cambios en el token (Login, Logout, Refresh)
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {

            // 1. Cleanup previous listener immediately
            if (profileUnsubRef.current) {
                console.log("[AuthContext] Cleaning up previous profile listener.");
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }

            if (currentUser) {
                // --- REAL-TIME PROFILE SYNC LISTENER ---
                // "The Source of Truth": We trust Firestore for UI permissions, not the potentially stale Token Claims.
                const { doc, onSnapshot, getDocFromServer } = await import('firebase/firestore');

                // 2. Setup New Listener
                const profileRef = doc(db, 'users', currentUser.uid);
                console.log(`[AuthContext] 🔍 Listening to profile: users/${currentUser.uid} (Project: ${db.app.options.projectId})`);

                const profileUnsub = onSnapshot(profileRef, (snapshot) => {
                    console.log(`[AuthContext] 📸 Snapshot received. Exists: ${snapshot.exists()}, FromCache: ${snapshot.metadata.fromCache}`);

                    if (!snapshot.exists()) {
                        if (snapshot.metadata.fromCache) {
                            console.warn(`[AuthContext] ⏳ Profile not found in cache. Attempting FORCE SERVER FETCH (Strict)...`);

                            // Fallback: Force a getDocFromServer to break the cache loop ABSOLUTELY
                            getDocFromServer(profileRef).then(serverSnap => {
                                console.log(`[AuthContext] 🌍 Force Fetch Result. Exists: ${serverSnap.exists()}`);
                                if (serverSnap.exists()) {
                                    // Manually update state
                                    const data = serverSnap.data();
                                    setUserProfile(data as UserProfile);

                                    const dbRole = Number(data.roleLevel) || 0;
                                    const dbTenantId = String(data.tenantId) || "unknown";

                                    setIdentity({
                                        uid: currentUser.uid,
                                        email: currentUser.email,
                                        realRole: dbRole,
                                        realTenantId: dbTenantId
                                    });

                                    setViewContext({
                                        activeRole: dbRole,
                                        activeTenantId: dbTenantId,
                                        isMasquerading: false
                                    });
                                    setLoading(false); // UNBLOCK UI!
                                } else {
                                    console.error(`[AuthContext] ⛔ User [${currentUser.uid}] has no Firestore profile (Confirmed by STRICT Server Fetch).`);

                                    // Attempt to diagnose via Server API
                                    fetch(`/api/debug/user?uid=${currentUser.uid}`)
                                        .then(res => res.json())
                                        .then(data => {
                                            console.error("[AuthContext] 🕵️‍♂️ Diagnostic Result:", data);
                                            const serverSaysExists = data.firestoreExists;
                                            // const serverProject = data.adminAppProjectId;
                                            const debugInfo = JSON.stringify(data, null, 2);

                                            if (serverSaysExists) {
                                                // Sync Error -> Show UI to Repair
                                                setSyncError({
                                                    type: 'SYNC_ERROR',
                                                    message: 'Tu usuario existe en el servidor pero no en tu navegador local (Cache/Sync Issue).',
                                                    debugInfo: debugInfo,
                                                    canRepair: true
                                                });
                                            } else {
                                                // Critical Error -> Show UI to Repair/Recreate
                                                setSyncError({
                                                    type: 'CRITICAL_ERROR',
                                                    message: 'Tu usuario NO EXISTE en la base de datos. Es necesario repararlo.',
                                                    debugInfo: debugInfo,
                                                    canRepair: true
                                                });
                                            }
                                        })
                                        .catch(err => {
                                            setSyncError({
                                                type: 'CRITICAL_ERROR',
                                                message: `Error Crítico y fallo en diagnóstico: ${err.message}`,
                                                debugInfo: JSON.stringify(err, null, 2),
                                                canRepair: false
                                            });
                                            // auth.signOut(); // Let user read error first
                                        });
                                }
                            }).catch(err => {
                                console.error("[AuthContext] 💥 Force Fetch Error:", err);
                                let msg = `Error al validar tu perfil: ${err.message}`;
                                if (err.code === 'unavailable') msg = "Error de Conexión: No se puede contactar con el servidor.";
                                if (err.code === 'permission-denied') msg = "Permiso Denegado: Existes, pero las reglas bloquean tu lectura.";

                                setSyncError({
                                    type: 'CRITICAL_ERROR',
                                    message: msg,
                                    debugInfo: JSON.stringify(err, null, 2),
                                    canRepair: false
                                });
                            });

                            return;
                        }

                        console.error(`[AuthContext] ⛔ User [${currentUser.uid}] has no Firestore profile (Confirmed by Server Snapshot). Auto-signing out.`);
                        setSyncError({
                            type: 'CRITICAL_ERROR',
                            message: `Error Crítico: Tu usuario (${currentUser.uid}) no tiene perfil en la base de datos.`,
                            debugInfo: "Snapshot confirmed non-existence.",
                            canRepair: false
                        });
                        return;
                    }

                    const data = snapshot.data();

                    // Block users with no valid tenant
                    if (!data.tenantId || data.tenantId === "unknown") {
                        console.warn("[AuthContext] ⛔ User has invalid tenantId. Auto-signing out.");
                        auth.signOut();
                        return;
                    }

                    // [STABLE APPROACH] Decoupled Logic
                    // We update the UI state (userProfile, identity, viewContext) based purely on Firestore.
                    // We do NOT check token claims here. This prevents the "Loop detected" error.
                    // If permissions fail on backend, the user will see an error there, but the app won't crash.

                    // [FIX] Stability Check: Only update if data actually changed
                    setUserProfile(prev => {
                        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                        return data as UserProfile;
                    });

                    const dbRole = Number(data.roleLevel) || 0;
                    const dbTenantId = String(data.tenantId) || "unknown";

                    // Update Identity if it changed
                    setIdentity(prev => {
                        if (prev && prev.realRole === dbRole && prev.realTenantId === dbTenantId) return prev;
                        return {
                            uid: currentUser.uid,
                            email: currentUser.email,
                            realRole: dbRole,
                            realTenantId: dbTenantId
                        };
                    });

                    // Update ViewContext if not masquerading
                    setViewContext(prev => {
                        // If masquerading, don't disturb it unless we need to?
                        // Actually, if real role drops below SuperAdmin, we should probably kill masquerade.
                        if (prev?.isMasquerading) {
                            if (dbRole < RoleLevel.SUPERADMIN) {
                                // Security: Lost superadmin status in DB -> Kill masquerade
                                return {
                                    activeRole: dbRole,
                                    activeTenantId: dbTenantId,
                                    isMasquerading: false
                                };
                            }
                            return prev;
                        }

                        // Normal update
                        if (prev && prev.activeRole === dbRole && prev.activeTenantId === dbTenantId) return prev;

                        return {
                            activeRole: dbRole,
                            activeTenantId: dbTenantId,
                            isMasquerading: false
                        };
                    });

                    setLoading(false);

                }, (error) => {
                    console.error("[AuthContext] Profile listener error:", error);
                    let errorMsg = "Error de conexión/permisos al cargar perfil.";

                    if (error.code === 'permission-denied') {
                        errorMsg = "Permiso denegado: No tienes acceso a tu perfil de usuario.";
                        console.warn("[AuthContext] Permission Denied. Rules might be blocking access.");
                    }

                    // CRITICAL FIX: Ensure we escape the loading state!
                    setLoading(false);

                    setSyncError({
                        type: 'CRITICAL_ERROR',
                        message: `⛔ Error de Acceso: ${errorMsg}`,
                        debugInfo: JSON.stringify(error, null, 2),
                        canRepair: false
                    });
                    // auth.signOut(); // Let user see error
                });

                // Store the unsubscribe function in the ref
                profileUnsubRef.current = profileUnsub;

                // Initial basic setup (Pre-listener)
                setUser(currentUser);
                // setLoading(false); // Moved inside onSnapshot callbacks

            } else {  // Logout / No user
                setUser(null);
                setIdentity(null);
                setViewContext(null);
                setUserProfile(null);
                localStorage.removeItem('superadmin_simulation_context');
                setLoading(false);
                setSyncError(null); // Clear errors on logout
            }
        });

        return () => {
            // Cleanup auth listener
            unsubscribe();
            // Cleanup profile listener
            if (profileUnsubRef.current) {
                profileUnsubRef.current();
            }
        };
    }, []);

    // Auto-process invite ONLY for Google Sign-In users (Google verifies email identity)
    // Email/password users MUST go through requestRegistration → email verification → completeRegistration
    useEffect(() => {
        if (!loading && user) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('invite')) {
                // Only auto-process for Google users (providerData check)
                const isGoogleUser = user.providerData?.some(p => p.providerId === 'google.com');
                if (isGoogleUser) {
                    console.log("[AuthContext] Google user with invite detected. Auto-processing...");
                    createUserProfile(user);
                } else {
                    console.log("[AuthContext] Email/password user with invite. Must use verification flow.");
                }
            }
        }
    }, [loading, user]);

    // --- MÉTODOS DE SIMULACIÓN (CONTROLADOS) ---

    const updateSimulation = (updates: Partial<ViewContext>) => {
        if (!identity || !viewContext) return;

        // GUARDIA DE SEGURIDAD: Solo Superadmin (Nivel 100) puede cambiar su contexto
        if (identity.realRole < RoleLevel.SUPERADMIN) {
            console.warn(`SECURITY ALERT: User ${identity.uid} attempted unauthorized masquerade.`);
            return;
        }

        setViewContext(prev => {
            if (!prev) return null;
            const newState = {
                ...prev,
                ...updates,
                isMasquerading: true
            };

            // Persist
            localStorage.setItem('superadmin_simulation_context', JSON.stringify({
                activeRole: newState.activeRole,
                activeTenantId: newState.activeTenantId
            }));

            return newState;
        });
    };

    const resetSimulation = () => {
        if (!identity) return;

        localStorage.removeItem('superadmin_simulation_context');

        // "Panic Button": Vuelve a la realidad inmediatamente
        setViewContext({
            activeRole: identity.realRole,
            activeTenantId: identity.realTenantId,
            isMasquerading: false
        });
    };

    // --- LEGACY COMPATIBILITY LAYER ---
    const legacyUserRole = viewContext ? getRoleString(viewContext.activeRole) : 'usuario_externo';
    const legacyTenantId = viewContext ? viewContext.activeTenantId : null;

    // --- CLIENT-SIDE FALLBACK FOR USER CREATION ---
    const createUserProfile = async (user: User, name?: string) => {
        try {
            const { doc, setDoc, serverTimestamp, getDoc, updateDoc } = await import('firebase/firestore');

            // 1. Check for Invite Code
            const urlParams = new URLSearchParams(window.location.search);
            const inviteCode = urlParams.get('invite');
            let inviteData: any = null;

            if (inviteCode) {
                console.log(`[AuthContext] Found invite code: ${inviteCode}`);
                const inviteRef = doc(db, "invites", inviteCode);
                const inviteSnap = await getDoc(inviteRef);

                if (inviteSnap.exists()) {
                    const data = inviteSnap.data();

                    // Check Deactivation
                    if (data.isActive === false) {
                        console.warn("[AuthContext] Invite is deactivated.");
                        alert("⛔ Invitación desactivada. Contacte al administrador.");
                        return;
                    }

                    // Check Expiration (10 days)
                    if (data.createdAt) {
                        const createdTime = data.createdAt.toMillis();
                        const tenDays = 10 * 24 * 60 * 60 * 1000;
                        if (Date.now() - createdTime > tenDays) {
                            console.warn("[AuthContext] Invite expired.");
                            alert("⛔ Invitación caducada. Contacte al administrador.");
                            return;
                        }
                    }

                    if (!data.isUsed) {
                        inviteData = data;
                    } else if (data.usedBy === user.uid) {
                        // Allow the same user who originally used this invite to re-authenticate
                        console.log("[AuthContext] Invite already used by this same user, allowing re-entry.");
                        inviteData = data;
                    } else {
                        console.warn("[AuthContext] Invite already used by a different user.");
                        alert("⚠️ Esta invitación ya ha sido utilizada por otro usuario.");
                        return; // Stop processing
                    }
                } else {
                    console.warn("[AuthContext] Invite code not found in DB.");
                    alert("⚠️ El código de invitación no es válido.");
                    return; // Stop processing
                }
            }

            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);
            const existingData = snapshot.data();

            // Logic Update: Only EXISTING users can have their profile updated via invite.
            // New profiles (first-time users) can ONLY be created by completeRegistration Cloud Function.
            if (!snapshot.exists() && !inviteData) {
                // No profile and no invite → ghost user, reject
                console.warn("[AuthContext] ⛔ New user without invite trying to create profile. Rejected.");
                setSyncError({
                    type: 'CRITICAL_ERROR',
                    message: "No se puede crear un perfil sin invitación válida.",
                    debugInfo: "User tried to register without invite code.",
                    canRepair: false
                });
                // await auth.signOut(); // Let user see error
                return;
            }

            if (!snapshot.exists() && inviteData) {
                // New user WITH invite → this path should no longer be used (use completeRegistration).
                // But for backwards-compatibility with existing Google login + invite flow, allow it.
                console.log("[AuthContext] Creating user profile from invite (Google Login flow)...");
            }

            if (snapshot.exists() || inviteData) {
                console.log("[AuthContext] Processing user profile With Invite Data...");

                // 2. Determine Initial Data (Invite vs Default)
                // If inviteData exists, it OVERRIDES existing role/tenant
                const finalRole = inviteData?.role || (existingData?.role || 'usuario_externo');
                const finalTenantId = inviteData?.tenantId || (existingData?.tenantId || "1");

                // Merge projects: Add new ones to existing list
                const existingProjects = existingData?.assignedProjectIds || [];
                const newProjects = inviteData?.assignedProjectIds || [];
                const mergedProjects = Array.from(new Set([...existingProjects, ...newProjects]));

                const autoActive = !!inviteData || (existingData?.isActive || false);

                const profilePayload: any = {
                    uid: user.uid,
                    email: user.email,
                    displayName: name || user.displayName || existingData?.displayName || '',
                    photoURL: user.photoURL || existingData?.photoURL || '',
                    role: finalRole,
                    roleLevel: getRoleLevel(finalRole),
                    tenantId: finalTenantId,
                    assignedProjectIds: mergedProjects,
                    isActive: autoActive,
                    updatedAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                };

                if (!snapshot.exists()) {
                    profilePayload.createdAt = serverTimestamp();
                    await setDoc(userRef, profilePayload);
                } else {
                    await updateDoc(userRef, profilePayload);
                }

                // 3. Consume Invite (only if not already consumed by this user)
                if (inviteCode && inviteData && !inviteData.isUsed) {
                    const inviteRef = doc(db, "invites", inviteCode);
                    await updateDoc(inviteRef, {
                        isUsed: true,
                        usedAt: serverTimestamp(),
                        usedBy: user.uid
                    });

                    // FORCE CLAIMS SYNC
                    try {
                        const { syncUserClaimsAction } = await import('@/app/actions/auth-actions');
                        await syncUserClaimsAction(user.uid);
                        console.log("[AuthContext] Custom claims synchronized successfully.");
                    } catch (syncError) {
                        console.error("[AuthContext] Error synchronizing claims:", syncError);
                    }

                    alert("✅ INVITACIÓN ACEPTADA: Ahora tienes acceso a " + (inviteData.tenantId || "tu organización"));
                } else if (inviteCode && inviteData && inviteData.usedBy === user.uid) {
                    console.log("[AuthContext] Invite already consumed by this user, skipping re-consumption.");
                } else if (!snapshot.exists()) {
                    alert("✅ PERFIL DE USUARIO CREADO CORRECTAMENTE");
                }

                // 4. Cleanup URL and Refresh
                if (inviteCode) {
                    const baseUrl = window.location.origin + window.location.pathname;
                    window.location.href = baseUrl; // Hard reload without params
                } else {
                    window.location.reload();
                }
            } else {
                console.log("[AuthContext] User profile already exists and is valid. No invite to process.");
            }
        } catch (e: any) {
            console.error("[AuthContext] Error in createUserProfile:", e);
            setSyncError({
                type: 'CRITICAL_ERROR',
                message: `ERROR AL PROCESAR PERFIL: ${e.message}`,
                debugInfo: JSON.stringify(e, null, 2),
                canRepair: false
            });
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // Reliance on useEffect to trigger profile creation/invite processing
        } catch (error: any) {
            if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
                console.log("[AuthContext] Login popup cancelled by user. This is expected.");
                return;
            }
            console.error("[AuthContext] Google Login Error:", error);
            setSyncError({
                type: 'CRITICAL_ERROR',
                message: `Error al iniciar sesión con Google: ${error.message}`,
                debugInfo: JSON.stringify(error, null, 2),
                canRepair: false
            });
        }
    };

    const loginWithEmail = async (e: string, p: string) => {
        await signInWithEmailAndPassword(auth, e, p);
        // Reliance on useEffect
    };

    const registerWithEmail = async (e: string, p: string, name?: string) => {
        // [DISABLED] Direct registration is no longer allowed.
        // All registrations must go through requestRegistration → email verification → completeRegistration
        // This prevents creating ghost users in Firebase Auth without a valid invitation.
        throw new Error("El registro directo no está disponible. Usa el flujo de invitación con verificación de email.");
    };

    const requestRegistration = async (e: string, p: string, name: string, inviteCode: string) => {
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const { app } = await import('@/lib/firebase');
            const functionsEU = getFunctions(app, 'europe-west1');
            const requestFn = httpsCallable(functionsEU, 'requestRegistration');

            const result = await requestFn({ email: e, password: p, name, inviteCode });
            return result.data as { success: boolean; message?: string };
        } catch (error: any) {
            console.error("[AuthContext] requestRegistration error:", error);
            throw error;
        }
    };

    const logout = async () => auth.signOut();

    return (
        <AuthContext.Provider value={{
            identity,
            viewContext,
            // Mask loading state: If user exists but context is not ready, we are still loading.
            loading: loading || (!!user && !viewContext),
            updateSimulation,
            resetSimulation,

            // Legacy / Compat
            user,
            userRole: legacyUserRole,
            tenantId: legacyTenantId,
            userProfile, // [NEW]
            loginWithGoogle,
            loginWithEmail,
            registerWithEmail,
            requestRegistration,
            logout
        }}>
            {/* ERROR OVERLAY FOR SYNC ISSUES */}
            {syncError && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col justify-center items-center text-white p-8 text-center backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-zinc-900 p-8 rounded-2xl max-w-2xl w-full border border-zinc-800 shadow-2xl flex flex-col items-center">
                        <div className="bg-red-500/10 p-4 rounded-full mb-6">
                            <h1 className="text-3xl font-bold text-red-500">
                                {syncError.type === 'SYNC_ERROR' ? '⚠️ Problema de Sincronización' : '⛔ Error de Acceso'}
                            </h1>
                        </div>

                        <p className="mb-8 text-zinc-300 text-lg leading-relaxed max-w-lg">
                            {syncError.message}
                        </p>

                        <div className="flex gap-4 justify-center mb-8 w-full">
                            {syncError.canRepair && (
                                <button
                                    onClick={handleRepair}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                                >
                                    <span>🛠️</span> Reparar Perfil
                                </button>
                            )}
                            <button
                                onClick={logout}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-3 rounded-lg font-bold transition-all active:scale-95 border border-zinc-600"
                            >
                                Cerrar Sesión
                            </button>
                        </div>

                        <div className="w-full">
                            <details className="group">
                                <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400 mb-2 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 select-none transition-colors">
                                    <span>Ver Detalles Técnicos</span>
                                    <span className="group-open:rotate-180 transition-transform">▼</span>
                                </summary>
                                <div className="bg-black/50 p-4 rounded-lg overflow-x-auto border border-zinc-800/50 text-left shadow-inner">
                                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">
                                        {syncError.debugInfo}
                                    </pre>
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !syncError && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Helper for Legacy Mapping
function getRoleString(level: RoleLevel): string {
    switch (level) {
        case RoleLevel.SUPERADMIN: return 'superadmin';
        case RoleLevel.ADMIN: return 'app_admin';
        case RoleLevel.PM: return 'global_pm';
        case RoleLevel.CONSULTANT: return 'consultant';
        case RoleLevel.TEAM_MEMBER: return 'team_member';
        case RoleLevel.CLIENT: return 'client';
        default: return 'client';
    }
}
