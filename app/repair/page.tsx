
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { syncUserClaimsAction } from '@/app/actions/auth-actions';
import { ShieldAlert, RefreshCw, CheckCircle2, LogOut, Home, Info } from 'lucide-react';
import Link from 'next/link';

export default function RepairPage() {
    const { user, identity, userProfile, logout, loading } = useAuth();
    const [syncing, setSyncing] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    console.log("[RepairPage] Render State:", {
        hasUser: !!user,
        uid: user?.uid,
        loading,
        hasProfile: !!userProfile,
        tenantId: identity?.realTenantId
    });

    const handleSync = async () => {
        if (!user) return;
        setSyncing(true);
        setMessage({ type: 'info', text: 'Sincronizando permisos con el servidor...' });

        try {
            const result = await syncUserClaimsAction(user.uid);
            if (result.success) {
                setMessage({ type: 'success', text: 'Permisos sincronizados correctamente. Por favor, refresca la página o inicia sesión de nuevo.' });
            } else {
                const errorMsg = (result as any).message || 'Error al sincronizar permisos.';
                setMessage({ type: 'error', text: errorMsg });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error inesperado.' });
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black">
                <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-black relative overflow-hidden font-sans text-white">
            {/* Background Ambient */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#D32F2F] rounded-full mix-blend-screen filter blur-[120px] opacity-10"></div>

            <div className="relative z-10 glass-panel p-8 rounded-3xl border border-white/10 flex flex-col max-w-xl w-full shadow-2xl animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-red-500/20 rounded-2xl">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Reparación de Sesión</h1>
                        <p className="text-zinc-500 text-sm">Herramienta de auto-recuperación de cuenta</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Diagnostic Info */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">
                            <Info className="w-3 h-3" /> Estado del Sistema
                        </div>

                        <div className="grid grid-cols-3 gap-y-2">
                            <span className="text-zinc-500">UID:</span>
                            <span className="col-span-2 text-zinc-300 font-mono truncate text-xs">{user?.uid || 'No autenticado'}</span>

                            <span className="text-zinc-500">Email:</span>
                            <span className="col-span-2 text-zinc-300">{user?.email || 'N/A'}</span>

                            <span className="text-zinc-500">Perfil:</span>
                            <span className="col-span-2 flex items-center gap-2">
                                {userProfile ? (
                                    <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Encontrado</span>
                                ) : (
                                    <span className="text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> No encontrado</span>
                                )}
                            </span>

                            <span className="text-zinc-500">Tenant:</span>
                            <span className="col-span-2 text-white font-bold">{identity?.realTenantId || 'Faltante'}</span>

                            <span className="text-zinc-500">Nivel Rol:</span>
                            <span className="col-span-2 text-white font-bold">{identity?.realRole || 0}</span>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm animate-in slide-in-from-top-2 flex items-start gap-3 border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                            message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}>
                            {message.type === 'error' ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                            <div>{message.text}</div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleSync}
                            disabled={!user || syncing}
                            className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                            Sincronizar mi perfil
                        </button>

                        <div className="flex gap-3">
                            <Link href="/" className="flex-1">
                                <span className="w-full bg-zinc-900 text-zinc-400 border border-white/10 font-bold py-3 px-6 rounded-xl hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer">
                                    <Home className="w-4 h-4" /> Volver
                                </span>
                            </Link>
                            <button
                                onClick={() => logout()}
                                className="bg-zinc-900 text-zinc-400 border border-white/10 font-bold py-3 px-4 rounded-xl hover:bg-red-950/20 hover:text-red-500 transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
