-- =============================================================================
-- SCRIPT DE CORRECCIÓN MASIVA DE TIPOS DE VEHÍCULO PARA BARCELONA (C07)
-- Autor: Antigravity
-- Fecha: 08/05/2026
-- Descripción: Cambia el IdTipoVehiculo de '2' (Girona C07) a '12' (Barcelona C07)
--              para los vehículos de los conductores César, Darío y Pedro que
--              operan físicamente en Barcelona.
-- =============================================================================
USE [UNIGIS_DataRepository_EUROPASTRY]
GO

BEGIN TRANSACTION;

BEGIN TRY
    -- Actualizar los vehículos de Barcelona que se cargaron con IdTipoVehiculo = 2 (Girona)
    -- Pasarlos a IdTipoVehiculo = 12 (Barcelona C07)
    UPDATE dbo.Vehiculo
    SET IdTipoVehiculo = 12
    WHERE Dominio IN (
        '0169-KMZ', -- Vehículo de DARIO (IdConductor = 4)
        '7655-LCP', -- Vehículo de CESAR (IdConductor = 34)
        '7832-JWY'  -- Vehículo de PEDRO (IdConductor = 11)
    );

    PRINT 'Actualización de Tipo de Vehículo para la flota de Barcelona completada con éxito.';
    
    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
    RAISERROR (@ErrorMessage, 16, 1);
END CATCH;
GO
