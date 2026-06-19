import "server-only";

import crypto from "crypto";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { RoleLevel, getRoleLevel } from "@/types";
import { toSlug } from "@/lib/slug";

export const UNI_TRACE_COLLECTION = "uni_trace";

const COOKIE_NAME = "unitrace_session";
const COOKIE_SECRET = process.env.UNITRACE_COOKIE_SECRET || "";

export type AccessLevel = "write" | "read" | "none";

export interface AccessResult {
    level: AccessLevel;
    uid?: string;
}

export interface CallerRole {
    uid: string;
    roleLevel: number;
}

function signCookiePayload(payload: string): string {
    return crypto.createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex");
}

export function buildSessionCookieValue(slug: string, keyVersion: number, ttlMs: number): string {
    const payload = JSON.stringify({ slug, exp: Date.now() + ttlMs, kv: keyVersion });
    const encoded = Buffer.from(payload).toString("base64url");
    const signature = signCookiePayload(encoded);
    return `${encoded}.${signature}`;
}

function verifySessionCookie(value: string, slug: string, currentKeyVersion: number): boolean {
    const [encoded, signature] = value.split(".");
    if (!encoded || !signature) return false;
    const expected = signCookiePayload(encoded);
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    try {
        const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
        return (
            payload.slug === slug &&
            payload.kv === currentKeyVersion &&
            typeof payload.exp === "number" &&
            payload.exp > Date.now()
        );
    } catch {
        return false;
    }
}

function getCookie(request: Request, name: string): string | null {
    const header = request.headers.get("cookie") || "";
    const match = header.split(";").map(p => p.trim()).find(p => p.startsWith(`${name}=`));
    return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/** Verifica el bearer token y devuelve uid+roleLevel, sin atarlo a ningún slug. Usado por el endpoint flat de listado/alta. */
export async function getCallerRole(request: Request): Promise<CallerRole | null> {
    const authHeader = request.headers.get("authorization") || "";
    const bearerMatch = authHeader.match(/^Bearer (.+)$/i);
    if (!bearerMatch) return null;

    try {
        const decoded = await adminAuth.verifyIdToken(bearerMatch[1]);
        const uid = decoded.uid;
        const userSnap = await adminDb.collection("users").doc(uid).get();
        const user = userSnap.data();
        if (!user || user.isActive === false) return null;
        const roleLevel = user.roleLevel ?? getRoleLevel(user.role);
        return { uid, roleLevel };
    } catch {
        return null;
    }
}

/** Comprueba si uid/roleLevel tienen acceso de escritura al projectId dado (superadmin bypass, o pertenencia al proyecto). */
export async function hasProjectWriteAccess(caller: CallerRole, projectId: string | undefined): Promise<boolean> {
    if (caller.roleLevel < RoleLevel.CONSULTANT) return false;
    if (caller.roleLevel >= RoleLevel.SUPERADMIN) return true;
    if (!projectId) return false;

    const userSnap = await adminDb.collection("users").doc(caller.uid).get();
    const user = userSnap.data();
    const projectSnap = await adminDb.collection("projects").doc(projectId).get();
    const project = projectSnap.data();
    return (project?.teamIds || []).includes(caller.uid) || (user?.assignedProjectIds || []).includes(projectId);
}

export async function resolveAccess(request: Request, rawSlug: string): Promise<AccessResult> {
    const slug = toSlug(rawSlug);
    const authHeader = request.headers.get("authorization") || "";
    const bearerMatch = authHeader.match(/^Bearer (.+)$/i);

    const traceSnap = await adminDb.collection(UNI_TRACE_COLLECTION).doc(slug).get();
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
        if (verifySessionCookie(cookieValue, slug, trace.keyVersion)) {
            return { level: "read" };
        }
    }

    return { level: "none" };
}

export { COOKIE_NAME };
