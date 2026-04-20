# UniFlux — Módulo C4 Architecture
## Propuesta, Implementación y Resultado

---

## 1. Contexto y Problema

### Estado previo

UniFlux era una herramienta de diseño de flujos con dos modos operativos:

| Modo | Descripción | Estado |
|------|-------------|--------|
| **Visual Flow** | Canvas drag-and-drop con 8 tipos de nodo genéricos | En uso diario |
| **Mermaid DSL** | Editor de código con preview en tiempo real | En uso diario — muy consolidado |

El modo Visual Flow usaba nodos genéricos de proceso (`START`, `OPERATION`, `DECISION`, `STATE`, `TASK`, `ERROR`, `TERMINAL`, `ENVIRONMENT`) pensados para documentar flujos de trabajo y logística, no arquitectura de software.

### Necesidad

El usuario necesitaba documentar arquitecturas de software usando el **modelo C4** (Simon Brown, 2006-2011), que estructura la arquitectura en 4 niveles de abstracción:

| Nivel | Nombre | Audiencia | Contenido |
|-------|--------|-----------|-----------|
| L1 | Context | Todos | Sistema + actores + sistemas externos |
| L2 | Container | Técnicos | Apps, BBDDs, APIs, colas dentro del sistema |
| L3 | Component | Desarrolladores | Módulos y servicios dentro de un container |
| L4 | Code | Dev avanzado | Clases y entidades (generalmente delegado al IDE) |

---

## 2. Decisión de Diseño: Estrategia Aditiva

### Opción A (descartada): Sustitución
Reemplazar los 8 tipos de nodo originales por tipos C4. Implicaría:
- Migración forzada de todos los flujos existentes
- Pérdida del Visual Flow y su lógica de validación
- Ruptura de los workflows en producción

### Opción B (elegida): Adición de modo
Añadir `docType: 'c4'` como tercer modo, **paralelo** a los dos existentes, sin modificar ni Visual Flow ni Mermaid.

**Principio rector:** ningún archivo existente se elimina, ningún tipo existente cambia. Todo es aditivo mediante uniones de tipos TypeScript y condicionales de renderizado.

```
UniFlux
├── docType: 'visual'   → Visual Flow (intacto)
├── docType: 'c4'       → C4 Architecture (NUEVO)
└── docType: 'mermaid'  → Mermaid DSL (intacto)
```

---

## 3. Arquitectura de la Solución

### 3.1 Capa de tipos (`app/uniflux/core/types.ts`)

Se mantiene `NodeType` original intacto y se añade `C4NodeType` en paralelo:

```typescript
// Original — no modificado
type NodeType = "START" | "STATE" | "OPERATION" | "TASK" | "DECISION" | "TERMINAL" | "ERROR" | "ENVIRONMENT"

// Nuevo — aditivo
type C4NodeType =
  | "C4_PERSON"           // Actor humano interno o externo
  | "C4_SYSTEM"           // Sistema de software en foco (azul)
  | "C4_SYSTEM_EXT"       // Sistema externo (gris)
  | "C4_CONTAINER_WEB"    // Aplicación web / SPA
  | "C4_CONTAINER_API"    // API / Backend / REST
  | "C4_CONTAINER_DB"     // Base de datos
  | "C4_CONTAINER_QUEUE"  // Cola de mensajes / Event bus
  | "C4_COMPONENT"        // Módulo dentro de un container
  | "C4_BOUNDARY"         // Frontera agrupadora (boundary)

// Unión para compatibilidad total
type AnyNodeType = NodeType | C4NodeType
```

`FlowNode` extiende con campos opcionales (no rompen nodos existentes):

```typescript
interface FlowNode {
  // ...campos originales intactos
  type: AnyNodeType       // antes: NodeType
  technology?: string     // "PostgreSQL 16", "Next.js 15"
  description?: string    // responsabilidad del elemento
  external?: boolean      // está fuera del boundary del sistema
  c4Level?: 1 | 2 | 3 | 4
}
```

`FlowGraph` añade un valor al discriminador existente:

```typescript
interface FlowGraph {
  // ...campos originales intactos
  docType?: 'visual' | 'mermaid' | 'c4'  // antes: 'visual' | 'mermaid'
  c4Level?: 1 | 2 | 3 | 4
}
```

### 3.2 Componentes de nodo C4

Cinco custom node components para React Flow, cada uno auto-contenido:

| Archivo | Tipo(s) C4 | Visual |
|---------|-----------|--------|
| `UnifluxC4PersonNode.tsx` | C4_PERSON | SVG humanoid + caja azul/gris |
| `UnifluxC4SystemNode.tsx` | C4_SYSTEM, C4_SYSTEM_EXT | Caja redondeada con emoji + badge |
| `UnifluxC4ContainerNode.tsx` | C4_CONTAINER_* | Caja con icono por subtipo + technology pill |
| `UnifluxC4ComponentNode.tsx` | C4_COMPONENT | Caja dashed azul claro |
| `UnifluxC4BoundaryNode.tsx` | C4_BOUNDARY | Contenedor redimensionable con NodeResizer |

