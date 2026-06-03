# UniVisio — Plan: Node Coverage Map (Opción A)

**Versión:** 1.0 | **Fecha:** 2026-06-02  
**Objetivo:** Saber en todo momento qué nodos del diagrama SVG/VSDX han sido analizados por Gemini, cuáles están pendientes y cuáles fueron ignorados, incluso en flujos de 200+ nodos procesados en múltiples lotes.

---

## 1. Problema exacto

UniVisio divide los nodos en **lotes de 40** (`lotSize = 40`, `client.tsx:167`) ordenados topológicamente. Cada lote se manda a `analyzeSubflowWithGemini()` (`actions.ts:58`), que devuelve un array de `AnalyzeStep`. Cada `AnalyzeStep` tiene un campo `linkedNodeId: string` — un solo nodeId por paso.

El gap: Gemini puede agrupar 3 nodos en un paso semántico (un subproceso), o puede omitir un nodo de anotación que sí importa. El campo `linkedNodeId: string` solo captura **uno** de los nodos cubiertos. El resto quedan silenciosamente sin contabilizar.

**Resultado observable:** tras analizar 4 lotes de un flujo de 163 nodos, el usuario no sabe si quedaron 5 nodos sin cubrir o 30.

---

## 2. Arquitectura actual — archivos clave

```
app/univisio/
├── client.tsx          # Componente React principal (2038 líneas)
├── actions.ts          # Server actions para Gemini (453 líneas)
└── page.tsx            # Wrapper Next.js (11 líneas)

lib/
└── univisio.ts         # CRUD Firestore para sesiones (ya existe, ver §6)

types.ts                # Interfaces globales (ParsedNode, TableRow, UniVisioSession...)
```

### Estado relevante en client.tsx

```typescript
// Grafo parseado del SVG/VSDX (líneas 28-31)
const [nodes, setNodes] = useState<ParsedNode[]>([]);
const [edges, setEdges] = useState<ParsedEdge[]>([]);
const [swimlanes, setSwimlanes] = useState<string[]>([]);
const [cycles, setCycles] = useState<string[][]>([]);

// Resultados del análisis semántico (líneas 33-34)
const [tableRows, setTableRows] = useState<TableRow[]>([]);
const [doubts, setDoubts] = useState<Doubt[]>([]);

// Lotes (líneas 170-182)
const lotSize = 40;
const lotes = useMemo(() => {
    // Divide nodes[] en chunks de 40 con {index, start, end, nodeIds}
}, [nodes]);
const [activeLoteIndex, setActiveLoteIndex] = useState<number>(0);
```

### Interfaz AnalyzeStep en actions.ts (línea 29)

```typescript
interface AnalyzeStep {
    step: number;
    title: string;
    // ... 18 campos más ...
    linkedNodeId: string;      // ← EL PROBLEMA: solo 1 nodeId
    confidence: number;
    // ...
}
```

### Tipo ParsedNode en types.ts

```typescript
interface ParsedNode {
    id: string;
    label: string;
    shapeType: string;
    swimlane: string;
    position: { x: number; y: number };
}
```

---

## 3. Solución: Node Coverage Map

### 3.1 Concepto central

Mantener un `nodeMap: Record<string, NodeCoverageStatus>` que refleja el estado de cada nodo del grafo original respecto al análisis:

```typescript
type NodeCoverageStatus = 
    | 'pending'    // en el grafo, no analizado aún
    | 'covered'    // referenciado en al menos un tableRow
    | 'orphan'     // aislado (sin edges), no puede ser analizado
    | 'skipped'    // estaba en el lote enviado a Gemini pero no en la respuesta
```

Este mapa se inicializa al parsear el archivo y se actualiza tras cada llamada a Gemini.

### 3.2 Métricas derivadas

```typescript
const coverage = useMemo(() => {
    const total = Object.keys(nodeMap).length;
    const covered = Object.values(nodeMap).filter(s => s === 'covered').length;
    const skipped = Object.values(nodeMap).filter(s => s === 'skipped').length;
    const pending = Object.values(nodeMap).filter(s => s === 'pending').length;
    const orphan = Object.values(nodeMap).filter(s => s === 'orphan').length;
    return { total, covered, skipped, pending, orphan, pct: total > 0 ? Math.round(covered / total * 100) : 0 };
}, [nodeMap]);
```

---

