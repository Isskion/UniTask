-- =============================================
-- SCRIPT DE VALIDACIÓN: Z_ProponerVehiculoViaje
-- JORNADA: 49
-- =============================================

-- test_Z_ProponerVehiculoViaje.sql
GO

-- Escenario: Prueba de asignación automática por RUTA y ZONA
DECLARE @IdRuta_Test INT;
DECLARE @IdTipoVehiculo_Test INT;
DECLARE @IdZona_Test INT;

PRINT '----------------------------------------------------------------'
PRINT 'ANÁLISIS DE DISPONIBILIDAD: JORNADA 49'
PRINT '----------------------------------------------------------------'

-- 1. Ver qué vehículos tenemos en la Jornada 49, sus prioridades y su estado real
SELECT 
    VJ.IdVehiculo, 
    V.ReferenciaExterna, 
    V.IdTipoVehiculo,
    VD.ZonaOpcionA,
    VD.ZonaOpcionB,
    VD.ZonaOpcionC,
    R.IdEstado AS [EstadoRecurso (1=OK)],
    (SELECT COUNT(DISTINCT IdRuta) FROM Viaje V2 WITH (NOLOCK) WHERE V2.IdVehiculo = VJ.IdVehiculo AND V2.IdJornada = 49 AND V2.Estado<>'ANULADO') AS [RutasYaAsignadas]
FROM dbo.VehiculoJornada VJ WITH (NOLOCK)
INNER JOIN dbo.Vehiculo V WITH (NOLOCK) ON VJ.IdVehiculo = V.IdVehiculo
INNER JOIN dbo.Recurso R WITH (NOLOCK) ON V.ReferenciaExterna = R.ReferenciaExterna
LEFT JOIN dbo.Vehiculo_Dyn VD WITH (NOLOCK) ON V.ReferenciaExterna = VD.Dominio
WHERE VJ.IdJornada = 49;

-- 2. Buscar una ruta sin vehículo en esa jornada para probar
SELECT TOP 1 
    @IdRuta_Test = IdRuta, 
    @IdTipoVehiculo_Test = IdTipoVehiculo,
    @IdZona_Test = IdDibujoZona
FROM dbo.Viaje WITH (NOLOCK)
WHERE IdJornada = 49 
  AND (IdVehiculo IS NULL OR IdVehiculo = 0)
  AND Estado <> 'ANULADO'
ORDER BY IdRuta DESC;

IF @IdRuta_Test IS NULL
BEGIN
    PRINT '>>> ERROR: No se encontró ninguna ruta sin vehículo en la Jornada 49 para realizar la prueba.'
    PRINT '>>> Sugerencia: UPDATE Viaje SET IdVehiculo = NULL WHERE IdRuta = [ID_EXISTENTE]'
END
ELSE
BEGIN
    PRINT '>>> Ruta seleccionada para la prueba: ' + CAST(@IdRuta_Test AS VARCHAR)
    PRINT '>>> Zona (IdDibujoZona): ' + ISNULL(CAST(@IdZona_Test AS VARCHAR), 'SIN ZONA')
    PRINT '>>> Tipo de Vehículo requerido: ' + CAST(@IdTipoVehiculo_Test AS VARCHAR)
    PRINT ''
    PRINT 'EJECUTANDO ASIGNACIÓN...'
    
    -- Ejecutamos el SP con el nuevo parámetro IdRuta
    EXEC dbo.Z_ProponerVehiculoViaje @IdRuta = @IdRuta_Test;

    -- 3. Verificamos si se realizó el cambio en todos los segmentos de la ruta
    PRINT ''
    PRINT 'RESULTADO POST-EJECUCIÓN (Segmentos de la Ruta ' + CAST(@IdRuta_Test AS VARCHAR) + '):'
    SELECT 
        V.IdViaje, 
        V.IdRuta,
        V.IdVehiculo AS [VehiculoAsignado], 
        VE.ReferenciaExterna AS [Patente_Asignada],
        V.IdDibujoZona AS [ZonaRuta],
        V.IdTipoVehiculo
    FROM dbo.Viaje V WITH (NOLOCK)
    LEFT JOIN dbo.Vehiculo VE WITH (NOLOCK) ON V.IdVehiculo = VE.IdVehiculo
    WHERE V.IdRuta = @IdRuta_Test;
END
GO
