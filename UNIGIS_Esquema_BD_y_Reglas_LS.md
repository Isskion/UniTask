# Base de Datos UNIGIS: Modelo Estándar y Asignación de Horarios (LS)

Documentación técnica de la estructura de base de datos estándar de **UNIGIS TMS** y la especificación del procedimiento de asignación automática de horarios de planeamiento para el proyecto **LS**.

---

## 1. 🗄️ Modelo de Datos Estándar de UNIGIS (Común al 99% de los proyectos)

### 1.1 Formato de Horarios en UNIGIS
En UNIGIS, las horas de entrega y ventanas horarias se representan nativamente como enteros (`INT`) que indican la **cantidad de minutos transcurridos desde las 00:00 (medianoche)**:
- `09:00` = **540** ($9 \times 60$)
- `14:00` = **840** ($14 \times 60$)
- `18:00` = **1080** ($18 \times 60$)

---

### 1.2 Tabla `Orden` (Pedidos / Órdenes)
Representa las órdenes/pedidos de transporte a nivel operativo.
- `IdOrden` (`BIGINT`): Clave primaria.
- `FechaEntrega` (`DATETIME`): Fecha prevista de entrega.
- `IdDomicilioOrden` (`BIGINT`): FK a la dirección de destino.
- `InicioHorario1` / `FinHorario1` (`INT`): Horario enviado en la integración por el cliente (**Horario Pedido Cliente**).
- `InicioHorario2` / `FinHorario2` (`INT`): Segunda horquilla enviada por el cliente.
- **`InicioHorarioPlanificado`** / **`FinHorarioPlanificado`** (`INT`): Horarios calculados para ser consumidos por el algoritmo de ruteo/planeamiento (**Horario Planeamiento**).
- `Varchar1` / `Tipo` (`VARCHAR`): Clasificación del servicio (ej. `'VT'` para Vehículo Dedicado).
- `CitaEnFechaEntrega` (`BIT`), `IdTipoCita` (`INT`): Referencias a citas de entrega.

---

### 1.3 Tabla `DomicilioOrden` (Destinatarios / Direcciones)
Almacena los datos maestros y restricciones del punto de entrega.
- `IdDomicilioOrden` (`BIGINT`): Clave primaria.
- `InicioHorario1` / `FinHorario1` (`INT`): Horquilla habitual de entrega en el domicilio.
- `InicioHorario2` / `FinHorario2` (`INT`): Segunda horquilla de entrega en el domicilio.
- **`RequiereTurno`** (`BIT`): Indicador de si el domicilio requiere Cita/Turno obligatorio.
- `Varchar1` (`VARCHAR`): Clasificación del destinatario (ej. `'Centralización'`, `'Directo'`).

---

### 1.4 Tabla `DomicilioOrdenVentanaHoraria` (Ventanas Horarias Auxiliares)
Ventanas horarias específicas por día para un domicilio.
- `IdDomicilioOrdenVentanaHoraria` (`INT`): Clave primaria.
- `IdDomicilioOrden` (`BIGINT`): FK a `DomicilioOrden`.
- `InicioHorario1`, `FinHorario1`, `InicioHorario2`, `FinHorario2` (`INT`): Horquillas permitidas.
- `DiasUso` (`VARCHAR`): Cadena con los días habilitados.

---

## 2. ⚙️ Reglas de Negocio: Asignación de Horario de Planeamiento (Sección 4.3.4 LS)

El procedimiento evalúa las órdenes secuencialmente hasta aplicar la primera regla que se cumpla:

1. **Regla 01 - Vehículo Dedicado (VT):**
   - *Condición:* `TipoServicio` / `Varchar1` es `'VT'` o `'VEHICULO DEDICADO'`.
   - *Resultado:* Asigna el horario de integración del cliente (`InicioHorario1` / `FinHorario1` de la `Orden`).

