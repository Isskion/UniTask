USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_ProponerVehiculoViaje] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		Antigravity (Refactorizado para JORNADAS)
-- Create date: 06/05/2026
-- Description:	Propone y asigna de forma masiva vehículos disponibles de VehiculoJornada 
--              a TODAS las rutas pendientes de una JORNADA (basado en IdZona, Tipo de Vehículo y Estado).
-- =============================================
ALTER PROCEDURE [dbo].[Z_SP_ProponerVehiculoViaje]
	@IdJornadaEntrada NVARCHAR(MAX) -- Acepta NVARCHAR para interceptar fallos de UNIGIS al reemplazar tags
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

    -- 1. DIAGNÓSTICO: Verificar si UNIGIS está pasando un texto literal en lugar de un número
    DECLARE @IdJornada BIGINT;
    IF TRY_CAST(@IdJornadaEntrada AS BIGINT) IS NULL 
    BEGIN
        DECLARE @MsgFalloUnigis NVARCHAR(MAX) = 'ERROR CRÍTICO UNIGIS: El sistema no reemplazó la variable de Jornada, pasó el texto literal: ' + @IdJornadaEntrada;
        PRINT @MsgFalloUnigis;
        RAISERROR(@MsgFalloUnigis, 16, 1);
        RETURN;
    END
    SET @IdJornada = CAST(@IdJornadaEntrada AS BIGINT);

    -- Obtener la fecha de la jornada actual
    DECLARE @FechaJornada DATE;
    SELECT @FechaJornada = CAST(Fecha AS DATE) FROM dbo.Jornada WHERE IdJornada = @IdJornada;

    -- Verificar si existe la Jornada
    IF NOT EXISTS (SELECT 1 FROM dbo.Jornada WHERE IdJornada = @IdJornada)
    BEGIN
        DECLARE @MsgNoExisteJornada NVARCHAR(1000) = 'No se encontró la Jornada ' + CAST(@IdJornada AS NVARCHAR(20)) + ' en la base de datos.';
        PRINT @MsgNoExisteJornada;
        RETURN;
    END

    -- 2. Cargar las rutas de la jornada que estén pendientes de asignar vehículo o conductor
    DECLARE @RutasParaAsignar TABLE (
        RowID INT IDENTITY(1,1) PRIMARY KEY,
        IdRuta INT,
        IdTipoVehiculo NVARCHAR(50),
        Zona NVARCHAR(50)
    );

    INSERT INTO @RutasParaAsignar (IdRuta, IdTipoVehiculo, Zona)
    SELECT 
        IdRuta, 
        CAST(IdTipoVehiculo AS NVARCHAR(50)), 
        CAST(Zona AS NVARCHAR(50))
    FROM dbo.Ruta
    WHERE IdJornada = @IdJornada
      AND (IdVehiculo IS NULL OR IdConductor IS NULL);

    DECLARE @MaxRow INT = (SELECT COUNT(*) FROM @RutasParaAsignar);
    DECLARE @CurrentRow INT = 1;

    PRINT 'Iniciando asignación masiva para Jornada ' + CAST(@IdJornada AS NVARCHAR(20)) + '. Rutas pendientes: ' + CAST(@MaxRow AS NVARCHAR(10));

    -- 3. Bucle set-safe (sin cursor) para asignar secuencialmente cada ruta
    WHILE @CurrentRow <= @MaxRow
    BEGIN
        DECLARE @IdRuta INT, 
                @IdTipoVehiculo NVARCHAR(50), 
                @Zona NVARCHAR(50);

        SELECT 
            @IdRuta = IdRuta, 
            @IdTipoVehiculo = IdTipoVehiculo, 
            @Zona = Zona
        FROM @RutasParaAsignar
        WHERE RowID = @CurrentRow;

        DECLARE @ZonaFiltro NVARCHAR(50) = RIGHT('000' + ISNULL(@Zona, ''), 3);
        DECLARE @IdVehiculoAsignar INT = NULL, 
                @IdConductorAsignar INT = NULL;

        -- Buscar el mejor vehículo disponible según jerarquía de prioridad del CONDUCTOR para esta ruta (pool general)
        SELECT TOP 1 
            @IdVehiculoAsignar = V.IdVehiculo,
            @IdConductorAsignar = V.IdConductor
        FROM dbo.Vehiculo V
        INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
        INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
        INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
        OUTER APPLY (
            -- Contar los días (Jornadas distintas) trabajados por este conductor en el mes actual de forma segura
            SELECT COUNT(DISTINCT R_Hist.IdJornada) AS DiasTrabajados
            FROM dbo.Ruta R_Hist
            INNER JOIN dbo.Jornada J_Hist ON CAST(R_Hist.IdJornada AS NVARCHAR(50)) = CAST(J_Hist.IdJornada AS NVARCHAR(50))
            WHERE CAST(R_Hist.IdConductor AS NVARCHAR(50)) = CAST(C.IdConductor AS NVARCHAR(50))
              AND J_Hist.Fecha >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0)
              AND J_Hist.Fecha < DATEADD(month, DATEDIFF(month, 0, GETDATE()) + 1, 0)
        ) Historial
        WHERE CAST(V.IdTipoVehiculo AS NVARCHAR(50)) = @IdTipoVehiculo
          AND CAST(R.IdEstado AS NVARCHAR(10)) = '1'
          -- Priorización por Zonas (A, B o C) en el CONDUCTOR
          AND (CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = @ZonaFiltro 
            OR CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = @ZonaFiltro 
            OR CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = @ZonaFiltro)
          -- Evitar vehículos ya asignados a otras RUTAS activas en el mismo día (evita doble asignación diaria)
          AND NOT EXISTS (
              SELECT 1 
              FROM dbo.Ruta R2
              INNER JOIN dbo.Jornada J2 ON R2.IdJornada = J2.IdJornada
              WHERE R2.IdVehiculo = V.IdVehiculo 
                AND CAST(J2.Fecha AS DATE) = @FechaJornada
                AND R2.IdRuta <> @IdRuta
          )
        ORDER BY 
            CASE 
                WHEN CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = @ZonaFiltro THEN 1
                WHEN CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = @ZonaFiltro THEN 2
                WHEN CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = @ZonaFiltro THEN 3
                ELSE 4 
            END ASC, -- 1º Preferencia de Zona de la Ruta (Opción A -> B -> C)
            ISNULL(C.IdTipoConductor, 99) ASC, -- 2º Tipo de Conductor (A=1, B=2, C=3) para desempatar esa preferencia
            Historial.DiasTrabajados ASC, -- 3º Menos días trabajados en el mes
            V.IdVehiculo ASC; -- 4º ID del vehículo

        -- 4. Efectuar la asignación para la ruta actual
        IF @IdVehiculoAsignar IS NOT NULL AND @IdConductorAsignar IS NOT NULL
        BEGIN
            BEGIN TRANSACTION;
            BEGIN TRY
                UPDATE dbo.Ruta
                SET IdVehiculo = @IdVehiculoAsignar,
                    IdConductor = @IdConductorAsignar
                WHERE IdRuta = @IdRuta;

                -- Mantener integridad con Viaje si existiera
                IF EXISTS (SELECT 1 FROM dbo.Viaje WHERE IdRuta = @IdRuta)
                BEGIN
                    UPDATE dbo.Viaje
                    SET IdVehiculo = @IdVehiculoAsignar,
                        IdConductor = @IdConductorAsignar
                    WHERE IdRuta = @IdRuta;
                END

                COMMIT TRANSACTION;
                PRINT 'Ruta ' + CAST(@IdRuta AS NVARCHAR(10)) + ': Asignado exitosamente Vehículo ' + CAST(@IdVehiculoAsignar AS NVARCHAR(10)) + ' y Conductor ' + CAST(@IdConductorAsignar AS NVARCHAR(10)) + ' (Zona ' + @ZonaFiltro + ')';
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
                PRINT 'Ruta ' + CAST(@IdRuta AS NVARCHAR(10)) + ': Error al asignar: ' + @ErrorMessage;
            END CATCH
        END
        ELSE
        BEGIN
            PRINT 'Ruta ' + CAST(@IdRuta AS NVARCHAR(10)) + ': No se encontró ningún vehículo/conductor libre compatible (Zona ' + @ZonaFiltro + ', Tipo ' + @IdTipoVehiculo + ')';
        END

        SET @CurrentRow = @CurrentRow + 1;
    END

    PRINT 'Asignación masiva finalizada para la Jornada ' + CAST(@IdJornada AS NVARCHAR(20));
END
