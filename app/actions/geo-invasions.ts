'use client'; // Uses Firebase client SDK — no 'use server'

import { db, auth } from '@/lib/firebase';
import {
    collection, doc, addDoc, getDocs, deleteDoc,
    query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';

const INVASIONS_COLLECTION = 'zone_invasions';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ZoneInvasion {
    id: string;
    tenantId: string;
    projectId: string;
    fromZoneId: string;
    fromZoneName: string;
    toZoneId: string;
    toZoneName: string;
    label?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

interface SaveInvasionParams {
    tenantId: string;
    projectId: string;
    fromZoneId: string;
    fromZoneName: string;
    toZoneId: string;
    toZoneName: string;
    label?: string;
}

// ─── Firestore CRUD ───────────────────────────────────────────────────────────

export async function saveInvasion(params: SaveInvasionParams): Promise<{ id: string }> {
    const docRef = await addDoc(collection(db, INVASIONS_COLLECTION), {
        tenantId:     params.tenantId,
        projectId:    params.projectId,
        fromZoneId:   params.fromZoneId,
        fromZoneName: params.fromZoneName,
        toZoneId:     params.toZoneId,
        toZoneName:   params.toZoneName,
        label:        params.label ?? null,
        createdBy:    auth.currentUser?.uid || 'system',
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
    });
    return { id: docRef.id };
}

export async function getProjectInvasions(tenantId: string, projectId: string): Promise<ZoneInvasion[]> {
    try {
        const q = query(
            collection(db, INVASIONS_COLLECTION),
            where('tenantId', '==', tenantId),
            where('projectId', '==', projectId),
            orderBy('createdAt', 'desc'),
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id:           d.id,
                tenantId:     data.tenantId,
                projectId:    data.projectId,
                fromZoneId:   data.fromZoneId,
                fromZoneName: data.fromZoneName,
                toZoneId:     data.toZoneId,
                toZoneName:   data.toZoneName,
                label:        data.label ?? undefined,
                createdBy:    data.createdBy,
                createdAt:    data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                updatedAt:    data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
            };
        });
    } catch (error) {
        console.error('Error al recuperar invasiones:', error instanceof Error ? error.message : error);
        return [];
    }
}

export async function deleteInvasion(invasionId: string): Promise<void> {
    await deleteDoc(doc(db, INVASIONS_COLLECTION, invasionId));
}
