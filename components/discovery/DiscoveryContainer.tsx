'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UniLeakNote } from '@/types';
import { DiscoveryTemplate } from '@/types/relevamiento';
import { getDiscoveryTemplate, getProjectDiscoveryInstance, instantiateProjectDiscovery } from '@/lib/discovery';
import { getProjectNotes } from '@/lib/unileaks';
import SplitScreenDiscoveryUI from './SplitScreenDiscoveryUI';

interface DiscoveryContainerProps {
    tenantId: string;
    projectId: string;
    projectName: string;
    uid: string;
    isInternalViewer: boolean;
}

// Punto de entrada real del módulo: resuelve el template del tenant, crea la instancia del
// proyecto la primera vez que se abre, y carga las notas de Unileaks antes de montar la UI.
export default function DiscoveryContainer({ tenantId, projectId, projectName, uid, isInternalViewer }: DiscoveryContainerProps) {
    const [template, setTemplate] = useState<DiscoveryTemplate | null>(null);
    const [notes, setNotes] = useState<UniLeakNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function bootstrap() {
            setLoading(true);
            setError(null);
            try {
                const tpl = await getDiscoveryTemplate(tenantId);
                if (!tpl) {
                    if (!cancelled) {
                        setError(
                            `Este tenant todavía no tiene una plantilla de Discovery activa (colección tenants/${tenantId}/discoveryTemplates, isActive=true). ` +
                            `Hay que sembrarla una vez antes de poder usar esta herramienta.`
                        );
                    }
                    return;
                }

                const existingInstance = await getProjectDiscoveryInstance(tenantId, projectId);
                if (!existingInstance) {
                    await instantiateProjectDiscovery(projectId, tenantId, tpl);
                }

                const projectNotes = await getProjectNotes(tenantId, projectId, uid, isInternalViewer);

                if (!cancelled) {
                    setTemplate(tpl);
                    setNotes(projectNotes);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Error inicializando el discovery del proyecto.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        bootstrap();
        return () => { cancelled = true; };
    }, [tenantId, projectId, uid, isInternalViewer]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full w-full text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Cargando discovery de {projectName}...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full w-full p-8">
                <div className="max-w-md text-center text-sm text-muted-foreground border border-border rounded-xl p-6 bg-card">
                    {error}
                </div>
            </div>
        );
    }

    if (!template) return null;

    return (
        <SplitScreenDiscoveryUI
            tenantId={tenantId}
            projectId={projectId}
            uid={uid}
            notes={notes}
            template={template}
            isInternalViewer={isInternalViewer}
        />
    );
}
