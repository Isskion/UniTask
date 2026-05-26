# Proyecto UNIGIS: Europastry (EUP) - Base de Conocimiento de Base de Datos y Stored Procedures

Este directorio sirve como repositorio de conocimiento, documentación técnica y estándares para los procedimientos almacenados (SPs) y la base de datos del entorno de **Europastry (EUP)**.

---

## 💡 Modelo de Negocio: Shipper (Cargador)
A diferencia de otros entornos como Luis Simões (Carrier), **Europastry (EUP)** actúa bajo el modelo de *Shipper (Cargador)*. Planifica y distribuye su propia mercadería (cargos cautivos mono-cliente).
Esto implica que:
- Las entidades principales están directamente ligadas a sus almacenes (Depósitos).
- Los conductores y vehículos pertenecen a su flota o transportistas asignados directamente bajo operaciones controladas.

---

## 🔍 Campos Dinámicos y Relaciones Personalizadas

En el entorno de EUP, es común enriquecer las entidades estándar de UNIGIS mediante tablas de extensión dinámicas (sufijo `_Dyn`).

- **`dbo.Conductor_Dyn`**: Extiende la tabla de conductores (`dbo.Conductor`). 
  - `operacion2`: Contiene el ID (en formato texto/número) de la operación a la cual pertenece el conductor cuando este es importado a través de interfaces de entrada.
- **`dbo.OperacionConductor`**: Tabla puente nativa que asocia conductores a operaciones habilitadas.
  - Campos clave: `IdOperacionConductor` (Clave primaria autogenerada/IDENTITY), `IdConductor` e `IdOperacion`.

---

## 🛠️ Catálogo de Stored Procedures Personalizados (`Z_SP_`)

Todos los desarrollos a medida se nombran bajo el esquema de prefijo `Z_` o `Z_SP_` para diferenciarlos del estándar del producto.

### 1. **[Z_SP_RelacionarConductorOperacion](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_RelacionarConductorOperacion.sql)**
- **Objetivo:** Relaciona automáticamente a un conductor con su operación correspondiente al finalizar el proceso de importación/creación en la interfaz.
- **Origen de datos:** 
  - `IdConductor` de `dbo.Conductor`
  - `IdOperacion` desde `TRY_CAST(dbo.Conductor_Dyn.operacion2 AS INT)`
- **Modos de Ejecución:**
  1. **Individual (Por evento):** Pasando el parámetro `@IdConductor INT`. Se ejecuta en tiempo real tras la creación individual de un conductor.
  2. **Por Lote (Bulk):** Al llamarse sin parámetros (`EXEC dbo.Z_SP_RelacionarConductorOperacion`), el SP busca todos los conductores existentes en `Conductor_Dyn` que tengan el campo `operacion2` informado, pero que aún no tengan la fila correspondiente en `OperacionConductor`.
- **Script de Pruebas Asociado:** **[Z_Test_RelacionarConductorOperacion.sql](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_Test_RelacionarConductorOperacion.sql)** (Valida el comportamiento e idempotencia usando el conductor de pruebas `IdConductor = 7`).

### Otros SPs de Integración EUP en el repositorio:
- **[Z_SP_CrearPedidoCero](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_CrearPedidoCero.sql)**: Proceso de validación de pedidos y transiciones de estado para pedidos en lote.
- **[Z_SP_ProponerVehiculoViaje](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_ProponerVehiculoViaje.sql)**: Asignación masiva inteligente de vehículos y conductores para jornadas específicas basándose en prioridades por zona.
- **[Z_SP_AnularCrossdock](file:///c:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/db/Z_SP_AnularCrossdock.sql)**: Gestión de estados operacionales y rollback de planes de carga de crossdocking.

---

## 📐 Estándares de Desarrollo para SPs de EUP

Al escribir o modificar procedimientos almacenados en Europastry, se deben cumplir los siguientes requisitos:

1. **Uso de Cabecera Estándar:** Incluir siempre autor, fecha, descripción y desde dónde se llama (evento, trigger, interfaz).
2. **Compatibilidad con `CREATE OR ALTER`:** Evitar borrar objetos mediante `DROP` previos si no es estrictamente necesario; usar la sintaxis moderna `CREATE OR ALTER PROCEDURE`.
3. **Manejo de Transacciones Seguro:** 
   - Declarar `SET NOCOUNT ON;` y `SET XACT_ABORT ON;`.
   - Implementar bloques `BEGIN TRY ... END TRY / BEGIN CATCH ... END CATCH`.
   - Controlar transacciones con control de contador activo: `IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;`.
4. **Validaciones de Integridad e Idempotencia:**
   - Evitar duplicar relaciones (ej. hacer un `IF NOT EXISTS` antes de insertar registros en tablas puente).
   - Validar la existencia de claves foráneas antes de realizar asignaciones.
   - Utilizar `TRY_CAST` o `TRY_CONVERT` para parsear campos provenientes de tablas dinámicas (`_Dyn`), previniendo caídas ante formatos de texto no conformes.
