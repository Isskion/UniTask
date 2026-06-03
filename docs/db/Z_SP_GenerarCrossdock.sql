USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- SQL Script: Generador Operativo de Viajes/Órdenes Crossdock
-- AUTOR:           Antigravity
-- FECHA:           18/05/2026
-- VERSIÓN:         v5.0
-- DESCRIPCIÓN:     Aplica el decalaje temporal de +1 día por cada Hub intermedio
--                  a las múltiples Órdenes logísticas generadas para un Pedido.
--                  Garantiza que las órdenes tengan una fecha correlativa para
--                  reflejar la gestión de crossdock en cada Hub.
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_GenerarCrossdock]
    @IdPedido  INT,
    @IdJornada BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdDepSalida       INT, 
            @IdDepLlegada      INT,
            @FechaEntrega      DATETIME, 
            @IdOperacion       INT;

    -- ── 1. DATOS DEL PEDIDO ──────────────────────────────────────────────────
    SELECT @IdDepSalida    = IdDepositoSalida, 
           @IdDepLlegada   = IdDepositoLlegada,
           @FechaEntrega   = FechaEntrega,     
           @IdOperacion    = IdOperacion
    FROM Pedido WHERE IdPedido = @IdPedido;

    IF @IdDepSalida IS NULL
    BEGIN
        RAISERROR('GenerarCrossdock: Pedido %d no encontrado.', 16, 1, @IdPedido);
        RETURN;
    END

    -- ── 2. APLICAR DECALAJE TEMPORAL (+1 DÍA SI SALE DE HUB O LLEGA A DESTINO) ──
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Actualizar la FechaEntrega en la tabla Orden aplicando el decalaje:
        -- +1 día para las órdenes de tránsito (las que salen de un Hub o llegan al destino de distribución)
        UPDATE O
        SET O.FechaEntrega = 
            CASE 
                -- Si la orden sale de un depósito configurado como Hub Intermedio en la matriz
                WHEN O.IdDepositoSalida IN (SELECT DISTINCT IdDepositoIntermedio FROM Z_RutaInterDepositoConfig WHERE Activo = 1)
                -- O si la orden llega al destino final del Pedido comercial
                  OR O.IdDepositoLlegada = @IdDepLlegada
                THEN DATEADD(DAY, 1, @FechaEntrega)
                -- Pedidos comerciales o tramos iniciales directos permanecen en el Día X
                ELSE @FechaEntrega
            END
        FROM Orden O
        WHERE O.IdPedido = @IdPedido;

        -- Registrar en la Bitácora del Pedido la certificación del decalaje
        DECLARE @LogMsg VARCHAR(1000) = 'GenerarCrossdock: ✓ Decalaje temporal aplicado de forma inteligente (+1 día en órdenes de tramos logísticos).';
        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, @LogMsg, GETUTCDATE(), 'SYSTEM');

        COMMIT TRANSACTION;
        PRINT 'GenerarCrossdock: ✓ Decalaje de órdenes aplicado exitosamente.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH;
END
GO
