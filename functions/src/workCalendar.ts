/**
 * Calendario laboral de Madrid: fines de semana + festivos estatales, de la Comunidad de Madrid y
 * locales de Madrid capital. Fuente única para la app (Agenda, Disponibilidad, Sprints, Plan,
 * Dashboard de proyecto) y las Cloud Functions (fotos diarias del proyecto).
 *
 * Días como "yyyy-MM-dd". Sin dependencias de Firebase.
 *
 * Mantenimiento: cada año, a finales de septiembre la Comunidad aprueba sus 12 festivos (BOCM) y en
 * diciembre se publican los locales. Añadir el año a OFFICIAL; mientras falte, se estima (ver estimated).
 */

/** Festivos oficiales publicados (BOCM). `localsPending`: aún no se han publicado los locales de Madrid capital. */
const OFFICIAL: Record<number, { days: Record<string, string>; localsPending?: boolean }> = {
    // Decreto 93/2024 (BOCM 26/09/2024) + locales Madrid capital
    2025: {
        days: {
            '2025-01-01': 'Año Nuevo',
            '2025-01-06': 'Epifanía del Señor',
            '2025-04-17': 'Jueves Santo',
            '2025-04-18': 'Viernes Santo',
            '2025-05-01': 'Fiesta del Trabajo',
            '2025-05-02': 'Fiesta de la Comunidad de Madrid',
            '2025-05-15': 'San Isidro (local)',
            '2025-07-25': 'Santiago Apóstol',
            '2025-08-15': 'Asunción de la Virgen',
            '2025-11-01': 'Todos los Santos',
            '2025-11-10': 'Nuestra Señora de La Almudena (local, trasladada del domingo 9)',
            '2025-12-06': 'Día de la Constitución Española',
            '2025-12-08': 'Inmaculada Concepción',
            '2025-12-25': 'Natividad del Señor',
        },
    },
    // Decreto 75/2025 (BOCM 25/09/2025) + locales Madrid capital
    2026: {
        days: {
            '2026-01-01': 'Año Nuevo',
            '2026-01-06': 'Epifanía del Señor',
            '2026-04-02': 'Jueves Santo',
            '2026-04-03': 'Viernes Santo',
            '2026-05-01': 'Fiesta del Trabajo',
            '2026-05-02': 'Fiesta de la Comunidad de Madrid',
            '2026-05-15': 'San Isidro (local)',
            '2026-08-15': 'Asunción de la Virgen',
            '2026-10-12': 'Fiesta Nacional de España',
            '2026-11-02': 'Todos los Santos (trasladado)',
            '2026-11-09': 'Nuestra Señora de La Almudena (local)',
            '2026-12-07': 'Día de la Constitución Española (trasladado)',
            '2026-12-08': 'Inmaculada Concepción',
            '2026-12-25': 'Natividad del Señor',
        },
    },
    // Decreto 82/2026 (BOCM 01/10/2026). Locales de Madrid capital pendientes (se publican en diciembre):
    // se cuentan San Isidro y La Almudena en su fecha habitual hasta que salgan.
    2027: {
        localsPending: true,
        days: {
            '2027-01-01': 'Año Nuevo',
            '2027-01-06': 'Epifanía del Señor',
            '2027-03-19': 'San José',
            '2027-03-25': 'Jueves Santo',
            '2027-03-26': 'Viernes Santo',
            '2027-05-01': 'Fiesta del Trabajo',
            '2027-05-15': 'San Isidro (local, provisional)',
            '2027-08-16': 'Asunción de la Virgen (trasladada)',
            '2027-10-12': 'Fiesta Nacional de España',
            '2027-11-01': 'Todos los Santos',
            '2027-11-09': 'Nuestra Señora de La Almudena (local, provisional)',
            '2027-12-06': 'Día de la Constitución Española',
            '2027-12-08': 'Inmaculada Concepción',
            '2027-12-25': 'Natividad del Señor',
        },
    },
};

