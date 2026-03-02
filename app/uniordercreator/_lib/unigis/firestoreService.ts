"use client";
/**
 * Firestore CRUD Service for UNIGIS Mapping Templates
 *
 * Encapsulates all Firestore operations for saving/loading/deleting mapping templates.
 * Gracefully degrades if Firebase is not configured (returns empty results).
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
import { getDb, isFirebaseConfigured } from '../firebase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MappingTemplateData {
    name: string;
    description: string;
    createdBy: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    mapping: Record<string, string>;
    booleanOverrides: Record<string, boolean>;
    dynamicFieldCounts: Record<string, number>;
    multiSheetConfig: {
        mainSheet: string;
        mainKey: string;
        relations: Array<{
            sheet: string;
            key: string;
            targetPath: string;
            itemTag: string;
        }>;
    };
}

export interface SavedTemplate extends MappingTemplateData {
    id: string;
}

// ---------------------------------------------------------------------------
// Collection reference
// ---------------------------------------------------------------------------

const COLLECTION = 'unigis_templates';

function getCollection() {
    return collection(getDb(), COLLECTION);
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Save a new template or update an existing one.
 * If `id` is provided, updates that document. Otherwise creates a new one.
 */
export async function saveTemplate(
    data: Omit<MappingTemplateData, 'createdAt' | 'updatedAt'>,
    existingId?: string
): Promise<string> {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase no configurado. Consulta .env.example para configurarlo.');
    }

    const id = existingId || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const docRef = doc(getDb(), COLLECTION, id);

    await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
        ...(existingId ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true });

    return id;
}

/**
 * Load all saved templates, ordered by most recently updated.
 */
export async function loadTemplates(): Promise<SavedTemplate[]> {
    if (!isFirebaseConfigured()) {
        return [];
    }

    try {
        const q = query(getCollection(), orderBy('updatedAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as SavedTemplate[];
    } catch (err) {
        console.warn('[Firestore] Error loading templates:', err);
        return [];
    }
}

/**
 * Get a single template by ID.
 */
export async function getTemplate(id: string): Promise<SavedTemplate | null> {
    if (!isFirebaseConfigured()) return null;

    try {
        const snap = await getDoc(doc(getDb(), COLLECTION, id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as SavedTemplate;
    } catch (err) {
        console.warn('[Firestore] Error getting template:', err);
        return null;
    }
}

/**
 * Delete a template by ID.
 */
export async function deleteTemplate(id: string): Promise<void> {
    if (!isFirebaseConfigured()) {
        throw new Error('Firebase no configurado.');
    }

    await deleteDoc(doc(getDb(), COLLECTION, id));
}
