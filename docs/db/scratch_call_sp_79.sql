-- ==============================================================================
-- SCRIPT DE PRUEBA DE EJECUCIÓN DEL STORED PROCEDURE - VIAJE 79
-- ==============================================================================
-- Este script ejecuta manualmente el SP en una transacción de prueba
-- y captura exactamente qué error SQL está ocurriendo.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

BEGIN TRY
    BEGIN TRANSACTION;

    PRINT '🚀 Iniciando ejecución manual de Z_SP_GenerarRendicion_V2 para Parada 388...';
    
    -- 1. Ejecutar el SP
    EXEC [dbo].[Z_SP_GenerarRendicion_V2] @IdParadaOriginal = 388;
    
    PRINT '✅ SP ejecutado con ÉXITO (en memoria).';
    
    -- 2. Mostrar si se creó la parada de rendición temporalmente
    PRINT '🔍 Comprobando paradas creadas temporalmente en este Viaje:';
    SELECT 
        IdParada,
        IdViaje,
        Orden,
        IdTipoParada,
        IdEstadoParada,
        ReferenciaExterna,
        Descripcion,
        IdDeposito,
        Direccion,
        Calle,
        Latitud,
        Longitud,
        IdDomicilioOrden

    FROM Parada
    WHERE IdViaje = 79;


    PRINT '🔍 Comprobando ParadaItems creados temporalmente para este Viaje:';
    SELECT 
        PI.IdParada,
        PI.IdParadaItem,
        PI.CodigoProducto,
        PI.Descripcion,
        PI.Cantidad
    FROM ParadaItem PI
    INNER JOIN Parada P ON P.IdParada = PI.IdParada
    WHERE P.IdViaje = 79;

    -- 3. IMPORTANTE: Hacer Rollback para no alterar datos reales aún
    ROLLBACK TRANSACTION;
    PRINT '🔁 ROLLBACK ejecutado exitosamente. Los datos originales permanecen intactos.';

END TRY
BEGIN CATCH
    -- Capturar y mostrar error exacto
    PRINT '❌ ERROR CAPTURADO EN LA EJECUCIÓN:';
    PRINT 'Mensaje de Error: ' + ERROR_MESSAGE();
    PRINT 'Número de Error:  ' + CAST(ERROR_NUMBER() AS VARCHAR(20));
    PRINT 'Línea del Error:  ' + CAST(ERROR_LINE() AS VARCHAR(20));
    PRINT 'Severidad:        ' + CAST(ERROR_SEVERITY() AS VARCHAR(20));
    PRINT 'Estado:           ' + CAST(ERROR_STATE() AS VARCHAR(20));
    
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
END CATCH
GO
