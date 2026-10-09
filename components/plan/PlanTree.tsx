"use client";
/**
 * [Plan] Árbol del plan: lo usan la vista previa del asistente (filas del Excel) y la pestaña Plan
 * (tareas ya importadas). Recibe filas planas en preorden y pinta sangría, rol, estado y avance.
 */
import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Flag, Folder, ListTree, CheckSquare, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanRole } from "@/types";

export interface PlanTreeRow {
    key: string;
    parentKey: string | null;
    level: number;            // sangría visual (0 = raíz)
    code: string | null;
    title: string;
    role: PlanRole;
    status?: string;
    progress?: number | null; // solo nodos calculados
    end?: string | null;      // ISO
    durationDays?: number | null; // plazo: días laborables entre comienzo y fin (calendario de Madrid)
    effortHours?: number | null;  // esfuerzo en horas (8 h = 1 día); en los nodos, suma de sus tareas
    responsible?: string | null;
    childCount: number;
    highlight?: boolean;      // p. ej. fila con aviso
    wait?: boolean;           // espera externa (sin esfuerzo propio)
}

const fmtHours = (h: number) => (Math.round(h * 10) / 10).toLocaleString("es-ES");

export const ROLE_META: Record<PlanRole, { label: string; className: string; icon: typeof Flag }> = {
    group: { label: "Agrupador", className: "bg-zinc-500/15 text-zinc-500", icon: Folder },
    milestone: { label: "Hito", className: "bg-indigo-500/15 text-indigo-500", icon: Flag },
    parent: { label: "Padre", className: "bg-sky-500/15 text-sky-500", icon: ListTree },
    leaf: { label: "Tarea", className: "bg-emerald-500/15 text-emerald-600", icon: CheckSquare },
    gate: { label: "Control", className: "bg-amber-500/15 text-amber-600", icon: Lock },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendiente", className: "text-zinc-500" },
    in_progress: { label: "En curso", className: "text-emerald-500" },
    review: { label: "Revisión", className: "text-amber-500" },
    completed: { label: "Aprobación Final", className: "text-blue-500" },
    discarded: { label: "Descartada", className: "text-rose-500" },
    out_of_scope: { label: "Fuera de alcance", className: "text-purple-500" },
};

const fmtDate = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

interface Props {
    rows: PlanTreeRow[];
    isLight: boolean;
    /** Niveles desplegados al inicio (por defecto todo). */
    initialExpandLevel?: number;
    showStatus?: boolean;
    filter?: (row: PlanTreeRow) => boolean;
    onRowClick?: (row: PlanTreeRow) => void;
    /** Acciones al final de la fila (visibles al pasar el ratón). */
    renderActions?: (row: PlanTreeRow) => ReactNode;
}

