# Resultado de Implementación — Fases 1 y 2: UniClienteDadorCreator

**Fecha:** 2026-08-31  
**Módulo:** `app/uniclientedadorcreator/`  
**Estado:** ✅ Fases 1 y 2 completadas y validadas contra la especificación.  
**Siguiente Paso:** Fase 3 (Prueba de integración real y validación por Claude).

---

## 1. Resumen Ejecutivo

Siguiendo las instrucciones del plan de trabajo (`docs/uniclientedadorcreator-plan.md`):
- Se ha creado el scaffold completo e independiente de **`UniClienteDadorCreator`** en `app/uniclientedadorcreator/`.
- Se adaptó todo el modelo de datos, esquema de campos y generador XML a la estructura oficial de UNIGIS para altas independientes de **Clientes Dadores** (`pClienteDador`, tabla `Cliente`).
- **Restricciones respetadas estrictamente:**
  - ❌ **No se modificó `AppLayout.tsx`** (se mantiene para Fase 4).
  - ❌ **No se realizaron llamadas reales a UNIGIS** (se mantiene para Fase 3).
  - ❌ No se alteraron módulos preexistentes.

---

## 2. Detalle de lo Realizado

### Fase 1: Scaffold del Módulo
1. **Estructura de Directorios:**
   - Creado en `app/uniclientedadorcreator/` replicando la arquitectura modular de `uniclientcreator`.
   - Adaptación de imports y referencias internas (`@/app/uniclientedadorcreator/...`).
2. **Interfaz de Usuario:**
   - Textos, etiquetas, modales y headers adaptados a la entidad **Cliente Dador** (dueño de la carga).
   - Limpieza de codificación UTF-8 en modales de ayuda, wizards, exporter y dashboard de resultados.

---

### Fase 2: Esquema (`schema.ts`) y Motor XML (`xmlBuilder.ts`)

#### A. Esquema de Datos (`_src/data/schema.ts`)
Conforme a la definición del Swagger (`LogisticService_CrearClientesDadores`, `pClienteDador`, línea 9536):

```typescript
export const SCHEMA = {
  Root: {
    ClienteDador: {
      ReferenciaExterna: '',        // Clave de negocio (Requerido)
      RazonSocial: '',              // Nombre/Razón Social (Requerido)
      NombreFantasia: '',
      Cuit: '',
      Telefono1: '',
      Telefono2: '',
      Direccion: '',                // Texto libre
      Localidad: '',                // Texto libre
      eMailGestorDeFlota: '',
      CentroDeCosto: '',
      IdEstado: '',
      IdEstado_opcional: '',
      IntegrarRNDC: 'bool',
      IntegrarRNDC_Opcional: 'bool',
      operaciones: {
        _isArray: true,
        _itemTag: 'pOperacion',
        _fields: {
          Descripcion: '',
          IdOperacion: '',
          Referencia: '',
          Sucursal: '',
          ReferenciaExterna: '',
        },
      },
      CampoDinamico: {
        _isArray: true,
        _itemTag: 'CampoValor',
        _fields: { Campo: '', Valor: '' },
      },
    },
  },
};
```

- **Campos Requeridos:** `ReferenciaExterna` y `RazonSocial`.
- **Known Booleans:** `IntegrarRNDC`, `IntegrarRNDC_Opcional`.
- **Grupos de Campos (`FIELD_GROUPS`):**
  - `pClienteDador`: Datos maestros del cliente dador.
  - `Operaciones`: Sub-entidad de operaciones vinculadas (`pOperacion`).
  - `Dinamicos`: Soporte dinámico para `CampoDinamico` (`CampoValor`).

#### B. Generador XML (`_src/services/xmlBuilder.ts`)
Implementa el sobre SOAP 1.1 con el namespace `unis:http://unisolutions.com.ar/` y la operación `CrearClientesDadores`:

- Envoltorio raíz: `<unis:CrearClientesDadores>`
- Autenticación: `<unis:ApiKey>` (con `ApiKey` respetando mayúscula inicial)
- Array contenedor: `<unis:clientes>`
- Elemento de cliente: `<unis:pClienteDador>`
- Soporte para arrays anidados:
  - `<unis:operaciones><unis:pOperacion>...</unis:pOperacion></unis:operaciones>`
  - `<unis:CampoDinamico><unis:CampoValor>...</unis:CampoValor></unis:CampoDinamico>`

#### C. Lógica de Página y Envío (`page.tsx`)
- `SOAP_ACTION`: `'http://unisolutions.com.ar/CrearClientesDadores'`.
- Tag de resultado evaluado: `CrearClientesDadoresResult` (con fallback a `Result` y patrones de error SOAP `faultstring`, `Descripcion`, `Mensaje`).
- Soporte completo para **Modo Simulación (Dry Run)** para validaciones locales sin tocar el servidor.