**Colores canónicos C4:**
- `#1168BD` — Sistema en foco (azul oscuro)
- `#999999` — Elementos externos (gris)
- `#438DD5` — Containers (azul medio)
- `#85BBF0` — Components (azul claro)

Cada nodo renderiza el formato canónico C4:
```
┌──────────────────────────┐
│  [icono]                 │
│  Nombre del elemento     │
│  [Tipo C4]               │
│  tecnología (pill)       │
│  Descripción (italic)    │
└──────────────────────────┘
```

### 3.3 Paleta (`UnifluxC4Palette.tsx`)

Selector de nivel integrado + elementos filtrados por nivel activo:

```
── Selector de Nivel ────────
[ L1 · Context    ]   ← activo
[ L2 · Container  ]
[ L3 · Component  ]

── Elementos (L1) ───────────
[ 👤 Persona       ]
[ 🖥️ Sistema        ]
[ 🌍 Sist. Externo  ]
[ ⬜ Boundary       ]
```

Al cambiar de nivel, la paleta filtra automáticamente los elementos válidos para ese nivel, guiando al usuario hacia la coherencia C4 sin impedirle nada.

### 3.4 Panel de propiedades (`UnifluxC4NodeEditor.tsx`)

Panel paralelo al original `UnifluxNodeEditor.tsx`. Aparece solo cuando el nodo seleccionado es de tipo C4:

- **Nombre** — label del elemento
- **Tipo C4** — selector con los 9 tipos
- **Tecnología** — con placeholder contextual por tipo (ej. "Ej: PostgreSQL 16" para C4_CONTAINER_DB)
- **Descripción** — textarea para responsabilidad del elemento
- **Externo** — toggle (afecta color del nodo)
- **Bloquear** — solo para C4_BOUNDARY

### 3.5 Orquestador (`UnifluxWorkspace.tsx`)

Cambios quirúrgicos sobre el componente existente:

**Registro de tipos en React Flow:**
```typescript
const nodeTypes = {
  ENVIRONMENT: UnifluxEnvironmentNode,  // original
  C4_PERSON: UnifluxC4PersonNode,       // nuevo
  C4_SYSTEM: UnifluxC4SystemNode,       // nuevo
  C4_CONTAINER: UnifluxC4ContainerNode, // nuevo
  C4_COMPONENT: UnifluxC4ComponentNode, // nuevo
  C4_BOUNDARY: UnifluxC4BoundaryNode,   // nuevo
}
```

**Función de mapeo de tipo C4 → React Flow:**
```typescript
function getC4ReactFlowType(c4Type: string): string {
  if (c4Type === 'C4_PERSON') return 'C4_PERSON'
  if (c4Type === 'C4_SYSTEM' || c4Type === 'C4_SYSTEM_EXT') return 'C4_SYSTEM'
  if (C4_CONTAINER_TYPES.has(c4Type)) return 'C4_CONTAINER'
  if (c4Type === 'C4_COMPONENT') return 'C4_COMPONENT'
  if (c4Type === 'C4_BOUNDARY') return 'C4_BOUNDARY'
}
```

Esto permite que múltiples C4NodeTypes (ej. C4_SYSTEM y C4_SYSTEM_EXT) compartan el mismo custom component y lo diferencien internamente via `data.external`.

**Renderizado condicional** — todo el canvas se bifurca por `docType`:
```
docType === 'mermaid'  → UnifluxMermaidEditor (sin cambios)
docType === 'c4'       → React Flow + UnifluxC4Palette + UnifluxC4NodeEditor
docType === 'visual'   → React Flow + UnifluxNodePalette + UnifluxNodeEditor
```

**Badge de nivel en header:**
```
[ NombreDelDiagrama ✏ ]  [ L1 ] [ L2 ] [ L3 ]
```
Los botones L1/L2/L3 son clickables, sincronizan `activeC4Level` y persisten `graph.c4Level` para que se guarde en Firestore.

### 3.6 Validador (`validator.ts` + `uniflux_validator.ts`)

El validador enruta por `docType`:

```typescript
static validate(graph: FlowGraph): ValidationResult {
  if (graph.docType === 'c4') {
    // Reglas C4 — todas warnings, no hard errors
    this.checkC4_001_EmptyDiagram(graph, errors)
    this.checkC4_002_ContainerTechnology(graph, errors)
    this.checkC4_003_OrphanNodes(graph, errors)
    this.checkC4_004_LevelCoherence(graph, errors)
    this.checkC4_005_MissingDescriptions(graph, errors)
  } else {
    // Reglas visuales originales E001-E007 — intactas
    this.checkE001_UniqueStart(graph, errors)
    // ...
  }
}
```

