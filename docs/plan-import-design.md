# Plan de Proyecto → Tareas UniTask (diseño)

> Estado: **aprobado** 2026-10-06 · Pasos 1 y 2 implementados y probados en emulador
> Caso piloto: `TRNP - Extracto Plan Etapa III, IV y V.xlsx` (Transpais, 603 filas, sin columna Id)
> Fase II (fuera de alcance aquí): vincular tareas con la Agenda.

## 0. Decisiones ya tomadas

| # | Decisión |
|---|----------|
| D1 | **Manda UniTask.** El Excel siembra el plan; las reimportaciones solo *proponen* cambios con vista previa. |
| D2 | **Hito = nivel con dos números contados desde el flujo.** `III.1` es el flujo; `III.1.4.2` ("4.2") es hito; `III.1.4.2.1` tarea padre; `III.1.4.2.1.x` tareas. Parámetro del asistente con ese valor por defecto. |
| D3 | **No hay Id en el Excel.** UniTask asigna ID interno y empareja reimportaciones por ruta de nombres (ver §4). |
| D4 | **Todo pertenece a un proyecto declarado.** No hay importación ni tarea de plan sin `projectId`. |
| D5 | **Los hitos y padres no se cierran ni se tratan a mano**: su estado se calcula de sus hijos. Excepción: hito individual (sin hijos). |
| D6 | **Un solo árbol en `tasks`.** `project_hierarchy` deja de ser un mundo aparte (se migra). |
| D7 | **8 h = 1 día** al convertir duración del Excel en esfuerzo. |
| D8 | **PM y superiores** (roleLevel ≥ 60) importan, deshacen y descartan bloques. |
| D9 | **El % del Excel se descarta.** Es una estimación a ojo del PM; el avance se calcula siempre en UniTask (regla 0/100 por hoja ponderada por esfuerzo). El % de proyecto, dashboard y burndown se tratarán aparte. |
| D10 | **§3 Deshacer importación queda EN VIGILANCIA**: se desarrolla, pero el usuario no está convencido del enfoque; revisar con él tras probarlo. |

## 1. Modelo

Se reutilizan los campos V3 que ya existen en `Task` (`types.ts`) y se añade lo mínimo:

```ts
// Ya existen: type, parentId, ancestorIds, order, planId, planStatus, externalSource,
//             progressV13, dependencies, startDate, endDate, clientDeadline,
//             estimatedEffort, actualEffort, raci, area, module, attributes, creationSource

planRole?: 'group' | 'milestone' | 'parent' | 'leaf' | 'gate';
//   group     → agrupador sobre el hito (Etapa, Flujo, "Configurar la solución"). Solo lectura.
//   milestone → hito (nivel D2). Calculado.
//   parent    → cualquier nodo con hijos bajo el hito. Calculado.
//   leaf      → tarea trabajable. Único estado editable a mano.
//   gate      → fila de control de 0 días ("III.1.4.1H"). Se cierra sola al completar su bloque.
planCode?: string;            // código EDT original ("III.1.4.2.1"), informativo, puede repetirse
planPath?: string;            // ruta normalizada de nombres desde la raíz (clave de emparejamiento)
planOrigin?: 'import' | 'unitask';   // fila venida del Excel o creada en UniTask (para exportar)
importId?: string;            // lote de importación que la creó (para deshacer)
lastImportId?: string;        // último lote que la modificó
computed?: { status; progress; estimatedEffort; actualEffort; startDate; endDate; updatedAt };
```

Nueva colección **`plan_imports`** (lote de importación, ver §3). **Se registra en los scripts de backup
(`scripts/backup-database.js` y afines) en el mismo cambio que la crea.**

Ajustes de gobierno (`lib/hierarchy-governance.ts`): `MAX_DEPTH` 5 → 10; `isValidChildType` deja de imponer
`root_epic → epic → task → subtask` cuando la tarea tiene `planRole`.

## 2. Importación (asistente en Proyecto → pestaña **Plan**)

