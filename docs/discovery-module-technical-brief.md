# Módulo "Discovery" (Relevamiento TMS) — Brief técnico para revisión con Gemini

**Fecha**: 2026-07-16 · **Repo**: `UniTask` (rama `main`, nada de esto commiteado todavía) · **Origen**: digitalización de la "Guía de Descubrimiento y Consultoría UNIGIS TMS" (documento Word de 22 secciones que un consultor recorre en un workshop con el cliente).

## 1. Objetivo del módulo y a quién sirve

Un consultor de UNIGIS hace un workshop de descubrimiento con un cliente nuevo (ej. una empresa de transporte). Durante esa sesión necesita: (a) tomar notas libres de lo que dice el cliente, (b) ir resolviendo un cuestionario estructurado de ~90 preguntas repartidas en 22 secciones (flota, operativa, pedidos, planificación, liquidaciones, app de conductor, etc.), y (c) al final tener un informe exportable. Hoy solo están construidas (a) y (b). El objetivo de esta ronda es **pensar cómo hacer que (b) sea realmente útil y rápida de usar en vivo durante una conversación**, no solo funcionalmente correcta.

## 2. Punto de entrada en la app

- Entrada de menú `mode="discovery"` en `AppLayout.tsx` (icono `FileSearch`, desktop + mobile).
- Renderizado desde `DailyFollowUp.tsx` → dashboard de selección de proyecto (reutiliza `ProjectMonitoringDashboard`) → al elegir proyecto, monta `DiscoveryContainer`.
- **Esto es una herramienta nueva y separada** de otro módulo preexistente con nombre parecido (`components/relevamiento/RelevamientoTool.tsx`, `mode="relevamiento"`) que es un formulario simple de un solo doc Firestore. No se tocan entre sí.

## 3. Árbol de componentes y responsabilidad de cada uno

```
DiscoveryContainer.tsx          — resuelve template del tenant, auto-instancia el discovery del
                                   proyecto la primera vez, carga notas iniciales de Unileaks.
  └─ SplitScreenDiscoveryUI.tsx — shell: layout de dos paneles + estado compartido de selección
                                   de texto (para el flujo "copiar de una nota a una respuesta").
       ├─ DiscoveryNotesPanel.tsx      — panel izquierdo: Unileaks embebido y scopeado al proyecto
       │                                  (no la página /unileaks completa).
       └─ DiscoveryQuestionnaire.tsx   — panel derecho: navegación de 22 secciones + campos editables.
```

Archivos de datos:
```
types/relevamiento.ts   — tipos: DiscoveryTemplate, DiscoverySection, DiscoveryField,
                           DiscoveryTableRow, ProjectDiscoveryInstance, DiscoveryResponses,
                           DiscoveryResponseValue, DiscoverySectionMeta, NoteLink.
lib/discovery.ts         — CRUD contra Firestore (ver §4).
lib/discoveryImporter.ts — import de Excel (modo tabla y modo escalar legacy).
scripts/seed_discovery_template.js — semilla real: 22 secciones, 90 campos, 20 de tipo 'table'.
```

## 4. Modelo de datos (Firestore)

```
tenants/{tenantId}/discoveryTemplates/{templateId}
  → DiscoveryTemplate { sections: DiscoverySection[], version, isActive }
  Editable por admins/superadmin. Es la plantilla BASE, versionada, compartida por todo el tenant.

tenants/{tenantId}/projects/{projectId}/discovery/instance
  → ProjectDiscoveryInstance { sections: DiscoverySection[] (snapshot editable de la plantilla),
                                status, progress, templateVersion }
  Se crea una vez por proyecto (instantiateProjectDiscovery), copia la estructura de la plantilla.
  El campo `progress` existe en el tipo pero NUNCA se persiste — el progreso real se calcula
  100% en cliente (DiscoveryQuestionnaire.tsx) en cada carga, no hay caché servidor.

tenants/{tenantId}/projects/{projectId}/discovery/responses_{sectionId}
  → DiscoveryResponses { [fieldId]: DiscoveryResponseValue, _meta?: DiscoverySectionMeta }
  Un doc POR SECCIÓN (no uno global) — evita que 22 secciones se lean/escriban en un solo doc.
  DiscoveryResponseValue.status: 'empty' | 'filled' | 'conflict' | 'verified' | 'not_applicable'
    ('conflict'/'verified' están en el tipo desde el diseño original pero NINGÚN código los
    escribe todavía — son terreno fértil para "IA detecta 2 respuestas contradictorias").
  DiscoverySectionMeta = { notApplicable: boolean } bajo la key reservada `_meta` del mismo doc.

tenants/{tenantId}/noteLinks/{id}
  → NoteLink { noteId, entity: { type:'project_discovery', id:projectId, sectionId, fieldId } }
  Se crea cada vez que se usa "Asignar" para pegar texto de una nota Unileaks en una respuesta.
  HOY es solo de escritura — nada lee noteLinks todavía para, por ejemplo, mostrar en un campo
  "esta respuesta viene de la nota X, línea Y" o para ir de una respuesta a la nota origen.

unileaks_notes / unileaks_folders (colecciones raíz, no anidadas bajo discovery)
  → reutilizadas tal cual del módulo Unileaks general, filtradas por projectId en cliente.
```