| Regla | Condición | Severidad |
|-------|-----------|-----------|
| C4-001 | Diagrama sin elementos | warning |
| C4-002 | Container sin campo `technology` | warning |
| C4-003 | Nodo sin conexiones (si hay edges) | warning |
| C4-004 | Tipo de nodo incoherente con el nivel | warning |
| C4-005 | System/Container sin `description` | warning |

Decisión deliberada: C4 no tiene errores bloqueantes porque los diagramas se construyen incrementalmente. Un L1 a medio construir sigue siendo un documento válido.

### 3.7 AI Generation (`functions/src/uniflux.ts`)

La Cloud Function detecta el modo por `currentGraph.docType` y construye un system prompt diferente:

**Prompt Visual Flow (original, intacto):**
```
You are the UNIFLUX SEMANTIC COMPILER.
NodeType: "START", "STATE", "OPERATION", "TASK", "DECISION", "TERMINAL"
Rules: E001-E004...
```

**Prompt C4 (nuevo):**
```
You are a C4 ARCHITECTURE COMPILER.
CURRENT DIAGRAM LEVEL: L2 Container — apps, databases, services.
C4NodeType: "C4_PERSON" | "C4_SYSTEM" | "C4_CONTAINER_WEB" | ...
Rules:
- ALWAYS fill technology for C4_CONTAINER_* nodes
- Fill description for SYSTEM and CONTAINER nodes
- Edges represent calls — label with protocol (HTTPS/JSON, SQL queries...)
- Layout: actors left (x:0-150), core center (x:300-700), external right (x:900+)
- MUST include docType: "c4" and c4Level: 2 in FlowGraph root
```

El wizard también adapta su UI, placeholder y botón según `docType === 'c4'`.

---

## 4. Resultado Final

### Flujo de usuario — Crear diagrama C4

1. Abrir sidebar → click **"Nuevo Diagrama C4"**
2. El wizard aparece con contexto C4 y nivel activo
3. Escribir descripción en lenguaje natural → **"Generar Diagrama C4"**
4. La IA genera nodos C4 con technology y description pre-rellenados
5. Refinar manualmente: arrastrar nodos, doble-click para editar propiedades
6. Cambiar nivel con los badges L1/L2/L3 del header o la paleta
7. Guardar → Firestore persiste `docType: 'c4'`, `c4Level`, y todos los campos C4

### Flujo de usuario — Editar nodo C4

Doble-click sobre cualquier nodo → panel `UnifluxC4NodeEditor` con:
- Tipo C4 (cambia visual en tiempo real)
- Tecnología con hint contextual
- Descripción de responsabilidad
- Toggle externo (cambia color azul ↔ gris)
- Bloquear (solo en C4_BOUNDARY)

### Compatibilidad con flujos existentes

Todos los flujos existentes siguen funcionando exactamente igual:
- Visual flows cargan y renderizan con los 8 tipos originales
- Mermaid flows no se tocan en absoluto
- El validador aplica las reglas originales E001-E007 si `docType !== 'c4'`

### Persistencia en Firestore

El schema de `uniflux_flows` no cambia — los nuevos campos (`technology`, `description`, `external`, `c4Level`) son aditivos. Firestore acepta el superset sin migración.

---

---

## 5. Alternativas analizadas

### Alternativa 1: Librería dedicada (Structurizr, Mermaid C4)
Usar una librería existente de C4 en lugar de implementar los componentes.

**Ventajas:** Menos código, estándares de la industria.
**Desventajas:** Rompe la integración con Firestore, la IA generativa, el undo/redo y el sistema de permisos. No se integra con el modelo de datos de UniTask.
**Veredcito:** Descartada — el valor diferencial de UniFlux es la integración profunda con el ecosistema.

### Alternativa 2: Diagrama Mermaid C4
Mermaid soporta sintaxis C4 experimental (`C4Context`, `C4Container`).

**Ventajas:** Zero código nuevo, funciona con el editor Mermaid existente.
**Desventajas:** Sintaxis experimental no estable, editor de texto puro (sin drag-and-drop), sin AI generativa C4, sin propiedades enriquecidas (technology, description).
**Veredicto:** Válida para casos simples. El usuario ya usa Mermaid intensivamente; el modo C4 visual añade una dimensión diferente.

### Alternativa 3: Sustitución total de Visual Flow
Reemplazar los 8 tipos genéricos por tipos C4 más un modo "legacy".

**Ventajas:** Simplifica el codebase a largo plazo.
**Desventajas:** Migración de datos, riesgo de regresión, pérdida de los flujos de proceso (que tienen semántica distinta a la arquitectura).
**Veredicto:** Descartada — Visual Flow y C4 son para casos de uso radicalmente distintos (proceso vs. arquitectura).

### Alternativa 4: Aplicación separada
Herramienta C4 como módulo independiente en UniTask.

**Ventajas:** Separación de concerns total, UI optimizada.
**Desventajas:** Duplica infraestructura (Firestore schema, AI, auth, proyectos). El usuario pierde la experiencia unificada de tener flujos y arquitectura en el mismo contexto de proyecto.
**Veredicto:** Descartada — la unificación bajo un proyecto UniTask es el valor real.

