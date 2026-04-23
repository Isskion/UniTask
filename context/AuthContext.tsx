"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { auth, db } from '../lib/firebase'; // Fixed path to lib/firebase
import { onIdTokenChanged, User, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
    const profileUnsubRef = useRef<(() => void) | null>(null);
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const lastRefreshTimeRef = useRef<number>(0);
    const refreshCountRef = useRef<number>(0);

    // [STABILITY] Set explicit persistence for browser sessions
    useEffect(() => {
        setPersistence(auth, browserLocalPersistence)
            .then(() => console.log("[AuthContext] 🔐 Persistence set to LOCAL."))
            .catch(err => console.error("[AuthContext] Failed to set persistence:", err));
    }, []);

    useEffect(() => {
        // Escuchamos cambios en el token (Login, Logout, Refresh)
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            // [FIX] Cleanup previous listeners and timers to prevent "zombie" refreshes
            if (profileUnsubRef.current) {
                console.log("[AuthContext] 🧹 Cleaning up previous profile listener...");
                profileUnsubRef.current();
                profileUnsubRef.current = null;
            }
            if (refreshTimerRef.current) {
                console.log("[AuthContext] 🧹 Cleaning up pending refresh timer...");
                clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }

            if (currentUser) {
                // Initial Load: Get current token result
                let tokenResult = await currentUser.getIdTokenResult();
                let claims = tokenResult.claims;

                // --- REAL-TIME PROFILE SYNC LISTENER ---
                // "The Consumer": Watches for backend modifications to trigger Token Refresh
                const { doc, onSnapshot } = await import('firebase/firestore');

                // Debounce timer reference
                let refreshTimer: NodeJS.Timeout | null = null;

                profileUnsubRef.current = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
                    const isRepairPage = window.location.pathname.startsWith('/repair');
                    if (!snapshot.exists()) {
                        if (isRepairPage) {
                            console.log("[AuthContext] 🛠️ User has no Firestore profile but is on /repair. Allowing session.");
                            setUserProfile(null); // Explicit clear
                            return;
                        }
                        console.warn("[AuthContext] ⚠️ User has no Firestore profile. UI will be restricted.");
                        // [STABILITY] Don't signOut() yet, let NoTenantBlocker handle the orphan state.
                        // This prevents "falling out" if the snapshot is just missing momentarily.
                        setIdentity(prev => prev ? { ...prev, realRole: 0 as RoleLevel, realTenantId: "unknown" } : null);
                        setViewContext(null); // Triggers loading/blocker
                        return;
                    }

                    const data = snapshot.data();

                    // Block users with no valid tenant
                    if (!data.tenantId || data.tenantId === "unknown") {
                        if (isRepairPage) {
                            console.log("[AuthContext] 🛠️ User has invalid tenantId but is on /repair. Allowing session.");
                            setUserProfile(data as UserProfile);
                            return;
                        }
                        console.warn("[AuthContext] ⚠️ User has invalid tenantId. UI will be restricted.");
                        // [STABILITY] Don't signOut(), just restrict identity to trigger blocker
                        setIdentity(prev => prev ? { ...prev, realTenantId: "unknown" } : null);
                        setViewContext(null);
                        return;
                    }

                    const latestSyncId = Number(data.syncId) || 0;
                    const currentSyncId = Number(claims.syncId) || 0;

                    // Logic: If backend says "I updated claims at X" and token says "I have claims from < X", refresh.
                    // Also refresh if roleLevel/tenantId mismatches critically.
                    // [HARDEN] Increase threshold to 2s to allow for propagation skew
                    const syncStale = latestSyncId > (currentSyncId + 2000);
                    const roleMismatch = Number(data.roleLevel) !== Number(claims.roleLevel);
                    const tenantMismatch = String(data.tenantId) !== String(claims.tenantId);

                    // [FIX] syncStale alone should NOT trigger a refresh if role and tenant already match.
                    const needsRefresh = roleMismatch || tenantMismatch;

                    if (syncStale && !needsRefresh) {
                        console.log(`[AuthContext] ℹ️ SyncId stale but role/tenant match — skipping refresh. (FS:${latestSyncId} vs TK:${currentSyncId})`);
                    }

                    if (needsRefresh) {
                        console.log(`[AuthContext] ⚠️ Refresh Triggered: 
                            Role=${roleMismatch} (FS:${data.roleLevel}[${typeof data.roleLevel}] vs TK:${claims.roleLevel}[${typeof claims.roleLevel}]), 
                            Tenant=${tenantMismatch} (FS:${data.tenantId}[${typeof data.tenantId}] vs TK:${claims.tenantId}[${typeof claims.tenantId}]), 
                            SyncStale=${syncStale}`);

                        // [OPTIMISTIC] Still update the UI profile so the name/photo reflects immediately
                        setUserProfile(data as UserProfile);

                        // --- LOOP GUARD ---
                        const now = Date.now();
                        if (now - lastRefreshTimeRef.current < 60000) {
                            refreshCountRef.current++;
                        } else {
                            refreshCountRef.current = 1;
                            lastRefreshTimeRef.current = now;
                        }

                        if (refreshCountRef.current > 2) {
                            console.warn("[AuthContext] 🛡️ Refresh loop detected! Using Firestore profile as source of truth instead of looping.");
                            
                            // [HEAL] Attempt to trigger a server-side sync to fix the stale token
                            console.log("[AuthContext] 🛠️ Attempting self-healing sync for UID:", currentUser.uid);
                            import('@/app/actions/auth-actions')
                                .then(({ syncUserClaimsAction }) => {
                                    syncUserClaimsAction(currentUser.uid)
                                        .then(res => {
                                            if (res.success) {
                                                console.log("[AuthContext] ✅ Self-healing sync triggered successfully.");
                                            } else {
                                                console.error("[AuthContext] ❌ Self-healing sync failed:", res.message);
                                            }
                                        })
                                        .catch(err => console.error("[AuthContext] ❌ syncUserClaimsAction error:", err));
                                })
                                .catch(err => console.error("[AuthContext] ❌ Failed to import auth-actions:", err));

                            const firestoreRole = (Number(data.roleLevel) || 0) as RoleLevel;
                            const firestoreTenant = String(data.tenantId) || "unknown";

                            setIdentity({
                                uid: currentUser.uid,
                                email: currentUser.email,
                                realRole: firestoreRole,
                                realTenantId: firestoreTenant
                            });

                            setViewContext(prev => prev?.isMasquerading ? prev : {
                                activeRole: firestoreRole,
                                activeTenantId: firestoreTenant,
                                isMasquerading: false
                            });

                            setLoading(false);
                            return;
                        }

                        console.log(`[AuthContext] ⚠️ Profile mismatch detected (Refreshes in window: ${refreshCountRef.current}). Scheduling forced token refresh...`);

                        // [FIX] Use refreshTimerRef to ensure total cleanup
                        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

                        refreshTimerRef.current = setTimeout(async () => {
                            console.log("[AuthContext] 🔄 Executing Forced Token Refresh...");
                            try {
                                tokenResult = await currentUser.getIdTokenResult(true); // Force Refresh
                                const newClaims = tokenResult.claims;
                                console.log("[AuthContext] ✅ Token Refreshed. New Claims:", newClaims);

                                // Update claims in the current scope for subsequent logic
                                claims = newClaims;

                                // Check if mismatch is STILL present after refresh
                                const stillMismatched = Number(data.roleLevel) !== Number(newClaims.roleLevel) ||
                                    String(data.tenantId) !== String(newClaims.tenantId);

                                if (stillMismatched) {
                                    // Claims didn't update — Cloud Function hasn't propagated yet.
                                    // Use Firestore profile directly as source of truth.
                                    console.warn(`[AuthContext] ⚠️ Token claims still mismatched after refresh. (FS:${data.roleLevel} vs TK:${newClaims.roleLevel}). Using Firestore profile values.`);
                                    const firestoreRole = (Number(data.roleLevel) || 0) as RoleLevel;
                                    const firestoreTenant = String(data.tenantId) || "unknown";

                                    setIdentity({
                                        uid: currentUser.uid,
                                        email: currentUser.email,
                                        realRole: firestoreRole,
                                        realTenantId: firestoreTenant
                                    });
                                    setViewContext(prev => prev?.isMasquerading ? prev : {
                                        activeRole: firestoreRole,
                                        activeTenantId: firestoreTenant,
                                        isMasquerading: false
                                    });
                                } else {
                                    // Re-evaluate identity with NEW token
                                    let newRole = Number(newClaims.roleLevel);
                                    if (isNaN(newRole) && newClaims.role) {
                                        console.log("[AuthContext] ⚠️ claims.roleLevel missing, falling back to legacy claims.role mapping.");
                                        newRole = getRoleLevel(newClaims.role as string);
                                    }
                                    newRole = (newRole || 0) as RoleLevel;
                                    const newTenant = (newClaims.tenantId as string) || "unknown";

                                    setIdentity({
                                        uid: currentUser.uid,
                                        email: currentUser.email,
                                        realRole: newRole,
                                        realTenantId: newTenant
                                    });
                                    setViewContext(prev => prev?.isMasquerading ? prev : {
                                        activeRole: newRole,
                                        activeTenantId: newTenant,
                                        isMasquerading: false
                                    });
                                }

                                setLoading(false);
                            } catch (e) {
                                console.error("[AuthContext] Token refresh failed:", e);
                                // Fallback: use Firestore profile
                                const firestoreRole = (Number(data.roleLevel) || 0) as RoleLevel;
                                const firestoreTenant = String(data.tenantId) || "unknown";
                                setViewContext(prev => prev?.isMasquerading ? prev : {
                                    activeRole: firestoreRole,
                                    activeTenantId: firestoreTenant,
                                    isMasquerading: false
                                });
                                setLoading(false);
                            } finally {
                                refreshTimerRef.current = null;
                            }
                        }, 3000); // 3 seconds total wait
                    } else {
                        // Optimistic Profile Hydration for UI display ONLY (Not security)
                        setUserProfile(data as UserProfile);
                    }
                }, (error) => {
                    if (error.code === 'permission-denied') {
                        console.log("[AuthContext] Permission denied for profile listener (expected during logout).");
                    } else {
                        console.error("[AuthContext] Profile listener error:", error);
                    }
                });

                // [SECURITY] Quick profile existence check BEFORE allowing the app to render
                const { doc: docRef, getDoc: getDocSnap } = await import('firebase/firestore');
                const profileSnap = await getDocSnap(docRef(db, 'users', currentUser.uid));
                const isRepairPath = window.location.pathname.startsWith('/repair');

                if (!profileSnap.exists()) {
                    if (isRepairPath) {
                        console.log("[AuthContext] 🛠️ Initial load: Missing profile allowed on /repair.");
                    } else {
                        console.error(`[AuthContext] ⚠️ Initial check: UID ${currentUser.uid} has no profile. Restricting session...`);
                        setIdentity(prev => prev ? { ...prev, realRole: 0 as RoleLevel, realTenantId: "unknown" } : null);
                        setViewContext(null);
                        setLoading(false);
                        return;
                    }
                }
                const profileData = profileSnap.data();
                if (!profileData?.tenantId || profileData.tenantId === "unknown" || profileData.tenantId === "__DENY__") {
                    if (isRepairPath) {
                        console.log("[AuthContext] 🛠️ Initial load: Invalid tenant allowed on /repair.");
                    } else {
                        console.error(`[AuthContext] ⚠️ Initial check: User profile ${currentUser.uid} has invalid tenantId: ${profileData?.tenantId}. Restricting UI.`);
                        setIdentity(prev => prev ? { ...prev, realTenantId: "unknown" } : null);
                        setViewContext(null);
                        setLoading(false);
                        return;
                    }
                }

                // Setup efficient state update on initial load (without waiting for listener)
                // [Harden] Mapped roleLevel fallback for initial load
                let parsedRole = Number(claims.roleLevel);
                if (isNaN(parsedRole) && claims.role) {
                    parsedRole = getRoleLevel(claims.role as string);
                }
                parsedRole = parsedRole || 0;

                let realTenantId = (claims.tenantId as string) || "unknown";

                const newIdentity: UserIdentity = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    realRole: parsedRole,
                    realTenantId
                };

                setIdentity(newIdentity);
                setUser(currentUser);
                setUserProfile(profileData as UserProfile); // [NEW] Initial hydration

                // Initialize View Context
                const savedSim = localStorage.getItem('superadmin_simulation_context');
                if (parsedRole >= RoleLevel.SUPERADMIN && savedSim) {
                    try {
                        const parsed = JSON.parse(savedSim);
                        setViewContext({
                            activeRole: parsed.activeRole,
                            activeTenantId: parsed.activeTenantId,
                            isMasquerading: true
                        });
                    } catch (e) {
                        setViewContext({ activeRole: parsedRole, activeTenantId: realTenantId, isMasquerading: false });
                    }
                } else {
                    setViewContext({ activeRole: parsedRole, activeTenantId: realTenantId, isMasquerading: false });
                }

                setLoading(false);

                // Cleanup internal listener on unmount/change
                // Note: We can't easily return cleanup for the inner effect from onIdTokenChanged. 
                // Ideally this listener logic would be a separate useEffect dependent on 'user'.
                // But for now, this closure works for the active session.

            } else {
                // Logout / No user
                setUser(null);
                setIdentity(null);
                setViewContext(null);
                setUserProfile(null);
                localStorage.removeItem('superadmin_simulation_context');
                setLoading(false);
            }
        });

        return () => unsubscribe();
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
        try {
            await signInWithEmailAndPassword(auth, e, p);
        } catch (error: any) {
            const currentProjectId = auth.app.options.projectId;
            console.error("[AuthContext] loginWithEmail FAILED");
            console.error("- Error Code:", error.code);
            console.error("- Error Message:", error.message);
            console.error("- Project ID:", currentProjectId);
            console.error("- Auth Domain:", auth.app.options.authDomain);
            console.log("- Full Raw Error:", error);

            if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-found' || error.code === 'auth/invalid-app-credential') {
                console.error("[AuthContext] 🚨 CONFIG ERROR: The API Key or App ID in .env.local might be invalid for project:", currentProjectId);
            }

            if (error.code === 'auth/unauthorized-domain') {
                console.error("[AuthContext] 🚨 DOMAIN ERROR: 'localhost' is not authorized in Firebase Console for this project.");
            }

            if (error.code === 'auth/wrong-password') {
                console.warn(`[AuthContext] 🛡️ AUTH FAILED: Incorrect password or project mismatch. (Target: ${currentProjectId})`);
            }

            if (error.code === 'auth/network-request-failed' || error.message?.includes('404')) {
                console.error("[AuthContext] 🚨 404 or Network failure detected during sign-in. Check .env.local for quotes or API key validity.");
            }
            throw error;
        }
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
