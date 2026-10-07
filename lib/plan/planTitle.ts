/**
 * [Plan] Título y ubicación de una tarea dentro del plan (docs/plan-import-design.md §1).
 *
 * - El título lleva delante el código EDT ("III.1.4.1.2 UNI Configurar y cargar…") para reconocer la
 *   línea del plan en cualquier vista (listas, agenda, daily…). El nombre "limpio" se obtiene quitando
 *   ese prefijo; es lo que se compara al reimportar.
 * - `planTrail` guarda la ruta desde el flujo ("III.1 Flujo logístico INTERNACIONAL") hasta el padre
 *   directo: el código EDT de MS Project se repite (Transpais: "IV.1.1" en los tres flujos de la
 *   Etapa IV), el flujo y el hito no.
 */
import type { PlanRole, PlanTrailItem } from '@/types';

export function composePlanTitle(code: string | null | undefined, name: string): string {
    const n = name.trim();
    return code ? `${code} ${n}` : n;
}

/** Quita del título el prefijo de código si es uno de los dados (el actual o el anterior). */
export function stripPlanCode(title: string, ...codes: (string | null | undefined)[]): string {
    const t = (title || '').trim();
    for (const c of codes) {
        if (c && t.startsWith(c + ' ')) return t.slice(c.length + 1).trim();
    }
    return t;
}

/** Nombre sin código de una tarea del plan. */
export const planName = (t: { title: string; planCode?: string | null; planBaseline?: { planCode?: string | null } | null }) =>
    stripPlanCode(t.title, t.planCode, t.planBaseline?.planCode);

const segments = (code?: string | null) => (code ? code.split('.').filter(Boolean).length : 0);

export interface TrailSource { id: string; code: string | null; name: string; role: PlanRole }

/**
 * Ruta desde el flujo (último antepasado con código de dos segmentos, "III.1") hasta el padre.
 * Sin flujo detectable: los antepasados salvo la raíz (nombre del proyecto).
 */
export function buildPlanTrail(ancestors: TrailSource[]): PlanTrailItem[] {
    let start = -1;
    ancestors.forEach((a, i) => { if (segments(a.code) === 2) start = i; });
    if (start < 0) start = Math.min(1, ancestors.length);
    return ancestors.slice(start).map((a) => ({ id: a.id, code: a.code, title: a.name, role: a.role }));
}

/** Texto de la ubicación: "III.1 Flujo… › III.1.4.2 Configurar y probar flujos logísticos". */
export function formatPlanTrail(trail: PlanTrailItem[] | undefined | null, opts: { compact?: boolean } = {}): string {
    if (!trail?.length) return '';
    const items = opts.compact
        ? [trail[0], trail.find((t) => t.role === 'milestone') ?? trail[trail.length - 1]].filter((t, i, a) => a.indexOf(t) === i)
        : trail;
    return items.map((t) => composePlanTitle(t.code, t.title)).join(' › ');
}

export const sameTrail = (a?: PlanTrailItem[] | null, b?: PlanTrailItem[] | null) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