---

## 6. Segunda iteración — Mejoras (Round 1, 2026-04-16)

### 6.1 Typed Edges (`C4RelationshipType`)

```typescript
type C4RelationshipType = 'sync' | 'async' | 'event' | 'database' | 'external'

interface FlowEdge {
  c4RelType?: C4RelationshipType
  protocol?: string      // "HTTPS/JSON", "SQL", "gRPC"
  c4Description?: string // qué hace la llamada
}
```

El editor de aristas en modo C4 muestra selector de tipo + campo de protocolo. El canvas aplica estilos visuales distintos:
- `sync` → línea continua azul
- `async` → línea discontinua azul
- `event` → línea punteada ámbar, animada
- `database` → línea continua verde
- `external` → línea gris clara discontinua

### 6.2 Zoom semántico C4 (multi-level real)

Cada nodo lleva `c4Level` (su nivel natural: 1=Context, 2=Container, 3=Component). El canvas filtra por nivel de vista:

- L1 activo → solo C4_PERSON, C4_SYSTEM, C4_SYSTEM_EXT visibles; el resto aparece al 12% de opacidad
- L2 activo → Context nodes + containers visibles
- L3 activo → containers + components visibles

No hay 3 diagramas separados: **hay uno con profundidad**. Las aristas entre nodos de diferentes niveles también se atenúan cuando uno de los extremos está fuera del nivel activo. Transición animada (opacity 0.25s) al cambiar nivel.

### 6.3 Validación progresiva

`ValidationSeverity = 'error' | 'warning' | 'info'`

| Código | Condición | Severidad |
|--------|-----------|-----------|
| C4-001 | Diagrama vacío | warning |
| C4-002 | L1 sin SOFTWARE_SYSTEM | **error** |
| C4-003 | Container sin technology | warning |
| C4-004 | Nodo sin conexiones | warning |
| C4-005 | Tipo incoherente con nivel | warning |
| C4-006 | Sin description | **info** |
| C4-007 | Container desconectado en L2 | **error** |

Las reglas de `error` bloquean validación. Las de `info` son puramente informativas, nunca bloquean.

### 6.4 Schema versioning

```typescript
interface FlowGraph {
  schemaVersion?: number  // 3 = typed edges + multi-level + progressive validation
}
```

Nuevos diagramas C4 se crean con `schemaVersion: 3`. Permite detectar y migrar diagramas de versiones anteriores.

### 6.5 C4 Templates

5 plantillas incluidas en `UnifluxC4Templates.tsx`:

| Template | Nivel | Descripción |
|----------|-------|-------------|
| Web App L1 | L1 | SPA + API + Email + Pagos |
| Web App L2 | L2 | SPA + API + DB + Cache + Queue |
| Microservicios | L2 | Gateway + 3 servicios + Kafka |
| Event-Driven | L2 | Productores → Bus → Consumidores |
| Monolito | L2 | Frontend + Monolito + DB + Redis |

Accesible desde el botón "📐 Plantillas C4" en la paleta. Los nodos de la plantilla tienen `technology` y `description` pre-rellenados. La IA puede partir desde una plantilla aplicada.

---

## 7. Decisiones técnicas destacadas (acumuladas)

### Por qué `AnyNodeType = NodeType | C4NodeType` en lugar de un solo enum
Permite que TypeScript discrimine en tiempo de compilación qué campos son relevantes para cada tipo. Los campos C4 (`technology`, `description`, `external`) solo existen en C4NodeType en el editor, evitando que aparezcan en el panel de Visual Flow.

### Por qué C4_SYSTEM y C4_SYSTEM_EXT comparten el mismo React Flow component type
React Flow registra tipos en un objeto estático. Tener un único `C4_SYSTEM` como tipo RF con `data.external` diferenciando el estilo reduce el registro de tipos y centraliza la lógica de color en un solo componente.

### Por qué las reglas C4 son warnings y no errors
Un diagrama C4 en construcción es un documento válido. A diferencia de un flujo de proceso (donde un nodo sin terminal es un bug real), un L1 sin descriptions es simplemente un diagrama incompleto. Las reglas C4 son guías de calidad, no invariantes de integridad.

### Por qué se habilitó la AI toolbar en modo C4
El ciclo AI → validar → corregir que ya funcionaba para Visual Flow es directamente reutilizable para C4 cambiando solo el system prompt. Mantener la misma UX reduce la curva de aprendizaje del usuario.

### Por qué `c4Level` se persiste tanto en el graph como en el estado local
`graph.c4Level` → se guarda en Firestore, sobrevive recargas
`activeC4Level` → controla qué muestra la paleta en la sesión actual
Al cargar un flow C4, se restauran ambos. Al cambiar de nivel, `handleC4LevelChange` actualiza los dos sincrónicamente.

