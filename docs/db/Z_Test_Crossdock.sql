USE [UNIGIS_DataRepository_EUROPASTRY]
GO

-- =============================================================================
-- SCRIPT DE TEST: Crossdock con Depósitos Intermedios (v3.0)
-- FECHA: 15/05/2026
-- 
-- INSTRUCCIONES:
--   1. Ejecutar los scripts de creación y el INSERT de estados primero.
--   2. Este test usa los COLs reales:
--        14: COL CARREGADO (Portugal)
--         7: COL físico AX (Centralidad Madrid)
--         9: COL físico BL (Barcelona Lliçà de Vall)
--   3. Ajustar @IdPedidoTest a un Pedido real de pruebas.
-- =============================================================================

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'TEST: Crossdock Estructural con Depósitos Intermedios';
PRINT '═══════════════════════════════════════════════════════════════';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 1: VERIFICAR QUE EXISTEN LOS OBJETOS
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Verificando objetos ──';

IF OBJECT_ID('Z_RutaInterDepositoConfig', 'U') IS NOT NULL PRINT '  ✓ Tabla Z_RutaInterDepositoConfig existe';
ELSE PRINT '  ✗ Tabla Z_RutaInterDepositoConfig NO existe';

IF OBJECT_ID('Z_SP_ResolverRutaInterDepositos', 'P') IS NOT NULL PRINT '  ✓ SP Z_SP_ResolverRutaInterDepositos existe';
ELSE PRINT '  ✗ SP Z_SP_ResolverRutaInterDepositos NO existe';

IF OBJECT_ID('Z_SP_GenerarCrossdock', 'P') IS NOT NULL PRINT '  ✓ SP Z_SP_GenerarCrossdock (Generador v3) existe';
ELSE PRINT '  ✗ SP Z_SP_GenerarCrossdock NO existe';

IF OBJECT_ID('Z_SP_ProcesarCrossdock', 'P') IS NOT NULL PRINT '  ✓ SP Z_SP_ProcesarCrossdock (Orquestador) existe';
ELSE PRINT '  ✗ SP Z_SP_ProcesarCrossdock NO existe';

IF OBJECT_ID('Z_SP_AnularCrossdock', 'P') IS NOT NULL PRINT '  ✓ SP Z_SP_AnularCrossdock (Anulación) existe';
ELSE PRINT '  ✗ SP Z_SP_AnularCrossdock NO existe';

IF EXISTS (SELECT 1 FROM EstadoPedido WHERE IdEstadoPedido = 6) PRINT '  ✓ Estado 6 (Crossdock) existe en DB';
ELSE PRINT '  ✗ Estado 6 (Crossdock) NO existe en DB';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 2: INSERTAR CONFIGURACIÓN REAL (Portugal 14 → Barcelona 9 vía Madrid 7)
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Insertando configuración real de ejemplo ──';

DECLARE @DepPortugal  INT = 14, -- COL CARREGADO
        @DepMadrid     INT = 7,  -- COL Físico AX Centralidad Madrid
        @DepBarcelona INT = 9;  -- COL Físico BL Barcelona

IF NOT EXISTS (
    SELECT 1 FROM Z_RutaInterDepositoConfig 
    WHERE IdDepositoOrigen = @DepPortugal AND IdDepositoDestino = @DepBarcelona
)
BEGIN
    INSERT INTO Z_RutaInterDepositoConfig 
    (IdDepositoOrigen, IdDepositoDestino, IdDepositoIntermedio, Orden, TipoTransferencia, TiempoEstimadoMinutos, Activo, Observaciones)
    VALUES
    (@DepPortugal, @DepBarcelona, @DepMadrid, 1, 'CROSS-DOCK', 240, 1, 'Parada Intermedia obligatoria en Madrid Centralidad');

    PRINT '  ✓ Configuración Portugal (14) → Madrid (7) → Barcelona (9) creada.';
END
ELSE
    PRINT '  ⚠ La configuración Portugal → Madrid → Barcelona ya existía.';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 3: VERIFICAR RECURSOS ESTRUCTURALES "NO DETERMINADOS"
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Recursos Estructurales Detectados para Viajes ──';

