import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resolveAccess, LS_TRACE_DOC_PATH } from "../access";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request) {
    const access = await resolveAccess(request);
    if (access.level === "none") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const snap = await adminDb.doc(LS_TRACE_DOC_PATH).get();
    const trace = snap.data();

    return NextResponse.json(
        {
            data: trace?.data ?? null,
            nextIds: trace?.nextIds ?? null,
            planHistory: trace?.planHistory ?? [],
            accessEnabled: !!trace?.accessEnabled,
        },
        { headers: { "X-Access-Level": access.level } },
    );
}

export async function POST(request: Request) {
    const access = await resolveAccess(request);
    if (access.level !== "write") {
        return NextResponse.json({ error: "read_only" }, { status: 403 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
        return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }

    let body: { data?: unknown; nextIds?: unknown; planHistory?: unknown };
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    await adminDb.doc(LS_TRACE_DOC_PATH).set(
        {
            data: body.data ?? {},
            nextIds: body.nextIds ?? {},
            planHistory: body.planHistory ?? [],
            updatedAt: new Date(),
            updatedBy: access.uid,
        },
        { merge: true },
    );

    return NextResponse.json({ ok: true });
}