---

## 8. Tercera iteración — Arquitectura de Producto (Round 2, 2026-04-16)

Esta iteración convierte el módulo de un prototipo sofisticado en una plataforma extensible. Tres nuevos módulos de lógica pura más integración completa en el workspace.

### 9.1 Mode Registry (`app/uniflux/core/modes.ts`)

**Problema resuelto:** doctype switch disperso por el workspace. Cada nuevo modo requería cambios en múltiples puntos.

**Solución:** interfaz `DiagramMode` + `MODE_REGISTRY`.

```typescript
interface DiagramMode {
    id: string                                          // 'visual' | 'c4' | 'mermaid'
    label: string
    icon: string
    description: string
    nodeTypes: ReadonlySet<string>                      // tipos válidos para este modo
    validate: (graph: FlowGraph) => ValidationResult   // pura — sin deps React
    buildAIPrompt: (ctx: AIPromptContext) => string     // system instruction para Gemini
    usesCanvas: boolean
    supportsAI: boolean
}

export const MODE_REGISTRY: Record<string, DiagramMode> = {
    visual:  VisualMode,
    c4:      C4Mode,
    mermaid: MermaidMode,
}

export function getMode(docType?: string): DiagramMode
```

`C4_NODE_TYPES` en el workspace pasa de ser una constante local hardcodeada a derivarse del registro:
```typescript
const C4_NODE_TYPES = MODE_REGISTRY['c4'].nodeTypes  // single source of truth
```

Añadir un modo nuevo (BPMN, UML, ER) = crear un objeto `DiagramMode` + registrarlo. Cero cambios en el workspace.

### 9.2 Schema Migration Engine (`app/uniflux/core/migrations.ts`)

**Problema resuelto:** documentos Firestore creados antes del esquema v3 podían cargar sin los campos nuevos, causando comportamientos indefinidos.

**Solución:** pipeline de migraciones incrementales puras.

```typescript
export const CURRENT_SCHEMA_VERSION = 3

const MIGRATIONS: Record<number, MigrationFn> = {
    // v1 → v2: docType discriminator (flujos sin docType = 'visual')
    1: (g) => ({ ...g, docType: g.docType ?? 'visual', schemaVersion: 2 }),

    // v2 → v3: c4Level inferred from node type + typed edges
    2: (g) => ({
        ...g,
        nodes: g.nodes.map(n => ({
            ...n,
            c4Level: n.c4Level ?? C4_NATURAL_LEVEL[n.type] ?? undefined,
        })),
        schemaVersion: 3,
    }),
}

export function migrateGraph(raw: any): any   // aplica v → CURRENT_SCHEMA_VERSION
export function needsMigration(raw: any): boolean
```

Invariante: cada migración es una función pura (sin side-effects). El pipeline es idempotente — llamar `migrateGraph` sobre un documento ya actualizado es un no-op.

**Integración en el workspace** (`handleLoadFlow`):
```typescript
const rawFlowInfo = await getFlow(tenantToUse, flowId)
const flowInfo = needsMigration(rawFlowInfo) ? migrateGraph(rawFlowInfo) : rawFlowInfo
setGraph(flowInfo)
```

Todos los documentos legacy se auto-actualizan en memoria en el momento de carga, sin afectar Firestore hasta el siguiente save explícito.

### 9.3 Computed Visibility Module (`app/uniflux/core/visibility.ts`)

**Problema resuelto:** lógica de opacidad ad-hoc dispersa por el workspace, duplicada entre renderizado de nodos y aristas.

**Solución:** módulo de visibilidad puro con API declarativa.

```typescript
type VisibilityTier = 'full' | 'dimmed' | 'hidden'

export const OPACITY: Record<VisibilityTier, number> = {
    full: 1, dimmed: 0.12, hidden: 0,
}

// Reglas canónicas:
// - C4_BOUNDARY → siempre 'full' (contexto siempre visible)
// - Nodos no-C4 → siempre 'full'
// - Nodos C4: 'full' si naturalLevel <= viewLevel, 'dimmed' si no
export function getNodeVisibility(node: FlowNode, viewLevel: number): VisibilityTier

// Una arista es dimmed si cualquiera de sus extremos es dimmed
export function getEdgeVisibility(edge, nodeMap, viewLevel): VisibilityTier

// Helpers para export, layout y contexto AI
export function partitionNodes(nodes, viewLevel): { visible, dimmed, hidden }
export function buildNodeMap(nodes): Map<string, FlowNode>
export function getAIVisibleGraph(nodes, edges, viewLevel): { nodes, edges }
```

El workspace ya no calcula opacidades inline. El sync `useEffect` Graph→ReactFlow usa:

```typescript
const nodeMap = buildNodeMap(graph.nodes)
// Para cada nodo:
const visTier = isC4 ? getNodeVisibility(n, activeC4Level) : 'full'
const opacity = n.isLocked ? 0.8 : OPACITY[visTier]
// Para cada arista:
const edgeVisTier = isC4Edge ? getEdgeVisibility(e, nodeMap, activeC4Level) : 'full'
```

