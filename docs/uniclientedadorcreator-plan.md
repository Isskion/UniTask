# UniClienteDadorCreator — Análisis y Plan de Trabajo

**Versión:** 1.0 | **Fecha:** 2026-08-31
**Objetivo:** Construir una nueva herramienta de alta masiva (`app/uniclientedadorcreator/`) que integre **Clientes Dadores** (dueños de la carga) hacia UNIGIS, replicando el patrón ya probado de `app/uniclientcreator/` pero apuntando a la tabla maestra `Cliente` en vez de `ClienteOrden`.

**Contexto previo:** ver memoria `[[project_uniclientedador]]` y `[[project_unitask]]`. Este documento resuelve las dos preguntas que habían quedado pendientes ese día y deja el trabajo listo para implementarse con Gemini.

---

## 1. Las dos preguntas pendientes — RESUELTAS

### 1.1 ¿Existe un método dedicado de alta independiente?

**Sí.** Confirmado con evidencia directa en el repo, no por analogía:

- `public/integrators/uni-swagger/swagger_dump.json:5223` y `public/integrators/uni-soap/swagger_dump.json:5223` — ambos dumps (idénticos, 2 334 864 bytes) documentan el endpoint real de UNIGIS:
  ```
  POST /mapi/rest/logistic/service/CrearClientesDadores
  operationId: LogisticService_CrearClientesDadores
  body: #/definitions/CrearClientesDadoresRequest
  ```
- `scratch/extracted_dds_4pl.txt:262` (documento de diseño del cliente Europastry/4PL) lo confirma en texto de negocio:
  > "Los clientes dadores se crearán y actualizarán en el TMS a través de la interfaz **CrearClientesDadores**... El ClienteOrden... se sincronizará... a través de las interfaces **CrearClientesOrden**."

Es decir: son **dos operaciones SOAP/REST distintas y paralelas** dentro del mismo `LogisticService`, tal como se sospechaba, y ambas están documentadas oficialmente — no hay que inferir nada.

### 1.2 ¿A qué tabla escribe y con qué forma?

Ya estaba resuelto (confirmado por Daniel el 2026-08-31 vía consulta a BD: tabla `Cliente`). Lo que este análisis añade es la **forma exacta del payload real**, que **no es igual** al `ClienteDador` anidado que ya existía en `app/uniordercreator/_src/data/schema.ts` (ese es un sub-objeto embebido en la creación de un Pedido, con más campos — `RefCliente`, `DomicilioFiscal`, etc.). El alta **independiente** usa una forma más plana: `pClienteDador` (swagger, línea 9536):

```
pClienteDador (alta independiente, tabla Cliente):
  ReferenciaExterna        string   ← clave de negocio (no hay "RefCliente" aquí)
  RazonSocial              string
  NombreFantasia           string
  Cuit                     string
  Telefono1                string
  Telefono2                string
  Direccion                string
  Localidad                string
  eMailGestorDeFlota       string
  CentroDeCosto            string
  IdEstado                 int32
  IdEstado_opcional        int32
  IntegrarRNDC             boolean   (Colombia — probablemente no aplica a Europastry/España)
  IntegrarRNDC_Opcional    boolean
  operaciones[]            pOperacion { Descripcion, IdOperacion, Referencia, Sucursal, ReferenciaExterna }
  CampoDinamico[]          CampoValor { Campo, Valor }

CrearClientesDadoresRequest:
  ApiKey     string        ← ⚠️ mayúscula inicial (en ClienteOrden es "apiKey", minúscula — swagger línea 9738)
  clientes[] pClienteDador
```

**No tiene** `DomicilioFiscal` ni desglose de dirección (Calle/NumeroPuerta/Provincia/País/CP) como sí tiene `pCliente` (ClienteOrden) — solo `Direccion` + `Localidad` en texto libre. Esto simplifica bastante el mapeo frente a `uniclientcreator`.

---

## 2. Riesgo abierto a validar en la implementación (no bloqueante, pero anotado)

