# UniVisio — Plan: Control de flujo, exclusión de nodos y revisión previa al Relato

**Versión:** 2.0 | **Fecha:** 2026-07-06
**Estado:** Análisis / diagnóstico — sin implementar
**Objetivo:** Que el usuario pueda corregir manualmente los casos en que UniVisio no infiere bien el flujo (sin cabecera clara, flechas invertidas, diagramas amplios), marcando nodo de inicio, dirección, nodos a excluir, y revisando el análisis de Gemini antes de generar el Relato.

**Nota de versión:** v2.0 fusiona el análisis original (v1.0) con una segunda pasada de análisis (Gemini) aportada por el usuario. Se incorporaron las mejoras verificadas contra el código real y se corrigió una asunción incorrecta (ver §3.1.c — no existe hoy un lienzo SVG interactivo, solo un `<img>` estático).

---

## 1. Problema reportado

En flujos amplios o sin un nodo de inicio evidente, el análisis de UniVisio sale mal ordenado o incompleto. El usuario necesita cuatro controles que hoy no existen:

1. Indicar dónde debe **empezar** el análisis (nodo de inicio explícito).
2. Indicar la **dirección** del flujo — tanto la orientación visual (arriba→abajo, izq→der) como la posibilidad de que una flecha concreta esté invertida por un fallo del parser.
3. Marcar nodos que **no** se deben analizar.
4. Un paso de **revisión** del análisis de Gemini antes de lanzar el "Relato" (narrativa final), para corregir errores.

---

## 2. Diagnóstico de causa raíz (código actual)

### 2.1 Ordenamiento — `topologicalSort` (`client.tsx:1321-1367`)

Es un Kahn's algorithm puro sobre `edges` (in-degree), sin usar posición (`x`,`y`) ni swimlanes:

- La cola inicial se llena con **todos los nodos con in-degree 0** (`client.tsx:1337-1341`). "Inicio" = "nodo sin flechas entrantes" — no hay selección manual de raíz.
- **Fallback (líneas 1357-1363):** los nodos no alcanzados (ciclos, o ningún nodo con in-degree 0) se añaden al final **en el orden de aparición en el XML/SVG original** — orden de exportación de Visio, sin relación con la lógica del diagrama. Este es exactamente el caso "sin cabecera clara": si no hay ningún nodo con in-degree 0, la cola queda vacía y **todo** el flujo cae a este fallback.
- Con **múltiples raíces** (varios nodos con in-degree 0), el BFS multi-fuente las intercala según el orden de inserción en la cola — sin ninguna prioridad definida por el usuario sobre cuál rama es la principal.
- No existe ningún concepto de "dirección visual" en el algoritmo: se capturan `x`/`y` y swimlanes al parsear (`client.tsx:978-1010`, `1118-1172`) pero no se usan para ordenar.

### 2.2 Lotes (`client.tsx:330-345`)

`lotSize = 40` fijo; `lotes` trocea `nodes` (ya en el orden de 2.1, potencially incorrecto) por slicing secuencial, sin criterio semántico. Un error de orden global se propaga a **todos** los lotes que se mandan a Gemini (`analyzeSubflowWithGemini`, `actions.ts:152-246`), cuyo prompt (`actions.ts:161-192`) no recibe ninguna pista de dirección o punto de entrada — solo el subgrafo del lote.

### 2.3 Exclusión de nodos — no existe

El único estado parecido es `'skipped'` en `NodeCoverageMap` (`types.ts:688-689`), pero es **automático**: se asigna cuando un nodo del lote queda `'pending'` tras la respuesta de Gemini (`client.tsx:1549-1557`). No hay ningún campo en `ParsedNode`, `NodeCoverageStatus` ni `UniVisioSession` para que el usuario marque intencionalmente "este nodo no se analiza". `'orphan'` (nodo sin conexiones) es también automático e informativo, no accionable.

### 2.4 Revisión antes del Relato — no existe como paso formal