export function PlanTree({ rows, isLight, initialExpandLevel = Infinity, showStatus = false, filter, onRowClick, renderActions }: Props) {
    const [collapsed, setCollapsed] = useState<Set<string>>(
        () => new Set(rows.filter((r) => r.childCount > 0 && r.level >= initialExpandLevel).map((r) => r.key)),
    );
    const todayMs = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);

    // Con filtro: se muestran las filas que cumplen y sus antepasados (para no perder el contexto)
    const visibleKeys = useMemo(() => {
        if (!filter) return null;
        const byKey = new Map(rows.map((r) => [r.key, r]));
        const keep = new Set<string>();
        for (const r of rows) {
            if (!filter(r)) continue;
            let cur: PlanTreeRow | undefined = r;
            while (cur && !keep.has(cur.key)) { keep.add(cur.key); cur = cur.parentKey ? byKey.get(cur.parentKey) : undefined; }
        }
        return keep;
    }, [rows, filter]);

    const shown = useMemo(() => {
        const out: PlanTreeRow[] = [];
        const hiddenUnder = new Set<string>();
        for (const r of rows) {
            if (r.parentKey && (hiddenUnder.has(r.parentKey) || (!visibleKeys && collapsed.has(r.parentKey)))) {
                hiddenUnder.add(r.key);
                continue;
            }
            if (visibleKeys && !visibleKeys.has(r.key)) continue;
            out.push(r);
        }
        return out;
    }, [rows, collapsed, visibleKeys]);

    const toggle = (key: string) => setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    return (
        <div className={cn("text-xs rounded-lg border", isLight ? "border-zinc-200" : "border-white/10")}>
            {shown.map((r) => {
                const meta = ROLE_META[r.role];
                const Icon = meta.icon;
                const isOpen = !collapsed.has(r.key) || !!visibleKeys;
                const closed = r.status === "completed" || r.status === "discarded" || r.status === "out_of_scope";
                const overdue = !closed && r.end && Date.parse(r.end) < todayMs && (r.role === "leaf" || r.role === "gate" || r.childCount === 0);
                const status = r.status ? STATUS_META[r.status] : undefined;
                return (
                    <div
                        key={r.key}
                        onClick={onRowClick ? () => onRowClick(r) : undefined}
                        className={cn(
                            "group flex items-center gap-2 pr-3 py-1.5 border-b last:border-b-0",
                            isLight ? "border-zinc-100 hover:bg-zinc-50" : "border-white/5 hover:bg-white/5",
                            r.highlight && (isLight ? "bg-amber-50" : "bg-amber-500/5"),
                            onRowClick && "cursor-pointer",
                        )}
                        style={{ paddingLeft: 8 + r.level * 16 }}
                    >
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (r.childCount) toggle(r.key); }}
                            className={cn("w-4 h-4 shrink-0 flex items-center justify-center text-zinc-400", !r.childCount && "invisible")}
                            aria-label={isOpen ? "Plegar" : "Desplegar"}
                        >
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0", meta.className)}>
                            <Icon className="w-3 h-3" />{meta.label}
                        </span>
                        {r.code && <span className="font-mono text-[10px] text-zinc-500 shrink-0">{r.code}</span>}
                        {r.wait && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 bg-amber-500/15 text-amber-600" title="Espera externa (p. ej. entrega de producto): no cuenta como esfuerzo, pero sus fechas sí cuentan en el plazo">Espera</span>}
                        <span className={cn("truncate min-w-0 flex-1", r.role === "group" || r.role === "milestone" ? "font-semibold" : "", closed && "line-through opacity-60")} title={r.title}>
                            {r.title}
                        </span>
                        {r.responsible && <span className="text-[10px] text-zinc-500 shrink-0 hidden md:inline">{r.responsible}</span>}
                        {typeof r.progress === "number" && (
                            <span className="flex items-center gap-1 shrink-0 w-20">
                                <span className={cn("h-1.5 flex-1 rounded-full overflow-hidden", isLight ? "bg-zinc-200" : "bg-white/10")}>
                                    <span className="block h-full bg-emerald-500" style={{ width: `${Math.min(100, r.progress)}%` }} />
                                </span>
                                <span className="text-[10px] text-zinc-500 w-7 text-right">{Math.round(r.progress)}%</span>
                            </span>
                        )}
                        {showStatus && status && <span className={cn("text-[10px] font-medium shrink-0 w-24 text-right whitespace-nowrap", status.className)}>{status.label}</span>}
                        <span className="text-[10px] text-zinc-500 shrink-0 w-10 text-right tabular-nums" title="Plazo: días laborables entre comienzo y fin (sin fines de semana ni festivos de Madrid)">
                            {r.durationDays != null && r.durationDays > 0 ? `${r.durationDays} d` : ""}
                        </span>
                        <span className="text-[10px] text-zinc-400 shrink-0 w-12 text-right tabular-nums hidden md:inline" title="Esfuerzo en horas (8 h = 1 día). Las tareas en paralelo con la misma predecesora comparten esfuerzo.">
                            {r.effortHours != null && r.effortHours > 0 ? `${fmtHours(r.effortHours)} h` : ""}
                        </span>
                        <span className={cn("text-[10px] shrink-0 w-16 text-right", overdue ? "text-rose-500 font-semibold" : "text-zinc-500")} title={overdue ? "Vencida" : undefined}>
                            {fmtDate(r.end)}
                        </span>
                        {renderActions && (
                            <span className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                {renderActions(r)}
                            </span>
                        )}
                    </div>
                );
            })}
            {shown.length === 0 && <div className="p-6 text-center text-zinc-500">No hay filas que mostrar.</div>}
        </div>
    );
}
