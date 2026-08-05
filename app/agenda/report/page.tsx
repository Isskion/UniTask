"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { getProjectById } from "@/lib/projects";
import { ProjectHours } from "@/lib/project-hours";
import { Project } from "@/types";
import ProjectReportModal from "@/components/agenda/ProjectReportModal";

/** Fila vacía con la forma correcta para sembrar ProjectReportModal mientras carga el proyecto real —
 *  no se usa aggregateProjectHours([project],[],[]) porque esa función solo siembra fila para proyectos
 *  con presupuesto configurado; aquí hace falta una fila válida siempre, tenga presupuesto o no. */
function emptyRow(p: Project): ProjectHours {
    const budgetFromPhases = (p.budgetPhases ?? []).reduce((s, ph) => s + (Number(ph.hours) || 0), 0);
    const budget = (p.budgetHours && p.budgetHours > 0) ? p.budgetHours : budgetFromPhases;
    return {
        projectId: p.id,
        name: p.name,
        code: p.code,
        color: p.color ?? '#6b7280',
        hasBudget: budget > 0,
        budget,
        planned: 0,
        real: 0,
        health: 'none',
        byPhase: (p.budgetPhases ?? []).map(ph => ({ phaseId: ph.id, name: ph.name, color: ph.color, budget: Number(ph.hours) || 0, planned: 0, real: 0 })),
        unphased: { planned: 0, real: 0 },
        matchedEntries: [],
    };
}

function ReportPageContent() {
    const params = useSearchParams();
    const tenantId = params.get('tenantId') || '';
    const projectId = params.get('projectId') || '';

    const [project, setProject] = useState<Project | null>(null);
    const [row, setRow] = useState<ProjectHours | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!projectId || !tenantId) {
            setError('Faltan parámetros en la URL (proyecto o tenant). Ábrelo desde el botón "Ver informe" del Resumen de Agenda.');
            return;
        }
        getProjectById(projectId)
            .then(p => {
                if (!p) { setError('Proyecto no encontrado.'); return; }
                setProject(p);
                setRow(emptyRow(p));
            })
            .catch(err => {
                console.error('[ReportPage] error cargando proyecto:', err);
                setError('No se pudo cargar el proyecto. Revisa tu conexión o los permisos del tenant.');
            });
    }, [projectId, tenantId]);

    if (error) {
        return (
            <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-3 text-zinc-400 text-sm px-6 text-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
                {error}
            </div>
        );
    }

    if (!project || !row) {
        return (
            <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-zinc-950">
            <ProjectReportModal row={row} tenantId={tenantId} project={project} onClose={() => window.close()} />
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div className="fixed inset-0 bg-zinc-950" />}>
            <ReportPageContent />
        </Suspense>
    );
}
