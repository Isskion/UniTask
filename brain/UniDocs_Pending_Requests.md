# UniDocs — Peticiones Pendientes y Contexto de Traspaso

> Este archivo es el punto de traspaso entre Claude y Gemini.
> Actualizar siempre al inicio y al final de cada sesión de trabajo.
> Última actualización: 2026-03-08 por Claude

---

## Estado actual

- **Versión app:** UniTaskController 14.0.1
- **Versión UniDocs:** V2.3.0
- **Rama producción:** `main` — desplegado en Vercel ✅
- **Último commit:** `feat(unidocs): V2.3 print engine + v14.0.1 versioning`

---

## Contexto imprescindible antes de tocar UniDocs

1. Leer [`brain/UniDocs_Project_Knowledge.md`](./UniDocs_Project_Knowledge.md) — arquitectura, reglas de versionado, qué NO tocar
2. El motor de impresión usa `<table>` con `<thead>`/`<tbody>`/`<tfoot>` — NO volver a `position:fixed`
3. Coordenadas de bloques en **mm** (no px). Escala del designer: `SCALE = 2.5 px/mm`
4. El bloque `cuerpo` es especial — es el `<tbody>` de la tabla, permite paginación

---

## Peticiones pendientes (backlog)

### ALTA PRIORIDAD
*(vacío por ahora — añadir aquí cuando el usuario reporte bugs o pida features)*

### MEDIA PRIORIDAD — Mejoras UniDocs V2.x

- [ ] **Número de página en el pie**
  - El usuario quiere poder poner `@pagina` / `@totalPaginas` como variables en el bloque `pie`
  - En impresión CSS puro esto requiere `counter(page)` / `counter(pages)` en `@page` — investigar compatibilidad con la arquitectura tabla actual

- [ ] **Resize visual con drag handles en el designer**
  - Actualmente los bloques se pueden mover (drag) pero no redimensionar visualmente
  - Añadir handles en las esquinas/bordes del bloque seleccionado en `UniDocsTemplateDesigner.tsx`
  - El cambio es solo en el designer, no afecta al motor de impresión

- [ ] **Variables `@campos` personalizadas por tenant**
  - Ej: `@clienteNombre`, `@proyectoCodigo`, `@responsable`
  - En bloques `titulo`, `texto_libre` y `pie` el texto estático podría contener estas variables
  - Sustituirlas en `buildPrintHtml()` y `buildWordHtml()` al generar el documento
  - Requiere pasar datos del proyecto/cliente al modal `UniDocsTemplatePickerModal`

- [ ] **Soporte multi-página en el designer**
  - Actualmente el designer solo muestra 1 página A4
  - El usuario podría querer definir una plantilla con portada diferente al resto de páginas

---

## Historial de cambios recientes (esta sesión)

### 2026-03-08 — V2.3.0

**Problema:** El pie de página solapaba el cuerpo en páginas intermedias de documentos largos. La cabecera no aparecía en páginas subsiguientes a la primera.

**Causa raíz:** La arquitectura anterior usaba `position: fixed` para header/footer y `padding-bottom` en el cuerpo. El `padding-bottom` solo protege la última página — en páginas intermedias el contenido fluía libremente hasta el pie.

**Solución implementada:** Reescritura completa de `buildPrintHtml()` usando `<table>` con `<thead>`/`<tbody>`/`<tfoot>`:
- `<thead>` → cabecera, se repite sola en cada página (garantía del navegador)
- `<tfoot>` → pie, se repite solo en cada página (garantía del navegador)
- `<tbody>` → cuerpo, fluye entre ellos sin posibilidad de solapamiento

**Archivos modificados:**
- `components/unileaks/UniDocsTemplatePickerModal.tsx` — motor de impresión reescrito
- `types/unidocs.ts` — comentario de versión actualizado a V2.3.0
- `components/VersionBadge.tsx` — eliminado icono Sparkles (se cortaba el badge con el logo del tenant)
- `lib/version.ts` — versión app a 14.0.1, changelog añadido
- `brain/UniDocs_Project_Knowledge.md` — creado (nuevo)

---

## Cómo actualizar este archivo

Al **inicio** de una sesión de trabajo en UniDocs:
1. Leer este archivo completo
2. Mover las peticiones completadas de "Pendientes" a "Historial"

Al **final** de una sesión:
1. Añadir al historial qué se hizo, el problema, la causa y la solución
2. Actualizar las peticiones pendientes con lo que queda
3. Actualizar "Estado actual" con la versión y commit nuevos
