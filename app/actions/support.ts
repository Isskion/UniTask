import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

interface SupportSubmission {
    userId: string;
    userName: string;
    userEmail: string;
    tenantId: string;
    message: string;
    context: string;
}

export async function submitSupportAction(data: SupportSubmission) {
    try {
        const supportFn = httpsCallable(functions, 'submitSupport');
        const result = await supportFn(data);
        return result.data as { success: boolean; ticketId?: string; error?: string };
    } catch (e: any) {
        console.error("Support Action error:", e);
        return { success: false, ticketId: undefined, error: e.message };
    }
}
