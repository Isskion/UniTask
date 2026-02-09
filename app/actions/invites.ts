import { app } from "@/lib/firebase"; // Import 'app' instead of 'functions'
import { getFunctions, httpsCallable } from "firebase/functions";

interface CreateInviteResult {
    success: boolean;
    code?: string;
    error?: string;
}

/**
 * CLIENT-SIDE WRAPPER: Call the secure 'inviteUser' Cloud Function
 * 
 * @param idToken - Firebase ID Token from client (passed automatically by SDK usually, but function expects it if manual)
 * @param tenantId - Target tenant for the new user
 * @param targetRole - Role to assign to the new user
 * @param assignedProjectIds - Projects to assign
 */
export async function createInviteAction(
    idToken: string, // Kept for signature compatibility, but SDK handles auth usually.
    tenantId: string,
    targetRole: string,
    assignedProjectIds: string[] = [],
    newTenantName?: string
): Promise<CreateInviteResult> {
    try {
        // Explicitly target europe-west1 to match deployment and solve IAM/403 issues
        const functionsEU = getFunctions(app, 'europe-west1');
        const inviteFn = httpsCallable(functionsEU, 'inviteUser');

        const result = await inviteFn({
            tenantId,
            targetRole,
            assignedProjectIds,
            newTenantName
        });

        return result.data as CreateInviteResult;
    } catch (error: any) {
        console.error("❌ [Client] Invite Error:", error);
        return { success: false, code: undefined, error: error.message || "Error interno" };
    }
}

export async function deactivateInviteAction(code: string): Promise<{ success: boolean; error?: string }> {
    try {
        const functionsEU = getFunctions(app, 'europe-west1');
        const deactivateFn = httpsCallable(functionsEU, 'deactivateInvite');
        await deactivateFn({ code });
        return { success: true };
    } catch (error: any) {
        console.error("❌ [Client] Deactivate Error:", error);
        return { success: false, error: error.message || "Error al desactivar invitación" };
    }
}
