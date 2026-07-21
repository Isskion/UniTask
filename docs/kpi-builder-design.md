# KPIs dinámicos en el Resumen de Agenda — Diseño técnico

> **Estado: DEPRECADO / en pausa (2026-07-21).** Se implementó el MVP completo (los 8 archivos de §13, más
> las modificaciones a `AgendaResumen`/`AgendaConsultantsManager`/`AgendaView`/`types.ts`/`firestore.rules`),
> se probó en local y en producción (reglas desplegadas y revertidas después), y el usuario decidió no
> llevarlo a producción — "no me gusta el resultado". Todo el código de implementación se revirtió (nunca se
> commiteó, así que el repo queda limpio) y las reglas de Firestore se redesplegaron a su estado anterior. Lo
> que **sí queda vivo**: la optimización de `getAgendaEntriesRange` en `lib/project-hours.ts` (batching de
> queries por semana, §6.4) — es una mejora real a código ya en producción, independiente de este feature, y
> se mantiene. Este documento se conserva íntegro como base para retomarlo más adelante — ver §18 para el
> resumen de qué se probó y qué se aprendió, antes de reabrir el desarrollo.
>
> Este documento es autocontenido: no depende de ninguna conversación previa. Cualquier persona (o modelo)
> que lo lea junto con el repo debería poder retomar el MVP sin más contexto que lo escrito aquí.

## 1. Objetivo

Hoy la pestaña **Resumen** de la Agenda (`components/agenda/AgendaResumen.tsx`) muestra un conjunto **fijo** de
bloques: horas por consultor×actividad, horas por proyecto, horas por tipo de actividad, horas por estado, y
(desde la feature de presupuesto) presupuesto-vs-planificado-vs-real por proyecto (`ProjectHoursSummary.tsx`).

Se quiere que **cualquier usuario pueda crear sus propios KPIs**: elegir de qué dato parte, cómo se filtra,
cómo se agrupa, y cómo se visualiza (lista / tarta / barras / serie temporal), con un rango temporal que por
defecto cubre **toda la vida del proyecto** (`Project.startDate` → hoy o `Project.endDate`).

## 2. Qué existe ya y se reutiliza

| Pieza | Dónde | Qué aporta |
|---|---|---|
| Gráficos (bar/pie) | `recharts@^3.6.0` (ya en `package.json`), usado en `components/agenda/ProjectReportModal.tsx` y `components/Dashboard.tsx` | No hace falta añadir librería de charts |
| Precedente de "breakdown configurable" | `ProjectReportModal.tsx` (líneas 1-80 revisadas): `breakdown: 'activity'|'consultant'|'week'|'phase'`, `chartType: 'bar'|'pie'` | Patrón a generalizar — hoy está hardcodeado a un único proyecto y a 4 dimensiones fijas |
| Rango temporal por periodo | `lib/project-hours.ts`: `PeriodKind`, `buildPeriodRange()`, `customRange()` | Reutilizable tal cual para 'día'/'semana'/'mes'/'horquilla'. Falta añadir el modo `'projectLifetime'` |
| Fetch de agenda por rango | `lib/project-hours.ts` → `getAgendaEntriesRange(tenantId, range)` — consulta semana a semana reutilizando el índice `agenda_entries(tenantId, weekStart)`, luego filtra por fecha exacta en cliente | Reutilizable para el engine de KPIs (fuente `agenda_entries`) |
| Fecha de arranque/cierre de proyecto | `types.ts` → `Project.startDate`, `Project.endDate` (añadidos en la feature de presupuesto por fase, ver `lib/project-hours.ts` y `components/ProjectBudgetEditor.tsx`) | Es la base del rango por defecto "vida del proyecto" |
| Calendario real de ausencias | `types/availability.ts` → `UserAvailability` (colección Firestore `user_availability`), hook `hooks/useAvailability.ts` (`useAvailability(tenantId)`, listener sin filtro de fecha, trae todo el tenant) | Fuente necesaria para el KPI de capacidad (ver §7) — **no confundir** con `ActivityType.VACACIONES`, que es un valor dentro de `agenda_entries` y no la fuente de verdad |
| Días hábiles / festivos | `lib/agenda-utils.ts` → `getDayType(date): DayType`, festivos hardcoded en `MADRID_HOLIDAYS` | Base para calcular capacidad teórica por semana |
| Reglas Firestore (patrón tenant) | `firestore.rules` línea 36: `docTenantMatches(docData)`; ejemplos de colección con owner en línea 418 (`user_availability`, lectura abierta a todo el tenant, escritura con rol) | Plantilla a copiar para `kpiDefinitions` |

## 3. Decisiones ya tomadas (no reabrir sin motivo nuevo)

1. **Motor de cálculo del MVP = agregación simple** (`sum`/`count`/`avg`). Nada de fórmulas libres evaluadas
   (`eval`/`new Function()`) porque la definición del KPI se persiste en Firestore y se ejecuta para otros
   usuarios del tenant — es superficie de inyección de código si se admite texto libre. Fórmulas compuestas
   (ratios, %) quedan para v2, con un parser restringido (tipo `mathjs` en modo *limited/sandboxed*, sin acceso
   a `import`/`eval`/prototipos) que solo resuelve variables = KPIs base ya calculados, nunca texto arbitrario
   contra el DOM/red.
2. **Multi-proyecto**: el filtro de proyecto (ninguno = todos, o selección de varios) es independiente del
   `groupBy`. Se puede agregar todo en una sola cifra/serie sin agrupar por proyecto — necesario para KPIs de
   cartera/equipo como el de capacidad.
3. **Fuentes de datos MVP**: solo `agenda_entries`. El catálogo de campos se modela como
   `Record<SourceId, FieldCatalog>` para que añadir `consultantTasks` más adelante sea registrar una fuente
   nueva, no rediseñar el motor. `consultantTasks` necesitará cambios propios antes de ser fuente fiable
   (pendiente, fuera de alcance de este documento).
4. **Visibilidad**: cada KPI tiene dueño (`ownerUserId`) y `visibility: 'private' | 'shared'`, por defecto
   `private`. El Resumen muestra dos bloques: "Mis KPIs" y "Compartidos por el equipo". Compartir es una
   acción explícita del dueño, no automática.
5. **El KPI de capacidad semanal NO pasa por el motor genérico en el MVP.** Motivo: cruza dos fuentes
   (`agenda_entries` + `user_availability` + festivos hardcoded), y el motor genérico de v1 solo agrega una
   fuente. Se implementa como un KPI "de sistema" (componente propio, como `ProjectHoursSummary` hoy), no como
   un `kpiDefinition` editable por el usuario. Cuando el motor soporte múltiples fuentes (v2/v3), se puede
   migrar a KPI de usuario normal.

