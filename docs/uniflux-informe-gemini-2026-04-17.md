# UniFlux — Informe de Mejoras para Mantenimiento
**Fecha:** 2026-04-17  
**Para:** Gemini (equipo de mantenimiento UniFlux)  
**Contexto:** Este fin de semana se suben a producción las mejoras acumuladas. El informe cubre el estado actual, todo lo implementado, y la deuda técnica pendiente para priorizar correctamente.

---

## 1. Estado antes de las mejoras

UniFlux era un editor de flujos con dos modos:

| Modo | Descripción |
|------|-------------|
| **Visual Flow** | Canvas drag-and-drop, 8 tipos de nodo genéricos (`START`, `STATE`, `OPERATION`, `TASK`, `DECISION`, `TERMINAL`, `ERROR`, `ENVIRONMENT`) |
| **Mermaid DSL** | Editor de código con preview en tiempo real |

**Limitación principal:** sin soporte para documentar arquitecturas de software. El usuario necesitaba diagramas C4 (modelo Simon Brown) integrados en el mismo ecosistema UniTask (Firestore, IA generativa, permisos, proyectos).

---

## 2. Resumen ejecutivo de las mejoras

Se implementó el **modo C4 Architecture** como tercer modo operativo de UniFlux, en 4 rounds de desarrollo incrementales. El principio rector fue **estrategia aditiva**: ningún archivo existente se eliminó, ningún tipo existente cambió. Todo Visual Flow y Mermaid funciona exactamente igual que antes.

```
UniFlux (estado actual)
├── docType: 'visual'   → Visual Flow (intacto)
├── docType: 'mermaid'  → Mermaid DSL (intacto)
└── docType: 'c4'       → C4 Architecture (NUEVO — 4 rounds)
```

---

## 3. Detalle por round

### Round 1 — C4 Foundation (Schema v2)

**Objetivo:** implementar el modo C4 mínimo viable con IA funcional.

**Tipos de nodo añadidos (`C4NodeType`):**
```typescript
'C4_PERSON'           // Actor humano interno o externo
'C4_SYSTEM'           // Sistema en foco (azul #1168BD)
'C4_SYSTEM_EXT'       // Sistema externo (gris #999999)
'C4_CONTAINER_WEB'    // SPA / Frontend
'C4_CONTAINER_API'    // API / Backend REST
'C4_CONTAINER_DB'     // Base de datos
'C4_CONTAINER_QUEUE'  // Cola / Event bus
'C4_COMPONENT'        // Módulo dentro de un container
'C4_BOUNDARY'         // Contenedor agrupador redimensionable
```

**Archivos nuevos:**
- `app/uniflux/core/types.ts` — `C4NodeType`, `AnyNodeType`, campos opcionales en `FlowNode` (`technology`, `description`, `external`, `c4Level`)
- `components/uniflux/nodes/UnifluxC4PersonNode.tsx`
- `components/uniflux/nodes/UnifluxC4SystemNode.tsx`
- `components/uniflux/nodes/UnifluxC4ContainerNode.tsx`
- `components/uniflux/nodes/UnifluxC4ComponentNode.tsx`
- `components/uniflux/nodes/UnifluxC4BoundaryNode.tsx`
- `components/uniflux/UnifluxC4Palette.tsx` — selector de nivel + paleta filtrada por nivel activo
- `components/uniflux/UnifluxC4NodeEditor.tsx` — panel de propiedades C4 (tipo, tecnología, descripción, externo, bloquear)
- `components/uniflux/UnifluxC4Templates.tsx` — 5 plantillas (Web App L1, Web App L2, Microservicios, Event-Driven, Monolito)

**Cambios en archivos existentes:**
- `UnifluxWorkspace.tsx` — registro de tipos C4 en React Flow, bifurcación de renderizado por `docType`, badges L1/L2/L3 en header
- `app/uniflux/core/validator.ts` — enrutamiento por `docType`, reglas C4-001 a C4-005 (todas warnings)
- `functions/src/uniflux.ts` (Cloud Function) — system prompt diferente para C4 vs Visual Flow