"Relato" (`viewMode = 'narrative'`, `client.tsx:81`) no dispara ninguna llamada nueva a Gemini — **renderiza el mismo array `tableRows`** como tarjetas (`client.tsx:2864+`) en vez de tabla (`client.tsx:2627+`). Ambas vistas comparten la misma edición inline (`handleCellChange`, `moveRow`, etc.). El campo `needsReview` (`types.ts:722`) se marca automáticamente si `confidence < 0.7` (`client.tsx:613`, `1539`) y se resalta visualmente, pero es solo una señal — no bloquea ni exige aprobación antes de pasar a Relato. El usuario puede cambiar a Relato en cualquier momento, incluso con lotes sin analizar.

Punto exacto donde la respuesta de Gemini se fusiona **sin ningún paso intermedio**: `runSemanticAnalysis` (`client.tsx:1491-1576`) construye `newRows` a partir de `response.steps` (líneas 1514-1540) y las integra de inmediato con `setTableRows(prev => mergeNewRows(prev, newRows, activeNodeIds))` (**línea 1561-1564**), en el mismo tick que actualiza `nodeMap` a `'covered'`. No hay ningún estado intermedio tipo "borrador" entre la respuesta de la API y la tabla final — este es el punto de inserción natural para un paso de revisión por lote (ver §3.4).

### 2.5 Infraestructura ya existente reutilizable: `Doubt` / `generatePreliminaryDoubts`

Ya existe un mecanismo de avisos estructurado, `Doubt` (`types.ts:741-747`: `{ id, severity: 'critical'|'medium'|'low', stepIndex?, message, nodeId? }`), poblado por `generatePreliminaryDoubts` (`client.tsx:1428-1488`) **antes** del análisis semántico, con 3 reglas: nodos aislados (líneas 1438-1447), ciclos detectados (1450-1457), y nodos con múltiples salidas que no están etiquetados `shapeType === 'decision'` (1465-1477). Esto es relevante para la propuesta de auditoría de §3.5: en vez de construir un componente nuevo, la extensión natural es generar más `Doubt` **después** del análisis semántico (no solo antes), reutilizando el mismo array/estado `doubts` y su UI existente.

---

## 3. Propuesta de diseño

*(v2.0: fusiona el plan original con una segunda pasada de análisis. Se marca `[Gemini]` donde la idea proviene de ahí, `[corregido]` donde se ajustó por no encajar con el código real.)*

### 3.1 Nodo de inicio manual

- Nuevo estado `startNodeId: string | null` (o `initiatorNodeId`, mismo concepto en ambos análisis), persistido en `UniVisioSession`.
- **UI de selección `[corregido]`:** Gemini propone "seleccionar cualquier nodo del lienzo gráfico (clic derecho)". Verificado contra el código: **hoy no existe un lienzo interactivo** — `client.tsx` solo renderiza el diagrama como `<img>` estático (líneas 2117, 2173, 2333, 2351, 3259, 3591) para previsualización y para mandarlo a Gemini Vision; no hay `onClick` por nodo ni `svgRef`. La selección de nodo de inicio (y de exclusión, §3.3) debe implementarse sobre una **lista/tabla buscable de nodos** (label, swimlane, id), no clicando el diagrama. Un lienzo SVG interactivo sería una mejora mayor y separada, fuera de alcance de este plan.
- Cambio en `topologicalSort(nodes, edges, startNodeId?)`: si se indica, se fuerza a tratarlo como raíz única (ignorando su in-degree real) y se arranca el recorrido desde ahí.
- **Agrupar no-alcanzados en un lote propio `[Gemini, adoptado]`:** en vez de solo marcar en el panel de cobertura "no alcanzable desde el inicio" (propuesta original v1.0), los nodos no alcanzables desde `startNodeId` se agrupan en un **lote especial y visible**, rotulado *"Nodos no alcanzados / desconectados"*, que el usuario puede analizar aparte o descartar explícitamente. Es una mejora real sobre v1.0: convierte el fallo silencioso en una acción concreta, no solo en una señal pasiva.

### 3.2 Dirección del flujo (modelo unificado: 3 mecanismos complementarios)

Se fusionan los dos enfoques: el de v1.0 (orientación visual + reversión de aristas) y el de Gemini (modo de recorrido Forward/Backward/Undirected). Son ortogonales, no se solapan:

