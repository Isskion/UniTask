# Dashboard de proyecto (diseño)

> Estado: **implementado** 2026-10-08 · Menú → Espacio de trabajo → "Dashboard de proyecto"
> El "Buzón / Tablero" (`components/Dashboard.tsx`) se queda como vista general de todos los proyectos.

## 0. Decisiones

| # | Decisión |
|---|----------|
| P1 | Entrada propia en el menú con selector de proyecto (uno a la vez). |
| P2 | **Unidad: días de esfuerzo** (8 h = 1 d), no nº de tareas. Las tarjetas de tareas creadas/activas/cerradas siguen en nº de tareas. |
| P3 | **Foto diaria** por proyecto (`project_snapshots`), para que la curva sea exacta desde que existe. |
| P4 | **Fecha fin comprometida por proyecto** (`Project.committedEndDate`), fija; la desviación se mide contra ella. `Project.endDate` pasa a ser la fecha fin *prevista* (replanificable). Sin comprometida se usa la prevista. |

## 1. Qué cuenta

- **Trabajo real** (`workableTasks`): se excluyen las tareas con hijas vivas (padres, hitos y agrupadores del plan,
  épicas con subtareas), los controles del plan (`gate`), las archivadas y las inactivas. Con Transpais: 461 de 603.
- **Días de cada tarea** (`effortOf`), recuperados por orden: estimación de la tarea → `planBaseline.estimatedEffort`
  (duración del Excel) → talla XS–XL → días laborables entre inicio y fin → 1 día. El panel "Fiabilidad de los datos"
  dice cuántas tareas salen de cada fuente.
- **Día de cierre**: `closedAt`; si una tarea cerrada no lo tiene, `updatedAt` (marcado como aproximado).
- **Alcance** = días de las tareas no descartadas / fuera de alcance. **Hecho** = días en Aprobación Final.
  **Avance** = escala por estado 100/75/50/0 (la misma del plan, D13), ponderada por días.
- Días en zona Europe/Madrid (igual en navegador y en la función).

## 2. Pantalla

1. **Tareas creadas** (+ días en alcance), **activas** (pendiente / en curso / revisión), **cerradas** hoy · semana · mes,
   **pendiente** en días y ritmo (días cerrados por semana, 4 últimas semanas).
2. **Plazo**: avance; **planificado a hoy** (según inicio/fin de cada tarea, reparto lineal por días laborables);
   **desviación frente a las fechas de las tareas** (día en que el plan preveía tener hecho lo que hoy está hecho, en
   días laborables respecto a hoy); **fin previsto al ritmo actual** y su desviación frente a la fecha objetivo.
3. **Burndown** (pendiente real, ideal desde el alcance del primer día con trabajo hasta 0 en la fecha objetivo,
   pendiente según las fechas de las tareas, previsión) y **burn-up** (alcance, planificado, hecho). Marcas de hoy,
   fin comprometida y fin prevista.
4. **Cerradas por día / semana / mes** (últimos 30 días, 12 semanas, 12 meses); el tooltip da también los días.
5. **Fechas** editables desde la cabecera (PM+) o en Proyectos → Ajustes → Presupuesto de horas.

El ideal arranca el primer día con alcance, no en la fecha de inicio: una importación de plan mete cientos de tareas
de golpe y el ideal no debe empezar en 0.

## 3. Historia de la curva

- Días con foto diaria → valores de la foto (exactos: ven reaperturas y cambios de esfuerzo).
- Días sin foto → reconstrucción desde `createdAt` y día de cierre de cada tarea (aproximada).
- Hoy → siempre el cálculo en vivo.

## 4. Foto diaria (`projectSnapshots`)

Cloud Function programada (europe-west1, 23:55 Europe/Madrid). Para cada proyecto activo con tareas guarda
`project_snapshots/{projectId}_{yyyy-MM-dd}` con `currentSnapshot` (alcance, hecho, pendiente, ganado, planificado,
recuentos, fuentes de días) + `projectId`, `tenantId`, `createdAt`. Idempotente. Reglas: lectura del propio tenant,
escritura solo admin SDK. Registrada en los 3 scripts de backup.

## 5. Código

| Pieza | Archivo |
|---|---|
| Cálculo puro compartido | `functions/src/projectProgressCore.ts` |
| Foto diaria | `functions/src/projectSnapshots.ts` (exportada en `functions/src/index.ts`) |
| Modelo de la pantalla | `lib/projectDashboard.ts` |
| Pantalla | `components/ProjectDashboard.tsx`; vista `project-dashboard` en `AppLayout` (menú escritorio y móvil) y `DailyFollowUp` |
| Fecha comprometida | `types.ts` (`Project.committedEndDate`), `ProjectBudgetEditor.tsx` |

Verificación: modelo con el plan de Transpais 22/22 (días laborables O(1) = conteo ingenuo, 604 tareas en ~0,2 s,
invariantes, foto diaria sustituye reconstrucción, ideal y previsión, cierres por periodo, proyecto sin fechas);
emulador 7/7 (fotos solo de proyectos activos, valores, idempotencia, lectura por tenant, escritura denegada).

## 6. Pendiente / ideas

- Pendiente por responsable (Unigis / cliente) y por hito o flujo.
- Vencidas y antigüedad de lo que está en curso o en revisión.
- Corregir en el "Buzón / Tablero": % por esfuerzo, semáforo con fechas, "activas" = backlog, cierre sin `updatedAt`.
