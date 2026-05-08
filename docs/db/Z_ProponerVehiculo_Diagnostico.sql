DECLARE @IdJornada BIGINT = 55; -- Reemplazar con el IdJornada real si es otro
DECLARE @IdRutaPrueba INT = (SELECT TOP 1 IdRuta FROM dbo.Ruta WHERE IdJornada = @IdJornada);

IF @IdRutaPrueba IS NULL
BEGIN
    PRINT 'No se encontró ninguna ruta para la jornada ' + CAST(@IdJornada AS VARCHAR);
    RETURN;
END

DECLARE @IdTipoVehiculo INT, @Zona VARCHAR(50);
SELECT @IdTipoVehiculo = IdTipoVehiculo, @Zona = Zona FROM dbo.Ruta WHERE IdRuta = @IdRutaPrueba;

DECLARE @ZonaFiltro VARCHAR(10) = RIGHT('000' + ISNULL(@Zona, ''), 3);

PRINT '--- DATOS DE LA RUTA ---';
PRINT 'IdRuta: ' + CAST(@IdRutaPrueba AS VARCHAR);
PRINT 'IdTipoVehiculo: ' + CAST(ISNULL(@IdTipoVehiculo, 0) AS VARCHAR);
PRINT 'Zona Original: ' + ISNULL(@Zona, 'NULL') + ' -> Zona Filtro: ' + @ZonaFiltro;

PRINT '--- DIAGNÓSTICO DE JOINS ---';

-- 1. Total Vehiculos en VehiculoJornada
SELECT '1. Total en VehiculoJornada' AS Paso, COUNT(*) AS Cantidad FROM dbo.VehiculoJornada WHERE IdJornada = @IdJornada;

-- 2. Join con Vehiculo
SELECT '2. Join con Vehiculo' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
WHERE VJ.IdJornada = @IdJornada;

-- 3. Join con Conductor (¿Tienen los vehículos un conductor asignado?)
SELECT '3. Join con Conductor' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
WHERE VJ.IdJornada = @IdJornada;

-- 4. Join con Recurso (¿Existe el estado del recurso?)
SELECT '4. Join con Recurso' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
WHERE VJ.IdJornada = @IdJornada;

-- 5. Join con Conductor_Dyn (¿Están los campos dinámicos cargados?)
SELECT '5. Join con Conductor_Dyn' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
WHERE VJ.IdJornada = @IdJornada;

-- 6. Filtro por Tipo Vehículo
SELECT '6. Filtro TipoVehiculo' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
WHERE VJ.IdJornada = @IdJornada AND V.IdTipoVehiculo = @IdTipoVehiculo;

-- 7. Filtro por Estado Recurso (IdEstado = 1)
SELECT '7. Filtro Estado Recurso = 1' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.Vehiculo V
INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
WHERE R.IdEstado = 1;

-- 8. Filtro por Zona
SELECT '8. Filtro por Zona (' + @ZonaFiltro + ')' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.Conductor_Dyn CD
WHERE CD.ZonaOpcionA = @ZonaFiltro OR CD.ZonaOpcionB = @ZonaFiltro OR CD.ZonaOpcionC = @ZonaFiltro;

-- 9. Consulta Completa Final
SELECT '9. Consulta Completa' AS Paso, COUNT(*) AS Cantidad 
FROM dbo.VehiculoJornada VJ
INNER JOIN dbo.Vehiculo V ON VJ.IdVehiculo = V.IdVehiculo
INNER JOIN dbo.Conductor C ON V.IdConductor = C.IdConductor
INNER JOIN dbo.Recurso R ON V.ReferenciaExterna = R.ReferenciaExterna
INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
WHERE VJ.IdJornada = @IdJornada
  AND V.IdTipoVehiculo = @IdTipoVehiculo
  AND R.IdEstado = 1 
  AND (CD.ZonaOpcionA = @ZonaFiltro OR CD.ZonaOpcionB = @ZonaFiltro OR CD.ZonaOpcionC = @ZonaFiltro);
