USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_ProponerVehiculoViaje] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Antigravity (Refactorizado)
-- Create date: 27/04/2026
-- Description:	Propone y asigna un vehículo disponible de VehiculoJornada 
--              a una RUTA basada en IdZona, Tipo de Vehículo y Estado de Recurso.
--              Se corrige la dependencia de la tabla Viaje, usando Ruta en su lugar.
-- =============================================
ALTER PROCEDURE [dbo].[Z_ProponerVehiculoViaje]
	@IdRuta INT
AS
BEGIN
	SET NOCOUNT ON;

    DECLARE @IdJornada BIGINT,
            @IdTipoVehiculo INT,
            @IdZona INT,
            @IdVehiculoAsignar INT;

    -- 1. Obtener datos directamente de la tabla RUTA
    -- Usamos Ruta porque el Viaje puede no existir aún en esta etapa.
    SELECT TOP 1 
           @IdJornada = IdJornada,
           @IdTipoVehiculo = IdTipoVehiculo,
           @IdZona = IdZona
    FROM dbo.Ruta WITH (NOLOCK)
    WHERE IdRuta = @IdRuta;

    -- Validaciones iniciales
    IF @IdJornada IS NULL 
    BEGIN
        PRINT 'No se encontró la ruta ' + CAST(@IdRuta AS VARCHAR) + ' o no tiene una Jornada asignada.';
        RETURN;
    END

    -- Formatear Zona para búsqueda en Vehiculo_Dyn (ej: 1 -> '001')
    -- Se mantiene el padding de 3 ceros según el estándar de EUP
    DECLARE @ZonaFiltro VARCHAR(10) = RIGHT('000' + CAST(@IdZona AS VARCHAR(10)), 3);

    -- 2. Buscar el mejor vehículo disponible según jerarquía de prioridad
    SELECT TOP 1 @IdVehiculoAsignar = V.IdVehiculo
    FROM dbo.VehiculoJornada VJ WITH (NOLOCK)
    INNER JOIN dbo.Vehiculo V WITH (NOLOCK) ON VJ.IdVehiculo = V.IdVehiculo
    INNER JOIN dbo.Recurso R WITH (NOLOCK) ON V.ReferenciaExterna = R.ReferenciaExterna
    INNER JOIN dbo.Vehiculo_Dyn VD WITH (NOLOCK) ON V.ReferenciaExterna = VD.Dominio
    WHERE VJ.IdJornada = @IdJornada
      AND V.IdTipoVehiculo = @IdTipoVehiculo
      AND R.IdEstado = 1 -- Disponible
      -- Priorización por Zonas (A, B o C)
      AND (VD.ZonaOpcionA = @ZonaFiltro OR VD.ZonaOpcionB = @ZonaFiltro OR VD.ZonaOpcionC = @ZonaFiltro)
      -- Evitar vehículos ya asignados a otras RUTAS activas en la misma jornada
      AND NOT EXISTS (
          SELECT 1 
          FROM dbo.Ruta R2 WITH (NOLOCK)
          WHERE R2.IdVehiculo = V.IdVehiculo 
            AND R2.IdJornada = @IdJornada
            AND R2.IdRuta <> @IdRuta -- No compararse consigo misma
      )
    ORDER BY 
        CASE 
            WHEN VD.ZonaOpcionA = @ZonaFiltro THEN 1
            WHEN VD.ZonaOpcionB = @ZonaFiltro THEN 2
            WHEN VD.ZonaOpcionC = @ZonaFiltro THEN 3
            ELSE 4 
        END ASC,
        V.IdVehiculo ASC;

    -- 3. Efectuar la asignación en la tabla RUTA
    IF @IdVehiculoAsignar IS NOT NULL
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            -- Actualizamos la Ruta
            UPDATE dbo.Ruta
            SET IdVehiculo = @IdVehiculoAsignar
            WHERE IdRuta = @IdRuta;

            -- Si por casualidad ya existieran viajes creados, los actualizamos también
            -- para mantener la integridad, pero la clave es la Ruta.
            IF EXISTS (SELECT 1 FROM dbo.Viaje WHERE IdRuta = @IdRuta)
            BEGIN
                UPDATE dbo.Viaje
                SET IdVehiculo = @IdVehiculoAsignar
                WHERE IdRuta = @IdRuta;
            END

            COMMIT TRANSACTION;
            PRINT 'Vehículo ' + CAST(@IdVehiculoAsignar AS VARCHAR) + ' asignado exitosamente a la ruta ' + CAST(@IdRuta AS VARCHAR) + ' (Zona ' + @ZonaFiltro + ')';
        END TRY
        BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
            RAISERROR (@ErrorMessage, 16, 1);
        END CATCH
    END
    ELSE
    BEGIN
        PRINT 'No se encontró ningún vehículo disponible para la zona ' + @ZonaFiltro + ', tipo ' + CAST(@IdTipoVehiculo AS VARCHAR) + ' y jornada ' + CAST(@IdJornada AS VARCHAR);
    END
END