## 4. Cambios necesarios — detalle por archivo

### 4.1 `actions.ts` — Cambio mínimo pero crítico

**Cambiar `linkedNodeId: string` a `coveredNodeIds: string[]`**

```typescript
// ANTES (línea 46)
linkedNodeId: string;

// DESPUÉS
coveredNodeIds: string[];   // IDs de todos los nodos cubiertos por este paso
linkedNodeId: string;       // Mantener para compatibilidad — el nodo PRINCIPAL del paso
```

Actualizar el **system instruction** (línea 67) para añadir instrucción sobre `coveredNodeIds`:

```
17. linkedNodeId: The ID of the PRIMARY shape/node from the provided JSON graph that best
    represents this step (single node, the most semantically central one).
17b. coveredNodeIds: Array with the IDs of ALL nodes from the graph that this step absorbs
    or represents. Must include linkedNodeId. Include auxiliary nodes, decision points,
    and annotations that are semantically part of this step. If only one node maps to this
    step, return an array with just that one ID.
```

Actualizar el **Gemini schema** (`stepSchema`, línea 146) para añadir:

```typescript
coveredNodeIds: {
    type: SchemaType.ARRAY,
    items: { type: SchemaType.STRING },
    description: 'All node IDs from the graph covered by this step, including linkedNodeId'
},
```

Añadir `'coveredNodeIds'` al array `required`.

### 4.2 `types.ts` — Nuevos tipos

```typescript
// Estado de cobertura de un nodo en el análisis
export type NodeCoverageStatus = 'pending' | 'covered' | 'orphan' | 'skipped';

// Mapa de cobertura: nodeId → estado
export type NodeCoverageMap = Record<string, NodeCoverageStatus>;

// Actualizar TableRow para incluir coveredNodeIds
export interface TableRow {
    // ... campos existentes ...
    coveredNodeIds?: string[];   // retrocompatible con sesiones antiguas
    linkedNodeId?: string;
}

// Actualizar UniVisioSession para persistir el mapa
export interface UniVisioSession {
    // ... campos existentes ...
    nodeMap?: NodeCoverageMap;   // nuevo campo, retrocompatible
}
```

### 4.3 `client.tsx` — Estado nuevo y lógica de cobertura

**Nuevo estado (añadir tras línea 34):**

```typescript
const [nodeMap, setNodeMap] = useState<NodeCoverageMap>({});
```

**Inicializar nodeMap al finalizar el parseo** — en `parseVisioPage()` y `parseVisioSvgText()`, al llamar `setNodes(orderedNodes)`, añadir:

```typescript
// Inicializar todos los nodos como 'pending', excepto huérfanos
const connectedIds = new Set(extractedEdges.flatMap(e => [e.from, e.to]));
const initialMap: NodeCoverageMap = {};
orderedNodes.forEach(n => {
    initialMap[n.id] = connectedIds.has(n.id) ? 'pending' : 'orphan';
});
setNodeMap(initialMap);
```

**Actualizar nodeMap después de cada llamada a Gemini** — en la función que procesa la respuesta de `analyzeSubflowWithGemini()`:

```typescript
// Tras recibir los steps del lote actual
const loteNodeIds = new Set(currentLote.nodeIds);
const coveredInThisCall = new Set<string>();

steps.forEach(step => {
    // Cada step ahora trae coveredNodeIds[]
    step.coveredNodeIds?.forEach(id => coveredInThisCall.add(id));
    if (step.linkedNodeId) coveredInThisCall.add(step.linkedNodeId); // fallback
});

setNodeMap(prev => {
    const next = { ...prev };
    loteNodeIds.forEach(id => {
        if (coveredInThisCall.has(id)) {
            next[id] = 'covered';
        } else if (next[id] === 'pending') {
            next[id] = 'skipped';   // estaba en el lote, Gemini no lo incluyó
        }
    });
    return next;
});
```

**Computed coverage metrics** (añadir tras `interfaceRegistry` useMemo ~línea 244):