## 4. Modelo de datos

### 4.1 Tipos (nuevo archivo `types/kpi.ts`)

```ts
export type KpiSourceId = 'agenda_entries'; // v2 añade 'consultantTasks'

export type AggOp = 'sum' | 'count' | 'avg' | 'min' | 'max';
export type ChartType = 'list' | 'pie' | 'bar' | 'timeseries';
export type TimeBucket = 'day' | 'week' | 'month';
export type TimeRangeMode = 'projectLifetime' | 'fixed' | 'rolling';

export interface KpiFilter {
    field: string;                 // debe existir en el FieldCatalog de la fuente
    op: 'eq' | 'neq' | 'in' | 'gte' | 'lte';
    value: string | number | string[];
}

export interface KpiTimeRange {
    mode: TimeRangeMode;
    bucket?: TimeBucket;           // requerido si chartType === 'timeseries'
    // mode === 'fixed'
    fromIso?: string;
    toIso?: string;
    // mode === 'rolling'
    rollingDays?: number;
    // mode === 'projectLifetime' usa Project.startDate → hoy o Project.endDate;
    // requiere que el KPI esté acotado a UN proyecto vía filtro projectId 'eq'
}

export interface KpiDefinition {
    id: string;
    tenantId: string;
    ownerUserId: string;
    visibility: 'private' | 'shared';
    name: string;
    source: KpiSourceId;
    metric: { field: string; agg: AggOp };
    filters: KpiFilter[];
    groupBy?: string;               // omitido = una sola serie/cifra agregada
    chartType: ChartType;
    timeRange: KpiTimeRange;
    createdAt: unknown;             // Timestamp
    updatedAt: unknown;             // Timestamp
}

export interface KpiResultPoint { key: string; label: string; value: number; color?: string }
export interface KpiResult {
    definitionId: string;
    points: KpiResultPoint[];       // 1 elemento si no hay groupBy ni timeseries
    isTimeSeries: boolean;
}

/** Datos auxiliares que el engine necesita para resolver labels/colores de grupos (§6.3) —
 *  los carga una vez el contenedor (AgendaResumen) y se pasan por referencia a cada KpiCard/computeKpi,
 *  nunca se vuelven a pedir dentro del engine. */
export interface KpiContext {
    projects: import("../types").Project[];
    consultants: import("./agenda").AgendaConsultant[];
}
```

### 4.2 Colección Firestore `kpiDefinitions`

Documento = serialización directa de `KpiDefinition` (sin `id`, es el id del doc).

**Índices necesarios** (`firestore.indexes.json`): consulta típica será
`where('tenantId','==',t).where('ownerUserId','==',u)` y `where('tenantId','==',t).where('visibility','==','shared')`.
Ambos son índices compuestos de 2 campos — Firestore los crea automáticamente la primera vez que falla la
query en consola (igual que el resto de índices del proyecto), no hace falta declararlos a mano si el volumen
por tenant es bajo (esperable: decenas de KPIs, no miles).

**Reglas** (añadir a `firestore.rules`, mismo patrón que `user_availability` en línea 418 y `agenda_entries`
en línea 740):

```
match /kpiDefinitions/{kpiId} {
  // Lectura: el dueño siempre; el resto del tenant solo si es 'shared'
  allow read: if isAuthenticated() && (
    isSuperAdmin() ||
    (docTenantMatches(resource.data) && (
      resource.data.ownerUserId == request.auth.uid ||
      resource.data.visibility == 'shared'
    ))
  );

  allow create: if isAuthenticated() && (
    isSuperAdmin() ||
    (docTenantMatches(request.resource.data) &&
     request.resource.data.ownerUserId == request.auth.uid)
  );

  // Update: solo el dueño (compartir es un update de 'visibility' por el propio dueño).
  allow update: if isAuthenticated() && (
    isSuperAdmin() ||
    (docTenantMatches(resource.data) && resource.data.ownerUserId == request.auth.uid)
  );

  // Delete: el dueño siempre; además, un PM+ (role >= 60) puede borrar KPIs *shared* ajenos
  // para limpiar KPIs de equipo abandonados — mismo umbral que canEdit() en
  // components/availability/AvailabilityRegistry.tsx:127 para "gestores pueden actuar sobre
  // recursos de otros". Deliberadamente NO se extiende ese umbral a 'update': un manager no
  // debe poder alterar en silencio el análisis guardado de otra persona, solo retirarlo.
  allow delete: if isAuthenticated() && (
    isSuperAdmin() ||
    (docTenantMatches(resource.data) && (
      resource.data.ownerUserId == request.auth.uid ||
      (resource.data.visibility == 'shared' && getRealRole() >= 60)
    ))
  );
}
```

## 5. Catálogo de campos — fuente `agenda_entries`

Nuevo archivo `lib/kpi-catalog.ts`. Basado en `types/agenda.ts::AgendaEntry`.

| `field` | label (ES) | tipo | agregable con | agrupable | filtrable | notas |
|---|---|---|---|---|---|---|
| `scheduledHours` | Horas planificadas | number | sum, avg, min, max | no (es la métrica, no dimensión) | gte/lte | métrica principal hoy |
| `__count__` (sintético) | Nº de entradas | number | count | no | no | `agg:'count'` ignora `field` real |
| `consultantId` | Consultor | enum (dinámico, de `AgendaConsultant[]`) | — | sí | eq/in | label vía `consultant.name` |
| `activityType` | Tipo de actividad | enum (`ActivityType`, fijo, 9 valores) | — | sí | eq/in | usar `ACTIVITY_CONFIG`/`ACTIVITY_TKEYS` para label+color |
| `result` | Estado | enum (`ResultStatus`, fijo, 4 valores) | — | sí | eq/in | usar `RESULT_CONFIG`/`RESULT_TKEYS` |
| `region` | Región | string (dinámico, de `SAMRegion[]`) | — | sí | eq/in | mismo matching que `regionMatches()` en `AgendaResumen.tsx:37` |
| `divisionId` | División | string (dinámico) | — | sí | eq/in | |
| `projectId` | Proyecto | enum (dinámico, de `Project[]` activos) | — | sí | eq/in | label vía `projectName`; ver `resolveId()` en `lib/project-hours.ts:179` para el caso `projectId` nulo con `client` — decidir si el KPI builder ignora esas entradas o las cuenta como "Sin proyecto" (mismo criterio que `AgendaResumen.tsx:226-241`) |
| `date` | Fecha | date (Timestamp) | — | no (se usa para bucketing, no groupBy manual) | gte/lte | eje de las series temporales |

