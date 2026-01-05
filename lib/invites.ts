import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";

export interface InviteCode {
    code: string;
    createdBy: string; // Admin UID
    createdAt: any;
    usedAt?: any;
    usedBy?: string; // User UID who used it
    isUsed: boolean;
    expiresAt?: any; // Optional expiration
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
 * Creates a new one-time invite code
 */
export async function createInvite(adminUid: string): Promise<string> {
    const code = generateCode();
    const inviteRef = doc(db, INVITES_COLLECTION, code);

    // Ensure uniqueness (extremely unlikely to collide, but good practice)
    const existing = await getDoc(inviteRef);
    if (existing.exists()) {
        return createInvite(adminUid); // Retry if exists
    }

    const inviteData: InviteCode = {
        code,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        isUsed: false
    };

    await setDoc(inviteRef, inviteData);
    return code;
}

/**
 * Validates an invite code without consuming it
 */
export async function checkInvite(code: string): Promise<{ valid: boolean; reason?: string }> {
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

    return { valid: true };
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