2. **Regla 02 - Centralizaciones / Citas:**
   - *Condición:* Destinatario clasificado como `'Centralización'` o con `RequiereTurno = 1`.
   - *Resultado:* Asigna el horario del pedido o la horquilla configurada en el domicilio/ventana maestro.

3. **Regla 03 / 04 - Destinatarios Variables o Fijos:**
   - *Condición:* Existe horario configurado en los datos maestros del domicilio (`DomicilioOrden` o `DomicilioOrdenVentanaHoraria`).
   - *Resultado:* Asigna el horario configurado en el maestro de domicilios.

4. **Regla 05 - Horario Comercial (Default):**
   - *Condición:* Ninguna de las reglas 01 a 04 aplica.
   - *Resultado:* Asigna horario comercial por defecto **09:00 a 18:00** (`540` a `1080` minutos).

---

## 3. 📜 Stored Procedure Estándar: `dbo.sp_LS_AsignarHorarioPlaneamiento`

```sql
CREATE OR ALTER PROCEDURE dbo.sp_LS_AsignarHorarioPlaneamiento
    @IdOrden BIGINT = NULL,           -- NULL para procesar masivo por fecha
    @FechaEntrega DATETIME = NULL,    -- Fecha a procesar (si @IdOrden es NULL)
    @Debug BIT = 0                    -- 1: Solo simula y muestra resultado, 0: Actualiza BD
AS
BEGIN
    SET NOCOUNT ON;

    -- Constantes UNIGIS (Minutos desde 00:00)
    -- 09:00 = 540 min, 18:00 = 1080 min
    DECLARE @HorarioComercialInicio INT = 540;  -- 09:00
    DECLARE @HorarioComercialFin    INT = 1080; -- 18:00

    -- 1. Tabla Temporal de Trabajo
    IF OBJECT_ID('tempdb..#OrdenesProcesar') IS NOT NULL DROP TABLE #OrdenesProcesar;

    CREATE TABLE #OrdenesProcesar (
        IdOrden BIGINT PRIMARY KEY,
        FechaEntrega DATETIME,
        TipoServicio VARCHAR(50),
        RequiereTurno BIT,
        TipoDestinatario VARCHAR(50),
        InicioHorario1 INT,
        FinHorario1 INT,
        DomInicioHorario1 INT,
        DomFinHorario1 INT,
        VentanaInicio1 INT,
        VentanaFin1 INT,
        InicioHorarioPlanificado INT,
        FinHorarioPlanificado INT,
        ReglaAplicada VARCHAR(100)
    );

    -- 2. Cargar datos de la BD real
    INSERT INTO #OrdenesProcesar (
        IdOrden,
        FechaEntrega,
        TipoServicio,
        RequiereTurno,
        TipoDestinatario,
        InicioHorario1,
        FinHorario1,
        DomInicioHorario1,
        DomFinHorario1,
        VentanaInicio1,
        VentanaFin1
    )
    SELECT 
        o.IdOrden,
        o.FechaEntrega,
        UPPER(TRIM(ISNULL(o.Varchar1, ISNULL(o.Tipo, '')))),
        ISNULL(d.RequiereTurno, 0),
        UPPER(TRIM(ISNULL(d.Varchar1, ''))),
        o.InicioHorario1,
        o.FinHorario1,
        d.InicioHorario1,
        d.FinHorario1,
        vh.InicioHorario1,
        vh.FinHorario1
    FROM dbo.Orden o WITH (NOLOCK)
    INNER JOIN dbo.DomicilioOrden d WITH (NOLOCK) ON o.IdDomicilioOrden = d.IdDomicilioOrden
    LEFT JOIN dbo.DomicilioOrdenVentanaHoraria vh WITH (NOLOCK) ON d.IdDomicilioOrden = vh.IdDomicilioOrden
    WHERE (@IdOrden IS NOT NULL AND o.IdOrden = @IdOrden)
       OR (@IdOrden IS NULL AND @FechaEntrega IS NOT NULL AND CAST(o.FechaEntrega AS DATE) = CAST(@FechaEntrega AS DATE))
       OR (@IdOrden IS NULL AND @FechaEntrega IS NULL AND o.InicioHorarioPlanificado IS NULL);

    IF NOT EXISTS (SELECT 1 FROM #OrdenesProcesar)
    BEGIN
        PRINT 'No se encontraron órdenes para procesar.';
        RETURN;
    END

    -- 3. Aplicación de Reglas Secuenciales 4.3.4 (LS)
    -- REGLA 01: Vehículo Dedicado (VT)
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = InicioHorario1,
        FinHorarioPlanificado = FinHorario1,
        ReglaAplicada = 'Regla 01 - Vehículo Dedicado (VT)'
    WHERE TipoServicio LIKE '%VT%' OR TipoServicio LIKE '%DEDICADO%';

    -- REGLA 02: Destinatario Centralización / Cita
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = ISNULL(InicioHorario1, ISNULL(VentanaInicio1, DomInicioHorario1)),
        FinHorarioPlanificado = ISNULL(FinHorario1, ISNULL(VentanaFin1, DomFinHorario1)),
        ReglaAplicada = 'Regla 02 - Centralización / Cita'
    WHERE ReglaAplicada IS NULL
      AND (TipoDestinatario LIKE '%CENTRALIZA%' OR RequiereTurno = 1);

    -- REGLA 03 / 04: Horarios en Maestro Domicilio
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = ISNULL(VentanaInicio1, DomInicioHorario1),
        FinHorarioPlanificado = ISNULL(VentanaFin1, DomFinHorario1),
        ReglaAplicada = 'Regla 03/04 - Horario Maestro Domicilio'
    WHERE ReglaAplicada IS NULL
      AND (DomInicioHorario1 IS NOT NULL OR VentanaInicio1 IS NOT NULL);

    -- REGLA 05: Horario Comercial Default (09:00 a 18:00)
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = @HorarioComercialInicio,
        FinHorarioPlanificado = @HorarioComercialFin,
        ReglaAplicada = 'Regla 05 - Horario Comercial Default (09:00 - 18:00)'
    WHERE ReglaAplicada IS NULL;

    -- 4. Verificación o Actualización
    IF @Debug = 1
    BEGIN
        SELECT 
            IdOrden,
            FechaEntrega,
            TipoServicio,
            RequiereTurno,
            InicioHorario1 AS ClienteInicioMin,
            FinHorario1 AS ClienteFinMin,
            InicioHorarioPlanificado AS PlanificadoInicioMin,
            FinHorarioPlanificado AS PlanificadoFinMin,
            RIGHT('0' + CAST(InicioHorarioPlanificado / 60 AS VARCHAR), 2) + ':' + 
            RIGHT('0' + CAST(InicioHorarioPlanificado % 60 AS VARCHAR), 2) AS HoraPlanificadoInicioHHMM,
            RIGHT('0' + CAST(FinHorarioPlanificado / 60 AS VARCHAR), 2) + ':' + 
            RIGHT('0' + CAST(FinHorarioPlanificado % 60 AS VARCHAR), 2) AS HoraPlanificadoFinHHMM,
            ReglaAplicada
        FROM #OrdenesProcesar;
    END
    ELSE
    BEGIN
        BEGIN TRANSACTION;

        UPDATE o
        SET 
            o.InicioHorarioPlanificado = p.InicioHorarioPlanificado,
            o.FinHorarioPlanificado = p.FinHorarioPlanificado
        FROM dbo.Orden o
        INNER JOIN #OrdenesProcesar p ON o.IdOrden = p.IdOrden;

        COMMIT TRANSACTION;

        PRINT CONCAT('Órdenes actualizadas con éxito: ', @@ROWCOUNT);
    END
END;
GO
```
