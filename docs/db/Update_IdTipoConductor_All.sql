-- =============================================================================
-- SCRIPT DE ALINEACIÓN DE PRIORIDADES DE CONDUCTORES (TODAS LAS SUCURSALES)
-- Autor: Antigravity
-- Fecha: 08/05/2026
-- Descripción: Actualiza el IdTipoConductor (1=A, 2=B, 3=C) para todos los
--              conductores de Barcelona y Girona de acuerdo con los Excels oficiales.
-- =============================================================================
USE [UNIGIS_DataRepository_EUROPASTRY]
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Actualizar a Prioridad C (IdTipoConductor = 3)
    UPDATE dbo.Conductor
    SET IdTipoConductor = 3
    WHERE ReferenciaExterna IN (
        '547045', '460548', '536797', '536799', '613504'
    );
    PRINT 'Actualizados ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' conductores a Prioridad C.';

    -- 2. Actualizar a Prioridad B (IdTipoConductor = 2)
    UPDATE dbo.Conductor
    SET IdTipoConductor = 2
    WHERE ReferenciaExterna IN (
        '446469', '620613', '581490', '578261', '607184', '177797', '383888', '498717', '613358'
    );
    PRINT 'Actualizados ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' conductores a Prioridad B.';

    -- 3. Actualizar a Prioridad A (IdTipoConductor = 1)
    UPDATE dbo.Conductor
    SET IdTipoConductor = 1
    WHERE ReferenciaExterna IN (
        '548726', '459238', '159813', '337780', '334028', '368973', '480874', '562977', '445162', '546489', '495767', '593375', '593664', '567750', '471005', '481456', '593477', '601381', '267535', '579616', '456307', '606261', '577481', '608395', '453874', '426375', '153982', '153984', '459620', '386079', '568144', '366741', '529946', '626428', '590041', '465878', '401335', '567634', '542977', '615441', '586265', '608395', '384405', '392507', '456197', '474519', '505131', '529041', '534019', '580291', '592058', '606148', '612206'
    );
    PRINT 'Actualizados ' + CAST(@@ROWCOUNT AS VARCHAR(10)) + ' conductores a Prioridad A.';

    COMMIT TRANSACTION;
    PRINT '¡Alineación de Prioridades de Conductores completada con éxito!';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR (@ErrorMessage, 16, 1);
END CATCH;
GO
