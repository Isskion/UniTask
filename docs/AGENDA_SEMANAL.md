# Agenda Semanal — Manual de Usuario

**Módulo:** Agenda Semanal de Consultores  
**Versión:** 1.0  
**Fecha:** 2026-05-13  
**Ruta en la app:** `/agenda`

---

## ¿Qué es este módulo?

La Agenda Semanal reemplaza el Excel de seguimiento _AGENDA SEMANAL 2026 - IBERIA_.  
Permite a todos los consultores registrar su actividad semana a semana (reuniones, tareas, viajes, vacaciones) y a los PMs verlo en tiempo real, sin descargar ni compartir archivos.

**Ventajas respecto al Excel:**
- Colaboración en tiempo real — cualquier cambio es visible al instante para todo el equipo
- Sin versiones duplicadas ni conflictos de edición
- Exportación directa a Jira y MS Project con un click
- Totales de horas calculados automáticamente
- Filtros por consultor, tipo de actividad, estado y región

---

## Acceso al módulo

Hay tres formas de abrir la Agenda Semanal:

1. **Menú de comandos** (recomendado)  
   Pulsa `Alt + S` para abrir el menú → escribe _"agenda"_ → `Enter`

2. **URL directa**  
   Navega a `/agenda` en la barra de dirección del navegador

3. **Menú de comandos → búsqueda**  
   Busca _"semanal"_, _"consultores"_ o _"schedule"_

---

## Interfaz principal