El swagger documenta la operación como **REST/JSON** (`/mapi/rest/logistic/service/...`). Sin embargo `CrearClientesOrden` **también** aparece así en el swagger y, en la práctica, `uniclientcreator` la invoca como **SOAP clásico 1.1** (`postSoapProxy`, `SOAP_ACTION = 'http://unisolutions.com.ar/CrearClientesOrden'`, sobre, namespace `unis:`). Esto indica que el `LogisticService` de UNIGIS expone las mismas operaciones por doble vía (WCF con `basicHttpBinding` + `webHttpBinding`), y las herramientas existentes usan la SOAP.

**Asunción de trabajo:** `CrearClientesDadores` tendrá el mismo doble binding, así que replicamos el patrón SOAP (`unis:CrearClientesDadores`, `unis:clientes/unis:pClienteDador`, `unis:ApiKey`). **Validar con una llamada real (Fase 3, dry-run→real) antes de dar el módulo por bueno** — si el servidor responde `soap:Fault` de "operación no encontrada", el fallback es probar la variante REST/JSON del mismo endpoint documentado en swagger.

También validar en esa misma prueba: si el tag SOAP realmente respeta `ApiKey` con mayúscula o si en el envoltorio XML real es case-insensitive/normalizado — el swagger es la definición JSON, no garantiza 1:1 el nombre de elemento XML.

---

## 3. Qué se reutiliza tal cual (sin tocar)

Toda la infraestructura de `app/uniclientcreator/` es genérica y **no conoce el dominio "Cliente"** — trabaja sobre `SCHEMA` de forma dinámica. Se copia el módulo entero como base y solo se reescriben 4-5 archivos:

| Reutilizable sin cambios | Motivo |
|---|---|
| `excelParser.ts`, `dateHelpers.ts`, `fieldSearchEngine.ts`, `levenshtein.ts`, `validation.ts` (motor genérico) | Operan sobre filas/columnas genéricas, no sobre nombres de campo fijos |
| `xmlBuilder.ts` — **la función `buildNode()` recursiva** | Ya recorre cualquier `SCHEMA` genérico (objetos anidados, arrays, defaults, booleans) |
| Todos los componentes de `components/` (Wizards, Modals, Dashboard, MasterTable, DetailPanel, MapperPanel, XmlPreview, Header) | Son genéricos, leen del store y del `SCHEMA` |
| `appStore.ts` (patrón Zustand) | Mismo shape de estado |
| `lib/soapProxy.ts` | Ya es transporte-agnóstico (recibe url/action/body) |
| `LoginModal.tsx`, `ToastProvider.tsx`, i18n (`_src/i18n/*`) | Sin cambios de dominio |

## 4. Qué hay que reescribir

| Archivo | Cambio |
|---|---|
| `_src/data/schema.ts` | Nuevo `SCHEMA.Root` con la forma de `pClienteDador` (sección 1.2). Nuevo `FIELD_GROUPS` (p.ej. `pClienteDador`, `Operaciones`, `Dinamicos`). Nuevo `REQUIRED_FIELDS` (mínimo: `ReferenciaExterna`, `RazonSocial`). `KNOWN_BOOLEAN_PATHS` → `IntegrarRNDC`. |
| `_src/services/xmlBuilder.ts` | Cambiar el envoltorio: `unis:CrearClientesDadores`, `unis:clientes/unis:pClienteDador`, tag `unis:ApiKey` (mayúscula), añadir soporte al array `operaciones` (nuevo — no existe en `uniclientcreator`, sí hay precedente de array anidado con `pOperacion` en `uniordercreator/schema.ts`, se puede portar ese patrón). |
| `page.tsx` | `SOAP_ACTION = 'http://unisolutions.com.ar/CrearClientesDadores'`; tag de resultado `CrearClientesDadoresResult` en vez de `CrearClientesOrdenResult`; columna de referencia para logs: `mapping['Root.ClienteDador.ReferenciaExterna']` en vez de `RefCliente`; label del panel izquierdo "👤 Clientes Dadores". |
| `_src/data/fieldDescriptions.ts`, `mappingTemplates.ts`, `errorCodes.ts` | Adaptar descripciones/plantillas de mapeo al nuevo set de campos (bastante más corto que el de `pCliente`). |
| `components/Wizards/DynamicFieldsWizard.tsx` (solo si hardcodea nombres) | Verificar que solo referencia `DYNAMIC_FIELD_SECTIONS` (genérico) — si es así, no requiere cambios. |
| `app/uniclientedadorcreator/page.tsx` (Next.js route) | Nuevo route wrapper, mismo patrón que `app/uniclientcreator/page.tsx` con `tenantId`. |
| `components/AppLayout.tsx` (2 sitios: nav desktop línea ~355 y variante línea ~587) | Añadir `<NavLink href="/uniclientedadorcreator" ... label="UniClienteDadorCreator" />` bajo `can('uniclientedadorcreator', 'views')`. El sistema de permisos es dinámico (por rol, sin registro estático adicional) — solo hace falta que un admin conceda el permiso `uniclientedadorcreator.views` desde la pantalla de Roles, igual que con los módulos existentes. |

