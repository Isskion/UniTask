import crypto from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { LS_TRACE_DOC_PATH, buildSessionCookieValue, COOKIE_NAME } from "../access";

const KEY_HASH_SECRET = process.env.LSTRACE_KEY_HASH_SECRET || "";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function hashKey(key: string): string {
    return crypto.createHmac("sha256", KEY_HASH_SECRET).update(key).digest("hex");
}

export async function POST(request: Request) {
    let body: { key?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const key = body.key?.trim();
    if (!key) return NextResponse.json({ ok: false }, { status: 401 });

    const snap = await adminDb.doc(LS_TRACE_DOC_PATH).get();
    const trace = snap.data();

    if (!trace?.accessEnabled || !trace.accessKeyHash || typeof trace.keyVersion !== "number") {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const candidateHash = hashKey(key);
    const candidateBuf = Buffer.from(candidateHash);
    const storedBuf = Buffer.from(trace.accessKeyHash);
    const matches = candidateBuf.length === storedBuf.length && crypto.timingSafeEqual(candidateBuf, storedBuf);

    if (!matches) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    const cookieValue = buildSessionCookieValue(trace.keyVersion, SESSION_TTL_MS);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, cookieValue, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        // path '/' (no solo /LSTrace): la cookie también debe viajar a /api/lstrace/*
        path: "/",
        maxAge: SESSION_TTL_MS / 1000,
    });
    return response;
}
