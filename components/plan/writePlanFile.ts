/**
 * [Plan] Escritura del Excel exportado (docs/plan-import-design.md §7). Las filas las calcula
 * `buildPlanExport` (lib/plan/planExport.ts); aquí solo el formato: sangría en el nombre, fechas reales,
 * % como porcentaje, resumen en negrita y tareas creadas en UniTask resaltadas.
 */
import ExcelJS from "exceljs";
import { formatDuration, INDENT, PLAN_EXPORT_HEADERS, type PlanExportResult } from "@/lib/plan/planExport";

const UNITASK_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };

/** "yyyy-MM-dd" → Date en UTC: ExcelJS guarda la fecha en UTC y así no se corre un día. */
const excelDate = (day: string | null) => {
    if (!day) return null;
    const [y, m, d] = day.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

export async function writePlanWorkbook(result: PlanExportResult, meta: { projectName: string; exportedBy: string }): Promise<Blob> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "UniTask";
    wb.created = new Date();

    // La hoja del plan va primera: la importación lee solo la primera hoja.
    const ws = wb.addWorksheet("Plan", { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [
        { width: 6 }, { width: 80 }, { width: 10 }, { width: 13 }, { width: 13 }, { width: 12 }, { width: 12 },
        { width: 17 }, { width: 18 }, { width: 10 }, { width: 24 },
    ];
    const header = ws.addRow([...PLAN_EXPORT_HEADERS]);
    header.font = { bold: true };
    header.eachCell((c) => { c.fill = HEADER_FILL; });

    for (const r of result.rows) {
        const name = INDENT.repeat(r.level) + (r.code ? `${r.code} ` : "") + r.name;
        const row = ws.addRow([
            r.id, name, formatDuration(r.durationDays), r.percent / 100, r.predecessors,
            excelDate(r.start), excelDate(r.end), r.status, r.responsible, r.origin, r.taskId,
        ]);
        row.getCell(4).numFmt = "0%";
        row.getCell(6).numFmt = "dd/mm/yyyy";
        row.getCell(7).numFmt = "dd/mm/yyyy";
        if (r.summary) row.font = { bold: true };
        if (r.origin === "UniTask") {
            row.eachCell({ includeEmpty: true }, (c) => { c.fill = UNITASK_FILL; });
            row.getCell(10).font = { bold: true, color: { argb: "FF9C5700" } };
            if (r.codeGenerated) row.getCell(2).note = "Código propuesto por UniTask (siguiente libre bajo su padre). Tarea creada en UniTask: decidir si se lleva a MS Project.";
        }
        if (r.archived) row.font = { ...(row.font || {}), italic: true, color: { argb: "FF808080" } };
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: PLAN_EXPORT_HEADERS.length } };

    const info = wb.addWorksheet("Info");
    info.columns = [{ width: 28 }, { width: 90 }];
    const lines: [string, string | number][] = [
        ["Proyecto", meta.projectName],
        ["Exportado", new Date().toLocaleString("es-ES")],
        ["Exportado por", meta.exportedBy],
        ["Filas", result.counts.total],
        ["Creadas en UniTask", result.counts.unitask],
        ["Archivadas incluidas", result.counts.archived],
        ["", ""],
        ["% completado", "Según el estado en UniTask: Aprobación Final 100 %, Revisión 75 %, En curso 50 %, Pendiente 0 %. Padres e hitos: media de sus tareas ponderada por esfuerzo."],
        ["Duración", "Tareas: esfuerzo estimado en días (8 h = 1 d). Padres e hitos: días laborables entre Comienzo y Fin. Controles: 0 d."],
        ["Predecesoras", "Referencian la columna Id de este fichero."],
        ["Filas amarillas", "Tareas creadas en UniTask (Origen = UniTask). El código es una propuesta: el PM decide si las lleva a MS Project."],
        ["Reimportar", "Este fichero se puede reimportar en UniTask (pestaña Plan → Reimportar Excel): la columna UniTask ID empareja cada fila con su tarea. No la borres."],
    ];
    for (const [k, v] of lines) {
        const row = info.addRow([k, v]);
        row.getCell(1).font = { bold: true };
        row.getCell(2).alignment = { wrapText: true, vertical: "top" };
    }

    const buf = await wb.xlsx.writeBuffer();
    return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
