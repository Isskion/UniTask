# MEMORIA — Integración de SOAP y Swagger a UniTask

> **Fecha**: 2026-03-08  
> **Objetivo**: Agregar los integradores SOAP y Swagger como páginas nativas de Next.js dentro del proyecto UniTask.

---

## Resumen de Cambios

Se migraron los dos integradores standalone (que vivían en `Integrators/SOAP` y `Integrators/Swagger` como apps Vanilla HTML/JS/CSS con su propio `server.js`) a **páginas React nativas** dentro del App Router de Next.js.

Los integradores originales (`Integrators/`) **NO fueron modificados ni eliminados** — siguen intactos como referencia.

---

## Estructura de Archivos Creados

```
UniTask/
├── app/
│   ├── api/unigis/
│   │   ├── proxy/route.ts          ← [NUEVO] Proxy CORS general (reemplaza server.js de ambos integr.)
│   │   └── soap/route.ts           ← [EXISTENTE] Proxy SOAP específico (no modificado)
│   │
│   ├── unisoap/                    ← [NUEVO] Integrador SOAP nativo
│   │   ├── page.tsx                ← Página principal React (login + WSDL + forms + mass + logs)
│   │   └── lib/
│   │       ├── types.ts            ← Tipos TS: WsdlMethod, SchemaNode, SoapState, UNIGIS_ERRORS
│   │       └── soap-engine.ts      ← Motor: parseWsdl, buildSoapXml, resolveSchema, assembleDeepObject
│   │
│   └── uniswagger/                 ← [NUEVO] Integrador Swagger/REST nativo
│       ├── page.tsx                ← Página principal React (login + Swagger JSON + forms + mass + logs)
│       └── lib/
│           ├── types.ts            ← Tipos TS: SwaggerSpec, SwaggerMethod, SwaggerField, UNIGIS_ERRORS
│           └── swagger-engine.ts   ← Motor: resolveSchema, parseSwaggerMethods, getSwaggerFields, injectApiKey
│
├── Integrators/                    ← [SIN CAMBIOS] Originales intactos
│   ├── SOAP/  (index.html, main.js, server.js, styles.css)
│   └── Swagger/  (index.html, main.js, server.js, styles.css)
```

---

## Arquitectura de Cada Integrador

### Integrador SOAP (`/unisoap`)

| Capa | Archivo | Descripción |
|------|---------|-------------|
| **Página** | `page.tsx` | Componente React `'use client'` autocontenido |
| **Tipos** | `lib/types.ts` | `WsdlMethod`, `SchemaNode`, `SoapState`, `LogEntry`, `UNIGIS_ERRORS` |
| **Motor** | `lib/soap-engine.ts` | `parseWsdl()`, `buildSoapXml()`, `resolveSchema()`, `parseSoapResponse()`, `xmlToObject()`, `assembleDeepObject()`, `enforceSchemaArrays()` |

**Flujo**: Login → WSDL parsing → lista de métodos → formulario dinámico + XML preview → envío unitario/masivo vía proxy

### Integrador Swagger (`/uniswagger`)

| Capa | Archivo | Descripción |
|------|---------|-------------|
| **Página** | `page.tsx` | Componente React `'use client'` autocontenido |
| **Tipos** | `lib/types.ts` | `SwaggerSpec`, `SwaggerOperation`, `SwaggerMethod`, `SwaggerField`, `LogEntry`, `UNIGIS_ERRORS`, `HIDDEN_TAGS` |
| **Motor** | `lib/swagger-engine.ts` | `resolveSchema()`, `parseSwaggerMethods()`, `getSwaggerFields()`, `assembleDeepObject()`, `enforceSchemaArrays()`, `injectApiKey()` |

**Flujo**: Login → Swagger JSON loading → grupos y métodos → formulario dinámico + JSON preview → envío unitario/masivo vía proxy → toggle asíncrono

### Proxy General (`/api/unigis/proxy`)

| Verbo | Descripción |
|-------|-------------|
| `GET` | Cargar WSDL / Swagger JSON |
| `POST` | Enviar SOAP XML o REST JSON |
| `PUT/DELETE` | Soporte genérico |
| `OPTIONS` | Preflight CORS |

Reemplaza el `server.js` Express que usaban ambos integradores originales.

---

## Diferencias Clave contra los Originales

| Aspecto | Original (Vanilla) | Nuevo (React/Next.js) |
|---------|--------------------|-----------------------|
| Rendering | DOM imperativo | React declarativo con estado |
| Servidor proxy | `server.js` (Express/Node, puerto propio) | API Route de Next.js (`/api/unigis/proxy`) |
| Estilos | CSS propio (`styles.css`) | Tailwind CSS (inline) |
| Tipo de app | SPA standalone | Página dentro de UniTask |
| Dependencias | `xlsx` + `lucide-static` | `xlsx` (ya incluido en UniTask) |
| TypeScript | No | Sí, completamente tipado |

