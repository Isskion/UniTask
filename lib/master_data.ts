import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface MasterOption {
    id: string;
    label: string;
    description?: string;
    isSystem?: boolean; // To prevent deletion of core options if needed
}

export interface SAMConfig {
    regions: MasterOption[];
    divisions: MasterOption[];
}

export const DEFAULT_REGIONS: MasterOption[] = [
    { id: 'EU', label: 'Europa (EU)', description: 'EMEA Region', isSystem: true },
    { id: 'LATAM', label: 'Latinoamérica (LATAM)', description: 'Latin America Region', isSystem: true },
    { id: 'NA', label: 'Norteamérica (NA)', description: 'North America Region', isSystem: true },
    { id: 'ASIA', label: 'Asia Pacific (APAC)', description: 'APAC Region', isSystem: true }
];

export const DEFAULT_DIVISIONS: MasterOption[] = [
    { id: 'TECH', label: 'Tecnología & Desarrollo', description: 'Engineering, IT, DevOps', isSystem: true },
    { id: 'OPS', label: 'Operaciones', description: 'Logistics, Support, QA', isSystem: true },
    { id: 'SALES', label: 'Ventas & Marketing', description: 'Commercial, Growth', isSystem: true },
    { id: 'HR', label: 'Recursos Humanos', description: 'People, Culture', isSystem: true },
    { id: 'FIN', label: 'Finanzas & Legal', description: 'Finance, Compliance', isSystem: true }
];

export function useMasterData() {
    const { tenantId } = useAuth();
    const [regions, setRegions] = useState<MasterOption[]>(DEFAULT_REGIONS);
    const [divisions, setDivisions] = useState<MasterOption[]>(DEFAULT_DIVISIONS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) {
            setLoading(false);
            return;
        }

        // Real-time listener for SAM Config
        const unsub = onSnapshot(doc(db, 'tenants', tenantId, 'settings', 'sam_config'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as SAMConfig;
                setRegions(data.regions || DEFAULT_REGIONS);
                setDivisions(data.divisions || DEFAULT_DIVISIONS);
            } else {
                // Initialize default if not exists (optional, or just use defaults in memory)
                // We just keep defaults in state
                setRegions(DEFAULT_REGIONS);
                setDivisions(DEFAULT_DIVISIONS);
            }
            setLoading(false);
        }, (err) => {
            console.error("Error fetching master data:", err);
            setLoading(false);
        });

        return () => unsub();
    }, [tenantId]);

    const saveMasterData = async (newRegions: MasterOption[], newDivisions: MasterOption[]) => {
        if (!tenantId) return;
        await setDoc(doc(db, 'tenants', tenantId, 'settings', 'sam_config'), {
            regions: newRegions,
            divisions: newDivisions
        }, { merge: true });
    };

    return { regions, divisions, loading, saveMasterData };
}

// Legacy exports for static usage (deprecated but kept for transition if needed)
export const REGIONS = DEFAULT_REGIONS;
export const DIVISIONS = DEFAULT_DIVISIONS;