**Persistencia:** schema aditivo en Firestore. Los nuevos campos son opcionales, sin migración de datos.

**Build:** ✅

---

### Round 2 — Typed Edges + Semantic Zoom + Progressive Validation (Schema v3)

**Objetivo:** darle profundidad semántica a las aristas y al canvas multi-nivel.

**Typed Edges (`C4RelationshipType`):**
```typescript
type C4RelationshipType = 'sync' | 'async' | 'event' | 'database' | 'external'
```
El canvas aplica estilos visuales por tipo:
- `sync` → línea continua azul
- `async` → línea discontinua azul
- `event` → línea punteada ámbar, animada
- `database` → línea continua verde
- `external` → línea gris clara discontinua

Campos añadidos a `FlowEdge`: `c4RelType`, `protocol`, `c4Description`.

**Zoom semántico (multi-level real):**  
Cada nodo lleva `c4Level`. El canvas filtra por nivel de vista activo:
- L1 activo → C4_PERSON, C4_SYSTEM, C4_SYSTEM_EXT visibles; el resto al 12% de opacidad
- L2 activo → Context nodes + containers visibles
- L3 activo → Containers + components visibles

No hay 3 diagramas separados: **hay uno con profundidad**. Transición animada (opacity 0.25s) al cambiar nivel.

**Validación progresiva (3 severidades):**

| Código | Condición | Severidad |
|--------|-----------|-----------|
| C4-001 | Diagrama vacío | warning |
| C4-002 | L1 sin SOFTWARE_SYSTEM | **error** |
| C4-003 | Container sin technology | warning |
| C4-004 | Nodo sin conexiones | warning |
| C4-005 | Tipo incoherente con nivel | warning |
| C4-006 | Sin description | info |
| C4-007 | Container desconectado en L2 | **error** |

**Schema versioning:** campo `schemaVersion` en `FlowGraph`. Nuevos diagramas C4 = `schemaVersion: 3`.

**Build:** ✅

---

### Round 3 — Mode Registry + Migrations + Visibility Module (Schema v3)

**Objetivo:** refactorizar la arquitectura interna para que sea extensible y eliminar lógica ad-hoc del workspace.

**Mode Registry (`app/uniflux/core/modes.ts`):**
```typescript
interface DiagramMode {
    id: string
    validate: (graph: FlowGraph) => ValidationResult   // pura
    buildAIPrompt: (ctx: AIPromptContext) => string
    nodeTypes: ReadonlySet<string>
    usesCanvas: boolean
    supportsAI: boolean
}
export const MODE_REGISTRY: Record<string, DiagramMode> = { visual, c4, mermaid }
```
Añadir un modo nuevo (BPMN, UML, ER) = crear un objeto `DiagramMode` + registrarlo. Cero cambios en el workspace.

**Schema Migration Engine (`app/uniflux/core/migrations.ts`):**
```typescript
export const CURRENT_SCHEMA_VERSION = 3
// Pipeline de migraciones puras e idempotentes
// v1→v2: docType discriminator
// v2→v3: c4Level inferred + typed edges
export function migrateGraph(raw: any): any
export function needsMigration(raw: any): boolean
```
Documentos legacy se auto-migran **en memoria** al cargarse. Firestore no se toca hasta el siguiente save explícito.

**Computed Visibility Module (`app/uniflux/core/visibility.ts`):**
```typescript
type VisibilityTier = 'full' | 'dimmed' | 'hidden'
export function getNodeVisibility(node, viewLevel): VisibilityTier
export function getEdgeVisibility(edge, nodeMap, viewLevel): VisibilityTier
export function partitionNodes(nodes, viewLevel): { visible, dimmed, hidden }
export function getAIVisibleGraph(nodes, edges, viewLevel): { nodes, edges }
```
La lógica de opacidad ya no está dispersa en el workspace.

**AI Context Filtering:**  
`liveGraph` (el grafo que se pasa al toolbar de IA) usa `getAIVisibleGraph` en modo C4. La IA recibe solo el subgrafo visible en el nivel activo — no confunde nodos L1 con containers L2 en el mismo prompt.

