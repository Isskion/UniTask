/**
 * [Plan] Lectura de un Excel de plan en el navegador: matriz de filas (SheetJS) y filas en negrita
 * (ExcelJS; MS Project marca así las tareas resumen y SheetJS no lo expone). Lo usan los asistentes
 * de importación y de reimportación.
 */
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { parsePlanRows } from "@/lib/plan/planParser";

async function readBoldRows(buffer: ArrayBuffer): Promise<Set<number>> {
    const bold = new Set<number>();
    try {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);
        const ws = wb.worksheets[0];
        ws?.eachRow((row, rowNumber) => {
            let isBold = false;
            row.eachCell((cell) => { if (cell.font?.bold) isBold = true; });
            if (isBold) bold.add(rowNumber);
        });
    } catch (err) {
        // Solo afecta al aviso "resumen sin detalle"; la importación no depende de ello.
        console.warn("[PlanImport] No se pudo leer el formato (negritas) del Excel:", err);
    }
    return bold;
}

/** Lanza con mensaje claro si el fichero no es un plan (sin cabecera "Nombre de tarea", sin filas). */
export async function readPlanFile(file: File): Promise<{ rows: unknown[][]; boldRows: Set<number> }> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, blankrows: false });
    parsePlanRows(rows);
    return { rows, boldRows: await readBoldRows(buffer) };
}