```typescript
const coverage = useMemo(() => {
    const vals = Object.values(nodeMap);
    const total = vals.length;
    if (total === 0) return null;
    const covered = vals.filter(s => s === 'covered').length;
    const skipped = vals.filter(s => s === 'skipped').length;
    const pending = vals.filter(s => s === 'pending').length;
    const orphan = vals.filter(s => s === 'orphan').length;
    return {
        total, covered, skipped, pending, orphan,
        pct: Math.round(covered / (total - orphan) * 100)  // % sobre nodos analizables
    };
}, [nodeMap]);

// Lista de nodos skipped con su contexto para mostrar en UI
const skippedNodes = useMemo(() => {
    return nodes
        .filter(n => nodeMap[n.id] === 'skipped')
        .map(n => ({
            ...n,
            prevNodeLabel: edges.find(e => e.to === n.id)
                ? nodes.find(nd => nd.id === edges.find(e => e.to === n.id)!.from)?.label
                : null,
            nextNodeLabel: edges.find(e => e.from === n.id)
                ? nodes.find(nd => nd.id === edges.find(e => e.from === n.id)!.to)?.label
                : null,
        }));
}, [nodeMap, nodes, edges]);
```

### 4.4 UI — Panel de cobertura

Añadir en la sidebar izquierda, **debajo del selector de lotes**, un panel colapsable:

```
┌─────────────────────────────────┐
│ Cobertura del análisis          │
│ ████████████░░░  87%            │
│ 142 cubiertos / 163 nodos       │
│ 12 pendientes · 9 ignorados     │
│                                 │
│ ▼ Nodos ignorados (9)           │
│   ⚠ "Validar Stock" (ID 47)     │
│     entre "Ruteo" → "Despacho"  │
│   ⚠ "Notif. ERP" (ID 83)        │
│     entre "Carga" → "Cierre"    │
│   [Analizar ignorados]          │
└─────────────────────────────────┘
```

**Botón "Analizar ignorados":** crea un lote sintético con solo los nodos `skipped` y los manda a Gemini en una nueva llamada. Los resultados se agregan al final de `tableRows`.

### 4.5 `lib/univisio.ts` — Persistir nodeMap

```typescript
// En saveUniVisioSession y updateUniVisioSession, incluir nodeMap en el payload:
const dataToSave = {
    // ... campos existentes ...
    nodeMap: nodeMap ?? {},    // NodeCoverageMap completo
};
```

En `handleLoadSession` (`client.tsx:102`), restaurar el nodeMap:

```typescript
setNodeMap(session.nodeMap || {});
```

Con esto, al recargar una sesión, el usuario ve exactamente el estado de cobertura que tenía al guardar — sin necesidad de re-subir el archivo.

---

## 5. Flujo completo con el cambio

```
1. Usuario sube VSDX/SVG
2. parseVisioPage() → nodes[], edges[]
3. initNodeMap() → todos 'pending' / 'orphan'    ← NUEVO
4. UI muestra "0/163 cubiertos (0%)"              ← NUEVO

5. Usuario analiza Lote 1 (nodos 1-40)
6. Gemini devuelve steps con coveredNodeIds[]     ← NUEVO campo
7. updateNodeMap(lote1NodeIds, coveredNodeIds)    ← NUEVO
8. nodeMap: 38 'covered', 2 'skipped'
9. UI muestra "38/163 cubiertos (23%)"            ← NUEVO

10. Usuario analiza Lotes 2, 3, 4...
11. Tras Lote 4: "142/163 cubiertos (87%)"

12. Panel muestra 9 nodos 'skipped' con contexto  ← NUEVO
13. Usuario clica "Analizar ignorados"
14. Lote sintético con 9 nodos → Gemini
15. 7 más cubiertos, 2 quedan como 'skipped' (anotaciones sin semántica)

16. Usuario guarda sesión → nodeMap persiste en Firestore
17. Al recargar: cobertura visible sin re-subir archivo
```

---

## 6. Estado actual de la implementación

Al revisar el código el 2026-06-02, la mayoría del plan de sesiones de Gemini **ya está implementado**:

- `client.tsx` ya importa `useAuth`, `useTenantQuery`, `saveUniVisioSession`, `getProjectSessions`, `updateUniVisioSession` (línea 18)
- `isDirty`, `selectedProjectId`, `selectedSessionId`, `sessions` ya existen como estado (líneas 57-62)
- `handleProjectChange` con confirmación de cambios ya implementado (líneas 83-100)
- `handleLoadSession` ya implementado (líneas 102-119)
- `handleSaveSession` ya implementado (líneas 121-164)