1. **Proyecto obligatorio** (D4): el asistente se abre desde un proyecto; no hay selector "sin proyecto".
2. **Subir Excel** y mapear columnas (lector propio `lib/plan/planParser.ts`).
   Columnas reconocidas: Nombre, Código/EDT (embebido en el nombre en Transpais), Duración, % completado,
   Predecesoras, Comienzo, Fin; opcionales si existen (formato Europastry): Esfuerzo, Notas, Asignado a, Prioridad, Hito.
3. **Elegir nivel de hito** (D2, por defecto "2 desde el flujo").
4. **Vista previa** en árbol con el rol de cada fila (grupo / hito / padre / tarea / control) y **avisos**:
   códigos EDT duplicados, filas sin código, hitos sin hijos, bloques vacíos ("pendiente de desglosar"),
   predecesoras que no resuelven, tareas ya vencidas, hitos con duración > 0.
5. **Confirmar** → escritura en lotes de 450 con `importId`; los estados calculados se fijan en el propio lote
   (la función de propagación no se dispara 600 veces).

Casos especiales (detectados en el Excel de Transpais):
- Hito sin padre intermedio (`III.1.1.1` → tareas): válido.
- Hito sin hijos (`III.1.1.2`): **hito individual**, se trata y cierra a mano (D5).
- Bloque sin detalle (Distribución `III.3.4.2.x`): hito vacío marcado "pendiente de desglosar".
- Fila sin código ("Transpais entrega de cuadros tarifarios"): cuelga del nodo anterior + aviso.

## 3. Deshacer una importación  ⚠️ EN VIGILANCIA (D10)

Cada importación crea un documento `plan_imports/{id}`:

```ts
{ projectId, tenantId, fileName, createdBy, createdAt, kind: 'initial' | 'reimport',
  milestoneLevel, created: string[] /* taskIds */, updated: { taskId, before: {...campos} }[],
  archived: string[], status: 'applied' | 'undone' | 'partially_undone', warnings: [...] }
```

Reglas:
- **Solo se deshace la última importación aplicada del proyecto** (pila). Deshacer una intermedia dejaría el árbol incoherente.
- Tareas **creadas** por el lote:
  - Sin actividad desde la importación (sin cambio de estado, sin esfuerzo real, sin hijos manuales, sin comentarios) → se eliminan.
  - Con actividad → **no se borran**: se listan y el PM elige mantenerlas (pasan a `planOrigin: 'unitask'`, desvinculadas del lote) o archivarlas.
- Tareas **modificadas** por una reimportación → se restauran los campos `before` (solo los que el lote tocó y nadie ha vuelto a cambiar).
- Tareas **archivadas** por una reimportación → se desarchivan.
- Resultado `undone` o `partially_undone`, con el detalle visible. Todo queda en el log de auditoría.

## 4. Reimportación (sin Id en el Excel)

Emparejamiento por capas, de más a menos seguro:
1. Misma `planPath` (ruta de nombres normalizada: minúsculas, sin acentos ni espacios dobles) y mismo nombre.
2. Mismo nombre bajo el mismo padre emparejado (el código EDT ha cambiado).
3. Nombre similar (≥ 0,85) bajo el mismo padre (erratas corregidas) → **siempre a confirmar** en la vista previa.
4. Sin pareja → fila nueva. Tarea del plan sin fila → **se propone archivar** (nunca borrar).

Duplicados del Excel ("IV.1.1 Preparar material" ×3) se distinguen por su ruta (cuelgan de flujos distintos);
si dos filas tienen la misma ruta completa, se desempata por orden de aparición y se avisa.

Como manda UniTask (D1): si un campo fue editado en UniTask después de la importación, la reimportación
**no lo pisa**; lo muestra como conflicto ("Excel dice X, UniTask tiene Y") para que el PM elija.

Opcional para emparejamiento exacto: la exportación (§7) incluye columna `UniTask ID`; si los PM la conservan
en MS Project (campo Texto1), el paso 0 empareja por ID.

## 5. Propagación de estado (Cloud Function)

