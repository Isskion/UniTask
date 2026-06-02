"use client";
/**
 * Firestore CRUD Service for UNIGIS Vehicle Mapping Templates
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy,
    type Timestamp,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from '@/app/uniordercreator/_lib/firebase';

export interface VehicleMappingTemplateData {
    name: string;
    description: string;
    createdBy: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    mapping: Record<string, string>;
    booleanOverrides: Record<string, boolean>;
    dynamicFieldCounts: Record<string, number>;
}

export interface SavedVehicleTemplate extends VehicleMappingTemplateData {
    id: string;
}

const COLLECTION = 'unigis_vehicle_templates';

function getCollection() {
    return collection(getDb(), COLLECTION);
}

export async function saveVehicleTemplate(
    data: Omit<VehicleMappingTemplateData, 'createdAt' | 'updatedAt'>,
    existingId?: string
): Promise<string> {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase no configurado.');
    }

    const id = existingId || `vtpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const docRef = doc(getDb(), COLLECTION, id);

    await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        ...(existingId ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true });

    return id;
}

export async function loadVehicleTemplates(): Promise<SavedVehicleTemplate[]> {
    if (!isFirebaseConfigured()) {
        return [];
    }

    try {
        const q = query(getCollection(), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as SavedVehicleTemplate[];
    } catch (err) {
        console.warn('[Firestore] Error loading vehicle templates:', err);
        return [];
    }
}

export async function deleteVehicleTemplate(id: string): Promise<void> {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase no configurado.');
    }

    await deleteDoc(doc(getDb(), COLLECTION, id));
}