**Mode-Aware Wizard Prompt:**  
El wizard adapta el envoltorio del input del usuario según el modo activo. En C4 pasa la descripción directamente; en Visual Flow añade contexto de flujo de datos.

**Build:** ✅

---

### Round 4 — UniFlux Core v4: SystemModel + Graph Intelligence (Schema v4)

**Objetivo:** convertir UniFlux de editor visual en **runtime de modelos de sistema**.

**`ModeId` type-safe:**
```typescript
export type ModeId = 'visual' | 'c4' | 'mermaid'
// MODE_REGISTRY: _ExhaustiveModeCheck — TypeScript falla en compilación si ModeId gana un valor no registrado
```

**Edge as Contract (campos nuevos en `FlowEdge`):**
```typescript
dataShape?: 'request-response' | 'event' | 'stream'
payload?: string    // "OrderEvent{orderId, items, total}"
sla?: string        // "<200ms P99", "eventually consistent"
```
Un edge con los 3 campos = contrato de sistema completo. Aditivos, sin migración.

**SystemModel (`app/uniflux/core/systemModel.ts`) — capa semántica intermedia:**
```typescript
interface SystemModel {
    actors:     C4Actor[]
    systems:    C4System[]
    containers: C4Container[]
    components: C4Component[]
    relations:  C4Relation[]
}
// Converters puros:
graphToSystemModel(graph): SystemModel
systemModelToGraph(model, c4Level, base?): FlowGraph
systemModelToPromptContext(model): string  // para prompts AI
```
Desacopla la representación visual del modelo lógico. Prepara el pipeline 2-fases de IA (pendiente).

**Graph Intelligence Layer (`app/uniflux/core/analysis.ts`):**
```typescript
findOrphans(nodes, edges): FlowNode[]
detectCycles(nodes, edges): string[][]
findCriticalPaths(nodes, edges): string[][]
findSinglePointsOfFailure(nodes, edges): FlowNode[]        // articulation points
findDisconnectedComponents(nodes, edges): string[][]
computeDensity(nodeCount, edgeCount): number
analyzeGraph(nodes, edges): GraphAnalysis
analysisToInsights(analysis, nodeMap): string[]  // mensajes listos para UI
```
API 100% pura, sin deps React. Lista para usar en panel de insights o enriquecer prompts AI.

**`shouldRender` render optimization:**
```typescript
// visibility.ts
export function shouldRender(node, viewLevel): boolean
// workspace: filter antes del sync Graph→ReactFlow
const renderableNodes = graph.nodes.filter(n => !C4_NODE_TYPES.has(n.type) || shouldRender(n, activeC4Level))
```

**Schema v4:**  
Migration v3→v4 normaliza docType. `handleSave` usa `CURRENT_SCHEMA_VERSION` importado — cambios de versión son automáticos en todos los saves.

**Build:** ✅

---

## 4. Inventario de archivos — estado actual

### Core modules (`app/uniflux/core/`)

| Archivo | Estado | Responsabilidad |
|---------|--------|----------------|
| `types.ts` | Extendido | `ModeId`, `AnyNodeType`, `C4NodeType`, `SystemModel`, `GraphAnalysis`, edge contracts |
| `modes.ts` | **NUEVO** | `DiagramMode`, `MODE_REGISTRY`, `getMode()` |
| `migrations.ts` | **NUEVO** | Pipeline de migraciones v1→v4, `CURRENT_SCHEMA_VERSION = 4` |
| `visibility.ts` | **NUEVO** | `getNodeVisibility`, `getEdgeVisibility`, `shouldRender`, `getAIVisibleGraph` |
| `systemModel.ts` | **NUEVO** | `graphToSystemModel`, `systemModelToGraph`, `systemModelToPromptContext` |
| `analysis.ts` | **NUEVO** | `analyzeGraph`, `findOrphans`, `detectCycles`, `findSinglePointsOfFailure`, `findCriticalPaths`, `analysisToInsights` |
| `validator.ts` | Extendido | C4 rules C4-001 a C4-007, 3 severidades |

### UI Components