Fuera de catálogo deliberadamente: `comment`, `description`, `jiraRecord`, `scheduleRaw/Start/End`, `linkedTaskId`,
`createdBy` — no aportan valor agregable/agrupable con sentido de negocio hoy.

## 6. Motor de agregación (`lib/kpi-engine.ts`, pseudocódigo)

```ts
function computeKpi(def: KpiDefinition, allEntries: AgendaEntry[], ctx: { projects: Project[]; consultants: AgendaConsultant[] }): KpiResult {
    let rows = allEntries.filter(e => e.isActive !== false);
    rows = rows.filter(e => def.filters.every(f => matchFilter(e, f)));

    const range = resolveTimeRange(def.timeRange, ctx.projects, def.filters); // ver §6.1
    rows = rows.filter(e => withinRange(e.date, range));

    if (def.chartType === 'timeseries') {
        const buckets = buildBuckets(range, def.timeRange.bucket!); // reutiliza date-fns como project-hours.ts
        return {
            definitionId: def.id,
            isTimeSeries: true,
            points: buckets.map(b => ({
                key: b.key, label: b.label,
                value: aggregate(rows.filter(e => inBucket(e.date, b)), def.metric),
            })),
        };
    }

    if (def.groupBy) {
        const groups = groupRowsBy(rows, def.groupBy, ctx); // resuelve labels vía consultants/projects/config
        return {
            definitionId: def.id, isTimeSeries: false,
            points: groups.map(g => ({ key: g.key, label: g.label, value: aggregate(g.rows, def.metric), color: g.color })),
        };
    }

    return { definitionId: def.id, isTimeSeries: false, points: [{ key: 'total', label: def.name, value: aggregate(rows, def.metric) }] };
}

function aggregate(rows: AgendaEntry[], metric: KpiDefinition['metric']): number {
    if (metric.agg === 'count') return rows.length;
    const vals = rows.map(r => Number((r as any)[metric.field]) || 0);
    switch (metric.agg) {
        case 'sum': return vals.reduce((a, b) => a + b, 0);
        case 'avg': return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        case 'min': return vals.length ? Math.min(...vals) : 0;
        case 'max': return vals.length ? Math.max(...vals) : 0;
    }
}
```

### 6.1 Resolución del rango temporal

- `mode: 'fixed'` → `customRange(fromIso, toIso)` de `lib/project-hours.ts` (reutilizar tal cual).
- `mode: 'rolling'` → `customRange(format(subDays(new Date(), rollingDays), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd'))`.
- `mode: 'projectLifetime'` → **requiere** que `def.filters` tenga exactamente un filtro `field:'projectId', op:'eq'`
  (si no lo tiene, es un error de configuración del KPI — validar en el builder, no en el engine). Resuelve
  `project = ctx.projects.find(p => p.id === filterValue)`, rango = `{ from: project.startDate, to: project.endDate ?? hoy }`.
  Si el proyecto no tiene `startDate`, fallback a "desde el primer `AgendaEntry` con ese `projectId`" (igual de
  razonable, pero flag como caso raro — la mayoría de proyectos ya tienen `startDate` por la feature de presupuesto).

### 6.2 `buildBuckets` — generación de intervalos para series temporales

```ts
export interface KpiBucket { key: string; label: string; from: Date; to: Date }

const BUCKET_STEP = { day: addDays, week: addWeeks, month: addMonths } as const;
const BUCKET_START = { day: startOfDay, week: (d: Date) => startOfWeek(d, { weekStartsOn: 1 }), month: startOfMonth } as const;
const BUCKET_END   = { day: endOfDay,   week: (d: Date) => endOfWeek(d,   { weekStartsOn: 1 }), month: endOfMonth   } as const;
const BUCKET_LABEL_FMT = { day: 'dd/MM', week: "'Sem' dd/MM", month: 'MMM yyyy' } as const;
const BUCKET_KEY_FMT   = { day: 'yyyy-MM-dd', week: 'yyyy-MM-dd', month: 'yyyy-MM' } as const;

/** Límite de puntos por serie — un bucket diario sobre 2 años de vida de proyecto daría ~730
 *  puntos, ilegible en un recharts LineChart y caro de calcular en cliente. Ver validación §12.8:
 *  el wizard debe bloquear la combinación antes de llegar aquí, este tope es cinturón de seguridad. */
export const MAX_BUCKETS = 180;

export function buildBuckets(range: PeriodRange, bucket: TimeBucket): KpiBucket[] {
    const buckets: KpiBucket[] = [];
    let cursor = BUCKET_START[bucket](range.from);
    let i = 0;
    while (!isAfter(cursor, range.to) && i < MAX_BUCKETS) {
        const bucketEnd = BUCKET_END[bucket](cursor);
        buckets.push({
            key: format(cursor, BUCKET_KEY_FMT[bucket]),
            label: format(cursor, BUCKET_LABEL_FMT[bucket], { locale: es }),
            from: cursor,
            to: isAfter(bucketEnd, range.to) ? range.to : bucketEnd,
        });
        cursor = BUCKET_STEP[bucket](cursor, 1);
        i++;
    }
    return buckets;
}

function inBucket(date: Date, b: KpiBucket): boolean {
    return date >= b.from && date <= b.to;
}
```

> **Garantía a preservar en `aggregate()` (§6): nunca `undefined`/`null` para un bucket vacío.** Un
> `LineChart`/`AreaChart` de recharts con un punto `value: undefined` rompe la continuidad visual de la línea
> (hueco o corte) en vez de tocar 0. El pseudocódigo de `aggregate()` en §6 ya cumple esto por construcción —
> `sum`/`count` sobre un array vacío devuelven `0` de forma natural (`reduce(...,0)`, `.length`), y
> `avg`/`min`/`max` comprueban `vals.length` explícitamente antes de devolver `0` — pero es una invariante que
> hay que mantener en la implementación real, no solo en este pseudocódigo: cualquier test/QA manual de
> `computeKpi()` con `chartType:'timeseries'` debe incluir un bucket sin filas y comprobar que el punto
> resultante es `{ value: 0, ... }`, nunca ausente del array `points`.