```
┌─────────────────────────────────────────────────────────────────┐
│  ◀  Semana 2 · mayo 2026   Semana Actual · Semana 20   ▶  [Hoy] │  ← Barra de navegación
│  [Filtros]  [Jira CSV]  [MS Project]       12 consultores · 47 entradas │
├─────────────────────────────────────────────────────────────────┤
│             LUN    MAR    MIÉ    JUE    VIE    SÁB    DOM  Total│
│              11     12     13     14     15     16     17        │
│              MAY    MAY    MAY    MAY    MAY    MAY    MAY       │
├────────────────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┤
│ NOMBRE CONSUL  │      │ ████ │      │ ████ │      │ ░░░░ │ ░░░░ │  4h │
│ IBERIA         │  +   │ Cli  │  +   │ Tar  │  +   │ FDS  │ FDS  │     │
├────────────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ OTRO CONSULTOR │ ████ │      │ ████ │      │ ████ │ ░░░░ │ ░░░░ │  6h │
│ LATAM          │ UNIG │  +   │ Pres │  +   │ Cli  │ FDS  │ FDS  │     │
├────────────────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┤
│ Total semana      2h     1h     2h     1h     2h     —     —    8h   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Navegación por semanas

La barra superior muestra la semana activa con su nombre ("Semana 2 · mayo 2026"), el número de semana del año (ISO) y su clasificación temporal:

| Indicador | Significado |
|-----------|-------------|
| **Semana Actual** (índigo) | La semana en curso |
| **Semana Anterior** (gris) | Semanas pasadas |
| **Semana Anterior N** (gris) | N semanas atrás |
| **Futuro** (ámbar) | Semanas pendientes |

- **◀ ▶** — Retrocede o avanza una semana
- **Hoy** — Vuelve a la semana actual (aparece solo si no estás en ella)

---

## Código de colores

### Encabezados de día

| Color | Tipo de día |
|-------|-------------|
| Fondo oscuro normal | Día Hábil (DH) |
| Fondo rojo oscuro | Festivo / Día No Hábil (DNH) — incluye festivos de Madrid 2025–2027 |
| Fondo gris muy oscuro | Fin de semana (FDS) |

### Tipos de actividad

| Color | Actividad |
|-------|-----------|
| 🔵 Azul | Reunión Cliente |
| 🔴 Rojo | Reunión UNIGIS |
| 🟣 Violeta | Reunión Presencial |
| ⚫ Zinc | Reunión Interna |
| 🟡 Ámbar | Comercial |
| 🟠 Naranja | Tarea (Tareas a Realizar) |
| 🟢 Esmeralda | Vacaciones |
| 🩵 Cian | Viaje |
| 🔮 Violeta | Especial |

### Estado de la actividad (punto de color en cada entrada)

| Punto | Estado |
|-------|--------|
| ⚫ Zinc | Por Hacer |
| 🟡 Ámbar | En pausa |
| 🟢 Verde | Hecho |
| 🔴 Rojo oscuro | Cancelado |

---

## Añadir una entrada

1. **Coloca el cursor** sobre la celda del consultor y día deseado  
   → Aparece el botón **+** en la esquina inferior derecha de la celda

2. **Haz click en +**  
   → Se abre el panel lateral de creación

3. **Rellena el formulario:**

   | Campo | Descripción | Ejemplo |
   |-------|-------------|---------|
   | Tipo de actividad | Selecciona uno de los 9 tipos (se colorea en tiempo real) | Reunión Cliente |
   | Comentario | Formato: `CLIENTE / DESCRIPCION` — el sistema extrae cliente y descripción automáticamente | `LUIS SIMOES / Diseño de solución EDI` |
   | Horario | Formato: `HH:MM A HH:MM` | `9:00 A 11:30` |
   | Estado | Por Hacer / En pausa / Hecho / Cancelado | Hecho |

4. **Preview en tiempo real:**  
   Mientras escribes el comentario y el horario, el panel muestra:
   - Cliente extraído: `LUIS SIMOES`
   - Descripción extraída: `DISEÑO DE SOLUCIÓN EDI`
   - Horas calculadas: `2h 30m`
   - Registro Jira generado: `Reunión Cliente: LUIS SIMOES->DISEÑO DE SOLUCIÓN EDI`

5. **Haz click en "Añadir entrada"**  
   → La celda se actualiza en tiempo real para todos los usuarios conectados

> **Nota:** Las celdas de fines de semana y festivos muestran el texto del tipo de día pero no permiten añadir entradas.

---

## Editar o eliminar una entrada

1. **Haz click sobre cualquier entrada** existente en la celda  
   → Se abre el mismo panel con los datos precargados

2. **Modifica** los campos que necesites

3. Para **guardar** → click en "Guardar cambios"  
   Para **eliminar** → click en "Eliminar" (botón rojo, pide confirmación)

> Los cambios son visibles para todos en tiempo real, sin necesidad de refrescar.

---

## Filtros

Haz click en **Filtros** (barra superior) para desplegar el panel de filtrado.

| Filtro | Opciones | Efecto |
|--------|----------|--------|
| **Región** | Todas / IBERIA / LATAM | Muestra solo consultores de esa región |
| **Consultores** | Lista de todos los consultores | Muestra solo los seleccionados (multiselección) |
| **Actividad** | Los 9 tipos | Muestra solo entradas de ese tipo |
| **Estado** | Por Hacer / En pausa / Hecho / Cancelado | Muestra solo entradas con ese estado |

- Los filtros activos se acumulan (se aplican todos a la vez)
- El botón **Filtros** muestra un contador de filtros activos
- Click en **Limpiar filtros** para resetear todo

> Las columnas de totales reflejan siempre las entradas visibles con los filtros aplicados.

---

## Totales automáticos

La última columna (**Total**) muestra las horas planificadas por consultor en la semana.  
La última fila (**Total semana**) muestra las horas por día y el grand total.

El cálculo se hace automáticamente a partir del campo Horario:
- `9:00 A 11:30` → **2h 30m** → **2.5 horas**
- `10:00 A 11:00` → **1h** → **1 hora**
- Sin horario → **no suma**

---

## Exportación

### Jira CSV

Genera un archivo `.csv` compatible con la importación masiva de Jira.

**Formato de cada fila:**
```
Fecha; Día; Consultor; Actividad; Cliente; Registro Jira; Horas Planificadas; Semana-Mes; Resultado
25/05/2026; LUNES; DANIEL DEL ALAMO; Reunión Cliente; LUIS SIMOES; Reunión Cliente: LUIS SIMOES->SESION DE TRABAJO; 2,50; Semana 3-MAY 2026; Hecho
```

**Formato del Registro Jira:**
- Actividad normal → `{Actividad}: {CLIENTE}->{DESCRIPCION}`
- "Tareas a Realizar" → `Tarea: {CLIENTE}->{DESCRIPCION}`

**Para exportar:**
1. Navega a la semana deseada
2. (Opcional) Aplica filtros para exportar solo lo que necesitas
3. Click en **Jira CSV**
4. El archivo se descarga automáticamente con nombre `jira-export-YYYYMMDD.csv`

> El archivo incluye BOM UTF-8 para que Excel lo abra correctamente con acentos.

---

### MS Project CSV

Genera un archivo `.csv` para importar en Microsoft Project.

**Formato de cada fila:**
```
Fecha; Recurso; Tarea; Horas; % Completado; Estado
25/05/2026; DANIEL DEL ALAMO; Reunión Cliente: LUIS SIMOES->SESION DE TRABAJO; 2,50; 100; Hecho
```

**Conversión de estado a % completado:**

| Estado | % Completado |
|--------|-------------|
| Por Hacer | 0% |
| En pausa | 50% |
| Hecho | 100% |
| Cancelado | 0% |

**Para exportar:**
1. Navega a la semana deseada
2. Click en **MS Project**
3. El archivo se descarga como `msproject-export-YYYYMMDD.csv`

---

## Guía de administración

### Añadir un consultor

Los consultores se gestionan en la colección Firestore `agenda_consultants`. Cada documento tiene la siguiente estructura:

```typescript
{
  tenantId:   "tu-tenant-id",
  userId:     "firebase-uid-del-usuario",  // vincula con la cuenta de UniTask
  name:       "DANIEL DEL ALAMO",          // en mayúsculas, como en el Excel
  sortOrder:  1,                           // orden de aparición en la grilla
  region:     "IBERIA",                   // "IBERIA" o "LATAM"
  isActive:   true,
}
```

**Consultores IBERIA de referencia (del Excel):**

| Orden | Nombre | Región |
|-------|--------|--------|
| 1 | DANIEL DEL ALAMO | IBERIA |
| 2 | JORGE MARTINEZ | IBERIA |
| 3 | GONZALO CASTRO | IBERIA |
| 4 | ERIC WALTHER | IBERIA |
| 5 | JESUS MARQUEZ | IBERIA |
| 6 | IÑAKI IRABURU | IBERIA |
| 7 | DIEGO SENRA | IBERIA |
| 8 | JAIME ARMAS | IBERIA |

Para dar de baja a un consultor: `isActive: false` (no se eliminan registros históricos).

---

### Festivos

Los festivos están precargados en `lib/holidays.ts` e incluyen Madrid 2025–2027.  
Las celdas de festivos se muestran en rojo y no permiten añadir entradas.

Si necesitas añadir festivos adicionales, edita el array `MADRID_HOLIDAYS` en ese archivo con formato `YYYY-MM-DD`.

> **Próxima fase:** UI de gestión de festivos en la app, con soporte para múltiples regiones (Portugal, Italia, LATAM).

---

## Estructura técnica

### Colecciones Firestore

```
agenda_entries/{id}          ← Entradas de agenda (una por actividad/día/consultor)
agenda_consultants/{id}      ← Registro de consultores con orden y región
```

### Índices Firestore

No se requieren índices compuestos. Las queries usan solo filtros de igualdad (`==`) y el ordenamiento se aplica client-side. Esto elimina el paso de creación de índices en Firebase Console.

### Archivos del módulo

```
types/
  agenda.ts                   ← Tipos, enums y configuración de colores