**a) Modo de recorrido `[Gemini, adoptado]`:** `traversalMode: 'forward' | 'backward' | 'undirected'`.
   - `forward` (por defecto): sigue las aristas `from → to`, el comportamiento actual.
   - `backward`: sigue `to → from` — útil para análisis de causa raíz o reconstrucción desde el cierre del proceso hacia atrás. Es una idea que v1.0 no contemplaba y que es más limpia que un toggle "invertir todas las flechas" (ver 3.2c): es un modo de recorrido, no una mutación del grafo.
   - `undirected`: ignora el sentido de la arista y conecta por adyacencia simple. Aquí es donde entra el criterio geométrico de v1.0 — cuando no hay dirección que seguir, se necesita algún criterio de desempate para decidir el orden de recorrido entre vecinos igualmente válidos.

**b) Orientación visual como desempate `[v1.0, ajustado]`:** `flowDirection: 'TB' | 'LR' | 'BT' | 'RL'`, usado en dos casos: (1) dentro de `traversalMode: 'undirected'`, como criterio de vecino "siguiente" por posición; (2) como fallback cuando `forward`/`backward` no puede decidir (múltiples raíces empatadas, o ningún nodo con in-degree 0 tras aplicar `startNodeId`) — reemplaza el "orden de aparición en XML" actual (línea 1358-1363) por orden geométrico según `x`/`y`, que es más fiel a la intención visual del diagrama.

**c) Corrección puntual de flechas invertidas `[v1.0]`:** el parser puede asignar `from`/`to` al revés en una conexión concreta (bug de parseo puntual, no de todo el diagrama — para eso ya está `traversalMode: 'backward'` en 3.2a). Añadir acción "Invertir dirección" sobre una arista concreta, persistida como `edgeOverrides: Record<edgeId, boolean>`, reversible, aplicada antes de `topologicalSort`.

### 3.3 Exclusión de nodos

- Nuevo campo explícito: `excludedNodeIds: Set<string>` (serializado como array/`Record<string,true>` en Firestore), persistido en `UniVisioSession`. Distinto del `'skipped'` automático de `NodeCoverageMap`.
- UI: sobre la misma lista/tabla de nodos de §3.1 (no sobre un lienzo, por lo verificado arriba) — acción "Excluir del análisis", reversible ("Volver a incluir").
- **Poda sin reconexión, por defecto `[Gemini, adoptado — resuelve pregunta abierta de v1.0]`:** Gemini propone el filtro concreto:
  ```typescript
  const activeNodes = parsedNodes.filter(n => !excludedNodeIds.has(n.id));
  const activeEdges = extractedEdges.filter(e => !excludedNodeIds.has(e.from) && !excludedNodeIds.has(e.to));
  ```
  Es decir: **no** reconectar automáticamente predecesor→sucesor al excluir un nodo intermedio — simplemente se podan sus edges y se acepta que el grafo quede desconectado en ese punto. Se adopta este default porque reconectar automáticamente exigiría inferir equivalencia semántica (¿el sucesor hereda todas las condiciones del nodo excluido?), lo cual es más arriesgado que dejarlo visible como desconexión en el panel de cobertura. Si en la práctica esto genera demasiados falsos "no alcanzados", se puede revisar más adelante.
- Estado en cobertura: los nodos excluidos deben tener su **propio estado** en `NodeCoverageStatus` (añadir `'excluded'` al union type) en vez de reusar `'skipped'` — para no confundir "Gemini no lo cubrió" (automático) con "el usuario decidió no analizarlo" (intencional) en la UI y en las métricas.
- Efecto: nunca se envían a Gemini, ni cuentan en el % de cobertura, ni entran en `lotes`.

### 3.4 Revisión antes de integrar cada lote (draft por lote, no solo antes del Relato)

**Cambio de enfoque respecto a v1.0 `[Gemini, adoptado como propuesta principal]`:** v1.0 proponía un filtro no bloqueante sobre `tableRows` ya fusionadas, revisable "en cualquier momento antes de entrar a Relato". La segunda pasada de análisis propone algo mejor: **no fusionar la respuesta de Gemini directamente** en `tableRows` — insertar un estado de borrador intermedio por lote.

Punto de inserción exacto (ver §2.4): en `runSemanticAnalysis` (`client.tsx:1491-1576`), hoy `newRows` (líneas 1514-1540) pasa directo a `setTableRows(prev => mergeNewRows(prev, newRows, activeNodeIds))` (línea 1561-1564) en el mismo tick que se marca `nodeMap` como `'covered'`. La propuesta:

1. `newRows` se guarda en un nuevo estado `draftRows: TableRow[]` (no en `tableRows`), y **`nodeMap` tampoco se marca `'covered'` todavía** — se muestra como estado intermedio, p.ej. `'analyzed_pending_review'`, o se mantiene `'pending'` visualmente con un indicador distinto.
2. Se muestra una vista de revisión del lote (reutilizando la edición inline existente — `handleCellChange`, reordenar filas, etc., no hace falta un editor nuevo) con las filas de `draftRows`.
3. **Re-asociación de nodo `[Gemini]`, corregida (`[corregido]`):** Gemini propone "pinchar el nodo correcto en el SVG/canvas" para corregir un `linkedNodeId`/`coveredNodeIds` mal asociado. Como no hay canvas interactivo (§3.1), esto debe ser un selector/buscador de nodos (misma lista de §3.1), no un clic en el diagrama.
4. Botón explícito **"Aprobar e integrar"**: solo entonces se ejecuta el `setTableRows`/`setNodeMap` actuales (líneas 1549-1564), moviendo las filas de `draftRows` a `tableRows` y marcando los nodos como `'covered'`.
5. El botón "Relato" (§2.4) puede simplemente seguir sin gate propio — como ya solo lee `tableRows`, y `tableRows` ahora solo contiene filas aprobadas, el paso de revisión ocurre naturalmente *antes* de que cualquier fila llegue a Relato, sin necesitar un segundo gate ni un campo `reviewed` separado. Esto simplifica v1.0 (que proponía un campo `reviewed` adicional): ya no hace falta, el estado "borrador vs aprobado" lo da la separación `draftRows`/`tableRows`.

Con este diseño, la pregunta abierta 7.4 de v1.0 ("¿gate bloqueante o aviso no bloqueante?") queda resuelta de forma natural: el gate es implícito y ya existía un lugar natural donde ponerlo (la propia acción de "analizar lote" pasa a tener dos pasos en vez de uno), sin fricción añadida — el usuario de todos modos tenía que mirar el resultado del lote antes de seguir.

### 3.5 Auditor de calidad post-análisis `[Gemini, adoptado y corregido contra el schema real]`

La segunda pasada de análisis propone una validación automática de coherencia narrativa antes/durante el Relato. Se adopta la idea, pero corrigiendo los campos asumidos: **no existe** un par simple "Estado Origen/Estado Resultante" por fila — `TableRow.stateChanges` (`types.ts:697`) es un **array** `{ entity, from, to }[]`, porque un paso puede cambiar el estado de varias entidades a la vez. Las reglas propuestas, ajustadas al schema real:

- **Continuidad de estado por entidad:** para cada `entity` que aparece en `stateChanges` del paso N con un `to`, verificar si el paso N+1 tiene un `stateChanges` para la misma `entity` cuyo `from` coincide. Si no coincide, generar un `Doubt` de severidad `medium`.
- **Huecos en pasos de decisión:** si `actionType`/`shapeType` indica un nodo de decisión y `precondition` o `rule` quedan en su valor por defecto `'-'` (`client.tsx:1528`, `1530`), generar `Doubt` de severidad `low`.
- **Huérfanos de mapeo:** filas con `linkedNodeId` vacío (`step.linkedNodeId || ''`, línea 1531), generar `Doubt` de severidad `critical` — esto puede pasar hoy con filas creadas manualmente vía "Insertar fila".
- **Reutilizar infraestructura existente, no crear un componente nuevo:** como se vio en §2.5, ya existe `Doubt` (con `stepIndex` incluido) y el estado `doubts` con su UI. La forma más barata de implementar esto es una función hermana de `generatePreliminaryDoubts`, ejecutada **después** de cada aprobación de lote (§3.4 paso 4) sobre `tableRows` actualizado, que añade a ese mismo array `doubts` en vez de crear un panel/estado separado.

---

## 4. Interacción entre los controles