Reutiliza `startOfDay/endOfDay/startOfWeek/endOfWeek/startOfMonth/endOfMonth` ya importados en
`lib/project-hours.ts` — mismo patrón, sin dependencia nueva. `date-fns/locale/es` ya se usa en
`ProjectReportModal.tsx:6`.

### 6.3 Resolución de filtros y agrupación

```ts
function matchFilter(entry: AgendaEntry, filter: KpiFilter): boolean {
    const raw = (entry as any)[filter.field];
    switch (filter.op) {
        case 'eq':  return raw === filter.value;
        case 'neq': return raw !== filter.value;
        case 'in':  return Array.isArray(filter.value) && filter.value.includes(raw);
        case 'gte': return Number(raw) >= Number(filter.value);
        case 'lte': return Number(raw) <= Number(filter.value);
    }
}

interface KpiGroup { key: string; label: string; color?: string; rows: AgendaEntry[] }

const UNASSIGNED_KEY = '__unassigned__';

function groupRowsBy(rows: AgendaEntry[], field: string, ctx: KpiContext): KpiGroup[] {
    const map = new Map<string, KpiGroup>();
    rows.forEach(r => {
        // Clave/etiqueta de fallback EXPLÍCITA para campos ausentes (típico: projectId en entradas
        // vinculadas solo por `client`, ver §5) — nunca dejar pasar undefined/null a Recharts como
        // key o label: rompe el render o produce sectores/barras "fantasma" sin texto.
        const raw = (r as any)[field];
        const key = raw === undefined || raw === null || raw === '' ? UNASSIGNED_KEY : String(raw);
        if (!map.has(key)) {
            const label = key === UNASSIGNED_KEY ? 'Sin proyecto' : resolveLabel(field, key, ctx); // label genérico ajustado por campo — ver nota abajo
            map.set(key, { key, label, color: key === UNASSIGNED_KEY ? '#6b7280' : resolveColor(field, key, ctx), rows: [] });
        }
        map.get(key)!.rows.push(r);
    });
    return [...map.values()];
}

// El label de fallback depende del campo agrupado — 'Sin proyecto' para projectId (mismo texto que
// AgendaResumen.tsx:234 hoy), 'Sin consultor'/'Sin región'/etc. para el resto; no hay un único texto
// genérico válido para todos los campos agrupables del catálogo (§5).
//
// 'consultantId'/'projectId' resuelven contra ctx.consultants/ctx.projects (pasados desde AgendaResumen,
// ya cargados ahí); 'activityType'/'result' resuelven contra ACTIVITY_CONFIG/RESULT_CONFIG + sus *_TKEYS
// (mismo patrón que AgendaResumen.tsx:154-156 y :282). Los demás campos devuelven la key tal cual.
function resolveLabel(field: string, key: string, ctx: KpiContext): string { /* ver detalle arriba */ return key; }
function resolveColor(field: string, key: string, ctx: KpiContext): string | undefined {
    if (field === 'activityType') return ACTIVITY_CONFIG[key as ActivityType]?.color;
    if (field === 'projectId')    return ctx.projects.find(p => p.id === key)?.color;
    return undefined; // KpiCard asigna de PIE_COLORS por índice si no hay color propio del dominio
}
```

`KpiContext = { projects: Project[]; consultants: AgendaConsultant[] }` — se le pasa a `computeKpi()` (§6)
junto con `def` y `allEntries`.

### 6.4 Regla de fetch — evitar recomputar sobre datos ya cargados

`AgendaResumen.tsx` ya recibe `entries: AgendaEntry[]` como prop (de la semana activa). **Los KPIs de usuario
casi nunca cubren solo la semana activa** (su rango por defecto es la vida del proyecto), así que el engine
necesita su propio fetch por KPI usando `getAgendaEntriesRange(tenantId, range)` — no se puede reutilizar la
prop `entries`. Igual que hace `ProjectHoursSummary.tsx` hoy (fetch propio, independiente del resto de la
página). Cachear por `(tenantId, range serializado)` si varios KPIs comparten rango, para no repetir fetches
idénticos — optimización razonable pero no bloqueante para el MVP (ver §17, decisión de no montar esa caché
en el MVP tras corregir el problema de fondo abajo).

> **Corrección aplicada 2026-07-21 (hallazgo de revisión externa, crítico):** `getAgendaEntriesRange`
> lanzaba **una query por semana** del rango (`Promise.all` de N llamadas). En modo `projectLifetime` sobre un
> proyecto de 2 años eso son ~104 peticiones paralelas a Firestore **por cada tarjeta de KPI** — con 4-5
> tarjetas en el Resumen, cientos de llamadas simultáneas al montar el componente. Ya corregido directamente
> en `lib/project-hours.ts` (código real, no solo diseño — esta función la usa también `ProjectHoursSummary`
> hoy en producción): las semanas del rango se agrupan en bloques de hasta 30 (límite de Firestore para el
> operador `in`) y se consulta con `where("weekStart", "in", chunk)`, reduciendo 104 queries a 4. Firma y
> comportamiento externo sin cambios — reutilizable tal cual por el engine de KPIs sin ningún ajuste adicional.
> Con este fix, la decisión de §17 (no montar caché compartida entre tarjetas en el MVP) vuelve a ser
> razonable: 4-5 KPIs × ~4 queries cada uno son ~20 peticiones por carga del Resumen, no cientos.

## 7. KPI de capacidad semanal (KPI de sistema, no genérico)

Componente propio, ej. `components/agenda/TeamCapacityKpi.tsx`, con la misma cabecera de selector de periodo
que `ProjectHoursSummary.tsx` para consistencia visual.

> **Asunción regional a documentar en el propio componente (comentario, no solo aquí):** `getDayType()`
> (`lib/agenda-utils.ts:57`) usa un calendario de festivos **hardcoded a Madrid** (`MADRID_HOLIDAYS`). El
> modelo de `AgendaEntry`/`AgendaConsultant` ya soporta `region` (consultores fuera de Madrid), así que la
> capacidad teórica calculada con este KPI puede estar equivocada para consultores en otras regiones/países
> (festivo real no coincide con festivo de Madrid). No se corrige en el MVP — sería un feature aparte
> (calendario de festivos por región) — pero `TeamCapacityKpi.tsx` debe llevar un comentario explícito
> señalándolo, para que quien lo lea no asuma que el % de utilización es exacto fuera de Madrid.

**Fórmula acordada:**