lib/
  agenda-utils.ts             ← Parsers puros: horarios, comentarios, Jira, fechas
  agenda.ts                   ← Operaciones Firestore + exportación CSV

components/agenda/
  AgendaView.tsx              ← Contenedor principal (navegación, filtros, datos)
  AgendaGrid.tsx              ← Grilla semanal (tabla consultores × días)
  AgendaCell.tsx              ← Celda individual (lista de entradas + botón +)
  AgendaEntryModal.tsx        ← Modal crear/editar entrada

app/agenda/
  page.tsx                    ← Ruta Next.js /agenda

docs/
  AGENDA_SEMANAL.md          ← Este documento
```

---

## Formato de comentario

El campo **Comentario** sigue la convención del Excel:

```
CLIENTE / DESCRIPCION
```

El sistema extrae automáticamente:
- **Cliente** = todo lo que hay antes de ` / `
- **Descripción** = todo lo que hay después de ` / `

**Ejemplos:**

| Comentario | Cliente extraído | Descripción extraída |
|------------|-----------------|---------------------|
| `LUIS SIMOES / Sesión de diseño` | LUIS SIMOES | SESIÓN DE DISEÑO |
| `TRANSIA / Revisión de interfaces` | TRANSIA | REVISIÓN DE INTERFACES |
| `Vacaciones` | VACACIONES | VACACIONES |
| `Viaje Corporativo` | VIAJE CORPORATIVO | VIAJE CORPORATIVO |

> Las entradas sin ` / ` (como Vacaciones o Viaje) usan el comentario completo como cliente y descripción.

---

## Selector de horario

El horario se selecciona con **dos desplegables** (inicio y fin) en lugar de texto libre.

### Controles disponibles

| Control | Descripción |
|---------|-------------|
| **Selector Inicio** | Desplegable con intervalos de 30 minutos, de 06:00 a 22:00 |
| **Selector Fin** | Solo muestra horas posteriores a la hora de inicio seleccionada |
| **☀ Día completo** | Fija automáticamente 09:00 → 18:00 (8h trabajo + 1h comida) |
| **Presets rápidos** | 1h · 1h 30m · 2h · Mañana (09-13) · Tarde (14-18) |
| **Badge de horas** | Muestra las horas planificadas calculadas en tiempo real |

### Presets rápidos

| Preset | Inicio | Fin | Horas |
|--------|--------|-----|-------|
| 1h | 10:00 | 11:00 | 1h |
| 1h 30m | 10:00 | 11:30 | 1h 30m |
| 2h | 10:00 | 12:00 | 2h |
| Mañana | 09:00 | 13:00 | 4h |
| Tarde | 14:00 | 18:00 | 4h |
| Día completo | 09:00 | 18:00 | 9h (8h trabajo + 1h comida) |

El formato almacenado internamente sigue siendo `HH:MM A HH:MM` para compatibilidad con la exportación Jira y MS Project.

---

## Preguntas frecuentes

**¿Puedo registrar varias actividades en el mismo día para el mismo consultor?**  
Sí. Cada celda admite múltiples entradas. Haz click en el botón **+** tantas veces como necesites.

**¿Puedo ver semanas pasadas?**  
Sí, usa los botones ◀ ▶ o escribe directamente en la URL: `/agenda` → navega desde ahí.

**¿Se borran las entradas al eliminarlas?**  
No. La eliminación es lógica (`isActive: false`). Los datos históricos siempre se preservan en Firestore.

**¿La exportación incluye todas las semanas o solo la semana visible?**  
Solo la semana visible. Para exportar varios meses, navega semana a semana y exporta por separado.  
_(Próxima fase: exportación por rango de fechas.)_

**¿Qué pasa si hay una entrada sin horario?**  
Se guarda correctamente pero no suma horas en los totales. El registro Jira se genera igual.

**¿Dónde veo el registro Jira antes de exportar?**  
En el modal de creación/edición, en la sección "Registro Jira generado" (al pie del formulario).

**¿Los festivos de Portugal e Italia están incluidos?**  
El sistema usa los festivos de Madrid por defecto. Los festivos de otras regiones (Portugal, Italia, LATAM) se implementarán en la siguiente fase con un catálogo por región.

---

## Próximas fases

| Fase | Funcionalidad |
|------|---------------|
| **Fase 3** | Dashboard de resumen semanal/mensual por consultor y cliente |
| **Fase 3** | Vista "Mi semana" — cada consultor ve solo sus entradas |
| **Fase 4** | Festivos por región (Portugal, Italia, LATAM) con UI de gestión |
| **Fase 4** | Exportación por rango de fechas |
| **Fase 5** | Vinculación con tareas de UniTask (`linkedTaskId`) |
| **Fase 5** | Vista combinada PM: agenda de consultor + tareas asignadas |
| **Fase 5** | Integración con sprint planning — ver disponibilidad real al planificar |

---

_Última actualización: 2026-05-13 · UniTask v14.4.0_
