import "server-only";

import crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { RoleLevel, getRoleLevel } from "@/types";

export const LS_TRACE_DOC_PATH = "ls_trace/main";

const COOKIE_NAME = "lstrace_session";
const COOKIE_SECRET = process.env.LSTRACE_COOKIE_SECRET || "";

export type AccessLevel = "write" | "read" | "none";

export interface AccessResult {
    level: AccessLevel;
    uid?: string;
}

function signCookiePayload(payload: string): string {
    return crypto.createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
}

export function buildSessionCookieValue(keyVersion: number, ttlMs: number): string {
    const payload = JSON.stringify({ exp: Date.now() + ttlMs, kv: keyVersion });
    const encoded = Buffer.from(payload).toString("base64url");
    const signature = signCookiePayload(encoded);
    return `${encoded}.${signature}`;
}

function verifySessionCookie(value: string, currentKeyVersion: number): boolean {
    const [encoded, signature] = value.split(".");
    if (!encoded || !signature) return false;
    const expected = signCookiePayload(encoded);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
        return payload.kv === currentKeyVersion && typeof payload.exp === "number" && payload.exp > Date.now();
    } catch {
        return false;
    }
}

function getCookie(request: Request, name: string): string | null {
    const header = request.headers.get("cookie") || "";
    const match = header.split(";").map(p => p.trim()).find(p => p.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function resolveAccess(request: Request): Promise<AccessResult> {
    const authHeader = request.headers.get("authorization") || "";
    const bearerMatch = authHeader.match(/^Bearer (.+)$/i);

    const traceSnap = await adminDb.doc(LS_TRACE_DOC_PATH).get();
    const trace = traceSnap.data();

    if (bearerMatch) {
        try {
            const decoded = await adminAuth.verifyIdToken(bearerMatch[1]);
            const uid = decoded.uid;
            const userSnap = await adminDb.collection("users").doc(uid).get();
            const user = userSnap.data();
            if (!user || user.isActive === false) return { level: "none", uid };

            const roleLevel = user.roleLevel ?? getRoleLevel(user.role);
            if (roleLevel < RoleLevel.CONSULTANT) return { level: "none", uid };
            if (roleLevel >= RoleLevel.SUPERADMIN) return { level: "write", uid };

            const projectId: string | undefined = trace?.projectId;
            if (!projectId) return { level: "none", uid };

            const projectSnap = await adminDb.collection("projects").doc(projectId).get();
            const project = projectSnap.data();
            const assigned = (project?.teamIds || []).includes(uid) || (user.assignedProjectIds || []).includes(projectId);

            return assigned ? { level: "write", uid } : { level: "none", uid };
        } catch {
            return { level: "none" };
        }
    }

    const cookieValue = getCookie(request, COOKIE_NAME);
    if (cookieValue && trace?.accessEnabled && typeof trace.keyVersion === "number") {
        if (verifySessionCookie(cookieValue, trace.keyVersion)) {
            return { level: "read" };
        }
    }

    return { level: "none" };
}

export { COOKIE_NAME };
