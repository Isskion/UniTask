import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { getRoleLevel } from "@/types"; // We will need to import this helper or replicate it

export interface InviteCode {
    code: string;
    createdBy: string; // Admin UID
    createdAt: any;
    usedAt?: any;
    usedBy?: string; // User UID who used it
    isUsed: boolean;
    expiresAt?: any; // Optional expiration
    tenantId: string; // Target Tenant for the new user
    role: string;    // [NEW] Target Role
    assignedProjectIds: string[]; // [NEW] Target Projects
}

const INVITES_COLLECTION = "invites";

/**
 * Generates a random alphanumeric code
 */
function generateCode(length = 8): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, 1, O, 0 to avoid confusion
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Helper to get user role level from string
 * Ideally this should be imported from types.ts to avoid duplication
 */
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
 * Creates a new one-time invite code with specific permissions
 * Incorporates security limits:
 * - Block Global_PM (level 60) and below
 * - Limit App_Admin (level 80) to max 5 active invites
 * - Block App_Admin from creating invites for roles >= 80
 */
export async function createInvite(
    adminUid: string,
    tenantId: string = "1",
    role: string = "usuario_externo",
    assignedProjectIds: string[] = [],
    creatorRole: string // Pass creator role to validate permissions
): Promise<string> {

    const creatorLevel = getRoleLevelNum(creatorRole);
    const targetLevel = getRoleLevelNum(role);

    // 1. Block unauthorized roles
    if (creatorLevel < 80) {
        throw new Error("Permisos insuficientes: Solo Administradores pueden crear invitaciones.");
    }

    // 2. Logic for App Admin (Level 80)
    if (creatorLevel === 80) {
        // A. Prevent Role Escalation (Cannot invite other Admins or multiple levels above)
        // Strictly, Admin (80) cannot create another Admin (80). Only lower levels.
        if (targetLevel >= 80) {
            throw new Error("Seguridad: No puedes crear invitaciones para un rol igual o superior al tuyo.");
        }

        // B. Enforce Limit of 5 Active Invites
        const q = query(
            collection(db, INVITES_COLLECTION),
            where("createdBy", "==", adminUid),
            where("isUsed", "==", false)
        );
        const snapshot = await getDocs(q);

        if (snapshot.size >= 5) {
            throw new Error("Límite alcanzado: Tienes 5 invitaciones activas. Elimina o espera a que se usen.");
        }
    }

    // ... Proceed with creation ...

    const code = generateCode();
    const inviteRef = doc(db, INVITES_COLLECTION, code);

    // Ensure uniqueness (extremely unlikely to collide, but good practice)
    const existing = await getDoc(inviteRef);
    if (existing.exists()) {
        return createInvite(adminUid, tenantId, role, assignedProjectIds, creatorRole); // Retry if exists
    }

    const inviteData: InviteCode = {
        code,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        isUsed: false,
        tenantId,
        role,
        assignedProjectIds
    };

    await setDoc(inviteRef, inviteData);
    return code;
}

/**
 * Validates an invite code without consuming it
 */
export async function checkInvite(code: string): Promise<{ valid: boolean; reason?: string; tenantId?: string }> {
    if (!code) return { valid: false, reason: "No code provided" };

    const inviteRef = doc(db, INVITES_COLLECTION, code);
    const snapshot = await getDoc(inviteRef);

    if (!snapshot.exists()) {
        return { valid: false, reason: "Código no encontrado" };
    }

    const data = snapshot.data() as InviteCode;

    if (data.isUsed) {
        return { valid: false, reason: "Código ya utilizado" };
    }

    return { valid: true, tenantId: data.tenantId || "1" };
}

/**
 * Consumes an invite code for a specific user
 * This should be called AFTER the user is successfully created/logged in
 */
export async function consumeInvite(code: string, userUid: string): Promise<boolean> {
    const check = await checkInvite(code);
    if (!check.valid) {
        console.error(`Invite consumption failed: ${check.reason}`);
        return false;
    }

    try {
        const inviteRef = doc(db, INVITES_COLLECTION, code);
        await updateDoc(inviteRef, {
            isUsed: true,
            usedAt: serverTimestamp(),
            usedBy: userUid
        });
        return true;
    } catch (error) {
        console.error("Error consuming invite:", error);
        return false;
    }
}

/**
 * Fetch all invites for admin view
 */
export async function getAllInvites(): Promise<InviteCode[]> {
    try {
        const q = query(collection(db, INVITES_COLLECTION)); // You might want to sort by date in UI or here
        const snapshot = await getDocs(q);
        const invites: InviteCode[] = [];
        snapshot.forEach(doc => invites.push(doc.data() as InviteCode));
        return invites;
    } catch (error) {
        console.error("Error fetching invites:", error);
        return [];
    }
}
