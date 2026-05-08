-- =============================================================================
-- SCRIPT DE VALIDACIÓN Y DIAGNÓSTICO DE DATOS PARA JORNADA 55
-- Lanzar directamente en SQL Server Management Studio (SSMS)
-- =============================================================================
USE [UNIGIS_DataRepository_EUROPASTRY]
GO

PRINT '=== 1. RUTAS DE LA JORNADA 55 ==='
SELECT 
    IdRuta, 
    IdJornada, 
    IdTipoVehiculo, 
    Zona,
    IdVehiculo,
    IdConductor,
    -- Intentar ver si hay problemas de tipo de datos en las columnas de Ruta
    TRY_CAST(IdRuta AS INT) AS IdRuta_Int,
    TRY_CAST(IdJornada AS BIGINT) AS IdJornada_BigInt,
    TRY_CAST(IdTipoVehiculo AS NVARCHAR(50)) AS IdTipoVehiculo_Txt,
    TRY_CAST(Zona AS NVARCHAR(50)) AS Zona_Txt
FROM dbo.Ruta 
WHERE IdJornada = 55;

PRINT '=== 2. VEHÍCULOS DISPONIBLES EN VEHICULOJORNADA PARA JORNADA 55 ==='
SELECT 
    VJ.IdVehiculoJornada,
    VJ.IdJornada,
    VJ.IdVehiculo,
    V.IdTipoVehiculo,
    V.IdConductor,
    V.ReferenciaExterna
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
WHERE VJ.IdJornada = 55;

PRINT '=== 3. CONDUCTORES Y SUS ZONAS CONFIGURADAS (CON VALORES DINÁMICOS) ==='
SELECT 
    C.IdConductor,
    C.Nombre,
    CD.ZonaOpcionA,
    CD.ZonaOpcionB,
    CD.ZonaOpcionC,
    -- Verificar si el ID de Conductor en CD_Dyn tiene algún problema de conversión
    TRY_CAST(CD.IdConductor AS INT) AS IdConductorDyn_Int
FROM dbo.Conductor C
INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor;

PRINT '=== 4. ESTADOS DE RECURSO Y SUS TIPOS DE DATOS ==='
SELECT 
    R.IdRecurso,
    R.ReferenciaExterna,
    R.IdEstado,
    TRY_CAST(R.IdEstado AS INT) AS IdEstado_Int
FROM dbo.Recurso R
WHERE TRY_CAST(R.IdEstado AS INT) IS NULL AND R.IdEstado IS NOT NULL; -- Muestra si hay algún estado que no sea convertible a entero

PRINT '=== 5. SIMULACIÓN DE PROPUESTA PARA LAS RUTAS DE LA JORNADA 55 ==='
-- Definimos una tabla temporal para evaluar ruta por ruta de la Jornada 55
DECLARE @RutaTemp TABLE (
    IdRuta INT,
    IdTipoVehiculo NVARCHAR(50),
    ZonaFiltro NVARCHAR(50)
);

INSERT INTO @RutaTemp
SELECT 
    IdRuta, 
    CAST(IdTipoVehiculo AS NVARCHAR(50)), 
    RIGHT('000' + ISNULL(CAST(Zona AS NVARCHAR(50)), ''), 3)
FROM dbo.Ruta 
WHERE IdJornada = 55;

-- Mostrar la propuesta calculada para cada ruta utilizando joins 100% NVARCHAR
SELECT 
    RT.IdRuta,
    RT.ZonaFiltro,
    RT.IdTipoVehiculo,
    (
        SELECT TOP 1 V.IdVehiculo
        FROM dbo.VehiculoJornada VJ
        INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
        INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
        INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
        INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
        WHERE VJ.IdJornada = 55
          AND CAST(V.IdTipoVehiculo AS NVARCHAR(50)) = RT.IdTipoVehiculo
          AND CAST(R.IdEstado AS NVARCHAR(10)) = '1'
          AND (
              CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = RT.ZonaFiltro OR 
              CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = RT.ZonaFiltro OR 
              CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = RT.ZonaFiltro
          )
        ORDER BY 
            CASE 
                WHEN CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = RT.ZonaFiltro THEN 1
                WHEN CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = RT.ZonaFiltro THEN 2
                WHEN CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = RT.ZonaFiltro THEN 3
                ELSE 4 
            END ASC,
            V.IdVehiculo ASC
    ) AS IdVehiculoAsignable,
    (
        SELECT TOP 1 V.IdConductor
        FROM dbo.VehiculoJornada VJ
        INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
        INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
        INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
        INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
        WHERE VJ.IdJornada = 55
          AND CAST(V.IdTipoVehiculo AS NVARCHAR(50)) = RT.IdTipoVehiculo
          AND CAST(R.IdEstado AS NVARCHAR(10)) = '1'
          AND (
              CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = RT.ZonaFiltro OR 
              CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = RT.ZonaFiltro OR 
              CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = RT.ZonaFiltro
          )
        ORDER BY 
            CASE 
                WHEN CAST(CD.ZonaOpcionA AS NVARCHAR(50)) = RT.ZonaFiltro THEN 1
                WHEN CAST(CD.ZonaOpcionB AS NVARCHAR(50)) = RT.ZonaFiltro THEN 2
                WHEN CAST(CD.ZonaOpcionC AS NVARCHAR(50)) = RT.ZonaFiltro THEN 3
                ELSE 4 
            END ASC,
            V.IdVehiculo ASC
    ) AS IdConductorAsignable
FROM @RutaTemp RT;
