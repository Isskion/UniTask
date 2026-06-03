USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           15/05/2026
-- DESCRIPCIÓN:     Orquestador Crossdock — Punto de entrada desde transición de estado.
--                  Configurar en UNIGIS: Entidad=Pedido, SP=Z_SP_ProcesarCrossdock, @IdPedido={IdPedido}
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_ProcesarCrossdock]
    @IdPedido INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TieneIntermedios BIT = 0,
            @IdEstadoPedido   INT,
            @IdDepSalida      INT,
            @IdDepLlegada     INT;

    -- 1. Validaciones
    SELECT @IdEstadoPedido = IdEstadoPedido,
           @IdDepSalida    = IdDepositoSalida,
           @IdDepLlegada   = IdDepositoLlegada
    FROM Pedido WHERE IdPedido = @IdPedido;

    IF @IdEstadoPedido IS NULL
    BEGIN PRINT 'ProcesarCrossdock: Pedido no encontrado.'; RETURN; END

    IF @IdEstadoPedido = 108
    BEGIN PRINT 'ProcesarCrossdock: Pedido cancelado.'; RETURN; END

    IF ISNULL(@IdDepSalida,0) = ISNULL(@IdDepLlegada,0)
    BEGIN
        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, 'ProcesarCrossdock: Origen=Destino. Sin crossdock.', GETUTCDATE(), 'SYSTEM');
        RETURN;
    END

    PRINT '═══ ProcesarCrossdock: INICIO Pedido ' + CAST(@IdPedido AS VARCHAR(10))
        + ' | Dep' + CAST(@IdDepSalida AS VARCHAR(10)) + '→Dep' + CAST(@IdDepLlegada AS VARCHAR(10)) + ' ═══';

    -- 2. Resolver ruta
    EXEC Z_SP_ResolverRutaInterDepositos @IdPedido = @IdPedido, @TieneIntermedios = @TieneIntermedios OUTPUT;

    -- 3. Generar crossdock
    IF @TieneIntermedios = 1
    BEGIN
        EXEC Z_SP_GenerarCrossdock @IdPedido = @IdPedido;

        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, 'ProcesarCrossdock: ✓ Viajes crossdock generados.', GETUTCDATE(), 'SYSTEM');
    END
    ELSE
    BEGIN
        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, 'ProcesarCrossdock: Sin ruta intermedia configurada.', GETUTCDATE(), 'SYSTEM');
    END

    PRINT '═══ ProcesarCrossdock: FIN ═══';
END
GO