### 9.4 Richer Edge Semantics

```typescript
interface FlowEdge {
    // ...campos anteriores
    direction?: 'uni' | 'bi'                          // A→B vs A↔B
    frequency?: 'sync' | 'eventual' | 'batch'         // cuándo ocurre
    criticality?: 'low' | 'medium' | 'high'           // impacto de fallo
}
```

Estos campos están en los tipos y en Firestore pero aún no tienen UI en el editor de aristas — marcados como deuda técnica planificada (ver §10).

### 9.5 AI Context Filtering — `liveGraph` con `getAIVisibleGraph`

**Problema resuelto:** en modo C4, el `liveGraph` pasado al toolbar de IA incluía todos los nodos independientemente del nivel de vista activo. La IA recibía contexto mezclado de L1+L2+L3 simultáneamente.

**Solución:** `liveGraph` useMemo usa `getAIVisibleGraph` en modo C4:

```typescript
const liveGraph = useMemo<FlowGraph>(() => {
    const allNodes = nodes.map(/* serializar RF→FlowNode */)
    const allEdges = edges.map(/* serializar RF→FlowEdge */)

    const { nodes: visibleNodes, edges: visibleEdges } = graph.docType === 'c4'
        ? getAIVisibleGraph(allNodes, allEdges, activeC4Level)
        : { nodes: allNodes, edges: allEdges }

    return { ...graph, nodes: visibleNodes, edges: visibleEdges }
}, [graph, nodes, edges, activeC4Level])
```

La IA solo recibe el subgrafo visible en el nivel activo — no confunde sistemas de L1 con containers de L2 en el mismo prompt.

### 9.6 Schema Version Stamping en `handleSave`

Cada save (visual, C4 y mermaid) estampa `schemaVersion: 3`:

```typescript
finalGraph = {
    ...graph,
    nodes: updatedGraphNodes,
    edges: updatedGraphEdges,
    schemaVersion: 3,   // ← nuevo
}
```

Garantiza que los documentos post-esta-versión siempre tienen versión conocida, haciendo `needsMigration()` inequívoco en cargas futuras.

### 9.7 Mode-Aware Wizard Prompt

**Problema resuelto:** `handleWizardSubmit` enviaba una frase genérica de "Create an initial data flow between these systems" — texto correcto para Visual Flow pero semánticamente incorrecto para C4 (un diagrama C4 es arquitectura, no flujo de datos).

**Solución:**

```typescript
const mode = getMode(graph.docType)
const prompt = mode.id === 'c4'
    ? wizardInput                                     // pasa descripción directa
    : `Describe the initial data flow: ${wizardInput}. Create nodes...`
```

La Cloud Function ya enruta por `currentGraph.docType` para construir el system instruction correcto (C4 vs visual). El usuario sigue viendo el mismo wizard; la diferencia está en cómo se envuelve su input antes de llegar a Gemini.

---

## 9. Cuarta iteración — UniFlux Core v4 (Round 3, 2026-04-16)

Esta iteración introduce la capa semántica que convierte UniFlux de editor visual en **runtime de modelos de sistema**.

### 9.1 ModeId — type safety sobre docType

**Problema:** `docType` era `'visual' | 'mermaid' | 'c4'` en types.ts y `Record<string, DiagramMode>` en modes.ts. Nada garantizaba que ambos estuvieran sincronizados.

**Solución:**

```typescript
// types.ts
export type ModeId = 'visual' | 'c4' | 'mermaid';

interface FlowGraph {
    docType?: ModeId;  // antes: 'visual' | 'mermaid' | 'c4' (literal repetido)
}
```

```typescript
// modes.ts — compile-time exhaustive check
type _ExhaustiveModeCheck = Record<ModeId, DiagramMode>;
export const MODE_REGISTRY: _ExhaustiveModeCheck = { visual, c4, mermaid };
```

Si `ModeId` gana un nuevo valor (`'bpmn'`) y no se añade a `MODE_REGISTRY`, TypeScript falla en compilación — no en runtime.

`getMode()` usa un cast seguro `Record<string, DiagramMode>` para el lookup dinámico sin perder la exhaustividad en el registro.

### 9.2 Edge as Contract — `dataShape`, `payload`, `sla`

```typescript
interface FlowEdge {
    // Campos anteriores (V5)...
    dataShape?: 'request-response' | 'event' | 'stream'; // patrón de interacción
    payload?: string;  // "OrderEvent{orderId, items, total}"
    sla?: string;      // "<200ms P99", "eventually consistent"
}
```

Un edge con estos tres campos es un **contrato de sistema** completo: qué tipo de interacción, qué datos viajan, qué garantía de tiempo. Los campos son opcionales y aditivos — no requieren migración de datos existentes.

### 9.3 SystemModel — capa semántica intermedia (`app/uniflux/core/systemModel.ts`)