/** Domingo de Pascua (algoritmo anónimo gregoriano). */
function easterSunday(year: number): string {
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const keyToUtc = (k: string) => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const utcToKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const shift = (k: string, n: number) => utcToKey(keyToUtc(k) + n * 86400000);
const weekdayOf = (k: string) => new Date(keyToUtc(k)).getUTCDay();

/** Año sin calendario publicado: fijos habituales + Semana Santa. Los traslados reales no se pueden prever. */
function estimated(year: number): Record<string, string> {
    const easter = easterSunday(year);
    const fixed: [string, string][] = [
        ['01-01', 'Año Nuevo'], ['01-06', 'Epifanía del Señor'], ['05-01', 'Fiesta del Trabajo'],
        ['05-02', 'Fiesta de la Comunidad de Madrid'], ['05-15', 'San Isidro (local)'], ['08-15', 'Asunción de la Virgen'],
        ['10-12', 'Fiesta Nacional de España'], ['11-01', 'Todos los Santos'], ['11-09', 'Nuestra Señora de La Almudena (local)'],
        ['12-06', 'Día de la Constitución Española'], ['12-08', 'Inmaculada Concepción'], ['12-25', 'Natividad del Señor'],
    ];
    const out: Record<string, string> = {};
    for (const [md, name] of fixed) out[`${year}-${md}`] = `${name} (estimado)`;
    out[shift(easter, -3)] = 'Jueves Santo (estimado)';
    out[shift(easter, -2)] = 'Viernes Santo (estimado)';
    return out;
}

export type HolidayCoverage = 'official' | 'locals_pending' | 'estimated';

export function holidayCoverage(year: number): HolidayCoverage {
    const o = OFFICIAL[year];
    return !o ? 'estimated' : o.localsPending ? 'locals_pending' : 'official';
}

const byYear = new Map<number, { map: Record<string, string>; weekdays: string[] }>();
function yearData(year: number) {
    let y = byYear.get(year);
    if (!y) {
        const map = OFFICIAL[year]?.days ?? estimated(year);
        // Solo los que caen entre semana restan días laborables
        const weekdays = Object.keys(map).filter((k) => { const wd = weekdayOf(k); return wd !== 0 && wd !== 6; }).sort();
        y = { map, weekdays };
        byYear.set(year, y);
    }
    return y;
}

/** Nombre del festivo o null. */
export function holidayName(day: string): string | null {
    return yearData(Number(day.slice(0, 4))).map[day] ?? null;
}

export const isHoliday = (day: string) => holidayName(day) !== null;

/** Laborable: de lunes a viernes y no festivo en Madrid. */
export const isWorkday = (day: string) => { const wd = weekdayOf(day); return wd !== 0 && wd !== 6 && !isHoliday(day); };

/** Lista plana de festivos oficiales publicados (compatibilidad con lib/holidays.ts). */
export const MADRID_HOLIDAYS: string[] = Object.values(OFFICIAL).flatMap((o) => Object.keys(o.days)).sort();

/** Días laborables entre a y b, ambos incluidos. 0 si b < a. */
export function workdaysBetween(a: string, b: string): number {
    if (b < a) return 0;
    const start = keyToUtc(a);
    const days = Math.round((keyToUtc(b) - start) / 86400000) + 1;
    let n = Math.floor(days / 7) * 5;
    const startWd = new Date(start).getUTCDay();
    for (let i = 0; i < days % 7; i++) { const wd = (startWd + i) % 7; if (wd !== 0 && wd !== 6) n++; }
    for (let y = Number(a.slice(0, 4)); y <= Number(b.slice(0, 4)); y++) {
        for (const h of yearData(y).weekdays) if (h >= a && h <= b) n--;
    }
    return n;
}

/** Desplaza n días laborables desde `from` (sin contarlo): n > 0 hacia delante, n < 0 hacia atrás. */
export function addWorkdays(from: string, n: number): string {
    let k = from;
    let left = Math.ceil(Math.abs(n));
    const step = n < 0 ? -1 : 1;
    while (left > 0) { k = shift(k, step); if (isWorkday(k)) left--; }
    return k;
}