- `startNodeId`, `traversalMode`, `flowDirection` y `edgeOverrides` afectan **solo** al cálculo de `topologicalSort` → se recalcula `nodes` ordenado cada vez que cambian.
- `excludedNodeIds` afecta a `topologicalSort` (se podan antes, sin reconexión — §3.3) y a la construcción de `lotes` (nunca aparecen en un lote) y al cálculo de `coverage` (nuevo estado `'excluded'`, excluido del denominador o mostrado aparte).
- Con el modelo de `draftRows`/`tableRows` de §3.4, el riesgo de desalineación de v1.0 se reduce pero **no desaparece del todo**: si el usuario cambia `startNodeId`/`traversalMode`/`excludedNodeIds` después de haber **aprobado** ya algunos lotes (es decir, ya están en `tableRows`, no solo en `draftRows`), esos pasos aprobados quedan igualmente desalineados con el nuevo orden de lotes pendientes. Esto sigue siendo una pregunta abierta — ver 7.1.

---

## 5. Archivos afectados (para cuando se pase a implementación)

| Archivo | Cambio |
|---|---|
| `types.ts` | `startNodeId`, `traversalMode`, `flowDirection`, `edgeOverrides`, `excludedNodeIds` en `UniVisioSession`; nuevo valor `'excluded'` en `NodeCoverageStatus`; sin necesidad de campo `reviewed` en `TableRow` (sustituido por el modelo draft/aprobado de §3.4) |
| `app/univisio/client.tsx` | `topologicalSort` con parámetros nuevos y lote especial de "no alcanzados"; lista/tabla de nodos para selección de inicio y exclusión (no hay canvas interactivo, ver §3.1); nuevo estado `draftRows` y flujo "Aprobar e integrar" en `runSemanticAnalysis` (líneas 1491-1576, especialmente el punto de fusión 1561-1564); función hermana de `generatePreliminaryDoubts` (1428-1488) para auditoría post-análisis |
| `app/univisio/actions.ts` | Sin cambios estructurales necesarios — el prompt de Gemini no necesita saber de esto si el orden ya llega correcto en el subgrafo del lote |
| `lib/univisio.ts` | Incluir los nuevos campos en el payload de guardar/cargar sesión |

---

## 6. Riesgos y edge cases

| Riesgo | Mitigación |
|---|---|
| Cambiar controles tras **aprobar** lotes desalinea `tableRows` ya integradas | Ver 7.1 — probablemente avisar y dejar elegir al usuario; mitigado parcialmente porque `draftRows` no aprobados sí se pueden recalcular libremente |
| `excludedNodeIds` rompe la conectividad y genera más "no alcanzables" | Mostrar explícitamente en el panel de cobertura (lote de "no alcanzados", §3.1), no ocultarlo |
| Sesiones antiguas sin estos campos | Defaults vacíos/false — retrocompatible, igual que se hizo con `nodeMap` en el plan de junio |
| Usuario invierte una flecha que en realidad estaba bien | Acción reversible (`edgeOverrides` es un toggle, no una mutación destructiva) |
| Auditor de calidad (§3.5) genera ruido de falsos positivos en diagramas con estados intencionalmente discontinuos | Severidad `medium`/`low` (no `critical`), no bloquea nada — es informativo, igual que los `doubts` actuales |

---

## 7. Preguntas abiertas (necesarias antes de diseñar la UI en detalle)

1. **Recalculo tras aprobar lotes:** si ya hay lotes **aprobados** (en `tableRows`, no solo en `draftRows`) y luego se cambia inicio/dirección/exclusión, ¿invalidar y re-lanzar esos lotes, o mantener lo ya aprobado y aplicar el cambio solo hacia adelante? (La versión anterior de esta pregunta asumía que todo pasaba directo a `tableRows`; con `draftRows` el problema se limita a lo ya aprobado.)
2. **Prioridad de implementación:** de los 5 sub-apartados de la sección 3 (inicio manual, dirección, exclusión, draft/aprobación por lote, auditor de calidad), ¿todos entran en un mismo alcance o se prioriza alguno primero? El draft/aprobación por lote (§3.4) es el que más directamente resuelve "necesito revisar antes del Relato"; inicio/dirección/exclusión (§3.1-3.3) resuelven el problema de origen (mal ordenamiento); el auditor (§3.5) es la mejora de menor urgencia y coste de implementación más bajo (reutiliza infraestructura existente).
3. **UI de selección de nodos:** ¿lista plana con buscador, o agrupada por swimlane? Afecta el diseño del componente compartido que usarán tanto "nodo de inicio" como "exclusión" como "re-asociar nodo" en el draft (§3.4.3).
