import * as functions from "firebase-functions";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "./utils";
import { BUSINESS_TZ, currentSnapshot, dayKey, ProgressTask } from "./projectProgressCore";

/**
 * [Seguimiento] Foto diaria del avance de cada proyecto activo (docs/project-dashboard-design.md §4).
 *
 * Cada noche guarda en `project_snapshots/{projectId}_{yyyy-MM-dd}` el alcance, lo hecho y lo
 * pendiente en días de esfuerzo. El Dashboard de proyecto usa estas fotos para los días que las
 * tienen (exactas: ven reaperturas y cambios de esfuerzo) y reconstruye el resto desde las tareas.
 * Idempotente: relanzarla el mismo día sobrescribe la foto de ese día.
 */
export async function snapshotAllProjects(today = dayKey(Date.now())!): Promise<{ projects: number; written: number }> {
    const db = getDb();
    const projects = await db.collection("projects").get();
    let written = 0;
    for (const p of projects.docs) {
        const data = p.data();
        if (data.isActive === false || data.status === "archived" || data.status === "completed") continue;
        const tenantId = String(data.tenantId || "1");
        try {
            const snap = await db.collection("tasks").where("projectId", "==", p.id).get();
            const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProgressTask)).filter((t) => (t as { tenantId?: string }).tenantId === undefined || String((t as { tenantId?: string }).tenantId) === tenantId);
            if (!tasks.length) continue;
            await db.collection("project_snapshots").doc(`${p.id}_${today}`).set({
                ...currentSnapshot(tasks, today),
                projectId: p.id,
                tenantId,
                createdAt: FieldValue.serverTimestamp(),
            });
            written++;
        } catch (err) {
            console.error(`[projectSnapshots] Error en el proyecto ${p.id} (${data.name}):`, err);
        }
    }
    console.log(`[projectSnapshots] ${today}: ${written} fotos de ${projects.size} proyectos.`);
    return { projects: projects.size, written };
}

export const projectSnapshots = functions.region("europe-west1")
    .runWith({ timeoutSeconds: 540, memory: "512MB" })
    .pubsub.schedule("55 23 * * *")
    .timeZone(BUSINESS_TZ)
    .onRun(async () => { await snapshotAllProjects(); });
