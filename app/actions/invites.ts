'use server'

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

interface CreateInviteResult {
    success: boolean;
    code?: string;
    error?: string;
}

function generateCode(length = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getRoleLevelNum(role: string): number {
    switch (role) {
        case 'superadmin': return 100;
        case 'app_admin': return 80;
        case 'global_pm': return 60;
        case 'consultor': return 20;
        case 'usuario_base': return 10;
        case 'usuario_externo': return 5;
        default: return 0;
    }
}

/**
 * SERVER ACTION: Securely create an invitation
 * Validates session, enforces limits, checks hierarchy, and writes to DB using Admin SDK.
 * 
 * @param idToken - Firebase ID Token from client (required to verify identity on server)
 * @param tenantId - Target tenant for the new user
 * @param targetRole - Role to assign to the new user
 * @param assignedProjectIds - Projects to assign
 */
export async function createInviteAction(
    idToken: string,
    tenantId: string,
    targetRole: string,
    assignedProjectIds: string[] = []
): Promise<CreateInviteResult> {
    try {
        console.log("🔒 [Server Action] createInvite called");

        if (!idToken) {
            return { success: false, error: "Autenticación requerida (Token missing)" };
        }

        // 1. Verify ID Token
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get Creator User Data (Role)
        // We trust the token role if present, or fetch from DB
        let creatorRole = decodedToken.role as string;
        if (!creatorRole) {
            const userDoc = await adminDb.collection('users').doc(uid).get();
            if (!userDoc.exists) throw new Error("User not found");
            creatorRole = userDoc.data()?.role || 'usuario_externo';
        }

        const creatorLevel = getRoleLevelNum(creatorRole);
        const targetLevel = getRoleLevelNum(targetRole);

        // 2. Security Checks

        // Block unauthorized roles
        if (creatorLevel < 80) {
            return { success: false, error: "Permisos insuficientes: Solo Administradores pueden crear invitaciones." };
        }

        // Logic for App Admin (Level 80)
        if (creatorLevel === 80) {
            // A. Prevent Role Escalation
            if (targetLevel >= 80) {
                return { success: false, error: "Seguridad: No puedes crear invitaciones para un rol igual o superior al tuyo." };
            }

            // B. Enforce Limit of 5 Total Invites
            // Using Admin SDK to query safely (user cannot spoof this query)
            const q = adminDb.collection('invites').where("createdBy", "==", uid);
            const snapshot = await q.get();

            if (snapshot.size >= 5) {
                return { success: false, error: "Límite TOTAL alcanzado: Solo puedes generar 5 invitaciones en total." };
            }
        }

        // 3. Create Invite
        const code = generateCode();
        // Check collision (paranoid check)
        const exists = await adminDb.collection('invites').doc(code).get();
        if (exists.exists) {
            return createInviteAction(idToken, tenantId, targetRole, assignedProjectIds); // Retry recursion
        }

        await adminDb.collection('invites').doc(code).set({
            code,
            createdBy: uid,
            createdAt: FieldValue.serverTimestamp(),
            isUsed: false,
            tenantId,
            role: targetRole,
            assignedProjectIds
        });

        console.log(`✅ [Server Action] Invite created: ${code} by ${uid}`);
        return { success: true, code };

    } catch (error: any) {
        console.error("❌ [Server Action] Error:", error);
        return { success: false, error: error.message || "Error interno del servidor" };
    }
}
