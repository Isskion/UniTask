"use client";

import React, { useState } from 'react';
import { sendPasswordResetEmailAction } from "../actions/auth-actions"; // Server Action
import Link from 'next/link';
import { ArrowLeft, KeyRound, Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState("");

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setIsLoading(true);
        setError("");

        try {
            const result = await sendPasswordResetEmailAction(email);
            if (result.success) {
                setIsSent(true);
            } else {
                setError(result.message || "Error al enviar el correo.");
            }
        } catch (err: any) {
            console.error("Reset Error:", err);
            setError("Error inesperado. Inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#09090b] relative overflow-hidden font-sans">
            {/* Background Ambient similar to Login */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#D32F2F] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse-slow"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>

            <div className="relative z-10 glass-panel p-10 rounded-3xl border border-white/10 flex flex-col items-center max-w-md w-full shadow-2xl backdrop-blur-xl bg-black/40">

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D32F2F] to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-red-900/30">
                    <KeyRound className="w-7 h-7 text-white" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2 text-center">
                    Restablecer Contraseña
                </h1>

                {!isSent ? (
                    <>
                        <p className="text-zinc-400 text-sm mb-8 text-center leading-relaxed">
                            Ingresa tu correo electrónico y te enviaremos las instrucciones para recuperar tu cuenta.
                        </p>

                        <form onSubmit={handleReset} className="w-full space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-zinc-500 ml-1">EMAIL REGISTRADO EN UNITASKCONTROLLER</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nombre@empresa.com"
                                        required
                                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all placeholder:text-zinc-600"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-zinc-100 hover:bg-white text-black font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.01] flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:hover:scale-100 mt-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Enlace"}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center w-full animate-in fade-in zoom-in-95 duration-300">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6 flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                            <p className="text-green-400 font-medium text-sm">¡Correo Enviado!</p>
                        </div>
                        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                            Hemos enviado un enlace de recuperación a <span className="text-white font-medium">{email}</span>. <br />
                            Revisa tu bandeja de entrada (y spam).
                        </p>
                        <button
                            onClick={() => setIsSent(false)}
                            className="text-xs text-zinc-500 hover:text-white underline mb-4"
                        >
                            ¿No lo recibiste? Intentar de nuevo
                        </button>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-white/5 w-full flex justify-center">
                    <Link href="/login" className="text-sm text-zinc-500 hover:text-white flex items-center gap-2 transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Volver a Iniciar Sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
