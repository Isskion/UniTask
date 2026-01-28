import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { AttributeDefinition } from '@/types';

/**
 * Hook to get dynamic master data labels from Firestore.
 * Falls back to static translations if no override exists in DB.
 * 
 * Usage:
 * const { getLabel, getColor } = useMasterDataLabels();
 * <label>{getLabel('module')}</label> // Returns "Circuito" if overridden, else "Módulo"
 */
export function useMasterDataLabels() {
    const { tenantId } = useAuth();
    const { t } = useLanguage();
    const [definitions, setDefinitions] = useState<AttributeDefinition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'attribute_definitions'),
            where('tenantId', '==', tenantId)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const defs = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as AttributeDefinition));
            setDefinitions(defs);
            setLoading(false);
        }, (error) => {
            console.error('[useMasterDataLabels] Error loading definitions:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    /**
     * Get the label for a master data field.
     * Checks for override in Firestore, falls back to static translation.
     */
    const getLabel = (fieldId: string): string => {
        // 1. Check for override in DB (by ID or mappedField)
        const override = definitions.find(def =>
            def.id === fieldId || def.mappedField === fieldId
        );

        if (override) {
            return override.name;
        }

        // 2. Fallback to static translation
        return t(`task_manager.${fieldId}`);
    };

    /**
     * Get the color for a master data field.
     * Returns undefined if no override exists.
     */
    const getColor = (fieldId: string): string | undefined => {
        const override = definitions.find(def =>
            def.id === fieldId || def.mappedField === fieldId
        );
        return override?.color;
    };

    return {
        getLabel,
        getColor,
        definitions,
        loading
    };
}