| Archivo | Estado |
|---------|--------|
| `UnifluxWorkspace.tsx` | Modificado (quirúrgico) — registro C4, `shouldRender`, `migrateGraph`, `liveGraph` con AI filtering |
| `UnifluxC4Palette.tsx` | **NUEVO** |
| `UnifluxC4NodeEditor.tsx` | **NUEVO** |
| `UnifluxC4Templates.tsx` | **NUEVO** |
| `nodes/UnifluxC4PersonNode.tsx` | **NUEVO** |
| `nodes/UnifluxC4SystemNode.tsx` | **NUEVO** |
| `nodes/UnifluxC4ContainerNode.tsx` | **NUEVO** |
| `nodes/UnifluxC4ComponentNode.tsx` | **NUEVO** |
| `nodes/UnifluxC4BoundaryNode.tsx` | **NUEVO** |

### Archivos intactos (críticos — NO TOCAR)

```
components/uniflux/UnifluxMermaidEditor.tsx
components/uniflux/UnifluxNodePalette.tsx
components/uniflux/UnifluxNodeEditor.tsx
components/uniflux/UnifluxToolbar.tsx
components/uniflux/nodes/UnifluxEnvironmentNode.tsx
app/uniflux/core/mermaidToVisual.ts
app/actions/uniflux.ts
app/actions/uniflux-ai.ts
```

---

## 5. Deuda técnica — estado actual

### Completada (4 rounds)

| Item | Versión |
|------|---------|
| Tipos C4 + nodos custom | v2 |
| Paleta C4 con filtro por nivel | v2 |
| Panel de propiedades C4 | v2 |
| 5 plantillas C4 | v2 |
| AI generativa C4 (Cloud Function) | v2 |
| Typed edges (`C4RelationshipType`) | v3 |
| Zoom semántico con opacidad por nivel | v3 |
| Validación progresiva (error/warning/info) | v3 |
| Schema versioning (`schemaVersion`) | v3 |
| Mode Registry (`modes.ts`) | v3 |
| Schema migrations pipeline | v3 |
| Computed visibility module | v3 |
| `migrateGraph` en load | v3 |
| `schemaVersion` en save | v3 |
| AI context filtering por nivel activo | v3 |
| Mode-aware wizard prompt | v3 |
| `ModeId` type-safe + exhaustive registry | v4 |
| Edge as contract (`dataShape/payload/sla`) | v4 |
| `SystemModel` + converters | v4 |
| Graph Intelligence Layer (`analysis.ts`) | v4 |
| `shouldRender` render optimization | v4 |
| `CURRENT_SCHEMA_VERSION` dinámico | v4 |

### Pendiente — priorizado

| Item | Descripción | Prioridad |
|------|-------------|-----------|
| **Cloud Function 2-phase AI pipeline** | Phase 1: `prompt → SystemModel (JSON)`. Phase 2: `systemModelToGraph()`. Los converters en `systemModel.ts` ya están listos — solo falta actualizar la Cloud Function `uniflux.ts`. Mejora radical la calidad de layouts generados por IA. | 🔴 Alta |
| **Edge UI para campos de contrato** | `direction`, `frequency`, `criticality`, `dataShape`, `payload`, `sla` están en `FlowEdge` y Firestore pero el editor inline no los expone. Requiere ampliar el panel de edición de aristas en modo C4. | 🟡 Media |
| **Panel de Insights** | `analyzeGraph()` y `analysisToInsights()` están listos en `analysis.ts`. Falta un componente UI (sidebar panel o badge en toolbar) que los muestre al usuario. | 🟡 Media |
| **Export C4** | React Flow soporta `toSvg/toPng`. `graphToSystemModel()` + `systemModelToPromptContext()` habilitan export adicional a PlantUML o Structurizr DSL. | 🟡 Media |
| **Validación server-side en save** | `saveFlowDraft` no valida antes de persistir. Un documento con C4-002 (L1 sin SYSTEM) puede guardarse silenciosamente. Mover validación de errores al server action. | 🟡 Media |
| **Auto-persist migration en load** | Actualmente `migrateGraph` corre solo en cliente en `handleLoadFlow`. Para eliminar legacy docs progresivamente, `getFlow` server action podría re-save documentos migrados. | 🟢 Baja |
| **C4 Level L4 (Code)** | Solo L1-L3 implementados. `C4Component` en `SystemModel` ya puede tener `containerId`. Falta el tipo de nodo `C4_CLASS`/`C4_CODE`. | 🟢 Baja |