#### D. Validación y Plantillas
- `_src/utils/validation.ts`: Valida campos requeridos y formatos enteros (`IdEstado`, `IdOperacion`).
- `_src/data/fieldDescriptions.ts`: Descripciones contextuales para cada campo de `pClienteDador`.
- `_src/data/mappingTemplates.ts`: Plantillas preconfiguradas:
  1. *Cliente Dador Estándar* (Referencia, Razón Social, CUIT, Contacto).
  2. *Cliente Dador con Operación* (incluye ID Operación, Sucursal y Centro de Costos).

---

## 3. Pruebas y Validación Ejecutada

Se ejecutó un script de verificación automatizado (`test_xml_builder.js`) probando casos de uso representativos:

### Caso 1: Cliente Dador Estándar
**XML Generado:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearClientesDadores>
      <unis:ApiKey>SECRET_API_KEY_123</unis:ApiKey>
      <unis:clientes>
        <unis:pClienteDador>
        <unis:ReferenciaExterna>DAD-001</unis:ReferenciaExterna>
        <unis:RazonSocial>Europastry S.A.</unis:RazonSocial>
        <unis:NombreFantasia>Europastry</unis:NombreFantasia>
        <unis:Cuit>A08123456</unis:Cuit>
        <unis:Telefono1>+34 93 123 4567</unis:Telefono1>
        <unis:Direccion>Plaza Xavier Cugat 2</unis:Direccion>
        <unis:Localidad>Sant Cugat del Valles</unis:Localidad>
        <unis:eMailGestorDeFlota>logistica@europastry.com</unis:eMailGestorDeFlota>
        <unis:CentroDeCosto>CC-ES-01</unis:CentroDeCosto>
        <unis:IdEstado>1</unis:IdEstado>
        <unis:IntegrarRNDC>true</unis:IntegrarRNDC>
        </unis:pClienteDador>
      </unis:clientes>
    </unis:CrearClientesDadores>
  </soapenv:Body>
</soapenv:Envelope>
```

### Caso 2: Cliente Dador con Operación y Campos Dinámicos
**XML Generado:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
  <soapenv:Header/>
  <soapenv:Body>
    <unis:CrearClientesDadores>
      <unis:ApiKey>SECRET_API_KEY_123</unis:ApiKey>
      <unis:clientes>
        <unis:pClienteDador>
        <unis:ReferenciaExterna>DAD-002</unis:ReferenciaExterna>
        <unis:RazonSocial>Transpais Distribucion</unis:RazonSocial>
        <unis:operaciones>
          <unis:pOperacion>
            <unis:Descripcion>Distribución</unis:Descripcion>
            <unis:IdOperacion>3</unis:IdOperacion>
            <unis:Sucursal>SUC-01</unis:Sucursal>
          </unis:pOperacion>
        </unis:operaciones>
        <unis:CampoDinamico>
          <unis:CampoValor>
            <unis:Campo>TIPO_SERVICIO</unis:Campo>
            <unis:Valor>REFRIGERADO</unis:Valor>
          </unis:CampoValor>
        </unis:CampoDinamico>
        </unis:pClienteDador>
      </unis:clientes>
    </unis:CrearClientesDadores>
  </soapenv:Body>
</soapenv:Envelope>
```

---

## 4. Archivos Modificados / Creados

| Ruta | Propósito |
|---|---|
| `app/uniclientedadorcreator/page.tsx` | Página principal y flujo de envío por lotes |
| `app/uniclientedadorcreator/_src/data/schema.ts` | Esquema formal de `pClienteDador` |
| `app/uniclientedadorcreator/_src/services/xmlBuilder.ts` | Generador del payload SOAP para `CrearClientesDadores` |
| `app/uniclientedadorcreator/_src/data/fieldDescriptions.ts` | Tooltips y documentación de campos |
| `app/uniclientedadorcreator/_src/data/mappingTemplates.ts` | Plantillas de mapeo estándar |
| `app/uniclientedadorcreator/_src/data/errorCodes.ts` | Catálogo de errores UNIGIS |
| `app/uniclientedadorcreator/_src/utils/validation.ts` | Reglas de validación previa al envío |
| `app/uniclientedadorcreator/_src/store/appStore.ts` | Estado Zustand adaptado |
| `app/uniclientedadorcreator/_src/components/*` | Componentes de interfaz, wizards y reportes |

---

## 5. Listo para Fase 3 (Validación e Integración Real)
El código queda preparado para que Claude pueda validar el diff y realizar las pruebas controladas de la **Fase 3** (prueba de conectividad y primera llamada de prueba contra el endpoint real de UNIGIS).