**Problema:** IA genera `FlowGraph` directamente. Esto acopla la representación visual con el modelo lógico, haciendo difícil cambiar el layout sin regenerar, o exportar a otros formatos.

**Solución:** interfaz `SystemModel` como representación canónica intermedia.

```typescript
interface SystemModel {
    actors:     C4Actor[]      // { id, name, description, external }
    systems:    C4System[]     // { id, name, technology, description, external, boundaryId }
    containers: C4Container[]  // { id, name, technology, description, systemId, containerType }
    components: C4Component[]  // { id, name, technology, description, containerId }
    relations:  C4Relation[]   // { id, fromId, toId, relType, protocol, dataShape, payload, sla }
}
```

**Converters puros:**

```typescript
graphToSystemModel(graph: FlowGraph): SystemModel
systemModelToGraph(model: SystemModel, c4Level: C4LevelValue, base?): FlowGraph
systemModelToPromptContext(model: SystemModel): string  // para prompts AI
```

Esto prepara el terreno para el pipeline 2-fases de IA (ver §10 deuda técnica).

**Nota sobre jerarquía:** `parentId` ya existía en `FlowNode` desde V1 (usado por ENVIRONMENT y C4_BOUNDARY). `SystemModel` formaliza la semántica: `C4System.boundaryId`, `C4Container.systemId`, `C4Component.containerId` mapean directamente a `parentId` en el FlowGraph.

### 9.4 Graph Intelligence Layer (`app/uniflux/core/analysis.ts`)

Módulo de algoritmos de grafos puros. API declarativa:

```typescript
findOrphans(nodes, edges): FlowNode[]
detectCycles(nodes, edges): string[][]
findCriticalPaths(nodes, edges): string[][]
findSinglePointsOfFailure(nodes, edges): FlowNode[]
findDisconnectedComponents(nodes, edges): string[][]
computeDensity(nodeCount, edgeCount): number

// Pipeline completo
analyzeGraph(nodes, edges): GraphAnalysis

// Insights legibles para panel o prompt AI
analysisToInsights(analysis, nodeMap): string[]
```

`GraphAnalysis`:
```typescript
interface GraphAnalysis {
    orphanNodeIds: string[]
    cycles: string[][]
    criticalPaths: string[][]             // hasta 3 rutas más largas
    singlePointsOfFailure: string[]       // articulation points
    disconnectedComponents: string[][]
    maxDepth: number                      // longitud de la ruta crítica más larga
    density: number                       // 0→1, edges / n*(n-1)
}
```

Complejidades: O(V+E) para orphans/components, O(V²) para SPOF, O(V+E) para critical paths vía topological sort.

`analysisToInsights` produce mensajes listos para UI — útil para un futuro panel de insights o para enriquecer el contexto de la IA.

### 9.5 `shouldRender` — render optimization

```typescript
// visibility.ts
export function shouldRender(node: FlowNode, viewLevel: number): boolean {
    return getNodeVisibility(node, viewLevel) !== 'hidden';
}
```

Aplicado en el workspace antes del sync Graph→ReactFlow:

```typescript
const renderableNodes = graph.nodes.filter(n =>
    !C4_NODE_TYPES.has(n.type) || shouldRender(n, activeC4Level)
);
const rfNodes: Node[] = renderableNodes.map(n => { ... })
```

Actualmente `hidden` no lo devuelve ningún tipo de nodo (el tier más bajo es `dimmed`), pero el filtro está listo para cuando se añadan nodos que deban desaparecer completamente a ciertos niveles (ej. L4 code-level nodes en una vista L1).

### 9.6 Schema v4 — `CURRENT_SCHEMA_VERSION = 4`

Migration v3→v4:
```typescript
3: (g) => ({
    ...g,
    // Normalise any legacy docType to the canonical ModeId set
    docType: (['visual', 'c4', 'mermaid']).includes(g.docType) ? g.docType : 'visual',
    schemaVersion: 4,
})
```

`handleSave` ya no hardcodea `schemaVersion: 3` — usa `CURRENT_SCHEMA_VERSION` importado de migrations.ts. Cambios de versión son automáticamente reflejados en todos los saves.

---

## 10. Deuda técnica planificada

> **Actualizado 2026-04-17** — Deploy previsto este fin de semana (2026-04-19/20).

### Completada (4 rounds, todos en producción tras deploy)

