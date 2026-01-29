import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Sprint } from '@/types';

export function useSprints() {
    const { tenantId } = useAuth();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, 'sprints'),
            where('tenantId', '==', tenantId),
            orderBy('startDate', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sprint));
            setSprints(data);
            setActiveSprint(data.find(s => s.status === 'active') || null);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    return { sprints, activeSprint, loading };
}