**Por qué un doc por sección** (`responses_{sectionId}`): permite lecturas/escrituras baratas por
sección sin traer las 22 de golpe en el camino caliente de "abrir una sección y editar". El coste
es que pintar el progreso de las 22 secciones en el sidebar necesita 22 reads sueltos al montar
(`getAllSectionsResponses`, `Promise.all`) — aceptable una vez por apertura de proyecto, no en loop.

## 5. Tipos de campo y cómo se editan hoy

| type          | cuántos | edición actual                                                            |
|---------------|---------|----------------------------------------------------------------------------|
| `text`        | 128     | input libre, guardado con debounce 600ms                                   |
| `number`      | 8       | igual que text, `type="number"`                                            |
| `boolean`     | 14      | dos botones Sí/No, guardado inmediato                                      |
| `select`      | 5       | input libre + `<datalist>` con las opciones de la plantilla como sugerencia (ya NO es un `<select>` cerrado — cambio reciente, ver §7) |
| `multiselect` | 6       | tag input: chips del valor actual (borrables) + sugerencias de la plantilla + campo libre para añadir cualquier texto, guardado inmediato |
| `table`       | 20      | solo-lectura + import Excel (mapeo columna→columna) **o** alta manual fila a fila (formulario con un input por columna, añadida esta sesión) + borrar fila individual |

**Guardado**: `updateFieldResponse()` sobrescribe TODO el valor del campo (última escritura gana,
sin merge). Para `table`, en cambio, `appendTableRow()` usa `arrayUnion` del servidor — dos
consultores añadiendo filas a la vez no se pisan. Esta asimetría es deliberada (ver comentarios en
`lib/discovery.ts`) pero significa que dos personas editando el MISMO campo de texto a la vez sí se
pisan silenciosamente (no hay lock ni merge ni aviso de conflicto).

## 6. Flujo "copiar de una nota a una respuesta" (el gancho central del módulo)

1. El consultor abre/crea una nota de Unileaks en el panel izquierdo mientras habla con el cliente.
2. Selecciona un fragmento de texto con el ratón (evento `onMouseUp` a nivel del contenedor
   izquierdo completo, capturado en `SplitScreenDiscoveryUI`).
3. Aparece una barra inferior fija con el texto seleccionado.
4. En el panel derecho, cualquier campo (excepto `table`) tiene un botón "Asignar" que aparece
   solo si hay texto seleccionado. Al pulsarlo: escribe el valor en el campo (o lo añade como tag
   si es `multiselect`), crea un `NoteLink` (traza de dónde vino ese dato) y limpia la selección.

Esto es "consulta y edición sin escribir dos veces" — la idea central pedida por el usuario. Hoy
funciona, pero es un mecanismo de un solo sentido: no hay forma de, mirando una respuesta ya
rellenada, saber de qué nota/frase salió ni volver a ella con un clic (el `NoteLink` se crea pero
nunca se lee de vuelta).

## 7. Decisiones de esta sesión que vale la pena que Gemini conozca

- Los `select`/`multiselect` de la plantilla semilla (modelo logístico, tipos de operativa, modo de
  transporte...) estaban originalmente definidos como listas CERRADAS del dominio TSP (transporte
  y distribución) porque la plantilla se escribió pensando en un cliente tipo. Se corrigió a
  "sugerencia, nunca lista cerrada" porque cada cliente de UNIGIS tiene una operativa distinta —
  este es un problema de fondo de CUALQUIER campo de catálogo cerrado en la plantilla, no solo
  esos dos: **vale la pena que Gemini piense si hay más sitios donde la plantilla asume
  implícitamente "cliente tipo TSP europeo" en vez de ser neutral.**
- Progreso y estado (`Obtenida/Pendiente/No aplica`) son 100% cliente, no hay ningún job ni
  Cloud Function que recalcule nada server-side.