**Nota de nombres:** por consistencia con el resto del módulo (`SCHEMA.Root.Cliente` en `uniclientcreator`), usar `SCHEMA.Root.ClienteDador` como nodo raíz de datos en el nuevo schema — mantiene el mismo patrón `Root.<Entidad>.<Campo>` para que el motor de mapeo/wizard no necesite cambios.

---

## 5. Plan de trabajo

**Modelo de trabajo:** Gemini implementa siguiendo este documento como spec; yo (Claude) reviso el diff resultante contra la sección 1.2/4 antes de cada envío real a UNIGIS.

| Fase | Contenido | Salida |
|---|---|---|
| **0. Kickoff** (ahora) | Este documento. Congelar el contrato de campos de la sección 1.2. | Este `.md` |
| **1. Scaffold** | Copiar `app/uniclientcreator/` → `app/uniclientedadorcreator/`, renombrar imports/paths, cambiar textos de UI genéricos ("Cliente" → "Cliente Dador"). Sin lógica nueva todavía. | Módulo compila y carga, con el schema viejo (ClienteOrden) todavía dentro — solo para verificar que el scaffold funciona |
| **2. Schema + XML** | Reescribir `schema.ts` y `xmlBuilder.ts` según sección 1.2/4. Probar `buildXml()` contra 2-3 filas de ejemplo y comparar el XML generado a mano contra la forma esperada del swagger. | XML válido, revisado por Claude campo a campo contra `pClienteDador` |
| **3. Integración real** | Cambiar `SOAP_ACTION`/tag de resultado en `page.tsx`. **Una llamada de prueba controlada** (1 fila, credenciales de test si existen, o dry-run primero) contra UNIGIS para resolver el riesgo de la sección 2 (SOAP vs REST, casing de `ApiKey`). | Confirmación de que `CrearClientesDadores` responde y de la forma exacta del sobre SOAP real |
| **4. Nav + permisos** | Añadir entrada en `AppLayout.tsx` (2 sitios) + permiso `uniclientedadorcreator.views` en la gestión de Roles. | Módulo accesible desde el menú para roles con permiso |
| **5. QA con Excel real** | Cargar un Excel de Clientes Dadores real (o de prueba), mapear, validar, envío por lotes, revisar `ResultsDashboard`. | Reporte de validación + primeras altas reales en `Cliente` |
| **6. Cierre** | Actualizar memoria (`[[project_uniclientedador]]` → resuelto) y `CLAUDE.md`/docs si aplica. | Memoria y documentación al día |

**Reparto sugerido:** Fases 1-2 son las más mecánicas (copiar+adaptar schema) → ideales para que las haga Gemini de una sentada con este documento como prompt. Fase 3 (llamada real) y la revisión de 2 y 5 las hago yo antes de que se disparen altas reales contra producción — es la parte "hard to reverse" (escribe en la tabla `Cliente` de UNIGIS de Europastry).

---

## 6. Para arrancar con Gemini

Pásale a Gemini este documento completo como contexto, más la instrucción: *"Ejecuta las Fases 1 y 2. No toques `AppLayout.tsx` ni hagas ninguna llamada real a UNIGIS todavía — eso lo valida Claude en la Fase 3."* Cuando tengas el resultado, tráemelo (el diff o la carpeta nueva) y lo reviso contra la sección 1.2/4 de este documento antes de dar luz verde a la Fase 3.
