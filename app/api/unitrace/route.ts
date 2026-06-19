import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { RoleLevel } from "@/types";
import { toSlug } from "@/lib/slug";
import { UNI_TRACE_COLLECTION, getCallerRole, hasProjectWriteAccess } from "./access";

export async function GET(request: Request) {
    const caller = await getCallerRole(request);
    if (!caller || caller.roleLevel < RoleLevel.CONSULTANT) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const snap = await adminDb.collection(UNI_TRACE_COLLECTION).get();
    const entries = await Promise.all(
        snap.docs.map(async doc => {
            const trace = doc.data();
            const visible = await hasProjectWriteAccess(caller, trace.projectId);
            if (!visible) return null;

            let clientName: string | null = null;
            if (trace.projectId) {
                const projectSnap = await adminDb.collection("projects").doc(trace.projectId).get();
                const project = projectSnap.data();
                clientName = project?.clientName || project?.name || null;
            }

            return {
                slug: doc.id,
                projectId: trace.projectId ?? null,
                clientName,
                accessEnabled: !!trace.accessEnabled,
            };
        }),
    );

    return NextResponse.json({ entries: entries.filter((e): e is NonNullable<typeof e> => e !== null) });
}

export async function POST(request: Request) {
    const caller = await getCallerRole(request);
    if (!caller || caller.roleLevel < RoleLevel.ADMIN) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: { slug?: string; projectId?: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const slug = toSlug(body.slug || "");
    const projectId = body.projectId?.trim();
    if (!slug || !projectId) {
        return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const projectSnap = await adminDb.collection("projects").doc(projectId).get();
    if (!projectSnap.exists) {
        return NextResponse.json({ error: "project_not_found" }, { status: 400 });
    }

    const docRef = adminDb.collection(UNI_TRACE_COLLECTION).doc(slug);
    const existing = await docRef.get();
    if (existing.exists) {
        return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }

    await docRef.set({
        projectId,
        data: {},
        nextIds: {},
        planHistory: [],
        accessEnabled: false,
        accessKeyHash: null,
        keyVersion: 0,
        createdAt: new Date(),
        createdBy: caller.uid,
    });

    return NextResponse.json({ ok: true, slug });
}
