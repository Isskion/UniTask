# UniDocs — Project Knowledge Base

> Leer este archivo ANTES de tocar cualquier código de UniDocs.

---

## Versión actual: V2.3.0

| Versión | Fecha      | Descripción                                                    |
|---------|------------|----------------------------------------------------------------|
| V1.0    | —          | Legacy: plantillas de texto enriquecido (rich text lineal)     |
| V2.0    | —          | Block-based: bloques con coordenadas x/y/width/height en mm    |
| V2.1    | —          | Firestore rules fix: App Admins pueden subir logos de tenant   |
| V2.2    | —          | Preview-first: iframe blob URL + botones Imprimir/PDF y Word   |
| V2.3    | 2026-03-08 | Fix impresión: arquitectura tabla thead/tbody/tfoot — el cuerpo ya no puede solapar el pie en ninguna página |

---

## Arquitectura del Motor de Impresión (V2.3)

**Archivo clave:** `components/unileaks/UniDocsTemplatePickerModal.tsx`

### Flujo de usuario
1. Usuario hace clic en "Generar Documento" en una nota
2. Modal muestra la lista de plantillas disponibles del tenant
3. Usuario selecciona una → `handlePreview()` genera HTML + crea Blob URL → `<iframe src=blobUrl>`
4. Pantalla completa con previsualización real del documento
5. Botón **"Imprimir / PDF"** → `iframe.contentWindow.print()` (usuario inicia, no auto-print)
6. Botón **"Word (.doc)"** → descarga HTML con namespace Word como `.doc`

### Por qué `<table>` con `<thead>`/`<tfoot>`/`<tbody>`
El enfoque anterior (`position: fixed` para header/footer) fallaba porque:
- El `padding-bottom` en el cuerpo solo protege la última página
- En páginas intermedias el contenido podía fluir libremente hasta solapar el pie

Con la tabla:
- **`<thead>`** se repite en la parte superior de cada página impresa (garantía del navegador)
- **`<tfoot>`** se repite en la parte inferior de cada página impresa (garantía del navegador)
- **`<tbody>`** fluye entre ellos — imposible que se solapen físicamente

### Cálculo de dimensiones
```
theadHeight = cuerpoBlock.y           // altura de cabecera = desde dónde empieza el cuerpo en el papel
tfootHeight = 297 - footerTopY        // desde el bloque pie más alto hasta el fondo del A4
cuerpoLeft  = cuerpoBlock.x           // margen izquierdo del tbody
cuerpoRight = 210 - cuerpoLeft - cuerpoBlock.width  // margen derecho del tbody
```

### Por qué `@page { margin: 0 }`
Elimina los headers del navegador (fecha, URL, número de página).
**NUNCA poner valor > 0** — cualquier margen positivo los restaura.

### Bloques de cabecera
Posicionados **absolutamente** dentro de la celda `<thead>` con sus coordenadas originales en mm.
La celda tiene `position: relative` y altura exacta = `theadHeight`.

### Bloques de pie
Posicionados **absolutamente** dentro de `<tfoot>` con `top = block.y - footerTopY` (coordenada relativa al inicio del tfoot).

---

## Schema de Datos V2 (NO MODIFICAR sin incrementar versión)

**Archivo:** `types/unidocs.ts`

```typescript
interface TemplateBlock {
    id: string;
    type: BlockType;   // 'logo_empresa' | 'logo_cliente' | 'titulo' | 'fecha' | 'cuerpo' | 'pie' | 'texto_libre' | 'separador'
    label: string;
    x: number;         // mm desde el borde izquierdo del papel A4
    y: number;         // mm desde el borde superior del papel A4
    width: number;     // mm
    height: number;    // mm
    config: BlockConfig;
}
```

**Escala del designer:** `SCALE = 2.5 px/mm` (en `UniDocsTemplateDesigner.tsx`)
**Papel:** A4 = 210mm × 297mm

---

## Reglas para colaboradores (Claude, Gemini, etc.)

### SI añades una propiedad nueva a BlockConfig
→ Debe ser **opcional** (`?`) para no romper plantillas existentes en Firestore.
```typescript
// CORRECTO
borderRadius?: number;   // nuevo campo, opcional

// INCORRECTO — rompe datos existentes
borderRadius: number;    // campo requerido
```

### SI cambias la unidad de medida (mm → px) o la estructura de blocks[]
→ Incrementar a **V3**, crear plan de migración de datos en Firestore, documentar aquí.

### El bloque `cuerpo` es especial
- Es el **único bloque sin posición fija** — permite paginación del contenido
- En el motor de impresión se convierte en el `<tbody>` de la tabla
- Cualquier cambio en su tratamiento puede romper notas largas (múltiples páginas)
- Tratar con máximo cuidado

### Añadir un nuevo tipo de bloque
1. Añadirlo a `BlockType` en `types/unidocs.ts`
2. Añadir entrada en `BLOCK_CATALOG` con `defaultConfig`
3. Añadir case en `renderBlock()` en `UniDocsTemplatePickerModal.tsx`
4. Añadir case en `UniDocsTemplateDesigner.tsx` para previsualización en el diseñador
5. Añadir case en `buildWordHtml()` si tiene sentido en Word

---

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `types/unidocs.ts` | Schema de datos V2 — fuente de verdad del modelo |
| `components/unileaks/UniDocsTemplatePickerModal.tsx` | Motor de impresión + previsualización + export Word |
| `components/unidocs/UniDocsTemplateDesigner.tsx` | Designer visual de plantillas (canvas drag & drop) |
| `firestore.rules` | Reglas de seguridad — incluye write para logos de tenant |

---

## Pendiente (backlog V2.x)

- [ ] Resize visual con drag handles en el designer
- [ ] Soporte multi-página en el designer (más de una página de plantilla)
- [ ] Variables `@campos` personalizadas por tenant (ej. `@clienteNombre`, `@proyectoCodigo`)
- [ ] Número de página en el pie (`@pagina` / `@totalPaginas`)
