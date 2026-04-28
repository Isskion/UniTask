-- Script para actualizar el IdTipoConductor basado en el Cód_Conductor (ReferenciaExterna)

BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Actualizar Conductores con Prioridad 'C'
    UPDATE dbo.Conductor
    SET IdTipoConductor = 3
    WHERE ReferenciaExterna IN (
        '547045'
    );

    -- 2. Actualizar Conductores con Prioridad 'B'
    UPDATE dbo.Conductor
    SET IdTipoConductor = 2
    WHERE ReferenciaExterna IN (
        '446469', '620613', '581490', '578261', '607184', '177797'
    );

    -- 3. Actualizar Conductores con Prioridad 'A'
    UPDATE dbo.Conductor
    SET IdTipoConductor = 1
    WHERE ReferenciaExterna IN (
        '548726', '459238', '159813', '337780', '334028',
        '368973', '480874', '562977', '445162', '546489',
        '495767', '593375', '593664', '567750', '471005',
        '481456', '593477', '601381', '267535', '579616',
        '456307', '606261', '577481', '608395', '453874',
        '426375', '153982', '153984', '459620', '386079',
        '568144', '366741', '529946', '626428', '590041',
        '465878', '401335', '567634', '542977', '615441',
        '586265'
    );

    PRINT 'Actualización completada. Verifique los resultados.';
    
    -- Si todo es correcto, hacer COMMIT. Si es solo de prueba, usar ROLLBACK.
    COMMIT TRANSACTION;
    -- ROLLBACK TRANSACTION; 

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR (@ErrorMessage, 16, 1);
END CATCH;
GO
