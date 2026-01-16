"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db } from '../lib/firebase'; // Fixed path to lib/firebase
import { onIdTokenChanged, User, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { RoleLevel, getRoleLevel } from '../types'; // Imported from types.ts (DRY)

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

    // Métodos de control
    updateSimulation: (updates: Partial<ViewContext>) => void;
    resetSimulation: () => void;

    // Legacy Auth Methods (Stubbed or proxied if needed)
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (e: string, p: string) => Promise<void>;
    registerWithEmail: (e: string, p: string, name?: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- COMPONENTE PROVIDER ---

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [identity, setIdentity] = useState<UserIdentity | null>(null);
    const [viewContext, setViewContext] = useState<ViewContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Escuchamos cambios en el token (Login, Logout, Refresh)
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            setUser(currentUser);
            try {
                if (currentUser) {
                    // Forzamos refresh del token para asegurar claims frescos
                    const tokenResult = await currentUser.getIdTokenResult(true);
                    const claims = tokenResult.claims;

                    // Extracción defensiva de claims
                    let parsedRole = Number(claims.role);
                    let realTenantId = (claims.tenantId as string);

                    // --- HYDRATION FALLBACK (Fix for Vercel/No-Cloud-Functions) ---
                    // If claims are missing, fetch from Firestore Profile
                    if (isNaN(parsedRole) || !realTenantId) {
                        try {
                            // Use static imports for reliability
                            const { doc, getDoc } = await import('firebase/firestore');

                            const userDocRef = doc(db, 'users', currentUser.uid);
                            const userSnapshot = await getDoc(userDocRef);

                            if (userSnapshot.exists()) {
                                const userData = userSnapshot.data();
                                console.log("[AuthContext] Hydrating identity from Firestore:", userData);

                                if (isNaN(parsedRole)) parsedRole = Number(userData.roleLevel || 10);
                                if (!realTenantId) realTenantId = userData.tenantId || "1";
                            }
                        } catch (e) {
                            console.error("[AuthContext] Failed to hydrate from Firestore", e);
                        }
                    }

                    if (isNaN(parsedRole)) {
                        parsedRole = getRoleLevel(claims.role as string);
                    }
                    const realRole = parsedRole || RoleLevel.EXTERNO;
                    realTenantId = realTenantId || "unknown"; // Final fallback

                    const newIdentity: UserIdentity = {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        realRole,
                        realTenantId
                    };

                    setIdentity(newIdentity);

                    // LOGIC: Persist Simulation across refreshes (Superadmin only)
                    const savedSim = localStorage.getItem('superadmin_simulation_context');

                    if (realRole >= RoleLevel.SUPERADMIN && savedSim) {
                        try {
                            const parsed = JSON.parse(savedSim);
                            // Validate structure roughly
                            if (parsed.activeRole && parsed.activeTenantId) {
                                console.log("🔄 Restoring Superadmin Simulation:", parsed);
                                setViewContext({
                                    activeRole: parsed.activeRole,
                                    activeTenantId: parsed.activeTenantId,
                                    isMasquerading: true
                                });
                            } else {
                                throw new Error("Invalid stored context structure");
                            }
                        } catch (e) {
                            console.warn("Failed to restore simulation, resetting:", e);
                            localStorage.removeItem('superadmin_simulation_context');
                            setViewContext({
                                activeRole: realRole,
                                activeTenantId: realTenantId,
                                isMasquerading: false
                            });
                        }
                    } else {
                        // Default: Real Identity
                        setViewContext({
                            activeRole: realRole,
                            activeTenantId: realTenantId,
                            isMasquerading: false
                        });
                    }

                } else {
                    // Logout / No user
                    setIdentity(null);
                    setViewContext(null);
                    localStorage.removeItem('superadmin_simulation_context'); // Clear on logout
                }
            } catch (error) {
                console.error("CRITICAL SECURITY ERROR: Failed to parse auth token", error);

                // [FIX] Don't orphan the user on transient errors. Provide a fallback context.
                // This allows components to render (gracefully degrading) instead of blocking.
                const fallbackIdentity = {
                    uid: currentUser?.uid || "unknown",
                    email: currentUser?.email || null,
                    realRole: RoleLevel.EXTERNO, // Assume worst case
                    realTenantId: "1" // Default to tenant 1 to avoid "Orphan" block, rules will handle security
                };
                setIdentity(fallbackIdentity);
                setViewContext({
                    activeRole: RoleLevel.EXTERNO,
                    activeTenantId: "1",
                    isMasquerading: false
                });
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

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
    // The previous app used `userRole` (string) and `tenantId` (string).
    // We map these to the VIEW CONTEXT to maintain existing UI compatibility,
    // but the underlying security is strictly enforced by rules/identity.

    // Map numerical RoleLevel back to string for legacy components if needed, or update types
    const legacyUserRole = viewContext ? getRoleString(viewContext.activeRole) : 'usuario_externo';
    const legacyTenantId = viewContext ? viewContext.activeTenantId : null;

    // --- CLIENT-SIDE FALLBACK FOR USER CREATION ---
    const createUserProfile = async (user: User, name?: string) => {
        try {
            // Use static db
            // Use dynamic import for Firestore functions only for code splitting if desired, but consistency is better
            const { doc, setDoc, serverTimestamp, getDoc, updateDoc } = await import('firebase/firestore');

            // 1. Check for Invite Code
            const urlParams = new URLSearchParams(window.location.search);
            const inviteCode = urlParams.get('invite');
            let inviteData: any = null;

            if (inviteCode) {
                console.log(`[AuthContext] Found invite code: ${inviteCode}`);
                const inviteRef = doc(db, "invites", inviteCode);
                const inviteSnap = await getDoc(inviteRef);
                if (inviteSnap.exists() && !inviteSnap.data().isUsed) {
                    inviteData = inviteSnap.data();
                }
            }

            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);

            if (!snapshot.exists()) {
                console.log("[AuthContext] Creating user profile on client (Fallback)...");

                // 2. Determine Initial Data (Invite vs Default)
                const finalRole = inviteData?.role || 'usuario_externo';
                const finalTenantId = inviteData?.tenantId || "1";
                const finalProjects = inviteData?.assignedProjectIds || [];
                const autoActive = !!inviteData;

                await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: name || user.displayName || '',
                    photoURL: user.photoURL || '',
                    role: finalRole,
                    roleLevel: getRoleLevel(finalRole),
                    tenantId: finalTenantId,
                    assignedProjectIds: finalProjects,
                    isActive: autoActive,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });

                // 3. Consume Invite
                if (inviteCode && inviteData) {
                    const inviteRef = doc(db, "invites", inviteCode);
                    await updateDoc(inviteRef, {
                        isUsed: true,
                        usedAt: serverTimestamp(),
                        usedBy: user.uid
                    });
                }

                alert("✅ PERFIL DE USUARIO CREADO CORRECTAMENTE (Invitación Procesada)");

                if (inviteCode) {
                    const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                    window.history.replaceState({ path: newUrl }, "", newUrl);
                }

                window.location.reload(); // Refresh to load permissions
            } else {
                console.log("[AuthContext] User profile already exists.");
            }
        } catch (e: any) {
            console.error("[AuthContext] Error creating client-side profile:", e);
            alert("❌ ERROR CREANDO PERFIL: " + e.message);
        }
    };

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            if (result.user) {
                await createUserProfile(result.user);
            }
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
        const result = await signInWithEmailAndPassword(auth, e, p);
        // Fallback: Check/Create profile on login too, in case registration succeeded but DB failed
        if (result.user) {
            await createUserProfile(result.user);
        }
    };

    const registerWithEmail = async (e: string, p: string, name?: string) => {
        const result = await createUserWithEmailAndPassword(auth, e, p);
        if (result.user) {
            if (name) {
                await updateProfile(result.user, { displayName: name });
            }
            await createUserProfile(result.user, name);
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
            loginWithGoogle,
            loginWithEmail,
            registerWithEmail,
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
        case RoleLevel.CONSULTOR: return 'consultor';
        case RoleLevel.EQUIPO: return 'usuario_base';
        case RoleLevel.EXTERNO: return 'usuario_externo';
        default: return 'usuario_externo';
    }
}
