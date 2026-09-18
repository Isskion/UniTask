"use client";

import * as XLSX from "xlsx";
import { ActivityType, ResultStatus, AgendaConsultant } from "@/types/agenda";
import { Project } from "@/types";
import { db } from "@/lib/firebase";
import {
    collection, getDocs, writeBatch, doc, query, where,
    serverTimestamp, Timestamp,
} from "firebase/firestore";
import {
    normalizeSchedule, parseHours, buildJiraRecord,
    getDayType, getWeekLabel, getWeekMonth, getWeekNumber,
    getYearMonth, getWeekStart, parseComment,
} from "@/lib/agenda-utils";
import { format, addDays } from "date-fns";

const ENTRIES_COLLECTION = "agenda_entries";

// ─── Activity / Result maps ───────────────────────────────────────────────────

const ACTIVIDAD_MAP: Record<string, ActivityType> = {
    'Reunión Cliente':    ActivityType.REUNION_CLIENTE,
    'Reunion Cliente':    ActivityType.REUNION_CLIENTE,
    'Reunión UNIGIS':     ActivityType.REUNION_UNIGIS,
    'Reunion UNIGIS':     ActivityType.REUNION_UNIGIS,
    'Reunión Presencial': ActivityType.REUNION_PRESENCIAL,
    'Reunion Presencial': ActivityType.REUNION_PRESENCIAL,
    'Reunión Interna':    ActivityType.REUNION_INTERNA,
    'Reunion Interna':    ActivityType.REUNION_INTERNA,
    'Tareas a Realizar':  ActivityType.TAREAS_A_REALIZAR,
    'Comercial':          ActivityType.COMERCIAL,
    'Vacaciones':         ActivityType.VACACIONES,
    'Viaje':              ActivityType.VIAJE,
    'Especial':           ActivityType.ESPECIAL,
};

const RESULTADO_MAP: Record<string, ResultStatus> = {
    'Por Hacer':  ResultStatus.POR_HACER,
    'En pausa':   ResultStatus.EN_PAUSA,
    'Hecho':      ResultStatus.HECHO,
    'Cancelado':  ResultStatus.CANCELADO,
};

// Bloques de día detectados dinámicamente (ver detectDayBlocks) — sustituye a los offsets fijos
// que asumían siempre 7 días de 5 columnas cada uno. Necesario desde 2026-09-18: el Excel de
// Europastry introdujo un formato de "calendario continuo" (una hoja = toda la temporada,
// Sept 2026 → Mayo 2027, cientos de bloques de día) con bloques de ancho variable (un día
// festivo puede tener solo la columna Fecha_T, sin Actividad/Comentario/Horario/Resultado).
// Ver [[project_agenda_continuous_calendar_2026-09-18]] en memoria.

