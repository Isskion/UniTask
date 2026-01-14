"use client";

import { useAuth } from "@/context/AuthContext";
import { Loader2, UserCircle2 } from "lucide-react";
import WeeklyEditor from "@/components/WeeklyEditor";
import FirebaseDiagnostic from "@/components/FirebaseDiagnostic";
import { UIProvider } from "@/context/UIContext";
import { ToastProvider } from "@/context/ToastContext";

export default function AppWrapper() {
    const { user, loading, loginWithGoogle, userRole } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#D32F2F]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-black relative overflow-hidden">
                {/* Background Ambient */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#D32F2F] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-orange-600 rounded-full mix-blend-screen filter blur-[100px] opacity-10"></div>

                <div className="relative z-10 glass-panel p-12 rounded-3xl border border-white/10 flex flex-col items-center max-w-md w-full shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D32F2F] to-orange-600 flex items-center justify-center mb-6 shadow-lg shadow-red-900/50">
                        <UserCircle2 className="w-8 h-8 text-white" />
                    </div>

                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent mb-2">
                        UniTaskController
                    </h1>
                    <p className="text-zinc-500 text-sm mb-8 text-center">
                        Gestión inteligente de proyectos y tareas
                    </p>

                    <button
                        onClick={loginWithGoogle}
                        className="w-full bg-white text-black font-bold py-3 px-6 rounded-xl hover:bg-zinc-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        Iniciar sesión con Google
                    </button>

                    <p className="mt-6 text-xs text-zinc-600 text-center">
                        Acceso restringido a personal autorizado. <br />
                        Contacta con soporte si no tienes acceso.
                    </p>
                </div>
                {/* Login screen diagnostic hidden for security */}
            </div>
        );
    }

    return (
        <UIProvider>
            <ToastProvider>
                <WeeklyEditor />
                {userRole === 'superadmin' && <FirebaseDiagnostic />}
            </ToastProvider>
        </UIProvider>
    );
}
