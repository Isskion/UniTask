USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_ProcesarRuteoIntermedio] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           15/05/2026
-- VERSIÓN:         v1.0
-- DESCRIPCIÓN:     SP Orquestador — Punto de entrada único para el proceso de ruteo
--                  con depósitos intermedios. Se invoca desde una transición de estado
--                  de Pedido configurada en UNIGIS.
--
-- INTEGRACIÓN:     Configurar en UNIGIS como proceso asociado a una transición de estado:
--                    Entidad:      Pedido
--                    Evento:       Transición de Estado (ej: GRABADO → EN_RUTA, o estado custom)
--                    Tipo Proceso: Stored Procedure
--                    SP:           Z_SP_ProcesarRuteoIntermedio
--                    Parámetro:    @IdPedido = {IdPedido}  (tag de UNIGIS)
--
-- FLUJO:
--   1. Validaciones de precondición
--   2. Resolver si el Pedido tiene ruta intermedia configurada
--   3. Si sí, generar las paradas intermedias en el Viaje
--   4. Opcionalmente, solicitar cambio de estado del Pedido
--   5. Registrar bitácora completa
--
-- LLAMADO POR:     Motor de procesos UNIGIS (transición de estado)
-- LLAMA A:         Z_SP_ResolverRutaInterDepositos (paso 2)
--                  Z_SP_GenerarParadasIntermedias  (paso 3)
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_ProcesarRuteoIntermedio]
    @IdPedido INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TieneIntermedios  BIT = 0,
            @IdEstadoPedido    INT,
            @IdDepSalida       INT,
            @IdDepLlegada      INT,
            @BitacoraMsg       VARCHAR(1000);

    -- ══════════════════════════════════════════════════════════════════════════
    -- 1. VALIDACIONES DE PRECONDICIÓN
    -- ══════════════════════════════════════════════════════════════════════════

    -- Verificar que el Pedido existe
    SELECT 
        @IdEstadoPedido = IdEstadoPedido,
        @IdDepSalida    = IdDepositoSalida,
        @IdDepLlegada   = IdDepositoLlegada
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    IF @IdEstadoPedido IS NULL
    BEGIN
        PRINT 'ProcesarRuteo: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' no encontrado. Abortando.';
        RETURN;
    END

    -- No procesar pedidos cancelados
    IF @IdEstadoPedido = 108
    BEGIN
        PRINT 'ProcesarRuteo: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' está cancelado (108). Abortando.';
        RETURN;
    END

    -- No procesar si origen = destino
    IF ISNULL(@IdDepSalida, 0) = ISNULL(@IdDepLlegada, 0)
    BEGIN
        SET @BitacoraMsg = 'ProcesarRuteo: Origen=Destino (' + ISNULL(CAST(@IdDepSalida AS VARCHAR(10)), 'NULL') + '). Sin intermedios aplicables.';
        PRINT @BitacoraMsg;
        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, @BitacoraMsg, GETUTCDATE(), 'SYSTEM');
        RETURN;
    END

    PRINT '═══════════════════════════════════════════════════════════════';
    PRINT 'ProcesarRuteo: INICIO para Pedido ' + CAST(@IdPedido AS VARCHAR(20))
        + ' | Estado=' + CAST(@IdEstadoPedido AS VARCHAR(5))
        + ' | Origen=' + ISNULL(CAST(@IdDepSalida AS VARCHAR(10)), 'NULL')
        + ' → Destino=' + ISNULL(CAST(@IdDepLlegada AS VARCHAR(10)), 'NULL');
    PRINT '═══════════════════════════════════════════════════════════════';

    -- ══════════════════════════════════════════════════════════════════════════
    -- 2. RESOLVER RUTA INTERMEDIA
    -- ══════════════════════════════════════════════════════════════════════════
    EXEC Z_SP_ResolverRutaInterDepositos 
        @IdPedido          = @IdPedido,
        @TieneIntermedios  = @TieneIntermedios OUTPUT;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 3. GENERAR PARADAS INTERMEDIAS SI APLICA
    -- ══════════════════════════════════════════════════════════════════════════
    IF @TieneIntermedios = 1
    BEGIN
        PRINT 'ProcesarRuteo: Ruta intermedia detectada. Generando paradas...';

        EXEC Z_SP_GenerarParadasIntermedias @IdPedido = @IdPedido;

        -- ══════════════════════════════════════════════════════════════════════
        -- 4. (OPCIONAL) SOLICITAR CAMBIO DE ESTADO DEL PEDIDO
        -- ══════════════════════════════════════════════════════════════════════
        -- Descomentar si se quiere cambiar el estado del Pedido después de generar intermedias.
        -- Ajustar IdEstadoDestino al estado que corresponda en vuestro workflow.
        /*
        INSERT INTO CambioEstadoSolicitud
        (Entidad, IdEntidad, IdEstadoDestino, ValidarTransicion, MismoEstado, 
         FechaCreacion, FechaEjecucion, Observacion, Estado, Intento, IdProceso)
        VALUES
        ('Pedido', @IdPedido, <ID_ESTADO_DESTINO>, 0, 0, 
         GETUTCDATE(), GETUTCDATE(), 'RuteoIntermedio: Paradas intermedias generadas', 'PENDIENTE', 0, NULL);
        */

        SET @BitacoraMsg = 'ProcesarRuteo: ✓ Completado. Paradas intermedias generadas para ruta '
            + ISNULL(CAST(@IdDepSalida AS VARCHAR(10)), '?') + '→' + ISNULL(CAST(@IdDepLlegada AS VARCHAR(10)), '?');
    END
    ELSE
    BEGIN
        SET @BitacoraMsg = 'ProcesarRuteo: Sin ruta intermedia configurada para '
            + ISNULL(CAST(@IdDepSalida AS VARCHAR(10)), '?') + '→' + ISNULL(CAST(@IdDepLlegada AS VARCHAR(10)), '?')
            + '. No se requieren paradas adicionales.';
    END

    -- ══════════════════════════════════════════════════════════════════════════
    -- 5. BITÁCORA FINAL
    -- ══════════════════════════════════════════════════════════════════════════
    INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
    VALUES (@IdPedido, @BitacoraMsg, GETUTCDATE(), 'SYSTEM');

    PRINT @BitacoraMsg;
    PRINT '═══════════════════════════════════════════════════════════════';
    PRINT 'ProcesarRuteo: FIN';
    PRINT '═══════════════════════════════════════════════════════════════';

END
GO
