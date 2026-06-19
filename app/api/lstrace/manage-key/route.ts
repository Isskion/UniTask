import crypto from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resolveAccess, LS_TRACE_DOC_PATH } from "../access";

const KEY_HASH_SECRET = process.env.LSTRACE_KEY_HASH_SECRET || "";

function hashKey(key: string): string {
    return crypto.createHmac("sha256", KEY_HASH_SECRET).update(key).digest("hex");
}

function generateReadableKey(): string {
    const part = () => crypto.randomBytes(3).toString("hex").toUpperCase();
    return `LST-${part()}-${part()}`;
}

export async function POST(request: Request) {
    const access = await resolveAccess(request);
    if (access.level !== "write") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: { action?: string; enabled?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const docRef = adminDb.doc(LS_TRACE_DOC_PATH);

    if (body.action === "rotate") {
        const newKey = generateReadableKey();
        const snap = await docRef.get();
        const currentVersion = snap.data()?.keyVersion ?? 0;
        await docRef.set(
            {
                accessKeyHash: hashKey(newKey),
                keyVersion: currentVersion + 1,
                keyRotatedAt: new Date(),
                keyRotatedBy: access.uid,
            },
            { merge: true },
        );
        return NextResponse.json({ ok: true, key: newKey });
    }

    if (body.action === "toggle") {
        await docRef.set({ accessEnabled: !!body.enabled }, { merge: true });
        return NextResponse.json({ ok: true, accessEnabled: !!body.enabled });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
