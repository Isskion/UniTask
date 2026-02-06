import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

export async function sendPasswordResetEmailAction(email: string) {
    if (!email) return { success: false, message: "Email requerido" };

    try {
        const resetFn = httpsCallable(functions, 'resetPassword');
        const result = await resetFn({ email });

        return result.data as { success: boolean; message?: string };
    } catch (error: any) {
        console.error("Auth Action Error:", error);
        return { success: false, message: error.message || "Error desconocido" };
    }
}

export async function syncUserClaimsAction(targetUserId: string) {
    if (!targetUserId) return { success: false, message: "UID requerido" };

    try {
        const syncFn = httpsCallable(functions, 'syncUserClaims');
        const result = await syncFn({ targetUserId });

        return result.data as { success: boolean; claims?: any };
    } catch (error: any) {
        console.error("Sync Claims Action Error:", error);
        return { success: false, message: error.message || "Error al sincronizar permisos" };
    }
}