| Item | Versión |
|------|---------|
| Tipos C4 + nodos custom (9 tipos) | v2 |
| Paleta C4 con filtro por nivel activo | v2 |
| Panel de propiedades C4 (`UnifluxC4NodeEditor`) | v2 |
| 5 plantillas C4 | v2 |
| AI generativa C4 (Cloud Function, system prompt C4) | v2 |
| Typed edges (`C4RelationshipType`) | v3 |
| Zoom semántico con opacidad por nivel | v3 |
| Validación progresiva (error/warning/info) | v3 |
| Schema versioning (`schemaVersion`) | v3 |
| Mode Registry (`modes.ts`) | v3 |
| Schema migrations pipeline (`migrations.ts`) | v3 |
| Computed visibility module (`visibility.ts`) | v3 |
| `handleLoadFlow` con `migrateGraph` | v3 |
| `handleSave` estampa `schemaVersion` | v3 |
| AI context filtering por nivel activo | v3 |
| Mode-aware wizard prompt | v3 |
| `ModeId` type-safe + exhaustive registry | v4 |
| Edge as contract (`dataShape/payload/sla`) | v4 |
| `SystemModel` + converters (`systemModel.ts`) | v4 |
| Graph Intelligence Layer (`analysis.ts`) | v4 |
| `shouldRender` render optimization | v4 |
| `CURRENT_SCHEMA_VERSION` dinámico en migrations | v4 |

### Pendiente — próximas iteraciones

| Item | Descripción | Prioridad |
|------|-------------|-----------|
| **Cloud Function 2-phase AI pipeline** | Phase 1: `prompt → SystemModel (JSON)`. Phase 2: `systemModelToGraph()`. Los converters en `systemModel.ts` ya están listos — solo falta actualizar `functions/src/uniflux.ts`. Mejora significativa en calidad de layouts generados por IA. | 🔴 Alta |
| **Edge UI para campos de contrato** | `direction`, `frequency`, `criticality`, `dataShape`, `payload`, `sla` están en `FlowEdge` y Firestore pero el editor inline no los expone. Requiere ampliar el panel de aristas en modo C4. | 🟡 Media |
| **Panel de Insights** | `analyzeGraph()` + `analysisToInsights()` listos en `analysis.ts`. Falta componente UI (sidebar panel o badge en toolbar). | 🟡 Media |
| **Export C4** | React Flow soporta `toSvg/toPng`. `graphToSystemModel()` + `systemModelToPromptContext()` habilitan export a PlantUML o Structurizr DSL. | 🟡 Media |
| **Validación server-side en save** | `saveFlowDraft` no valida antes de persistir. Un documento con C4-002 puede guardarse silenciosamente. | 🟡 Media |
| **Auto-persist migration en load** | `migrateGraph` corre solo en cliente. Para eliminar legacy docs progresivamente, `getFlow` server action podría re-save documentos migrados. | 🟢 Baja |
| **C4 Level L4 (Code)** | Solo L1-L3. `C4Component` en `SystemModel` ya soporta `containerId`. Falta tipo de nodo `C4_CLASS`. | 🟢 Baja |

---

## 10. Inventario de archivos (estado actual)

### Core modules (`app/uniflux/core/`)

| Archivo | Estado | Qué contiene |
|---------|--------|--------------|
| `types.ts` | Extendido | `ModeId`, `SystemModel`, `GraphAnalysis`, edge contracts |
| `modes.ts` | Extendido | `_ExhaustiveModeCheck`, `MODE_REGISTRY: _ExhaustiveModeCheck` |
| `migrations.ts` | Extendido | v3→v4 migration, `CURRENT_SCHEMA_VERSION = 4` |
| `visibility.ts` | Extendido | `shouldRender()` |
| `validator.ts` | Extendido | C4 rules + progressive validation |
| `systemModel.ts` | **NUEVO** | `graphToSystemModel`, `systemModelToGraph`, `systemModelToPromptContext` |
| `analysis.ts` | **NUEVO** | `analyzeGraph`, `findOrphans`, `detectCycles`, `findSinglePointsOfFailure`, `findCriticalPaths`, `analysisToInsights` |

### UI Components

| Archivo | Estado |
|---------|--------|
| `UnifluxWorkspace.tsx` | Modificado — `shouldRender`, `CURRENT_SCHEMA_VERSION`, imports v4 |
| `UnifluxC4Palette.tsx` | Nuevo |
| `UnifluxC4NodeEditor.tsx` | Nuevo |
| `UnifluxC4Templates.tsx` | Nuevo |
| `nodes/UnifluxC4PersonNode.tsx` | Nuevo |
| `nodes/UnifluxC4SystemNode.tsx` | Nuevo |
| `nodes/UnifluxC4ContainerNode.tsx` | Nuevo |
| `nodes/UnifluxC4ComponentNode.tsx` | Nuevo |
| `nodes/UnifluxC4BoundaryNode.tsx` | Nuevo |

### Intactos (críticos)

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

### Builds verificados

| Round | Schema | Cambios principales | Resultado |
|-------|--------|---------------------|-----------|
| 1 | v2 | Tipos C4, nodos, paleta, editor, templates, AI prompt | ✅ |
| 2 | v3 | Typed edges, semantic zoom, progressive validation | ✅ |
| 3 | v3 | Mode Registry, Migrations, Visibility, AI context filtering | ✅ |
| 4 | v4 | ModeId, SystemModel, analysis.ts, shouldRender, edge contracts | ✅ |
