"use client";

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getRoleLevel } from '@/types';

export type AccessScopes = { regionIds: string[]; divisionIds: string[] } | null;

/**
 * Returns the current user's SAM access scopes.
 * Returns null for admins (>= 80) and superadmins → no filtering applied.
 */
export function useAccessScopes(): AccessScopes {
    const { user, userRole } = useAuth();
    const [scopes, setScopes] = useState<AccessScopes>(undefined as unknown as AccessScopes);

    useEffect(() => {
        if (!user?.uid) return;
        if (getRoleLevel(userRole) >= 80) {
            setScopes(null); // admins bypass SAM
            return;
        }
        getDoc(doc(db, 'users', user.uid)).then(snap => {
            setScopes(snap.exists() ? (snap.data()?.accessScopes ?? null) : null);
        }).catch(() => setScopes(null));
    }, [user?.uid, userRole]);

    return scopes;
}