`functions/src/planRollup.ts`, trigger `onUpdate` + `onCreate` + `onDelete` de `tasks` con `planRole`:
- Recalcula el padre directo y sube por `ancestorIds`; **solo escribe si algo cambia** (sin bucles).
- **Estado** del nodo calculado:
  - `completed` si todos los hijos están en `completed | discarded | out_of_scope` (y al menos uno `completed`).
  - `discarded` / `out_of_scope` si todos los hijos lo están.
  - `in_progress` si algún hijo ha empezado; si no, `pending`.
  - Reabrir un hijo reabre la cadena; añadir un hijo a un nodo cerrado lo reabre.
- **Avance** ponderado por esfuerzo estimado (o duración del Excel si no hay esfuerzo).
- **Esfuerzo** estimado y real = suma de hijos. **Fechas** = mín. inicio / máx. fin de hijos.
- Los nodos calculados se cierran sin pedir `actualEffort` (hoy obligatorio al cerrar): se agrega de los hijos.
- Nodos `gate` se cierran cuando su bloque (hermanos anteriores dentro del mismo padre) está completo.

UI y reglas (D5):
- Hito / padre / grupo: estado y avance **de solo lectura**, sin botón de cerrar ni de tratar.
- Acción "Descartar bloque" en un hito: marca sus hojas abiertas como `out_of_scope` (el hito se cierra por propagación). Auditado.
- Hito individual (sin hijos): se comporta como una tarea normal.
- `firestore.rules`: rechazar cambios de `status` hechos por cliente en tareas con `planRole` ∈ {group, milestone, parent, gate}
  (solo la función, con Admin SDK, los escribe).

## 6. Añadir tareas desde las tareas

En el árbol del plan y en la ficha de tarea:
- **"+ Tarea aquí"** en un hito o padre → nueva hoja hija (con su dependencia jerárquica concreta).
- **"+ Subtarea"** en una hoja → la hoja pasa a ser padre (estado calculado). Confirmación previa avisando de que
  su esfuerzo real registrado se conserva y que a partir de ahora se cierra por sus hijas.
- **"+ Tarea suelta del proyecto"** → sin padre, sigue siendo del proyecto (D4); aparece en un bloque "Fuera de plan".
- Predecesoras opcionales: elegir tareas del mismo proyecto (alimenta `dependencies`, que ya bloquea el cierre).
- Toda tarea creada así lleva `planOrigin: 'unitask'` (viaja en la exportación, §7).
- Reglas: `projectId` forzado e inmutable para tareas de plan; no se puede mover una tarea a otro proyecto.

### Herencia (punto 3)
Al crear una hija hereda del padre, editable antes de guardar:

| Campo | Origen |
|---|---|
| `projectId`, `projectCode`, `ancestorIds`, `planId` | padre (obligatorio, no editable) |
| `endDate` / deadline | fin del padre (si el padre tiene `clientDeadline`, también) |
| `startDate` | hoy o inicio del padre si es posterior |
| `estimatedEffort` | vacío; se sugiere el esfuerzo restante del padre ÷ nº de hijas abiertas |
| `raci` / lado responsable (Transpais / UNI) | padre |
| `area`, `module`, `priority`, `attributes` | padre |
| `description` | "Parte de: {ruta del hito › padre}" + descripción del padre como referencia |

Al importar, cada hoja recibe del Excel: nombre, `startDate`, `endDate` (= deadline), `estimatedEffort`
(columna Esfuerzo si existe; si no, duración en días), % inicial (`completed` si 100%), predecesoras →
`dependencies`, y responsable deducido del prefijo ("Transpais …" → cliente, "UNI …"/"Unigis …" → Unigis).

## 7. Exportación

Botón en la pestaña Plan → Excel con el **mismo formato que el de entrada** más columnas de control:

`Nombre de tarea | Duración | % completado | Predecesoras | Comienzo | Fin | Estado UniTask | Responsable | Origen | UniTask ID`

