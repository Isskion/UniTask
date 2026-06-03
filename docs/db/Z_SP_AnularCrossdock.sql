USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           15/05/2026
-- DESCRIPCIÓN:     Anula el crossdock de un Pedido: marca Viajes/Rutas como Anulados
--                  y devuelve el Pedido al estado Aprobado planificar (4).
--                  Identificación por ReferenciaExterna con prefijo 'XDOCK-'.
--
-- LLAMADO DESDE:   Transición de estado Crossdock (6) → Aprobado planificar (4)
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_AnularCrossdock]
    @IdPedido INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ViajesAnulados INT = 0,
            @RutasAnuladas  INT = 0,
            @ParadasAnuladas INT = 0;

    DECLARE @PatronRef VARCHAR(30) = 'XDOCK-%' + CAST(@IdPedido AS VARCHAR(10)) + '-%';

    PRINT '═══ AnularCrossdock: INICIO Pedido ' + CAST(@IdPedido AS VARCHAR(10)) + ' ═══';

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Anular Viajes crossdock (IdEstadoViaje = 4)
        UPDATE Viaje
        SET IdEstadoViaje = 4,
            Estado = 'ANULADO',
            FechaUltimaModificacion = GETUTCDATE(),
            Observaciones = 'Anulado por Z_SP_AnularCrossdock - ' + CONVERT(VARCHAR(20), GETUTCDATE(), 120)
        WHERE ReferenciaExterna LIKE 'XDOCK-V' + CAST(@IdPedido AS VARCHAR(10)) + '-%'
          AND IdEstadoViaje <> 4;

        SET @ViajesAnulados = @@ROWCOUNT;

        -- 2. Anular Paradas de esos viajes
        UPDATE P
        SET P.IdEstadoParada = 108  -- Cancelada
        FROM Parada P
        WHERE P.ReferenciaExterna LIKE 'XDOCK-P' + CAST(@IdPedido AS VARCHAR(10)) + '-%'
          AND P.IdEstadoParada <> 108;

        SET @ParadasAnuladas = @@ROWCOUNT;

        -- 3. Anular Rutas
        UPDATE R
        SET R.IdEstadoRuta = 4  -- Anulada
        FROM Ruta R
        WHERE R.ReferenciaExterna LIKE 'XDOCK-%' + CAST(@IdPedido AS VARCHAR(10)) + '-%'
          AND ISNULL(R.IdEstadoRuta,0) <> 4;

        SET @RutasAnuladas = @@ROWCOUNT;

        -- 4. Bitácora
        DECLARE @Msg VARCHAR(500) = 'AnularCrossdock: '
            + CAST(@ViajesAnulados AS VARCHAR(5)) + ' viajes, '
            + CAST(@ParadasAnuladas AS VARCHAR(5)) + ' paradas, '
            + CAST(@RutasAnuladas AS VARCHAR(5)) + ' rutas anuladas.';

        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, @Msg, GETUTCDATE(), 'SYSTEM');

        COMMIT TRANSACTION;

        PRINT @Msg;
        PRINT '═══ AnularCrossdock: ✓ FIN ═══';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @Severity INT = ERROR_SEVERITY();
        DECLARE @State INT = ERROR_STATE();
        PRINT 'AnularCrossdock: ✗ ERROR - ' + @Err;
        RAISERROR(@Err, @Severity, @State);
    END CATCH;
END
GO