SELECT 'Vehículo' AS Tipo, IdVehiculo AS ID, Descripcion FROM Vehiculo WHERE Descripcion LIKE '%NO DET%' OR ReferenciaExterna LIKE '%NO DET%'
UNION ALL
SELECT 'Conductor', IdConductor, Nombre + ' ' + ISNULL(Apellido,'') FROM Conductor WHERE Nombre LIKE '%NO DET%' OR Apellido LIKE '%NO DET%'
UNION ALL
SELECT 'Remolque', IdVehiculo, Descripcion FROM Vehiculo WHERE (Descripcion LIKE '%REMOLQUE%' OR ReferenciaExterna LIKE '%REMOLQUE%') AND (Descripcion LIKE '%NO DET%' OR ReferenciaExterna LIKE '%NO DET%');

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 4: EJECUTAR TEST END-TO-END (ORQUESTADOR)
-- ══════════════════════════════════════════════════════════════════════════════
-- ⚠️ AJUSTAR @IdPedidoTest a un Pedido real que tenga DepositoSalida = 14 y DepositoLlegada = 9 ⚠️

/*
DECLARE @IdPedidoTest INT = 99999; -- 👈 Colocar IdPedido real aquí

PRINT '';
PRINT '═══ EJECUTANDO ORQUESTADOR CROSSDOCK ═══';
EXEC Z_SP_ProcesarCrossdock @IdPedido = @IdPedidoTest;

-- Verificar Viajes y Rutas creadas estructuralmente
PRINT '';
PRINT '── Viajes y Rutas Creadas ──';
SELECT 
    V.IdViaje,
    V.Descripcion AS ViajeDesc,
    R.IdRuta,
    V.ReferenciaExterna AS ViajeRef,
    V.IdEstadoViaje,
    V.IdVehiculo,
    Veh.Descripcion AS Vehiculo,
    V.IdConductor,
    Cond.Nombre AS Conductor
FROM Viaje V
INNER JOIN Ruta R ON R.IdRuta = V.IdRuta
LEFT JOIN Vehiculo Veh ON Veh.IdVehiculo = V.IdVehiculo
LEFT JOIN Conductor Cond ON Cond.IdConductor = V.IdConductor
WHERE V.ReferenciaExterna LIKE 'XDOCK-V' + CAST(@IdPedidoTest AS VARCHAR(10)) + '%';

-- Verificar Paradas y su relación a la Orden estructural
PRINT '';
PRINT '── Paradas Generadas y Vinculación Comercial ──';
SELECT 
    P.IdParada,
    P.IdViaje,
    P.Orden AS OrdenEnViaje,
    P.Descripcion,
    P.ReferenciaExterna AS ParadaRef,
    P.IdPedido,
    P.IdOrden,
    P.IdOrdenParada,
    (SELECT COUNT(*) FROM ParadaItem WHERE IdParada = P.IdParada) AS CantItems
FROM Parada P
WHERE P.ReferenciaExterna LIKE 'XDOCK-P' + CAST(@IdPedidoTest AS VARCHAR(10)) + '%';
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 5: EJECUTAR ANULACIÓN
-- ══════════════════════════════════════════════════════════════════════════════
/*
DECLARE @IdPedidoTest INT = 99999; -- 👈 El mismo Pedido de arriba

PRINT '';
PRINT '═══ ANULANDO CROSSDOCK ═══';
EXEC Z_SP_AnularCrossdock @IdPedido = @IdPedidoTest;

-- Verificar anulación
PRINT '';
PRINT '── Estado Post-Anulación ──';
SELECT 
    'Viaje' AS Tipo,
    V.IdViaje AS ID,
    V.ReferenciaExterna,
    CASE V.IdEstadoViaje WHEN 4 THEN '✓ ANULADO' ELSE '❌ ACTIVO (' + CAST(V.IdEstadoViaje AS VARCHAR(5)) + ')' END AS Estado
FROM Viaje V WHERE V.ReferenciaExterna LIKE 'XDOCK-V' + CAST(@IdPedidoTest AS VARCHAR(10)) + '%'
UNION ALL
SELECT 
    'Parada',
    P.IdParada,
    P.ReferenciaExterna,
    CASE P.IdEstadoParada WHEN 108 THEN '✓ CANCELADA' ELSE '❌ ACTIVA' END
FROM Parada P WHERE P.ReferenciaExterna LIKE 'XDOCK-P' + CAST(@IdPedidoTest AS VARCHAR(10)) + '%';
*/

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'FIN DEL TEST';
PRINT '═══════════════════════════════════════════════════════════════';
GO
