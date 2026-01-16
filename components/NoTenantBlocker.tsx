"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { RoleLevel } from '@/types';
import { GlobalHeader } from './GlobalHeader';

export function NoTenantBlocker({ children }: { children: React.ReactNode }) {
    const { user, tenantId, loading, identity } = useAuth();
    const ADMIN_EMAIL = 'argoss01@gmail.com';

    useEffect(() => {
        if (!loading && user && !tenantId) {
            // Robust Role Check
            const currentRole = identity?.realRole ? Number(identity.realRole) : 0;

            // Superadmin Bypass: Just log warning, don't scream
            if (currentRole >= RoleLevel.SUPERADMIN || user.email === ADMIN_EMAIL) {
                console.warn("[NoTenantBlocker] Superadmin has no active Tenant ID. Allowing access for debugging.");
                return;
            }

            // Trigger Notification Logic for regular users
            const notificationData = {
                userEmail: user.email,
                userId: user.uid,
                userName: user.displayName,
                timestamp: new Date().toISOString(),
                reason: "Login attempt without Tenant ID",
                debug: {
                    role: currentRole,
                    identityExists: !!identity,
                    rawRole: identity?.realRole
                }
            };

            console.error(`[SECURITY ALERT] Orphan User Detected! Notification sent to ${ADMIN_EMAIL}`, notificationData);
        }
    }, [user, tenantId, loading, identity]);

    if (loading) {
        return <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-500">Cargando...</div>;
    }

    // Bypass for Superadmin to prevent lockout
    const safeRole = identity?.realRole ? Number(identity.realRole) : 0;
    if (safeRole >= RoleLevel.SUPERADMIN) {
        return (
            <div className="min-h-screen flex flex-col">
                <GlobalHeader />
                <div className="flex-1 flex flex-col min-h-0">
                    {children}
                </div>
            </div>
        );
    }

    if (user && !tenantId) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-6 animate-pulse" />
                <h1 className="text-2xl font-bold mb-2 text-red-500 uppercase tracking-widest">Acceso Denegado</h1>
                <p className="text-zinc-400 max-w-md mb-8">
                    Tu cuenta no está asociada a ninguna organización (Tenant).
                    <br /><br />
                    <strong>Se ha enviado una notificación automática al administrador ({ADMIN_EMAIL})</strong> con los detalles de tu intento de acceso.
                </p>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg text-xs text-left font-mono text-zinc-500 w-full max-w-md">
                    <p>User: {user.email}</p>
                    <p>UID: {user.uid}</p>
                    <p>Time: {format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
                    <p>Status: ORPHAN_USER</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-medium transition-colors"
                >
                    Reintentar Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <GlobalHeader />
            <div className="flex-1 flex flex-col min-h-0">
                {children}
            </div>
        </div>
    );
}
