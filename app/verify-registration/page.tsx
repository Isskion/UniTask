"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function VerifyRegistrationPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState("Verificando tu cuenta...");
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage("Token no válido o ausente.");
            return;
        }

        const complete = async () => {
            try {
                // We use dynamic import for firebase to avoid SSR issues if any
                const { getFunctions, httpsCallable } = await import('firebase/functions');
                const { app } = await import('@/lib/firebase');
                const functionsEU = getFunctions(app, 'europe-west1');
                const completeFn = httpsCallable(functionsEU, 'completeRegistration');

                const result = await completeFn({ token });
                const data = result.data as { success: boolean; message?: string };

                if (data.success) {
                    setStatus('success');
                    setMessage(data.message || "¡Registro completado con éxito!");
                    // Auto redirect after 3 seconds
                    setTimeout(() => {
                        router.push('/');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage("Error al completar el registro.");
                }
            } catch (error: any) {
                console.error("Verification Error:", error);
                setStatus('error');
                setMessage(error.message || "Ocurrió un error inesperado al verificar tu cuenta.");
            }
        };

        complete();
    }, [token, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
                <div className="mb-6 flex justify-center">
                    <img src="/brand-white.png" alt="UniTask" className="h-10 w-auto" />
                </div>

                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-red-500 animate-spin mx-auto" />
                        <h2 className="text-xl font-bold text-white">Verificando registro</h2>
                        <p className="text-zinc-400 text-sm">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">¡Todo listo!</h2>
                        <p className="text-zinc-300">{message}</p>
                        <p className="text-zinc-500 text-xs">Redirigiendo al inicio en unos segundos...</p>
                        <div className="pt-4">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-2 bg-white text-black font-bold py-2 px-6 rounded-lg hover:bg-zinc-200 transition-all"
                            >
                                Ir a Inicio <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                        <h2 className="text-2xl font-bold text-white">Opps...</h2>
                        <p className="text-red-400 text-sm font-medium">{message}</p>
                        <p className="text-zinc-500 text-xs leading-relaxed">
                            El enlace puede haber caducado o ya ha sido utilizado.
                            Intenta registrarte de nuevo o contacta con el administrador.
                        </p>
                        <div className="pt-4">
                            <Link
                                href="/"
                                className="text-zinc-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                Volver al inicio
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
