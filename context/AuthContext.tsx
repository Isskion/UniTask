"use strict";
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    userRole: string | null;
    loginWithGoogle: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Check/Create User Document in Firestore
                    const userRef = doc(db, "user", currentUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        if (currentUser.email === 'argoss01@gmail.com') {
                            console.log("👑 Super Admin identified. Forcing role update.");
                            if (userData.role !== 'app_admin' || !userData.isActive) {
                                await setDoc(userRef, { role: 'app_admin', isActive: true }, { merge: true });
                                setUserRole('app_admin');
                            } else {
                                setUserRole('app_admin');
                            }
                        } else {
                            // If user is inactive, we might want to restrict role or handle it in UI
                            // For now, we trust the role, but UI should check isActive
                            setUserRole(userData.role || "usuario_base");
                        }
                    } else {
                        // First login: Create User Document
                        let isActive = false; // Default to pending
                        let initialRole = "usuario_base";

                        // Check for invite code in URL
                        const urlParams = new URLSearchParams(window.location.search);
                        const inviteCode = urlParams.get("invite");

                        if (inviteCode) {
                            // Dynamically import to avoid circular dependencies if any, though here it's fine
                            const { checkInvite, consumeInvite } = await import("@/lib/invites");
                            const check = await checkInvite(inviteCode);

                            if (check.valid) {
                                console.log("Valid invite found! Auto-approving user.");
                                isActive = true;
                                await consumeInvite(inviteCode, currentUser.uid);
                            } else {
                                console.warn("Invalid invite code:", check.reason);
                            }
                        } else {
                            // Fallback: Check if this is the VERY first user (could be admin)
                            // Optional: For now, we assume first user setup was done manually or we want secure by default.
                            // set isActive = false.
                        }

                        await setDoc(userRef, {
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            photoURL: currentUser.photoURL,
                            role: initialRole,
                            isActive: isActive,
                            createdAt: serverTimestamp(),
                            lastLogin: serverTimestamp()
                        });

                        setUserRole(initialRole);
                        // Force reload or state update might be needed if isActive affects role, 
                        // but currently we set role regardless. UI will need to check isActive.
                    }
                } catch (err: any) {
                    console.error("Firestore access error:", err);
                    setUserRole("usuario_base");

                    if (err.code === 'unavailable' || err.message.includes('offline')) {
                        console.warn("Firestore appears offline. Check network or Security Rules.");
                    }
                }
            } else {
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            // Mostrar el error real para depurar
            let msg = "Error al iniciar sesión.";
            if ((error as any).code === 'auth/unauthorized-domain') {
                msg += "\n\nDOMINIO NO AUTORIZADO:\nEste dominio (localhost o tu IP) no está en la lista de dominios autorizados en Firebase Console > Authentication > Settings.";
            } else if ((error as any).code === 'auth/api-key-not-valid') {
                msg += "\n\nAPI KEY INVÁLIDA:\nVerifica lib/firebase.ts";
            } else {
                msg += `\n\nDetalles: ${(error as any).message}`;
            }
            alert(msg);
        }
    };

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await import("firebase/auth").then(({ signInWithEmailAndPassword }) =>
                signInWithEmailAndPassword(auth, email, password)
            );
        } catch (error: any) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const registerWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Set Display Name immediately so Firestore listener picks it up
            await updateProfile(userCredential.user, {
                displayName: displayName
            });

            // Note: The onAuthStateChanged listener in useEffect above handles creating the 
            // Firestore document and processing any Invite Code found in the URL.

        } catch (error: any) {
            console.error("Registration failed", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, userRole, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