```
Capacidad semanal (por consultor, por semana) =
    (Nº de días con getDayType(d) === DH en esa semana)   // DNH=festivo y FDS=fin de semana NO cuentan
    × jornada_estandar_tenant                              // ver 7.1, nuevo campo
    − Σ días DH de esa semana con alguna UserAvailability status='approved'
          y type ∈ {'vacation', 'sick_leave', 'personal_days'}
          que cubra ese día para userId === consultant.userId
```
> Corrección 2026-07-21: una versión anterior de esta fórmula incluía por error `{DH, DNH}` en el primer
> término, lo que habría contado los festivos como capacidad disponible — justo lo contrario de la intención
> ("festivos ya excluidos"). Detectado al implementar `TeamCapacityKpi.tsx`. Solo `DH` cuenta.

`public_holiday`, `training`, `remote_work`, `other` de `UserAvailability` **no restan** capacidad (decisión
explícita, ver §3 y la conversación de diseño — revisar si en la práctica se necesita ampliar la lista).

**Utilización** = `Σ scheduledHours de agenda_entries de ese consultor en esa semana / capacidad_semanal`.
Umbral de color sugerido, coherente con `HOURS_HEALTH_THRESHOLDS` de `lib/project-hours.ts:118`
(warn ≥ 80%, over > 100%) — reutilizar la misma función `hoursHealth()`.

### 7.1 Dato que falta: "jornada estándar del tenant"

No existe hoy en ningún sitio (revisado `types.ts::Tenant`, `AgendaConsultant`; el único "capacity" existente
es el de Sprints en días, en `components/SprintPlanningBoard.tsx`, un módulo distinto y no reutilizable aquí).

Propuesta: añadir a `Tenant` (`types.ts`) un campo opcional:
```ts
standardHoursPerDay?: number; // default 8 si no está seteado
```

