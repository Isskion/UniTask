import crypto from "crypto";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resolveAccess, UNI_TRACE_COLLECTION } from "../../access";
import { toSlug } from "@/lib/slug";

const KEY_HASH_SECRET = process.env.UNITRACE_KEY_HASH_SECRET || "";

function hashKey(key: string): string {
    return crypto.createHmac("sha256", KEY_HASH_SECRET).update(key).digest("hex");
}

function generateReadableKey(): string {
    const part = () => crypto.randomBytes(3).toString("hex").toUpperCase();
    return `UNI-${part()}-${part()}`;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params;
    const slug = toSlug(rawSlug);
    const access = await resolveAccess(request, slug);
    if (access.level !== "write") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: { action?: string; enabled?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const docRef = adminDb.collection(UNI_TRACE_COLLECTION).doc(slug);

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
