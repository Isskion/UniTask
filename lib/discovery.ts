import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    writeBatch,
    arrayUnion
} from "firebase/firestore";
import { DiscoveryTemplate, ProjectDiscoveryInstance, DiscoveryResponses, NoteLink, NoteLinkEntity, DiscoveryTableRow, SECTION_META_KEY } from "@/types/relevamiento";

export async function getDiscoveryTemplate(tenantId: string): Promise<DiscoveryTemplate | null> {
    const q = query(
        collection(db, "tenants", tenantId, "discoveryTemplates"),
        where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as DiscoveryTemplate;
}

export async function getProjectDiscoveryInstance(tenantId: string, projectId: string): Promise<ProjectDiscoveryInstance | null> {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "instance");
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as ProjectDiscoveryInstance;
    }
    return null;
}

export async function instantiateProjectDiscovery(projectId: string, tenantId: string, template: DiscoveryTemplate) {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "instance");
    const instanceData: Partial<ProjectDiscoveryInstance> = {
        projectId,
        tenantId,
        templateVersion: template.version,
        sections: template.sections,
        status: 'draft',
        progress: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(ref, instanceData);
    return instanceData;
}

export async function getSectionResponses(tenantId: string, projectId: string, sectionId: string): Promise<DiscoveryResponses | null> {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as DiscoveryResponses;
    }
    return null;
}

// Carga las respuestas de TODAS las secciones de una vez (usado para pintar el progreso por
// sección en la navegación lateral). Un read por sección — aceptable porque se hace una sola vez
// al abrir el proyecto, no en un loop.
export async function getAllSectionsResponses(tenantId: string, projectId: string, sectionIds: string[]): Promise<Record<string, DiscoveryResponses | null>> {
    const entries = await Promise.all(
        sectionIds.map(async (sectionId) => [sectionId, await getSectionResponses(tenantId, projectId, sectionId)] as const)
    );
    return Object.fromEntries(entries);
}

export async function updateFieldResponse(projectId: string, sectionId: string, tenantId: string, fieldId: string, value: any, uid: string) {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
        // Create initial response doc
        await setDoc(ref, {
            projectId,
            tenantId,
            [fieldId]: {
                value,
                status: 'filled',
                updatedBy: uid,
                updatedAt: serverTimestamp()
            }
        });
    } else {
        // Atomic update with dot notation
        await updateDoc(ref, {
            [`${fieldId}.value`]: value,
            [`${fieldId}.status`]: 'filled',
            [`${fieldId}.updatedBy`]: uid,
            [`${fieldId}.updatedAt`]: serverTimestamp()
        });
    }
}

// Marca (o desmarca) un campo individual como "No aplica" sin necesidad de un valor —
// independiente de updateFieldResponse, que siempre deja el campo en status 'filled'.
export async function setFieldNotApplicable(tenantId: string, projectId: string, sectionId: string, fieldId: string, notApplicable: boolean, uid: string) {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const snap = await getDoc(ref);
    const status = notApplicable ? 'not_applicable' : 'empty';

    if (!snap.exists()) {
        await setDoc(ref, {
            projectId,
            tenantId,
            [fieldId]: { value: null, status, updatedBy: uid, updatedAt: serverTimestamp() }
        });
    } else {
        await updateDoc(ref, {
            [`${fieldId}.status`]: status,
            [`${fieldId}.updatedBy`]: uid,
            [`${fieldId}.updatedAt`]: serverTimestamp(),
        });
    }
}

// Marca (o desmarca) la sección COMPLETA como "No aplica a este proyecto" — independiente del
// estado de cada campo individual, se guarda bajo la key reservada SECTION_META_KEY.
export async function setSectionNotApplicable(tenantId: string, projectId: string, sectionId: string, notApplicable: boolean, uid: string) {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const snap = await getDoc(ref);
    const meta = { notApplicable, updatedBy: uid, updatedAt: serverTimestamp() };

    if (!snap.exists()) {
        await setDoc(ref, { projectId, tenantId, [SECTION_META_KEY]: meta });
    } else {
        await updateDoc(ref, { [SECTION_META_KEY]: meta });
    }
}

// Añade UNA fila a un campo tipo 'table' (catálogo de vehículos, tarifas, etc.) sin pisar las
// filas ya existentes. arrayUnion es una operación atómica del servidor: dos consultores
// importando/añadiendo filas a la vez no se pisan entre sí (a diferencia de updateFieldResponse,
// que SÍ sobrescribe el valor de un campo escalar). _rowId evita que arrayUnion deduplique dos
// filas con contenido idéntico (p.ej. dos vehículos con las mismas capacidades).
export async function appendTableRow(
    tenantId: string,
    projectId: string,
    sectionId: string,
    fieldId: string,
    row: Record<string, any>,
    uid: string
): Promise<void> {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const rowWithId: DiscoveryTableRow = {
        ...row,
        _rowId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            projectId,
            tenantId,
            [fieldId]: {
                value: [rowWithId],
                status: 'filled',
                updatedBy: uid,
                updatedAt: serverTimestamp(),
            },
        });
    } else {
        await updateDoc(ref, {
            [`${fieldId}.value`]: arrayUnion(rowWithId),
            [`${fieldId}.status`]: 'filled',
            [`${fieldId}.updatedBy`]: uid,
            [`${fieldId}.updatedAt`]: serverTimestamp(),
        });
    }
}

// Elimina UNA fila de un campo tipo 'table' por su _rowId (ej. corregir una fila metida a mano
// con un error). Lee el array completo y lo reescribe sin esa fila — a diferencia de
// appendTableRow no puede usar arrayRemove porque necesitaríamos el objeto exacto de la fila,
// que el llamador no siempre tiene a mano tras un reload.
export async function removeTableRow(
    tenantId: string,
    projectId: string,
    sectionId: string,
    fieldId: string,
    rowId: string,
    uid: string
): Promise<void> {
    const ref = doc(db, "tenants", tenantId, "projects", projectId, "discovery", "responses_" + sectionId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const currentRows: DiscoveryTableRow[] = Array.isArray(snap.data()[fieldId]?.value) ? snap.data()[fieldId].value : [];
    const nextRows = currentRows.filter(r => r._rowId !== rowId);

    await updateDoc(ref, {
        [`${fieldId}.value`]: nextRows,
        [`${fieldId}.status`]: nextRows.length > 0 ? 'filled' : 'empty',
        [`${fieldId}.updatedBy`]: uid,
        [`${fieldId}.updatedAt`]: serverTimestamp(),
    });
}

export async function createNoteLink(tenantId: string, noteId: string, entity: NoteLinkEntity, uid: string) {
    const ref = doc(collection(db, "tenants", tenantId, "noteLinks"));
    const data: Partial<NoteLink> = {
        tenantId,
        noteId,
        entity,
        linkedBy: uid,
        linkedAt: serverTimestamp()
    };
    await setDoc(ref, data);
    return ref.id;
}

export async function getNoteLinksForEntity(tenantId: string, projectId: string, sectionId: string, fieldId: string) {
    const q = query(
        collection(db, "tenants", tenantId, "noteLinks"),
        where("entity.type", "==", "project_discovery"),
        where("entity.id", "==", projectId),
        where("entity.sectionId", "==", sectionId),
        where("entity.fieldId", "==", fieldId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as NoteLink));
}