**Dónde se edita — resuelto:** en `components/agenda/AgendaConsultantsManager.tsx`, no en `AppManagement.tsx`.
Motivo: `AppManagement.tsx` es el panel **cross-tenant de superadmin** (ranking de consumo, toggles globales
tipo `aiEnabled`) — meter ahí un ajuste que un tenant admin normal necesita tocar con frecuencia forzaría a
depender de superadmin para algo que ya es autoservicio en otros sitios. `AgendaConsultantsManager.tsx` ya es
el panel de configuración *del propio tenant* para la Agenda (gestiona consultores/regiones/divisiones) y ya
gatea acciones de sincronización a `role >= 80` (`AgendaConsultantsManager.tsx:116`) — mismo umbral que exige
la regla de Firestore para escribir en `tenants/{tenantId}` (`firestore.rules:183`: *"App Admins (>= 80) pueden
actualizar SU PROPIO tenant"*). No hace falta ninguna regla nueva: `standardHoursPerDay` es un campo más del
doc `tenants/{tenantId}`, ya escribible por ese rol.

**No** se modela por consultor en el MVP (decisión tomada: jornada global, no per-consultor — más simple,
aunque no distingue part-time).

> **v2 (anotado, no MVP):** en equipos de consultoría es habitual tener personas a media jornada o con
> reducción — usar siempre `standardHoursPerDay` global falsea su % de utilización (aparecerían
> permanentemente "por debajo" de capacidad). Cuando haga falta, añadir un override opcional
> `AgendaConsultant.standardHoursPerDay?: number` que, si está presente, gana sobre el valor del tenant en
> el cálculo de §7 solo para ese consultor. No romper compatibilidad: el campo del tenant sigue siendo el
> default para quien no tenga override.

### 7.2 Fuente de datos para este KPI

`useAvailability(tenantId)` (`hooks/useAvailability.ts`) ya trae **todas** las `UserAvailability` del tenant
sin filtro de fecha (listener `onSnapshot` sin `where` de rango). Para un tenant de tamaño normal esto es
aceptable tal cual — no hace falta una query por rango nueva, basta con filtrar en cliente por
`startDate`/`endDate` solapando la semana en cuestión.

## 8. UI / UX

### 8.1 Ubicación

Nueva sección en `AgendaResumen.tsx`, después del bloque de `ProjectHoursSummary` (línea 118-120 actual) y
antes de los bloques fijos existentes (o al final — a decidir por preferencia visual, no bloqueante). Los
bloques fijos actuales (por consultor, por proyecto, por actividad, por estado) **se mantienen tal cual**, no
se migran al motor genérico en el MVP — son baratos de mantener y ya están optimizados para la vista semanal.

### 8.2 Flujo del builder (wizard modal, ej. `components/agenda/KpiBuilderModal.tsx`)

1. **Nombre** del KPI.
2. **Fuente** — en MVP fijo a "Agenda" (`agenda_entries`), campo deshabilitado pero visible (para que el
   usuario entienda que hay más fuentes previstas — coherente con [[feedback_new_fields_inactive]]: los campos
   nuevos/no disponibles aún se muestran inactivos, no se ocultan).
3. **Filtros** — chips añadibles desde el catálogo (§5): proyecto(s), consultor(es), tipo de actividad,
   estado, región. Multi-select vía `op:'in'`.
4. **Métrica** — selector de campo agregable (`scheduledHours` o "Nº de entradas") + operación (`sum`/`count`/`avg`/...).
5. **Agrupación** (opcional) — ninguno de los campos agrupables del catálogo, o "ninguna" (una sola cifra/serie).
6. **Visualización** — lista / tarta / barras / serie temporal. Si serie temporal → selector de bucket
   (día/semana/mes) y el paso 5 (agrupación) queda deshabilitado (una serie temporal ya "agrupa" por tiempo;
   combinar groupBy + timeseries es v2, no MVP — evita el caso "N líneas por Y grupos" que complica el chart).
7. **Rango temporal** — **por defecto `rolling` (90 días)**, no `projectLifetime`. Corrección 2026-07-21
   tras un bug real en pruebas: al abrir por defecto en `projectLifetime` (que exige exactamente un
   proyecto, §12.4), el usuario se veía forzado a elegir un proyecto irrelevante solo para poder guardar un
   KPI simple sin intención de filtrar por proyecto — ese proyecto arbitrario acababa vaciando el resultado
   sin que la causa fuera evidente ("sin datos" parecía un fallo del filtro que sí importaba, cuando el
   culpable era el que se había elegido sin querer). `projectLifetime` sigue disponible y se activa solo
   cuando el usuario lo elige explícitamente y selecciona un proyecto en Filtros.
8. **Visibilidad** — privado (default) / compartir con el equipo.

### 8.3 Renderizado

`components/agenda/KpiCard.tsx` recibe un `KpiResult` + `chartType` y pinta:
- `list` → tabla simple ordenada desc, reutilizando el estilo de `byProject`/`byActivity` en `AgendaResumen.tsx`.
- `pie`/`bar` → `recharts`, mismo patrón que `ProjectReportModal.tsx` (`PIE_COLORS` reutilizable).
- `timeseries` → `LineChart`/`AreaChart` de recharts, eje X = `point.label` (bucket), eje Y = `point.value`.

Grid de tarjetas con botón "+ Nuevo KPI" que abre el wizard; cada tarjeta con menú de editar/duplicar/eliminar/
compartir (solo visible al dueño, salvo eliminar que también podría vetarse a un admin — a decidir).

### 8.4 Idioma

Precedente explícito ya usado en la feature de horas por proyecto ([[project_unitask_project_hours]]): los
strings de esos componentes están **hardcoded en español**, sin pasar por el sistema de i18n (`Dictionary`),
por relación coste/riesgo de tocar los 6 locales. Se sigue el mismo criterio aquí salvo que se decida lo
contrario explícitamente.

## 9. Fases

- **MVP**: motor de agregación simple, fuente única `agenda_entries`, 4 tipos de visualización, KPI de
  capacidad como componente de sistema aparte (§7), privado/compartido, rango `fixed`/`rolling`/`projectLifetime`.
- **v2**: fuente `consultantTasks` (tras resolver sus cambios propios, fuera de alcance aquí), fórmulas
  compuestas con parser seguro, combinar `groupBy` + `timeseries` (multi-línea).
- **v3**: alertas de umbral sobre un KPI, export (PDF/Excel, ya hay precedente de export en `ProjectReportModal.tsx`),
  KPIs con más de una fuente vía joins (permitiría migrar el KPI de capacidad al motor genérico).

## 10. Decisiones cerradas en esta iteración (ya no están abiertas)

- **Borrado de KPI `shared` ajeno**: el dueño siempre puede; además un PM+ (`role >= 60`) puede *borrar*
  (no editar) un KPI `shared` de otra persona, para limpieza de equipo — ver regla final en §4.2.
- **Ubicación de `standardHoursPerDay`**: `AgendaConsultantsManager.tsx`, editable por `role >= 80` — ver §7.1.
- **`projectLifetime` con varios proyectos**: fuera de alcance del MVP. El engine exige exactamente un filtro
  `projectId eq` cuando `timeRange.mode === 'projectLifetime'`; si no lo hay, es un error de validación del
  wizard (ver §12), no un caso a soportar con unión de fechas entre proyectos. Revisar en v2 si aparece demanda real.
- **Índices de `kpiDefinitions`**: no se declaran a mano en `firestore.indexes.json`. Se deja que Firestore
  los pida la primera vez que la query compuesta falle en consola — mismo criterio que el resto del proyecto
  (ver `lib/project-hours.ts`, que no tocó `firestore.indexes.json` — nota en `project_unitask_project_hours`
  de la memoria del asistente). Si en producción el volumen de KPIs por tenant crece mucho, revisar entonces.

Sin abiertos pendientes de decisión de producto a día de hoy. Lo que queda es trabajo de implementación
(escribir el código descrito en §11-§13) y las validaciones/casos límite listados abajo, que son detalle de
construcción, no decisiones de diseño por tomar.

## 11. Manejo de errores y estados vacíos

Regla general del proyecto (memoria `feedback_error_messages_with_solution`, aplica a todos los proyectos,
no solo a este): un mensaje de "0 resultados" o error **debe explicar la causa real + proponer una solución
concreta + loguear un diagnóstico en consola** — nunca un mensaje genérico tipo "Error" o un listado vacío sin
contexto. Aplicado a KPIs dinámicos:

| Situación | Mensaje al usuario | Log de diagnóstico |
|---|---|---|
| Query de Firestore falla por índice compuesto no creado (`kpiDefinitions` por `ownerUserId`/`visibility`) | "No se pudo cargar el listado de KPIs. Puede faltar un índice de Firestore — revisa la consola del navegador o contacta con soporte." (mismo patrón que `ProjectHoursSummary.tsx:90`) | `console.error('[KpiEngine] error consultando kpiDefinitions:', err)` con el `err.code` de Firestore, que suele traer el link directo para crear el índice |
| `timeRange.mode === 'projectLifetime'` sin filtro `projectId` único | Bloquear el paso 7 del wizard (§8.2), no dejar guardar: "Este rango necesita un único proyecto seleccionado en los filtros." | No aplica (validación cliente, nunca llega a persistir) |
| `groupBy` apunta a un campo sin `groupable: true` en el catálogo (KPI antiguo tras un cambio de catálogo) | Al renderizar: "Este KPI usa una agrupación que ya no está disponible. Edítalo para elegir otra." + botón directo a editar | `console.warn('[KpiEngine] groupBy inválido para KPI', def.id, def.groupBy)` |
| 0 filas tras aplicar filtros + rango | "Sin datos para estos filtros en el periodo seleccionado. Prueba a ampliar el rango o revisar los filtros." (nunca una tarjeta vacía sin texto) | No requiere log — es un resultado válido, no un error |
| Proyecto del filtro fue borrado/desactivado después de crear el KPI | "El proyecto de este KPI ya no existe o está inactivo." + deshabilitar la tarjeta en vez de romper el render | `console.warn('[KpiEngine] projectId no encontrado', filterValue)` |

## 12. Validaciones del wizard (cliente, antes de permitir guardar)

1. `name` no vacío.
2. `metric.field` debe tener `agg` compatible según el catálogo (§5) — ej. no se puede pedir `avg` de un
   campo `enum`.
3. Si `chartType === 'timeseries'` → `timeRange.bucket` obligatorio y `groupBy` debe estar vacío (combinar
   ambos es v2, ver §9).
4. Si `timeRange.mode === 'projectLifetime'` → exactamente un `filters` con `field: 'projectId', op: 'eq'`.
5. `groupBy`, si está presente, debe cumplir `groupable: true` en el catálogo de la fuente elegida.
6. Cada `KpiFilter.field` debe cumplir `filterable: true` en el catálogo.
7. Si `chartType === 'timeseries'`, calcular `buildBuckets(range, bucket).length` (§6.2) con el rango
   resuelto (§6.1) **antes** de guardar: si supera `MAX_BUCKETS` (180), bloquear con
   "El rango es demasiado amplio para el intervalo elegido (Nº de puntos). Elige un intervalo mayor
   (semana/mes) o acorta el rango." — evita series ilegibles en recharts y cálculos caros repetidos en
   cada carga del Resumen.
8. Si `visibility` pasa de `'private'` a `'shared'` en una edición, no se pide confirmación adicional (es
   reversible por el propio dueño) — pero si pasa de `'shared'` a `'private'` y hay otros usuarios con la
   tarjeta ya en pantalla, no hace falta notificarles (no hay sistema de notificaciones para esto en MVP;
   simplemente deja de aparecer en su próxima carga del Resumen).

## 13. Checklist de archivos — MVP (para implementación)

Nuevos:
- `types/kpi.ts` — tipos de §4.1.
- `lib/kpi-catalog.ts` — `FieldCatalog` de §5, un `Record<KpiSourceId, FieldDef[]>`.
- `lib/kpi-engine.ts` — `computeKpi()` y `aggregate()` de §6, más `resolveTimeRange()` de §6.1.
- `lib/kpi-store.ts` — CRUD de `kpiDefinitions` (create/update/delete/list por owner y por shared), paralelo
  a como `lib/projects.ts` expone `getActiveProjects()`.
- `components/agenda/KpiBuilderModal.tsx` — wizard de §8.2, con las validaciones de §12.
- `components/agenda/KpiCard.tsx` — render de §8.3 (list/pie/bar/timeseries vía recharts).
- `components/agenda/TeamCapacityKpi.tsx` — KPI de sistema de §7 (no pasa por `kpi-engine.ts`).

Modificados:
- `components/agenda/AgendaResumen.tsx` — añade la sección de KPIs de usuario + `TeamCapacityKpi`.
- `components/agenda/AgendaConsultantsManager.tsx` — añade el input de `standardHoursPerDay` (§7.1).
- `types.ts` — añade `Tenant.standardHoursPerDay?: number`.
- `firestore.rules` — añade el bloque `match /kpiDefinitions/{kpiId}` de §4.2.
- `scripts/run-dated-backup.js` y `scripts/security_backup.ts` — añadir `'kpiDefinitions'` al array
  `COLLECTIONS` de ambos (ver §14). **No opcional**: es la misma clase de fallo que motivó la auditoría de §14.

No requiere tocar: `firestore.indexes.json` (§10), `lib/project-hours.ts` (se reutiliza tal cual, no se
modifica), `hooks/useAvailability.ts` (se reutiliza tal cual).

## 14. Auditoría de backup — hallazgo y corrección (2026-07-21)

Al diseñar este feature se detectó que el backup automático real (GitHub Action `firestore-backup.yml`,
cada 6h, ejecuta `scripts/run-dated-backup.js`) tenía una lista `COLLECTIONS` hardcodeada que **no incluía
ninguna colección de Agenda** — ni `agenda_entries`, ni `agenda_consultants`, ni `user_availability`, ni
`consultantTasks`, ni siquiera `tenants`. Se confirmó mirando el contenido real de `git_backup_data/`: solo 10
colecciones, coincidentes con la lista antigua. Es decir, **la fuente de datos de la que depende este mismo
feature de KPIs no tenía copia de seguridad**.

Causa raíz: la lista de colecciones a respaldar está duplicada y hardcodeada de forma independiente en al
menos dos scripts (`scripts/run-dated-backup.js`, el automático; `scripts/security_backup.ts`, manual "antes
de operaciones críticas") — cada colección Firestore nueva requiere acordarse de tocar ambos sitios, y basta
con olvidar uno para perder cobertura semanas o meses sin que nadie lo note (no hay alerta si una colección
queda fuera).

**Corregido** en esta sesión: se añadieron a ambos scripts todas las colecciones detectadas en uso en el
código (`components/`, `hooks/`, `lib/`) que no estaban en ninguna lista — incluye las de Agenda, `tenants`,
y otras (`sprints`, `taskTypes`, `unileaks_notes`, `support_tickets`, etc.). Aviso aceptado explícitamente por
el usuario: colecciones como `unileaks_notes`/`support_tickets` pueden contener texto libre de clientes que
ahora queda en el historial de git (`git_backup_data/`); el script de formateo (`format-backup-for-git.js`)
solo redacta claves con nombre de contraseña/secreto, no PII genérica en campos de texto libre.

**Regla a partir de ahora** (aplica a todo el proyecto, no solo a KPIs): toda colección Firestore nueva se
añade en el mismo PR/commit que la crea a `COLLECTIONS` en `scripts/run-dated-backup.js` (mínimo) y
`scripts/security_backup.ts` (recomendado). Pendiente de mejora estructural, no bloqueante: consolidar ambas
listas en un único archivo fuente de verdad (ej. `scripts/backup-collections.js`, importado por ambos) para
que esta clase de olvido deje de ser posible — no se implementó en esta sesión por mantener el cambio acotado
al hallazgo, pero queda anotado para no repetirlo.

## 15. Interfaces de componentes React (props) — listas para implementar

```ts
// components/agenda/KpiBuilderModal.tsx
interface KpiBuilderModalProps {
    tenantId: string;
    ownerUserId: string;
    projects: Project[];
    consultants: AgendaConsultant[];
    samRegions: SAMRegion[];
    editing?: KpiDefinition;        // si viene, edita; si no, alta nueva
    onClose: () => void;
    onSaved: (def: KpiDefinition) => void;
}

// components/agenda/KpiCard.tsx
interface KpiCardProps {
    definition: KpiDefinition;
    result: KpiResult | null;       // null mientras carga
    loading: boolean;
    error?: string;                 // ver tabla de §11 para el texto exacto según la causa
    isOwner: boolean;                // gatea botones editar/compartir; borrar además permite role>=60 en shared (§4.2)
    canDelete: boolean;              // resuelto por el padre: isOwner || (definition.visibility==='shared' && roleLevel>=60)
    onEdit: () => void;
    onDelete: () => void;
    onToggleShare: () => void;      // solo visible si isOwner
}

// components/agenda/TeamCapacityKpi.tsx (KPI de sistema, §7 — no usa KpiCard/KpiResult genérico)
interface TeamCapacityKpiProps {
    tenantId: string;
    anchorIso: string;               // mismo contrato que ProjectHoursSummary.tsx
    consultants: AgendaConsultant[];
    standardHoursPerDay: number;     // Tenant.standardHoursPerDay ?? 8, ya resuelto por el padre (AgendaResumen)
}
```

`AgendaResumen.tsx` pasa `projects`/`consultants`/`samRegions` porque ya los tiene o los puede obtener igual
que hace hoy `ProjectHoursSummary` (`getActiveProjects(tenantId)`); no se vuelven a pedir dentro del modal.

## 16. `lib/kpi-store.ts` — CRUD de `kpiDefinitions`

```ts
export async function listOwnKpis(tenantId: string, ownerUserId: string): Promise<KpiDefinition[]>;
export async function listSharedKpis(tenantId: string): Promise<KpiDefinition[]>;
export async function createKpi(def: Omit<KpiDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;
export async function updateKpi(id: string, patch: Partial<KpiDefinition>): Promise<void>;
export async function deleteKpi(id: string): Promise<void>;
```

Dos queries (`listOwnKpis`/`listSharedKpis`) en vez de una sola con `OR` porque Firestore no soporta `OR`
entre campos distintos (`ownerUserId == X` OR `visibility == 'shared'`) en una sola consulta — patrón estándar
en Firestore: dos queries en paralelo (`Promise.all`) y merge en cliente, deduplicando por `id` si el dueño
mismo comparte un KPI (aparecería en ambas). `AgendaResumen`/el contenedor de la sección de KPIs hace ese
`Promise.all` + merge, no `kpi-store.ts` (mantiene el store como acceso a datos puro, sin lógica de UI).

## 17. Estrategia de fetch/caché entre tarjetas (MVP: sin caché compartida, documentado el porqué)

Cada `KpiCard` dispara su propio `getAgendaEntriesRange(tenantId, range)` (§6.4) al montarse — mismo patrón
que `ProjectHoursSummary.tsx` hoy (fetch propio e independiente). Con varios KPIs de usuario compartiendo
rango (ej. varios KPIs todos en modo `'month'` del mes actual), esto genera fetches duplicados a Firestore.

**Decisión MVP: aceptar la duplicación, no construir caché compartida.** Motivo: la mayoría de tenants no
tendrán más de un puñado de KPIs simultáneos visibles en el Resumen, y `getAgendaEntriesRange` ya reutiliza el
índice `(tenantId, weekStart)` semana a semana — el coste real es bajo. Construir una caché
(`Map<rangeKey, Promise<AgendaEntry[]>>` a nivel de `AgendaResumen`) es la optimización obvia si en producción
se ve lentitud con muchos KPIs por tenant — no se hace ahora para no invertir esfuerzo en un problema que
todavía no se ha observado. Revisar si en algún momento el Resumen tarda perceptiblemente en cargar con varios
KPIs activos.

## 18. Retrospectiva de la implementación (2026-07-21) — leer antes de retomar

Se llegó a construir y probar en vivo el MVP completo descrito en §13. Quedó revertido, pero estas son las
lecciones reales de esa implementación, no solo hipótesis de diseño:

**Bugs encontrados y corregidos durante la construcción (si se retoma, no reintroducirlos):**
1. La fórmula de capacidad semanal (§7) tenía un error real: contaba días `{DH, DNH}` en vez de solo `DH`,
   lo que habría contado festivos como capacidad disponible. Corregido en código y en este documento.
2. Firestore rechaza `undefined` como valor de campo (`addDoc`/`updateDoc` fallan con
   `Unsupported field value: undefined`). `KpiFilter`/`KpiTimeRange` tienen varios campos opcionales que se
   quedaban `undefined` al construir el payload (`groupBy`, `bucket`, `fromIso`, `rollingDays`...). Hace falta
   un saneador recursivo antes de escribir — y en `update` (no en `create`), los campos raíz que se quieren
   *borrar* de verdad (ej. quitar `groupBy` al editar) deben mapearse a `deleteField()`, no simplemente
   omitirse, o el valor viejo queda huérfano en Firestore para siempre.
3. **Bug de UX más importante, el que motivó abandonar el desarrollo indirectamente:** el wizard abría por
   defecto en `timeRange.mode: 'projectLifetime'`, que exige elegir exactamente un proyecto (§12.4). Un
   usuario probando solo "filtrar por consultor" se veía forzado a elegir un proyecto arbitrario para poder
   guardar, y ese proyecto (irrelevante para su intención real) acababa vaciando el resultado sin que la
   causa fuera evidente. Se corrigió cambiando el default a `'rolling'` (90 días) — `projectLifetime` sigue
   disponible pero ya no forzado.
4. `chartType: 'bar'`/`'pie'` sin `groupBy` degenera en un único punto — Recharts lo pinta como una barra
   sólida a todo ancho o una tarta de una sola porción: visualmente "un bloque rectangular sin información",
   justo lo que reportó el usuario al probar un KPI de evolución en TRANSPAIS (había elegido barras en vez de
   serie temporal). Se corrigió con dos capas: (a) `KpiCard` trata ese caso degenerado igual que `'list'` sin
   agrupar — muestra una cifra grande en vez de un gráfico sin sentido — y (b) el wizard avisa en el momento
   ("sin agrupación, Tarta/Barras solo mostrará una cifra... usa Serie temporal para ver evolución") en vez de
   dejar que el usuario lo descubra después de guardar.
5. Tipos de `recharts@3.6.0`: la prop `formatter` de `<Tooltip>` no infiere bien una función `(v: number) =>
   string` simple — hace falta `as any` en el cast (cosmético, no afecta a runtime, pero da error de `tsc`).

**Por qué se decidió no llevarlo a producción:** el usuario probó el flujo real (crear KPI de consultor,
luego uno de evolución de proyecto) y "no le gustó el resultado" — after fixing bug #4 el mecanismo ya
funcionaba correctamente, pero el juicio de producto fue que la experiencia global del builder (pasos,
fricción de configurar filtro+métrica+agrupación+visualización+rango para cada KPI) no está al nivel deseado
todavía. No se registró un motivo más específico — si se retoma, vale la pena empezar preguntando
directamente qué parte de la experiencia no convenció, en vez de asumir que era solo el bug #4 (ya arreglado).

**Qué NO hay que rehacer si se retoma:** la arquitectura de §4-§6 (modelo de datos, motor de agregación,
`buildBuckets`, `groupRowsBy`) funcionó correctamente una vez arreglados los bugs de arriba — el problema fue
de UX del wizard/builder, no del motor de cálculo. Priorizar rediseñar el flujo de creación (¿wizard paso a
paso en vez de formulario largo? ¿plantillas predefinidas en vez de configurar desde cero?) antes de tocar el
engine.

## Referencias cruzadas (memoria del asistente)

Ver `project_unitask_kpi_builder.md`, `project_unitask_project_hours.md`, `project_unitask_repo_location.md`
en el sistema de memoria del asistente para el hilo de decisiones que originó este documento.