// Activity types whose "cliente" text (before " / " in Comentario) plausibly names a project.
// Vacaciones/Viaje/Reunión Interna/Especial never carry a project — never offered for resolution.
export const PROJECT_ELIGIBLE_ACTIVITIES = new Set<ActivityType>([
    ActivityType.REUNION_CLIENTE,
    ActivityType.REUNION_UNIGIS,
    ActivityType.REUNION_PRESENCIAL,
    ActivityType.TAREAS_A_REALIZAR,
    ActivityType.COMERCIAL,
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedExcelEntry {
    consultantName: string;
    date: Date;
    activityType: ActivityType;
    comment: string;
    scheduleRaw: string;
    result: ResultStatus;
    /** True when Fecha_T couldn't be parsed and the date was inferred from the week + day column instead
     *  of the actual cell — schedule is dropped (no hours) until someone confirms/fixes the real date. */
    needsDateReview?: boolean;
}

export interface ImportDiagnostics {
    sheetName: string;
    consultantRows: number;       // rows (from row 4) with a non-empty consultant name
    candidateCells: number;       // day-cells with Actividad filled (Horario is optional)
    invalidDateCells: number;     // candidate cells without a parseable Fecha_T
    unknownActivityCells: number; // candidate cells with valid date but unrecognized Actividad
}

export interface ImportPreview {
    sheetNames: string[];   // every sheet in the workbook, for the sheet picker
    sheetName: string;      // sheet actually parsed
    weekStart: string;
    weekLabel: string;
    entries: ParsedExcelEntry[];
    unknownConsultants: string[];
    diagnostics: ImportDiagnostics;
    /** Todas las semanas (lunes, yyyy-MM-dd) con al menos una entrada válida en la hoja, ordenadas.
     *  Longitud 1 en las hojas clásicas (una semana por hoja). >1 significa que la hoja es del
     *  formato "calendario continuo" nuevo — `entries`/`weekStart` ya vienen filtrados a una sola
     *  semana (la primera de esta lista, o `targetWeekStart` si se indicó); usar esta lista para
     *  ofrecer un selector de semana y volver a parsear con otro `targetWeekStart`. */
    availableWeeks: string[];
}

export interface ParseOptions {
    sheetName?: string;        // defaults to the first sheet
    /** Monday (yyyy-MM-dd) used to derive Fecha_T when the cell is empty/invalid (e.g. broken #REF! formulas) */
    weekStartOverride?: string;
    /** Semana (lunes, yyyy-MM-dd) a la que restringir `entries` cuando la hoja tiene más de una
     *  semana con datos (formato "calendario continuo"). Si se omite, se usa la primera semana
     *  con datos encontrada en la hoja (mismo comportamiento de siempre cuando solo hay una). */
    targetWeekStart?: string;
}

export interface ImportResult {
    written: number;
    updated: number;
    skipped: number;
    unknownConsultants: string[];
}

// ─── Parse Excel ──────────────────────────────────────────────────────────────

function parseExcelDate(raw: string): Date | null {
    if (!raw) return null;
    const parts = raw.toString().trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    return new Date(2000 + y, m - 1, d);
}

interface DayBlock {
    fechaCol: number;
    actividadCol: number | null;
    comentarioCol: number | null;
    horarioCol: number | null;
    resultadoCol: number | null;
}

/** Detecta los bloques de día a partir de las dos filas de cabecera (fila 2 = etiqueta del día,
 *  ej. "LUN 21/09/26 - DH (Semana 3)", solo rellena en la primera columna de cada bloque; fila 3
 *  = subcabeceras "Fecha_T | Actividad | Comentario | Horario | Resultado"). Un bloque empieza en
 *  cualquier columna con texto en la fila 2 y termina justo antes del siguiente. No asume un ancho
 *  fijo: un día sin actividad puede tener solo la columna Fecha_T (bloque de 1 columna) — en ese
 *  caso el resto de columnas quedan a `null` y esas filas se saltan limpiamente en el parseo.
 *  Funciona igual para hojas clásicas de una sola semana (7 bloques de 5 columnas) que para el
 *  formato de calendario continuo (cientos de bloques de ancho variable) — es una generalización
 *  estricta de los offsets fijos que usaba antes, sin cambiar el resultado en el caso clásico. */
function detectDayBlocks(headerRow: any[], subHeaderRow: any[]): DayBlock[] {
    const width = Math.max(headerRow.length, subHeaderRow.length);
    const starts: number[] = [];
    for (let c = 2; c < width; c++) {
        if (String(headerRow[c] ?? '').trim()) starts.push(c);
    }
    return starts.map((start, i) => {
        const end = i + 1 < starts.length ? starts[i + 1] : width;
        const block: DayBlock = { fechaCol: start, actividadCol: null, comentarioCol: null, horarioCol: null, resultadoCol: null };
        for (let c = start; c < end; c++) {
            const label = String(subHeaderRow[c] ?? '').trim().toLowerCase();
            if (label === 'fecha_t') block.fechaCol = c;
            else if (label === 'actividad') block.actividadCol = c;
            else if (label === 'comentario') block.comentarioCol = c;
            else if (label === 'horario') block.horarioCol = c;
            else if (label === 'resultado') block.resultadoCol = c;
        }
        return block;
    });
}

export function parseAgendaExcel(file: File, opts?: ParseOptions): Promise<ImportPreview> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' });
                const sheetName = (opts?.sheetName && wb.SheetNames.includes(opts.sheetName))
                    ? opts.sheetName
                    : wb.SheetNames[0];
                const ws = wb.Sheets[sheetName];
                const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                // Fallback Monday used to derive Fecha_T when the cell is empty/broken (#REF!)
                const overrideMonday = opts?.weekStartOverride
                    ? new Date(opts.weekStartOverride + 'T00:00:00')
                    : null;

                const blocks = detectDayBlocks(rows[1] || [], rows[2] || []);
                // Las hojas clásicas (una semana por hoja) siempre detectan 7 bloques — el
                // fallback "Lunes de esta semana" solo tiene sentido de interpretar `dayIdx` como
                // día de la semana (0=lunes..6=domingo) en ese caso. En el formato de calendario
                // continuo (>7 bloques) cada bloque ya trae su propia fecha real casi siempre, así
                // que no se intenta adivinar — el override ahí no tendría un día de la semana claro.
                const isClassicSingleWeekSheet = blocks.length <= 7;

                const diagnostics: ImportDiagnostics = {
                    sheetName,
                    consultantRows: 0,
                    candidateCells: 0,
                    invalidDateCells: 0,
                    unknownActivityCells: 0,
                };

                // ── Pass 1: collect every candidate cell (Actividad filled — Horario is optional,
                // e.g. "Tareas a Realizar" rows often have no time range), keeping its real date
                // when parseable and its block index so a missing date can later be inferred from
                // the week once it's known (solo en hojas clásicas de una semana, ver arriba). ──
                interface Candidate {
                    consultantName: string;
                    dayIdx: number;
                    date: Date | null;
                    activityType: ActivityType;
                    comment: string;
                    scheduleRaw: string;
                    result: ResultStatus;
                }
                const candidates: Candidate[] = [];

                for (let ri = 3; ri < rows.length; ri++) {
                    const row = rows[ri];
                    const consultantName = String(row[1] || '').trim();
                    if (!consultantName) continue;
                    diagnostics.consultantRows++;

                    for (let dayIdx = 0; dayIdx < blocks.length; dayIdx++) {
                        const block = blocks[dayIdx];
                        if (block.actividadCol === null) continue; // bloque "solo Fecha_T" (ej. festivo) — nada que leer
                        const actividad  = String(row[block.actividadCol] || '').trim();
                        if (!actividad) continue;
                        diagnostics.candidateCells++;

                        const activityType = ACTIVIDAD_MAP[actividad];
                        if (!activityType) {
                            diagnostics.unknownActivityCells++;
                            continue;
                        }

                        const comentario = block.comentarioCol !== null ? String(row[block.comentarioCol] || '').trim() : '';
                        const horario    = block.horarioCol    !== null ? String(row[block.horarioCol]    || '').trim() : '';
                        const resultado  = block.resultadoCol  !== null ? String(row[block.resultadoCol]  || '').trim() : '';

                        let date = parseExcelDate(String(row[block.fechaCol] || ''));
                        if (!date && overrideMonday && isClassicSingleWeekSheet) {
                            date = addDays(overrideMonday, dayIdx); // day-block order: lunes..domingo
                        }
                        if (!date) diagnostics.invalidDateCells++;

                        candidates.push({
                            consultantName,
                            dayIdx,
                            date,
                            activityType,
                            comment: comentario,
                            scheduleRaw: horario,
                            result: RESULTADO_MAP[resultado] || ResultStatus.POR_HACER,
                        });
                    }
                }

                // ── Pass 2: figure out the week's Monday from any cell with a real date,
                // so cells without one can still be placed on the right weekday (hojas clásicas). ──
                const firstRealDate = candidates.find(c => c.date)?.date ?? null;
                const inferredMonday = (isClassicSingleWeekSheet && firstRealDate) ? getWeekStart(firstRealDate) : null;

                // ── Pass 3: build every entry with a resolvable date (across potentially MANY
                // weeks, en el formato de calendario continuo). Cells with no real date but a
                // known single week get a best-effort date (week + day column) and lose their
                // schedule/hours — flagged for review. ──
                const allEntries: ParsedExcelEntry[] = [];
                for (const c of candidates) {
                    if (c.date) {
                        allEntries.push({
                            consultantName: c.consultantName,
                            date: c.date,
                            activityType: c.activityType,
                            comment: c.comment,
                            scheduleRaw: c.scheduleRaw,
                            result: c.result,
                        });
                    } else if (inferredMonday) {
                        allEntries.push({
                            consultantName: c.consultantName,
                            date: addDays(inferredMonday, c.dayIdx),
                            activityType: c.activityType,
                            comment: c.comment,
                            scheduleRaw: '', // sin horas hasta confirmar la fecha real
                            result: c.result,
                            needsDateReview: true,
                        });
                    }
                    // No real date AND no inferred week (every cell in the sheet is dateless) —
                    // still un-importable; the "Lunes de esta semana" override is the only way out.
                }

                // ── Pass 4: `executeImport` escribe con un único weekStart por lote (y el dedup
                // consulta Firestore filtrando por esa misma semana) — así que `entries` se
                // restringe siempre a UNA semana, igual que antes. Si la hoja trae varias (formato
                // de calendario continuo), se listan todas en `availableWeeks` para que la UI
                // ofrezca un selector y se pueda re-parsear con `targetWeekStart`. ──
                const weekSet = new Set(allEntries.map(en => format(getWeekStart(en.date), 'yyyy-MM-dd')));
                const availableWeeks = Array.from(weekSet).sort();
                const chosenWeek = (opts?.targetWeekStart && weekSet.has(opts.targetWeekStart))
                    ? opts.targetWeekStart
                    : (availableWeeks[0] ?? '');
                const entries = chosenWeek
                    ? allEntries.filter(en => format(getWeekStart(en.date), 'yyyy-MM-dd') === chosenWeek)
                    : allEntries; // sin ninguna fecha resoluble en toda la hoja — se deja tal cual para que el diagnóstico explique por qué

                const weekStart = chosenWeek || (entries.length ? format(getWeekStart(entries[0].date), 'yyyy-MM-dd') : '');
                const weekLabel = entries.length ? getWeekLabel(entries[0].date) : String(rows[0]?.[2] || '').trim();

                if (entries.length === 0) {
                    console.warn('[agenda-import] 0 entradas parseadas — diagnóstico:', diagnostics);
                }

                // unknownConsultants resolved externally by caller (needs consultant list)
                resolve({ sheetNames: wb.SheetNames, sheetName, weekStart, weekLabel, entries, unknownConsultants: [], diagnostics, availableWeeks });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/** Builds the set of names (consultant.name + aliases, uppercase) that resolve without asking. */
function buildKnownNames(consultants: AgendaConsultant[]): Set<string> {
    const known = new Set<string>();
    consultants.filter(c => c.isActive).forEach(c => {
        known.add(c.name.toUpperCase());
        (c.aliases ?? []).forEach(a => known.add(a.toUpperCase()));
    });
    return known;
}

/** Returns the set of consultant names from the Excel that don't match any known consultant (by name or alias). Inactive consultants never count as a match. */
export function resolveUnknownConsultants(
    entries: ParsedExcelEntry[],
    consultants: AgendaConsultant[]
): string[] {
    const knownNames = buildKnownNames(consultants);
    const excelNames = new Set(entries.map(e => e.consultantName.toUpperCase()));
    return [...excelNames].filter(n => !knownNames.has(n));
}

/** Naive best-guess match for an unknown Excel name, to pre-select a suggestion in the resolver UI.
 *  Compares normalized (accent-stripped) token overlap — good enough for "Diego Senra" -> "Diego Senra Lamberti". */
export function suggestConsultantMatch(
    excelName: string,
    consultants: AgendaConsultant[]
): AgendaConsultant | null {
    const normalize = (s: string) => s
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase().trim();

    const target = normalize(excelName);
    const targetTokens = new Set(target.split(/\s+/).filter(Boolean));
    if (targetTokens.size === 0) return null;

    let best: AgendaConsultant | null = null;
    let bestScore = 0;

    for (const c of consultants.filter(c => c.isActive)) {
        const candidate = normalize(c.name);
        if (candidate === target || candidate.startsWith(target) || target.startsWith(candidate)) {
            return c; // strong match — short-circuit
        }
        const candidateTokens = candidate.split(/\s+/).filter(Boolean);
        const overlap = candidateTokens.filter(t => targetTokens.has(t)).length;
        if (overlap > bestScore) {
            bestScore = overlap;
            best = c;
        }
    }

    return bestScore > 0 ? best : null;
}

/** Builds the set of names (project.name + aliases, uppercase) that resolve without asking.
 *  Matches by NAME only, never by code — the Excel cell is a free-text label a PM types,
 *  never the project's business code. */
export function buildKnownProjectNames(projects: Project[]): Map<string, Project> {
    const known = new Map<string, Project>();
    projects.forEach(p => {
        known.set(p.name.toUpperCase(), p);
        (p.aliases ?? []).forEach(a => known.set(a.toUpperCase(), p));
    });
    return known;
}

/** Returns the distinct "cliente" texts (from project-eligible entries) that don't match any
 *  known project by name/alias. Entries with empty client text are ignored. */
export function resolveUnknownProjects(
    entries: ParsedExcelEntry[],
    projects: Project[]
): string[] {
    const knownNames = buildKnownProjectNames(projects);
    const clientTexts = new Set(
        entries
            .filter(e => PROJECT_ELIGIBLE_ACTIVITIES.has(e.activityType))
            .map(e => parseComment(e.comment).client)
            .filter(Boolean)
    );
    return [...clientTexts].filter(n => !knownNames.has(n));
}

/** Naive best-guess match for an unmatched "cliente" text, to pre-select a suggestion in the
 *  resolver UI. Compares normalized (accent-stripped) token overlap against project.name only. */
export function suggestProjectMatch(clientText: string, projects: Project[]): Project | null {
    const normalize = (s: string) => s
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase().trim();

    const target = normalize(clientText);
    const targetTokens = new Set(target.split(/\s+/).filter(Boolean));
    if (targetTokens.size === 0) return null;

    let best: Project | null = null;
    let bestScore = 0;

    for (const p of projects) {
        const candidate = normalize(p.name);
        if (candidate === target || candidate.startsWith(target) || target.startsWith(candidate)) {
            return p; // strong match — short-circuit
        }
        const candidateTokens = candidate.split(/\s+/).filter(Boolean);
        const overlap = candidateTokens.filter(t => targetTokens.has(t)).length;
        if (overlap > bestScore) {
            bestScore = overlap;
            best = p;
        }
    }

    return bestScore > 0 ? best : null;
}

// ─── Execute Import ───────────────────────────────────────────────────────────

/**
 * regionOverrides: consultantId → region string.
 * When a consultant has multiple regions, the caller can specify which region
 * to stamp on the imported entries instead of using consultant.region.
 *
 * nameResolutions: excelName.toUpperCase() → consultant.userId (manual mapping chosen
 * by the importer for a name that didn't match any consultant/alias) or the literal
 * string 'SKIP' (importer explicitly chose to leave those rows out).
 *
 * projects: active projects available for auto-matching by name/alias.
 *
 * projectResolutions: clientText.toUpperCase() → project.id (manual mapping chosen by the
 * importer for a "cliente" text that didn't match any project name/alias). Unlike consultants,
 * an unresolved project is never blocking — the entry is imported with projectId null and
 * projectName set to the raw text, same as before this feature existed.
 */
export async function executeImport(
    preview: ImportPreview,
    consultants: AgendaConsultant[],
    tenantId: string,
    userId: string,
    regionOverrides?: Record<string, string>,
    nameResolutions?: Record<string, string>,
    projects?: Project[],
    projectResolutions?: Record<string, string>,
): Promise<ImportResult> {
    const { entries, weekStart } = preview;

    // Build name → consultant lookup (uppercase for case-insensitive match).
    // Inactive consultants never match by name/alias — only an explicit nameResolution can target them.
    const nameMap = new Map<string, AgendaConsultant>();
    consultants.filter(c => c.isActive).forEach(c => {
        nameMap.set(c.name.toUpperCase(), c);
        (c.aliases ?? []).forEach(a => nameMap.set(a.toUpperCase(), c));
    });
    const consultantsByUserId = new Map(consultants.map(c => [c.userId, c]));

    // Build cliente-text → project lookup (by name/alias only, never by code).
    const projectNameMap = buildKnownProjectNames(projects ?? []);
    const projectsById = new Map((projects ?? []).map(p => [p.id, p]));

    // Load existing entries for the week to enable dedup
    const existingQ = query(
        collection(db, ENTRIES_COLLECTION),
        where("tenantId",  "==", tenantId),
        where("weekStart", "==", weekStart)
    );
    const existingSnap = await getDocs(existingQ);
    // dedupKey → { id, result, projectId } del documento existente, para poder sincronizar el
    // Resultado y el Proyecto en reimportación sin necesidad de otra lectura (ya tenemos todo
    // el doc en memoria). El Proyecto puede cambiar entre importaciones cuando se resuelve un
    // alias después de la primera importación de esa semana.
    const existingByKey = new Map<string, { id: string; result: ResultStatus; projectId: string | null }>();
    existingSnap.docs.forEach(d => {
        const e = d.data();
        const _d = (e.date as Timestamp).toDate();
        const dateISO = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
        const { scheduleRaw: norm } = normalizeSchedule(e.scheduleRaw || '');
        const normComment = String(e.comment || '').trim().toUpperCase();
        const key = `${e.consultantId}::${dateISO}::${e.activityType}::${norm}::${normComment}`;
        existingByKey.set(key, { id: d.id, result: e.result as ResultStatus, projectId: e.projectId ?? null });
    });

    let batch = writeBatch(db);
    let opsInBatch = 0;
    const flushIfFull = async () => {
        // Firestore batch limit is 500 ops
        if (opsInBatch < 490) return;
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
    };

    let written = 0;
    let updated = 0;
    let skipped = 0;
    const unknownConsultants = new Set<string>();

    for (const entry of entries) {
        const upperName = entry.consultantName.toUpperCase();
        let consultant = nameMap.get(upperName);

        if (!consultant) {
            const resolution = nameResolutions?.[upperName];
            if (resolution === 'SKIP') {
                skipped++;
                continue;
            }
            if (resolution) consultant = consultantsByUserId.get(resolution);
        }

        if (!consultant) {
            unknownConsultants.add(entry.consultantName);
            skipped++;
            continue;
        }

        const { scheduleRaw, scheduleStart, scheduleEnd } = normalizeSchedule(entry.scheduleRaw);
        const dateISO = `${entry.date.getFullYear()}-${String(entry.date.getMonth()+1).padStart(2,'0')}-${String(entry.date.getDate()).padStart(2,'0')}`;
        const normComment = entry.comment.trim().toUpperCase();
        const dedupKey = `${consultant.userId}::${dateISO}::${entry.activityType}::${scheduleRaw}::${normComment}`;

        const { client, description } = parseComment(entry.comment);

        // Project auto-match by "cliente" text (name/alias only, never by code) — not blocking:
        // unmatched entries keep today's behavior (no projectId, projectName = raw text).
        let project: Project | undefined;
        if (PROJECT_ELIGIBLE_ACTIVITIES.has(entry.activityType) && client) {
            project = projectNameMap.get(client) ?? projectsById.get(projectResolutions?.[client] ?? '');
        }

        const existing = existingByKey.get(dedupKey);
        if (existing) {
            // Misma tarea ya importada. El Resultado y el Proyecto son los únicos campos que
            // pueden haber cambiado entre dos importaciones de la misma semana (el resto forma
            // parte de la clave de dedup) — el Proyecto cambia cuando se resuelve un alias nuevo
            // después de la primera importación. Si ninguno cambió, se omite.
            const newProjectId = project?.id ?? null;
            const projectChanged = existing.id && newProjectId !== existing.projectId;
            const resultChanged  = existing.id && existing.result !== entry.result;
            if (resultChanged || projectChanged) {
                batch.update(doc(db, ENTRIES_COLLECTION, existing.id), {
                    ...(resultChanged  ? { result: entry.result } : {}),
                    ...(projectChanged ? {
                        projectId:    newProjectId,
                        projectName:  project?.name  ?? (client || null),
                        projectCode:  project?.code  ?? null,
                        projectColor: project?.color ?? null,
                    } : {}),
                    updatedAt: serverTimestamp(),
                });
                updated++;
                opsInBatch++;
                await flushIfFull();
            } else {
                skipped++;
            }
            continue;
        }
        existingByKey.set(dedupKey, { id: '', result: entry.result, projectId: project?.id ?? null }); // prevent duplicate within same import batch

        const weekDate  = getWeekStart(entry.date);
        const weekLabel = getWeekLabel(entry.date);
        const weekMonth = getWeekMonth(entry.date);
        const yearMonth = getYearMonth(entry.date);

        const payload = {
            tenantId,
            date:            Timestamp.fromDate(entry.date),
            weekStart,
            weekLabel,
            weekMonth,
            weekNumber:      getWeekNumber(entry.date),
            yearMonth,
            dayType:         getDayType(entry.date),
            consultantId:    consultant.userId,
            consultantName:  consultant.name,
            consultantOrder: consultant.sortOrder,
            region:          regionOverrides?.[consultant.userId]
                                ?? (consultant.regions ?? []).find(r => r !== '*')
                                ?? consultant.region
                                ?? '',
            divisionId:      '',
            divisionName:    '',
            activityType:    entry.activityType,
            comment:         entry.comment,
            client,
            description,
            scheduleRaw,
            scheduleStart,
            scheduleEnd,
            scheduledHours:  parseHours(scheduleRaw),
            result:          entry.result,
            jiraRecord:      buildJiraRecord(entry.activityType, client, description),
            projectId:       project?.id    ?? null,
            projectName:     project?.name  ?? (client || null),
            projectCode:     project?.code  ?? null,
            projectColor:    project?.color ?? null,
            linkedTaskId:    null,
            createdBy:       userId,
            createdAt:       serverTimestamp(),
            updatedAt:       serverTimestamp(),
            isActive:        true,
            importedFromExcel: true,
            needsDateReview: entry.needsDateReview ?? false,
        };

        batch.set(doc(collection(db, ENTRIES_COLLECTION)), payload);
        written++;
        opsInBatch++;
        await flushIfFull();
    }

    if (opsInBatch > 0) await batch.commit();

    return { written, updated, skipped, unknownConsultants: [...unknownConsultants] };
}
