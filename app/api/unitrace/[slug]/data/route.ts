import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { resolveAccess, UNI_TRACE_COLLECTION } from "../../access";
import { toSlug } from "@/lib/slug";

const MAX_BODY_BYTES = 2 * 1024 * 1024;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params;
    const slug = toSlug(rawSlug);
    const access = await resolveAccess(request, slug);
    if (access.level === "none") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const snap = await adminDb.collection(UNI_TRACE_COLLECTION).doc(slug).get();
    const trace = snap.data();

    let clientName: string | null = null;
    if (trace?.projectId) {
        const projectSnap = await adminDb.collection("projects").doc(trace.projectId).get();
        const project = projectSnap.data();
        clientName = project?.clientName || project?.name || null;
    }

    return NextResponse.json(
        {
            data: trace?.data ?? null,
            nextIds: trace?.nextIds ?? null,
            planHistory: trace?.planHistory ?? [],
            accessEnabled: !!trace?.accessEnabled,
            clientName,
        },
        { headers: { "X-Access-Level": access.level } },
    );
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug: rawSlug } = await params;
    const slug = toSlug(rawSlug);
    const access = await resolveAccess(request, slug);
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

    await adminDb.collection(UNI_TRACE_COLLECTION).doc(slug).set(
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