- Orden de árbol (sangría por nivel en el nombre, como MS Project).
- Tareas **creadas en UniTask** van en su sitio del árbol con código generado (siguiente libre bajo su padre,
  p. ej. `III.1.4.2.1.8`) y `Origen = UniTask` resaltado → los PM deciden qué llevan a MS Project.
- Archivadas: excluidas por defecto (opción para incluirlas).
- Predecesoras re-numeradas a número de fila del fichero exportado.

## 8. Migración de lo existente

- `project_hierarchy` actual → script que convierte nodos en tareas con `planRole` y re-enlaza las tareas
  que tenían `planId` (por id de documento). Ejecución en seco primero, informe, luego real.
- **Hecho (2026-10-07): importador antiguo retirado del código.** Borrados `lib/project-import.ts`,
  `ImportMappingModal`, `LinkTaskModal`. `ProjectMindMapModal` ("Jerarquía") pinta solo el árbol de `tasks` por
  `parentId` (sin importar/exportar a Planner/deshacer). `TaskManagement` ya no lee `project_hierarchy`: el selector
  de padre solo ofrece tareas y el buscador de dependencias busca tareas abiertas del proyecto (antes solo buscaba
  nodos de `project_hierarchy`). Reglas: `project_hierarchy` solo lectura, borrado solo SuperAdmin.
  Los datos existentes y los `planId`/`dependencies` que apunten a nodos viejos siguen ahí hasta la migración
  (son inertes: el bloqueo por dependencias solo mira tareas).

## 9. Entregas

| Paso | Contenido | Comprobación |
|---|---|---|
| 1 | Modelo + gobierno (`MAX_DEPTH`, tipos) + `plan_imports` + backup | tipos y reglas compilan |
| 2 | Función de propagación + reglas Firestore | pruebas con árbol de 4 niveles en emulador |
| 3 | Asistente de importación con vista previa y avisos | importar el Excel de Transpais en un proyecto de prueba |
| 4 | Deshacer importación | importar → tocar 2 tareas → deshacer → ver resultado parcial |
| 5 | Árbol del plan + añadir tareas + herencia | crear hija, subtarea, suelta; cerrar hojas y ver subir el estado |
| 6 | Reimportación con emparejamiento y conflictos | reimportar el mismo Excel con 3 cambios y 1 errata |
| 7 | Exportación | exportar, abrir en Excel, revisar tareas `UniTask` |
| 8 | Migración `project_hierarchy` | ejecución en seco sobre datos reales |

Fase II: agenda (las hojas ya llevan fechas y esfuerzo estimado, que es lo que la agenda necesitará).

## 10. Preguntas abiertas

Resueltas (D7–D9). Notas:
- **friendlyId en importaciones masivas (resuelto en paso 3):** el importador asigna `friendlyId`/`taskNumber`
  en cliente con el mismo esquema que `lib/tasks.ts` (prefijo del nombre del proyecto + nº correlativo tras el
  máximo actual). Con `friendlyId` presente, `generateFriendlyId` no hace nada → cero transacciones sobre el contador.
- `isValidChildType` (lib/hierarchy-governance.ts) no tiene usos; no hace falta relajarla.
- **Predecesoras:** el Excel de Transpais referencia IDs internos de MS Project que no vienen en el extracto
  (no se pueden resolver); se ignoran con aviso. Las dependencias se definen en UniTask (paso 5: buscador de
  predecesoras al crear tarea → campo `dependencies`, que ya bloquea el cierre).
- **Subtarea sobre una hoja con esfuerzo real registrado:** al pasar a padre, su `actualEffort` propio se conserva en
  el documento pero deja de sumar (los agregados vienen de sus hijas). El formulario lo avisa.
- **Otros sitios que cambian estado** (listas rápidas, daily, etc.) no conocen el bloqueo de nodos de plan: las
  reglas lo rechazan. Solo el editor principal de tareas muestra el aviso claro. Revisar si se usan con tareas de plan.
- **Existe un tercer intento previo, `ProjectWbsTracker` ("📊 WBS Tracker")**, que guarda el WBS como un JSON por
  proyecto (con DDS y SQL). No se toca; valorar unificarlo con la pestaña Plan más adelante.