---

## Rutas de Acceso

| Integrador | Ruta | Descripción |
|------------|------|-------------|
| SOAP | `/unisoap` | Integrador WSDL/SOAP para Logistic Service |
| Swagger | `/uniswagger` | Integrador REST/Swagger para todos los endpoints |

---

## Qué NO se Modificó

- ❌ Ningún archivo del proyecto UniTask existente
- ❌ Ningún archivo dentro de `Integrators/SOAP/` ni `Integrators/Swagger/`
- ❌ La ruta API existente `app/api/unigis/soap/route.ts`
- ❌ Componentes, contextos, hooks existentes del proyecto

---

## Correcciones Recientes (Bugfixes)

- **Proxy CORS (`/api/unigis/proxy`)**: Se agregó `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` para evitar que el proxy interno de Next.js (`fetch()`) rechace conexiones a servidores UNIGIS de prueba que utilizan certificados auto-firmados o inválidos. 
- **Integrador Swagger (`/uniswagger`)**: Se implementó un mecanismo de *fallback* para buscar el archivo JSON de Swagger. Ahora el integrador intenta cargar automáticamente desde múltiples rutas conocidas (`/swagger/docs/v1`, `/api/swagger/docs/v1`, `/swagger/v1/swagger.json`, etc.) ya que distintas versiones de UNIGIS exponen el archivo en rutas diferentes.
- **Preservación de API Key en Uni-swagger (Junio 2026)**:
  - **Problema**: El integrador sobrescribía automáticamente el campo `ApiKey` del request body con el token dinámico de sesión (`MapiToken` de login) y lo mandaba en las cabeceras `ApiKey`/`X-ApiKey`. Al consumir endpoints REST como `CrearTipoVehiculo` de manera unitaria o masiva desde Excel, el servidor UNIGIS arrojaba `INVALID APIKEY` porque estos servicios requieren la API Key estática original de la empresa en el cuerpo del JSON y en la cabecera de autenticación REST.
  - **Solución**: Se actualizó `injectApiKey` (en `main.js` y `swagger-engine.ts`) para que **no sobrescriba** la API Key si esta ya ha sido ingresada de forma manual. Para la integración masiva (`startMassIntegration` / `startMass`), el sistema ahora busca y extrae la API Key configurada en la plantilla de request unitaria y la inyecta a cada fila procesada desde el Excel si la fila no tiene una asignada. Al enviar la petición (`executeServiceCall` y `sendUnitary`/`startMass`), si se detecta una API Key en el cuerpo, esta se usa para las cabeceras/URL query de `ApiKey` y `X-ApiKey`, mientras que el token dinámico de login se reserva para `MapiToken`, `Authorization` y `Token`.
  - **Archivos Modificados**: 
    - [integrators/uni-swagger/main.js](file:///c:/Users/jesus.marquez/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/Documentos/Jesus_UniES/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/UNITASK/UniTask/integrators/uni-swagger/main.js)
    - [public/integrators/uni-swagger/main.js](file:///c:/Users/jesus.marquez/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/Documentos/Jesus_UniES/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/UNITASK/UniTask/public/integrators/uni-swagger/main.js)
    - [app/uniswagger/lib/swagger-engine.ts](file:///c:/Users/jesus.marquez/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/Documentos/Jesus_UniES/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/UNITASK/UniTask/app/uniswagger/lib/swagger-engine.ts)
    - [app/uniswagger/page.tsx](file:///c:/Users/jesus.marquez/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/Documentos/Jesus_UniES/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/UNITASK/UniTask/app/uniswagger/page.tsx)
- **Robusto saneamiento de ApiKey (Recursivo y sin dependencia de esquema) y Cache Buster (Junio 2026)**:
  - **Problema**: El error `INVALID APIKEY` seguía presentándose en la integración masiva debido a que `injectApiKey` dependía estrictamente de que el Swagger tuviera declarado `ApiKey` en sus propiedades. Si el Swagger omitía la propiedad en el esquema, la inyección fallaba. Asimismo, el navegador tendía a cachear el archivo `main.js` viejo, y la decodificación fallaba ante caracteres ocultos (espacios/saltos de línea) en el token.
  - **Solución**:
    1. Se implementó la función recursiva `sanitizeApiKeyInObject` que recorre el cuerpo de la petición por completo (independiente del esquema del Swagger) y sobrescribe de forma segura cualquier propiedad `ApiKey`/`apiKey` vacía o con token largo con la API Key estática limpia.
    2. Se depuró la función `extractStaticApiKeyFromToken` para filtrar caracteres inválidos del Base64 antes de pasarlo a `atob`.
    3. Se añadió un cache-buster (`?v=202606161100`) a la carga de `main.js` en `index.html` (tanto en la carpeta Standalone como en `public`).
    4. Se portó este nuevo saneamiento robusto al integrador de Next.js (`app/uniswagger/page.tsx` y `swagger-engine.ts`).