- Las secciones 16 (Decisiones), 18 (Matriz de Requisitos), 19 (Gap Analysis) y 20 (Checklist de
  Workshops) del documento original se **aplanaron** dentro del mismo modelo Template/Response de
  campos sueltos — el diseño original (antes de la primera implementación) las definía como
  entidades independientes con ciclo de vida propio (`DecisionLog`, `RequirementsMatrix`,
  `GapAnalysis` calculado, `WorkshopChecklist`). Sigue pendiente decidir si eso importa de verdad
  o si aplanarlas fue la decisión correcta y no vale la pena la complejidad de separarlas.

## 8. Deuda técnica / simplificaciones conocidas (no ocultarlas, mejor que Gemini las vea)

1. `updateFieldResponse` no tiene control de concurrencia — dos consultores en la misma sección al
   mismo tiempo se pisan sin aviso.
2. `NoteLink` es de solo escritura — no hay UI que lea "qué nota generó esta respuesta".
3. No hay historial/versionado de respuestas (cada guardado sobrescribe, no hay auditoría de quién
   cambió qué y cuándo más allá de `updatedBy`/`updatedAt` del último write).
4. `ProjectDiscoveryInstance.status: 'draft'|'in_progress'|'completed'` existe en el tipo pero nada
   lo transiciona automáticamente — es un campo muerto hoy.
5. No hay exportación (informe HTML/PDF prellenado) todavía — es el V2 del roadmap original.
6. No hay modo offline — el documento original de la guía dice explícitamente que las sesiones
   ocurren a veces en almacenes con mala cobertura; hoy el módulo asume conexión constante a
   Firestore.
7. `select`/`multiselect` datalist/tags: la implementación es deliberadamente simple (HTML nativo
   `<datalist>`, sin fuzzy-search ni agrupación de sinónimos). Si dos consultores escriben "FTL" y
   "Camión completo" para lo mismo, quedan como dos valores distintos sin normalizar.

## 9. Seguridad (contexto, no se toca en esta ronda)

```
match /tenants/{tenantId}/projects/{projectId}/discovery/{document=**} {
  allow read:  if canAccessTenantDiscovery(tenantId);
  allow write: if canAccessTenantDiscovery(tenantId) && canWriteProjectDiscovery(tenantId, projectId);
}
match /tenants/{tenantId}/noteLinks/{id} {
  allow read, write: if canAccessTenantDiscovery(tenantId);
}
match /tenants/{tenantId}/discoveryTemplates/{templateId} {
  allow read:  if canAccessTenantDiscovery(tenantId);
  allow write: if getRealRole() >= 80 || isSuperAdmin();
}
```
`canWriteProjectDiscovery` reusa `hasAccess()` (el mismo control de acceso por región/scope que ya
usa el resto de subcolecciones de un proyecto), no un campo inventado — esto costó 3 rondas de fix
en la sesión anterior, documentado para que no se repita el error de reinventar el control de acceso.

## 10. Lo que le pedimos a Gemini que piense (no implementar, solo ideas)

El consultor usa esto EN VIVO, hablando con un cliente, no offline rellenando un formulario con
calma. La pregunta de fondo: **¿qué fricciones concretas le van a hacer perder el hilo de la
conversación, y cómo se elimina cada una?** Algunos ángulos de partida, sin cerrar la lista:

- ¿El flujo "seleccionar texto → clicar Asignar → buscar el campo correcto entre 90" es realista
  hablando en vivo, o hace falta algo más como IA sugiriendo a qué campo(s) pertenece una frase?
- ¿22 secciones planas en un sidebar es suficiente memoria de "dónde estoy" en una sesión de 2h+,
  o falta una vista de "solo lo pendiente" / favoritos / secciones de la sesión de hoy?
- ¿El estado "No aplica" a nivel de campo Y de sección es demasiado granular para usar en vivo, o
  falta justo lo contrario (marcar por lotes)?
- ¿Vale la pena una vista de "resumen ejecutivo" (solo lo respondido, para repasar con el cliente
  antes de cerrar la sesión) separada de la vista de trabajo (todos los campos)?
- Dado que la plantilla asume un dominio (TSP) que no siempre encaja: ¿mejor plantilla más neutral,
  o plantillas por vertical seleccionables al crear el discovery del proyecto?

## 11. Archivos exactos si Gemini quiere leer código real

```
components/discovery/DiscoveryContainer.tsx
components/discovery/SplitScreenDiscoveryUI.tsx
components/discovery/DiscoveryNotesPanel.tsx
components/discovery/DiscoveryQuestionnaire.tsx
lib/discovery.ts
lib/discoveryImporter.ts
types/relevamiento.ts
scripts/seed_discovery_template.js
```
