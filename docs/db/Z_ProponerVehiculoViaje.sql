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
            @Zona VARCHAR(50),
            @IdVehiculoAsignar INT;

    -- 1. Obtener datos directamente de la tabla RUTA
    -- Usamos Ruta porque el Viaje puede no existir aún en esta etapa.
    SELECT TOP 1 
           @IdJornada = IdJornada,
           @IdTipoVehiculo = IdTipoVehiculo,
           @Zona = Zona
    FROM dbo.Ruta WITH (NOLOCK)
    WHERE IdRuta = @IdRuta;

    -- Validaciones iniciales
    IF @IdJornada IS NULL 
    BEGIN
        PRINT 'No se encontró la ruta ' + CAST(@IdRuta AS VARCHAR) + ' o no tiene una Jornada asignada.';
        RETURN;
    END

    -- Formatear Zona si es necesario, asumimos que viene como string (ej: '001')
    DECLARE @ZonaFiltro VARCHAR(10) = RIGHT('000' + @Zona, 3);

    -- 2. Buscar el mejor vehículo disponible según jerarquía de prioridad del CONDUCTOR
    SELECT TOP 1 @IdVehiculoAsignar = V.IdVehiculo
    FROM dbo.VehiculoJornada VJ WITH (NOLOCK)
    INNER JOIN dbo.Vehiculo V WITH (NOLOCK) ON VJ.IdVehiculo = V.IdVehiculo
    INNER JOIN dbo.Conductor C WITH (NOLOCK) ON V.IdConductor = C.IdConductor
    INNER JOIN dbo.Recurso R WITH (NOLOCK) ON V.ReferenciaExterna = R.ReferenciaExterna
    INNER JOIN dbo.Conductor_Dyn CD WITH (NOLOCK) ON C.IdConductor = CD.IdConductor
    OUTER APPLY (
        -- Contar los días (Jornadas distintas) trabajados por este conductor en el mes actual
        SELECT COUNT(DISTINCT R_Hist.IdJornada) AS DiasTrabajados
        FROM dbo.Ruta R_Hist WITH (NOLOCK)
        INNER JOIN dbo.Jornada J_Hist WITH (NOLOCK) ON R_Hist.IdJornada = J_Hist.IdJornada
        WHERE R_Hist.IdConductor = C.IdConductor
          AND MONTH(J_Hist.Fecha) = MONTH(GETDATE())
          AND YEAR(J_Hist.Fecha) = YEAR(GETDATE())
    ) Historial
    WHERE VJ.IdJornada = @IdJornada
      AND V.IdTipoVehiculo = @IdTipoVehiculo
      AND R.IdEstado = 1 -- Disponible
      -- Priorización por Zonas (A, B o C) en el CONDUCTOR
      AND (CD.ZonaOpcionA = @ZonaFiltro OR CD.ZonaOpcionB = @ZonaFiltro OR CD.ZonaOpcionC = @ZonaFiltro)
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
            WHEN CD.ZonaOpcionA = @ZonaFiltro THEN 1
            WHEN CD.ZonaOpcionB = @ZonaFiltro THEN 2
            WHEN CD.ZonaOpcionC = @ZonaFiltro THEN 3
            ELSE 4 
        END ASC,
        Historial.DiasTrabajados ASC, -- Priorizar a quien haya trabajado MENOS días en el mes
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
