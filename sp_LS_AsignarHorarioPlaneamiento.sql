USE [UNIGIS] -- Cambiar por el nombre de tu base de datos UNIGIS si es diferente
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =========================================================================================
-- Autor:       UNISOLUTIONS / Proyecto LS
-- Fecha:       2026-08-03
-- Descripción: Procedimiento para la asignación automática del horario de planeamiento 
--              en pedidos/órdenes de transporte en UNIGIS TMS, aplicando las reglas 
--              secuenciales del apartado 4.3.4 (LS):
--              - Regla 01: Vehículo Dedicado (VT) -> Asigna horario pedido cliente
--              - Regla 02: Centralizaciones / Citas -> Asigna horario pedido o ventana cita
--              - Regla 03/04: Horario Maestro Domicilio -> Horquilla de DomicilioOrden
--              - Regla 05: Horario Comercial Default (09:00 - 18:00 -> 540 a 1080 min)
-- =========================================================================================
CREATE OR ALTER PROCEDURE dbo.sp_LS_AsignarHorarioPlaneamiento
    @IdOrden BIGINT = NULL,           -- NULL para procesar masivo por fecha
    @FechaEntrega DATETIME = NULL,    -- Fecha a procesar (si @IdOrden es NULL)
    @Debug BIT = 0                    -- 1: Solo simula y muestra resultado, 0: Actualiza BD
AS
BEGIN
    SET NOCOUNT ON;

    -- -------------------------------------------------------------------------
    -- Constantes UNIGIS (Minutos desde 00:00)
    -- 09:00 = 540 min (9 * 60), 18:00 = 1080 min (18 * 60)
    -- -------------------------------------------------------------------------
    DECLARE @HorarioComercialInicio INT = 540;  -- 09:00
    DECLARE @HorarioComercialFin    INT = 1080; -- 18:00

    -- -------------------------------------------------------------------------
    -- 1. Tabla Temporal de Trabajo
    -- -------------------------------------------------------------------------
    IF OBJECT_ID('tempdb..#OrdenesProcesar') IS NOT NULL DROP TABLE #OrdenesProcesar;

    CREATE TABLE #OrdenesProcesar (
        IdOrden BIGINT PRIMARY KEY,
        FechaEntrega DATETIME,
        TipoServicio VARCHAR(50),
        RequiereTurno BIT,
        TipoDestinatario VARCHAR(50),
        -- Horarios del Pedido (Cliente)
        InicioHorario1 INT,
        FinHorario1 INT,
        -- Horarios Maestros Domicilio
        DomInicioHorario1 INT,
        DomFinHorario1 INT,
        -- Horarios Auxiliares Ventana
        VentanaInicio1 INT,
        VentanaFin1 INT,
        -- Resultados Calculados para Planeamiento
        InicioHorarioPlanificado INT,
        FinHorarioPlanificado INT,
        ReglaAplicada VARCHAR(100)
    );

    -- -------------------------------------------------------------------------
    -- 2. Cargar datos de las tablas nativas de UNIGIS (Orden, DomicilioOrden)
    -- -------------------------------------------------------------------------
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

    -- -------------------------------------------------------------------------
    -- 3. Aplicación de Reglas Secuenciales 4.3.4 (LS)
    -- -------------------------------------------------------------------------

    -- REGLA 01: Vehículo Dedicado (VT) -> Asignar horario enviado en el pedido del cliente
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = InicioHorario1,
        FinHorarioPlanificado = FinHorario1,
        ReglaAplicada = 'Regla 01 - Vehículo Dedicado (VT)'
    WHERE TipoServicio LIKE '%VT%' OR TipoServicio LIKE '%DEDICADO%';

    -- REGLA 02: Destinatario Centralización / Cita -> Asignar horario del pedido o ventana cita
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = ISNULL(InicioHorario1, ISNULL(VentanaInicio1, DomInicioHorario1)),
        FinHorarioPlanificado = ISNULL(FinHorario1, ISNULL(VentanaFin1, DomFinHorario1)),
        ReglaAplicada = 'Regla 02 - Centralización / Cita'
    WHERE ReglaAplicada IS NULL
      AND (TipoDestinatario LIKE '%CENTRALIZA%' OR RequiereTurno = 1);

    -- REGLA 03 / 04: Destinatarios Variables / Fijos con Horario en Maestro
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = ISNULL(VentanaInicio1, DomInicioHorario1),
        FinHorarioPlanificado = ISNULL(VentanaFin1, DomFinHorario1),
        ReglaAplicada = 'Regla 03/04 - Horario Maestro Domicilio'
    WHERE ReglaAplicada IS NULL
      AND (DomInicioHorario1 IS NOT NULL OR VentanaInicio1 IS NOT NULL);

    -- REGLA 05: Horario Comercial Default (09:00 a 18:00 -> 540 a 1080 min)
    UPDATE #OrdenesProcesar
    SET 
        InicioHorarioPlanificado = @HorarioComercialInicio,
        FinHorarioPlanificado = @HorarioComercialFin,
        ReglaAplicada = 'Regla 05 - Horario Comercial Default (09:00 - 18:00)'
    WHERE ReglaAplicada IS NULL;

    -- -------------------------------------------------------------------------
    -- 4. Verificación o Actualización en la BD
    -- -------------------------------------------------------------------------
    IF @Debug = 1
    BEGIN
        SELECT 
            IdOrden,
            FechaEntrega,
            TipoServicio,
            RequiereTurno,
            -- Formato Minutos UNIGIS
            InicioHorario1 AS ClienteInicioMin,
            FinHorario1 AS ClienteFinMin,
            InicioHorarioPlanificado AS PlanificadoInicioMin,
            FinHorarioPlanificado AS PlanificadoFinMin,
            -- Formato visual HH:MM
            RIGHT('0' + CAST(InicioHorarioPlanificado / 60 AS VARCHAR), 2) + ':' + 
            RIGHT('0' + CAST(InicioHorarioPlanificado % 60 AS VARCHAR), 2) AS HoraPlanificadoInicioHHMM,
            RIGHT('0' + CAST(FinHorarioPlanificado / 60 AS VARCHAR), 2) + ':' + 
            RIGHT('0' + CAST(FinHorarioPlanificado % 60 AS VARCHAR), 2) AS HoraPlanificadoFinHHMM,
            ReglaAplicada
        FROM #OrdenesProcesar;
    END
    ELSE
    BEGIN
        -- Actualizar los campos nativos InicioHorarioPlanificado y FinHorarioPlanificado en la tabla Orden
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

-- =========================================================================================
-- EJEMPLOS DE USO:
-- =========================================================================================
-- 1. Simulación Debug para una Orden específica (No modifica datos):
-- EXEC dbo.sp_LS_AsignarHorarioPlaneamiento @IdOrden = 101, @Debug = 1;

-- 2. Ejecución real para una Orden específica:
-- EXEC dbo.sp_LS_AsignarHorarioPlaneamiento @IdOrden = 101, @Debug = 0;

-- 3. Ejecución real masiva por fecha de entrega:
-- EXEC dbo.sp_LS_AsignarHorarioPlaneamiento @FechaEntrega = '2026-08-04', @Debug = 0;
-- =========================================================================================