## 2b. Reglas del lector (implementadas en paso 3)

- **Jerarquía por sangría** (MS Project exporta 3 espacios por nivel), no por código: los códigos EDT de
  Transpais tienen 36 duplicados y saltos. Orden de preferencia: columna Nivel de esquema → columna EDT →
  sangría → segmentos del código.
- **Hito contado desde el flujo de cada fila** (D2 literal): flujo = fila con código de dos segmentos
  ("III.1"). Así "III.4 Tarifación", que en el Excel viene un nivel menos sangrado que el resto de flujos,
  coloca bien sus hitos. Sin flujos detectables se usa nivel absoluto.
- **Gate** = fila sin hijos con duración 0 d (p. ej. "III.1.1.4 Mapeo de interfaces aprobado", "III.1.4.1H").
- Responsable deducido del prefijo → `raci.responsible` ("UNI …" → Unigis; "Transpais …"/"TRNP …" → cliente).
- Resultado con el Excel de Transpais (603 filas): 42 agrupadores, 91 hitos (49 individuales), 22 padres,
  412 tareas, 36 controles.

## 11. Implementado

| Paso | Archivos | Verificación |
|---|---|---|
| 1 Modelo | `types.ts` (PlanRole, PlanComputed, PlanImport, campos plan* en Task), `MAX_DEPTH` 10, `plan_imports` en los 3 scripts de backup | `tsc` app y functions sin errores |
| 2 Propagación + reglas | `functions/src/planRollupCore.ts` (cálculo puro), `functions/src/planRollup.ts` (trigger onWrite europe-west1), `firestore.rules` (`planStateLocked`/`planGuardOk` en ambas reglas de tasks, `plan_imports`) | 24/24 comprobaciones en emulador Firestore+Functions: cierre/reapertura en cascada, gate automático, agregados de esfuerzo, promoción hoja→padre y vuelta, bloqueo de hitos/padres/gates para PM y Admin, hito individual cerrable, escape SuperAdmin, permisos de `plan_imports` |
| 3 Asistente de importación | `lib/plan/planParser.ts` (lector puro), `lib/plan/planImport.ts` (escritura por lotes + `plan_imports`), `components/plan/PlanTree.tsx`, `PlanImportWizard.tsx`, `ProjectPlan.tsx` (pestaña "🗂️ Plan" en `ProjectManagement`) | Lector contra el Excel real de Transpais. E2E en emulador con `importPlan()` real como PM y reglas activas: 13/13 (603 tareas en ~3 s, lote `applied`, roles y cadena padre/antepasados, computed inicial, todo `pending`, responsable por prefijo, friendlyId únicos y respetados por la función, 2ª importación bloqueada, cierre propagado hasta el flujo). `tsc` y `next build` OK. **UI no probada en navegador** (requiere sesión). |
| 5 Árbol accionable | `lib/plan/planTasks.ts` (herencia `buildDraft`, `createPlanTask` sobre `createTask`, `discardBlock`, `isPlanStateLocked`), `components/plan/PlanTaskModal.tsx`, acciones por fila en `PlanTree`/`ProjectPlan` (+ Tarea aquí, + Sub, Descartar bloque PM+, abrir en `/tasks?id=`), botón "Tarea suelta" y sección "Fuera de plan"; `TaskManagement.tsx`: estado "· calculado" no editable en nodos bloqueados y no reenvía `computed`/`planChildCount`/`planRole` (ni estado/progreso si está bloqueado); `firestore.rules`: `projectId` inmutable en tareas de plan | E2E emulador 23/23 (los 13 del paso 3 + herencia de deadline/ruta, alta bajo hito con `TRA-604` y suma en el hito, subtarea sobre hoja cerrada → padre y reapertura en cadena, tarea suelta, descartar bloque → `out_of_scope` por propagación con traza por tarea, reglas `projectId` y cierre de hito). Regresión paso 2: 24/24. `tsc`/`next build` OK. **UI no probada en navegador.** |
