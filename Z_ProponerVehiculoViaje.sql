-- Z_ProponerVehiculoViaje.sql
GO

/****** Object:  StoredProcedure [dbo].[Z_ProponerVehiculoViaje]    Script Date: 20/04/2026 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Antigravity
-- Create date: 20/04/2026
-- Description:	Propone y asigna un vehículo disponible de VehiculoJornada 
--              a una ruta recién creada basado en IdZona, Tipo de Vehículo y Estado de Recurso.
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[Z_ProponerVehiculoViaje]
	@IdRuta INT
AS
BEGIN
	SET NOCOUNT ON;

    DECLARE @IdJornada BIGINT,
            @IdTipoVehiculo INT,
            @IdDibujoZona INT,
            @IdVehiculoAsignar INT;

    -- 1. Obtener datos de la ruta actual (desde la tabla Viaje que contiene los segmentos)
    -- Se asume que todos los segmentos de la ruta comparten Jornada, Tipo de Vehículo y Zona.
    SELECT TOP 1 
           @IdJornada = IdJornada,
           @IdTipoVehiculo = IdTipoVehiculo,
           @IdDibujoZona = IdDibujoZona
    FROM dbo.Viaje WITH (NOLOCK)
    WHERE IdRuta = @IdRuta;

    -- Validaciones iniciales
    IF @IdJornada IS NULL 
    BEGIN
        PRINT 'No se encontró la ruta o no tiene una Jornada asignada.';
        RETURN;
    END

    -- Formatear Zona para búsqueda en Vehiculo_Dyn (ej: 1 -> '001')
    DECLARE @ZonaFiltro VARCHAR(10) = RIGHT('000' + CAST(@IdDibujoZona AS VARCHAR(10)), 3);

    -- 2. Buscar el mejor vehículo disponible según jerarquía de prioridad
    -- Prioridad 1: ZonaOpcionA = @ZonaFiltro
    -- Prioridad 2: ZonaOpcionB = @ZonaFiltro
    -- Prioridad 3: ZonaOpcionC = @ZonaFiltro
    SELECT TOP 1 @IdVehiculoAsignar = V.IdVehiculo
    FROM dbo.VehiculoJornada VJ WITH (NOLOCK)
    INNER JOIN dbo.Vehiculo V WITH (NOLOCK) ON VJ.IdVehiculo = V.IdVehiculo
    INNER JOIN dbo.Recurso R WITH (NOLOCK) ON V.ReferenciaExterna = R.ReferenciaExterna
    INNER JOIN dbo.Vehiculo_Dyn VD WITH (NOLOCK) ON V.ReferenciaExterna = VD.Dominio
    WHERE VJ.IdJornada = @IdJornada
      AND V.IdTipoVehiculo = @IdTipoVehiculo
      AND R.IdEstado = 1 -- Disponible
      -- El vehículo debe tener la zona asignada en alguna de sus opciones de prioridad
      AND (VD.ZonaOpcionA = @ZonaFiltro OR VD.ZonaOpcionB = @ZonaFiltro OR VD.ZonaOpcionC = @ZonaFiltro)
      -- Evitar vehículos ya asignados a otras rutas activas en la misma jornada
      AND NOT EXISTS (
          SELECT 1 
          FROM dbo.Viaje V2 WITH (NOLOCK)
          WHERE V2.IdVehiculo = V.IdVehiculo 
            AND V2.IdJornada = @IdJornada
            AND V2.Estado NOT IN ('ANULADO', 'CANCELADO')
      )
    ORDER BY 
        CASE 
            WHEN VD.ZonaOpcionA = @ZonaFiltro THEN 1
            WHEN VD.ZonaOpcionB = @ZonaFiltro THEN 2
            WHEN VD.ZonaOpcionC = @ZonaFiltro THEN 3
            ELSE 4 
        END ASC,
        V.IdVehiculo ASC; -- Desempate determinista

    -- 3. Efectuar la asignación si encontramos un candidato
    IF @IdVehiculoAsignar IS NOT NULL
    BEGIN
        BEGIN TRANSACTION;
        BEGIN TRY
            -- Actualizamos todos los segmentos de la ruta
            UPDATE dbo.Viaje
            SET IdVehiculo = @IdVehiculoAsignar
            WHERE IdRuta = @IdRuta;

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
GO