---

## 6. Esquema de datos Firestore — `uniflux_flows`

Sin cambios destructivos. El schema es aditivo — documentos antiguos siguen cargando y se auto-migran en memoria.

Campos nuevos relevantes en cada documento:
```json
{
  "docType": "c4",
  "schemaVersion": 4,
  "c4Level": 2,
  "nodes": [
    {
      "type": "C4_CONTAINER_API",
      "technology": "Next.js 15 / Node",
      "description": "Gestiona autenticación y lógica de negocio",
      "external": false,
      "c4Level": 2
    }
  ],
  "edges": [
    {
      "c4RelType": "sync",
      "protocol": "HTTPS/JSON",
      "c4Description": "Consulta disponibilidad",
      "dataShape": "request-response",
      "payload": "AvailabilityQuery{date, slots}",
      "sla": "<100ms P95"
    }
  ]
}
```

---

## 7. Decisiones de diseño clave (para contexto de mantenimiento)

| Decisión | Por qué |
|----------|---------|
| **Estrategia aditiva** en lugar de reemplazar tipos de nodo | Migración forzada de flujos existentes + riesgo de regresión en workflows de producción |
| **C4_SYSTEM y C4_SYSTEM_EXT comparten el mismo React Flow component type** | Un único componente `C4_SYSTEM` con `data.external` diferenciando el color reduce el registro de tipos y centraliza la lógica |
| **Reglas C4 son warnings/info, no errores duros** | Un C4 en construcción es un documento válido — a diferencia de un flujo de proceso, un L1 sin descriptions no es un bug |
| **`migrateGraph` en cliente, no en servidor** | Permite migración lazy sin afectar Firestore hasta el siguiente save explícito. Facilita rollback |
| **`SystemModel` como capa intermedia** | Desacopla la representación visual del modelo lógico. Habilita el pipeline 2-fases de IA y futuros exports a PlantUML/Structurizr |
| **`analysis.ts` sin deps React** | Módulo 100% testeable en Node.js. Puede usarse tanto en UI (panel de insights) como en Cloud Functions (enriquecer prompts) |

---

## 8. Testing manual — checklist para el deploy del fin de semana

### Regresión Visual Flow
- [ ] Crear flujo visual nuevo con START/STATE/TERMINAL → valida correctamente
- [ ] Cargar flujo visual existente → renderiza igual que antes
- [ ] AI en modo visual → genera nodos con tipos originales

### Regresión Mermaid
- [ ] Abrir diagrama Mermaid existente → preview funciona
- [ ] Editar código → preview actualiza en tiempo real

### Modo C4
- [ ] Crear diagrama C4 nuevo → aparece con badge L1
- [ ] Cambiar L1→L2→L3 → opacidad de nodos cambia correctamente
- [ ] Doble-click en nodo C4 → aparece `UnifluxC4NodeEditor` (no el editor de Visual Flow)
- [ ] Seleccionar tipo C4_BOUNDARY → aparece toggle "Bloquear"
- [ ] Guardar y recargar → `c4Level` y propiedades persisten
- [ ] IA en modo C4 L2 → genera containers con `technology` y `description`
- [ ] IA en modo C4 L1 → genera personas y sistemas (no containers)
- [ ] Cargar diagrama legacy (sin `schemaVersion`) → se migra y funciona
- [ ] Plantillas → "📐 Plantillas C4" abre modal con 5 opciones
- [ ] Validador C4 → C4-002 bloquea si L1 no tiene SYSTEM; C4-003 es solo warning

### Schema migration
- [ ] Documento sin `docType` → se asume `'visual'` al cargar
- [ ] Documento con `schemaVersion: 2` → se migra a v4 en carga
- [ ] Guardar después de migrar → `schemaVersion: 4` en Firestore

---

*Informe generado: 2026-04-17. Próxima actualización prevista: post-deploy semana del 2026-04-21.*