**Lo que FALTA implementar** (el scope real de este plan):
1. `coveredNodeIds: string[]` en `AnalyzeStep` (actions.ts)
2. `nodeMap: NodeCoverageMap` estado en client.tsx
3. Inicialización de nodeMap en parseVisioPage/parseVisioSvgText
4. Actualización de nodeMap tras cada llamada Gemini
5. Panel de cobertura en UI
6. Botón "Analizar ignorados"
7. Persistencia de nodeMap en UniVisioSession (types.ts + lib/univisio.ts)

---

## 7. Riesgos y edge cases

| Riesgo | Descripción | Mitigación |
|--------|-------------|------------|
| Gemini ignora `coveredNodeIds` | Devuelve array vacío o solo `linkedNodeId` | Fallback: si `coveredNodeIds` está vacío, usar `[linkedNodeId]` |
| Un nodo aparece cubierto en dos lotes diferentes | Gemini menciona un nodo del lote anterior como contexto | Solo marcar como cubierto nodos que estaban en `currentLote.nodeIds` |
| Nodos de anotación sin semántica (ej: "Ver nota 3") | Quedan como 'skipped' indefinidamente | Añadir acción manual "Marcar como irrelevante" que cambia 'skipped' → 'orphan' |
| nodeMap en sesiones antiguas | Sessions guardadas antes de este cambio no tienen nodeMap | En `handleLoadSession`: si `session.nodeMap` es undefined, reconstruir desde `tableRows` (match linkedNodeId) |
| Lote sintético de nodos ignorados en flujo roto | Nodos skipped pueden estar desconectados del contexto | Incluir en el prompt del lote sintético los nodos vecinos (prev/next) como contexto adicional |

---

## 8. Plan de verificación

1. Subir un VSDX con 160+ nodos. Verificar que la UI muestra "0/N cubiertos" inmediatamente.
2. Analizar Lote 1. Verificar que el contador sube y que `nodeMap` en devtools React tiene nodos 'covered'.
3. Intencionalmente dejar Lote 2 sin analizar. Verificar que los nodos 1-40 están 'pending' en el panel.
4. Analizar Lote 3. Verificar que los nodos del lote 2 siguen 'pending' (no contaminados).
5. Guardar sesión. Recargar página. Cargar sesión. Verificar que el nodeMap se restaura con los mismos estados.
6. Clicar "Analizar ignorados" tras tener nodos 'skipped'. Verificar que se crea el lote sintético y los nodos se cubren.
7. Flujo edge case: sesión guardada antes del cambio (sin nodeMap). Verificar que la app no explota y reconstruye el mapa desde tableRows.

---

## 9. Archivos a modificar — resumen

| Archivo | Tipo de cambio | Líneas afectadas |
|---------|---------------|------------------|
| `app/univisio/actions.ts` | `linkedNodeId` → `coveredNodeIds[]` + retrocompatible | ~46, ~92, ~146-220 |
| `types.ts` | Añadir `NodeCoverageStatus`, `NodeCoverageMap`, actualizar `TableRow` y `UniVisioSession` | ~líneas existentes de TableRow/UniVisioSession |
| `app/univisio/client.tsx` | Estado nodeMap, init en parsers, update en análisis, UI panel, botón | ~líneas 34, 470-490, 630-700 (análisis), sidebar |
| `lib/univisio.ts` | Incluir nodeMap en save/update payloads | función saveUniVisioSession, updateUniVisioSession |

---

## 10. Preguntas abiertas para el agente implementador

1. **¿Lote sintético de skipped incluye imagen?** El análisis normal puede incluir una imagen cropped del área. Para el lote sintético de nodos skipped (dispersos en el diagrama), no hay imagen coherente — ¿mandar solo el JSON del subgrafo?

2. **¿Qué hacer con ciclos?** Los nodos en `cycles[]` pueden aparecer como 'skipped' si el lote de su SCC no los cubre explícitamente. ¿Marcarlos automáticamente como 'covered' si están en un cycle que ya tiene representación en tableRows?

3. **Threshold de confianza:** Si `confidence < 0.5` en un step, ¿marcar los nodos que cubre como 'skipped' en lugar de 'covered'? Esto daría un indicador de calidad además de cobertura.

4. **Color coding en la tabla:** Añadir una columna de indicador visual en la tabla principal (verde/amarillo/rojo según `confidence` del tableRow correspondiente). ¿Fuera de scope de este plan?
