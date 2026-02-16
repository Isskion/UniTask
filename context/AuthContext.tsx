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

    // Ref to track the profile listener unsubscribe function
    const profileUnsubRef = React.useRef<(() => void) | null>(null);

    useEffect(() => {
        console.log("[AuthContext] VERSION CHECK: 13.4.10-CLEAN-BUILD");
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
                const { doc, onSnapshot } = await import('firebase/firestore');

                // 2. Setup New Listener
                const profileUnsub = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
                    if (!snapshot.exists()) {
                        console.warn("[AuthContext] ⛔ User has no Firestore profile. Auto-signing out.");
                        auth.signOut();
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

                    // If it's a hard error (like permission denied on own profile), we should probably logout
                    // to avoid a broken state where Auth matches but Firestore is inaccessible.
                    // But maybe show a toast/alert first?
                    // For now, auto-logout is safer than infinite loop.
                    auth.signOut().catch(e => console.error("SignOut error:", e));
                    alert(`⛔ Error de Acceso: ${errorMsg}\n\nSesión cerrada por seguridad.`);
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
                alert("⛔ No se puede crear un perfil sin invitación válida.");
                await auth.signOut();
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
            alert("❌ ERROR AL PROCESAR PERFIL: " + e.message);
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
            alert("Error al iniciar sesión con Google: " + error.message);
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
            {!loading && children}
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
