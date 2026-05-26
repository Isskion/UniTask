USE [UNIGIS_DataRepository_EUROPASTRY]
GO

-- =============================================================================
-- SCRIPT DE PRUEBAS: Validación de vinculación Conductor ↔ Operación (IdConductor = 7)
-- =============================================================================

PRINT '════════════════════════════════════════════════════════════════════════';
PRINT '1. DIAGNÓSTICO INICIAL (Conductor ID = 7)';
PRINT '════════════════════════════════════════════════════════════════════════';

-- Ver información del conductor en tabla maestro
SELECT IdConductor, Nombre, ReferenciaExterna 
FROM dbo.Conductor 
WHERE IdConductor = 7;

-- Ver el campo dinámico que tiene el ID de la operación
SELECT IdConductor, operacion2 AS [IdOperacion (operacion2)]
FROM dbo.Conductor_Dyn 
WHERE IdConductor = 7;

-- Ver si ya existe alguna relación en la tabla puente
SELECT IdOperacionConductor, IdConductor, IdOperacion 
FROM dbo.OperacionConductor 
WHERE IdConductor = 7;

PRINT '';
PRINT '════════════════════════════════════════════════════════════════════════';
PRINT '2. EJECUCIÓN DEL SP PARA EL CONDUCTOR 7';
PRINT '════════════════════════════════════════════════════════════════════════';

-- Ejecución en modo conductor único
EXEC dbo.Z_SP_RelacionarConductorOperacion @IdConductor = 7;

PRINT '';
PRINT '════════════════════════════════════════════════════════════════════════';
PRINT '3. VERIFICACIÓN POST-EJECUCIÓN';
PRINT '════════════════════════════════════════════════════════════════════════';

-- Comprobar si se insertó la relación
SELECT IdOperacionConductor, IdConductor, IdOperacion 
FROM dbo.OperacionConductor 
WHERE IdConductor = 7;

PRINT '';
PRINT '════════════════════════════════════════════════════════════════════════';
PRINT '4. PRUEBA DE INDEMPOTENCIA (Ejecutar de nuevo para validar que no duplique)';
PRINT '════════════════════════════════════════════════════════════════════════';

EXEC dbo.Z_SP_RelacionarConductorOperacion @IdConductor = 7;

/*
-- =============================================================================
-- SCRIPT DE LIMPIEZA / RESET (Por si deseas volver a probar desde cero)
-- =============================================================================
-- DECLARE @IdOperacion INT;
-- SELECT @IdOperacion = TRY_CAST(operacion2 AS INT) FROM dbo.Conductor_Dyn WHERE IdConductor = 7;
-- DELETE FROM dbo.OperacionConductor WHERE IdConductor = 7 AND IdOperacion = @IdOperacion;
-- PRINT 'Relación eliminada. Listo para volver a probar.';
*/
