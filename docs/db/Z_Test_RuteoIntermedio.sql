USE [UNIGIS_DataRepository_EUROPASTRY]
GO

-- =============================================================================
-- SCRIPT DE TEST: Ruteo con Depósitos Intermedios
-- FECHA: 15/05/2026
-- 
-- INSTRUCCIONES:
--   1. Ejecutar PRIMERO los scripts de creación (tabla + 3 SPs)
--   2. Ajustar los IDs de depósito de ejemplo a valores reales de EUP
--   3. Ejecutar este script en bloques o completo
--
-- NOTA: Este script usa datos de ejemplo. Revisar y ajustar los IDs
--       según los depósitos reales del entorno.
-- =============================================================================

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'TEST: Ruteo con Depósitos Intermedios';
PRINT '═══════════════════════════════════════════════════════════════';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 1: VERIFICAR QUE EXISTEN LOS OBJETOS
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Verificando objetos ──';

IF OBJECT_ID('Z_RutaInterDepositoConfig', 'U') IS NOT NULL
    PRINT '  ✓ Tabla Z_RutaInterDepositoConfig existe';
ELSE
    PRINT '  ✗ Tabla Z_RutaInterDepositoConfig NO existe — ejecutar Z_Tabla_RutaInterDepositoConfig.sql primero';

IF OBJECT_ID('Z_SP_ResolverRutaInterDepositos', 'P') IS NOT NULL
    PRINT '  ✓ SP Z_SP_ResolverRutaInterDepositos existe';
ELSE
    PRINT '  ✗ SP Z_SP_ResolverRutaInterDepositos NO existe';

IF OBJECT_ID('Z_SP_GenerarParadasIntermedias', 'P') IS NOT NULL
    PRINT '  ✓ SP Z_SP_GenerarParadasIntermedias existe';
ELSE
    PRINT '  ✗ SP Z_SP_GenerarParadasIntermedias NO existe';

IF OBJECT_ID('Z_SP_ProcesarRuteoIntermedio', 'P') IS NOT NULL
    PRINT '  ✓ SP Z_SP_ProcesarRuteoIntermedio existe';
ELSE
    PRINT '  ✗ SP Z_SP_ProcesarRuteoIntermedio NO existe';

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 2: LISTAR DEPÓSITOS DISPONIBLES (para elegir IDs de prueba)
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Depósitos disponibles ──';
SELECT TOP 20 
    IdDeposito, 
    Descripcion, 
    Direccion,
    Localidad,
    Provincia
FROM Deposito 
WHERE Descripcion IS NOT NULL 
  AND Descripcion <> ''
ORDER BY IdDeposito;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 3: INSERTAR DATOS DE CONFIGURACIÓN DE EJEMPLO
-- ══════════════════════════════════════════════════════════════════════════════
-- ⚠️ AJUSTAR ESTOS IDs A DEPÓSITOS REALES DE EUP ⚠️
-- Ejemplo: Ruta Barcelona → Madrid pasando por Zaragoza y Guadalajara

/*
-- Descomentar y ajustar IDs según los depósitos reales del entorno:

DECLARE @IdDepBarcelona   INT = 5;   -- ← Ajustar al IdDeposito real de Barcelona
DECLARE @IdDepMadrid      INT = 12;  -- ← Ajustar al IdDeposito real de Madrid
DECLARE @IdDepZaragoza    INT = 8;   -- ← Ajustar al IdDeposito real de Zaragoza (Hub intermedio)
DECLARE @IdDepGuadalajara INT = 15;  -- ← Ajustar al IdDeposito real de Guadalajara (Hub intermedio)

-- Insertar ruta: Barcelona → Madrid con 2 paradas intermedias
IF NOT EXISTS (
    SELECT 1 FROM Z_RutaInterDepositoConfig 
    WHERE IdDepositoOrigen = @IdDepBarcelona AND IdDepositoDestino = @IdDepMadrid
)
BEGIN
    INSERT INTO Z_RutaInterDepositoConfig 
    (IdDepositoOrigen, IdDepositoDestino, IdDepositoIntermedio, Orden, TipoTransferencia, TiempoEstimadoMinutos, Observaciones)
    VALUES
    (@IdDepBarcelona, @IdDepMadrid, @IdDepZaragoza,    1, 'CROSS-DOCK', 180, 'Hub Zaragoza - Descarga y recarga'),
    (@IdDepBarcelona, @IdDepMadrid, @IdDepGuadalajara, 2, 'TRANSITO',   120, 'Hub Guadalajara - Solo tránsito');

    PRINT '  ✓ Configuración de ejemplo insertada: Barcelona → Zaragoza → Guadalajara → Madrid';
END
ELSE
BEGIN
    PRINT '  ⚠ Configuración Barcelona → Madrid ya existía. No se insertó de nuevo.';
END
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 4: VERIFICAR CONFIGURACIÓN ACTUAL
-- ══════════════════════════════════════════════════════════════════════════════
PRINT '';
PRINT '── Configuración actual de rutas intermedias ──';
SELECT 
    C.IdConfig,
    DO.Descripcion  AS DepositoOrigen,
    DD.Descripcion  AS DepositoDestino,
    DI.Descripcion  AS DepositoIntermedio,
    C.Orden,
    C.TipoTransferencia,
    C.TiempoEstimadoMinutos,
    C.Activo,
    C.Observaciones
FROM Z_RutaInterDepositoConfig C
LEFT JOIN Deposito DO ON DO.IdDeposito = C.IdDepositoOrigen
LEFT JOIN Deposito DD ON DD.IdDeposito = C.IdDepositoDestino
LEFT JOIN Deposito DI ON DI.IdDeposito = C.IdDepositoIntermedio
ORDER BY C.IdDepositoOrigen, C.IdDepositoDestino, C.Orden;

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 5: TEST DEL RESOLVER (sin modificar datos)
-- ══════════════════════════════════════════════════════════════════════════════
-- ⚠️ AJUSTAR @IdPedidoTest a un Pedido real que tenga DepositoSalida y DepositoLlegada
--    que coincidan con la configuración insertada arriba ⚠️

/*
DECLARE @IdPedidoTest INT = 12345; -- ← Ajustar al IdPedido real de prueba
DECLARE @TieneIntermediosTest BIT;

PRINT '';
PRINT '── Test del Resolver ──';
EXEC Z_SP_ResolverRutaInterDepositos 
    @IdPedido = @IdPedidoTest,
    @TieneIntermedios = @TieneIntermediosTest OUTPUT;

PRINT 'Resultado: @TieneIntermedios = ' + CAST(@TieneIntermediosTest AS VARCHAR(1));
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 6: TEST COMPLETO (GENERA PARADAS) — ⚠️ MODIFICA DATOS ⚠️
-- ══════════════════════════════════════════════════════════════════════════════

/*
-- ⚠️ SOLO EJECUTAR CUANDO ESTÉS SEGURO ⚠️
-- Este test ejecuta el proceso completo: resuelve ruta + genera paradas en el Viaje

DECLARE @IdPedidoTestCompleto INT = 12345; -- ← Ajustar

PRINT '';
PRINT '── Test COMPLETO (orquestador) ──';
EXEC Z_SP_ProcesarRuteoIntermedio @IdPedido = @IdPedidoTestCompleto;

-- Verificar resultado
PRINT '';
PRINT '── Paradas del Viaje resultante ──';
SELECT 
    P.IdParada,
    P.Orden,
    P.IdTipoParada,
    P.IdEstadoParada,
    P.Descripcion,
    P.Direccion,
    P.ReferenciaExterna,
    P.Latitud,
    P.Longitud,
    (SELECT COUNT(*) FROM ParadaItem PI WHERE PI.IdParada = P.IdParada) AS CantItems
FROM Parada P
WHERE P.IdViaje = (
    SELECT TOP 1 P2.IdViaje 
    FROM Parada P2 
    INNER JOIN Viaje V ON V.IdViaje = P2.IdViaje
    WHERE P2.IdPedido = @IdPedidoTestCompleto 
      AND V.IdEstadoViaje <> 108
    ORDER BY P2.IdParada DESC
)
ORDER BY P.Orden;
*/

-- ══════════════════════════════════════════════════════════════════════════════
-- PASO 7: TEST DE IDEMPOTENCIA (ejecutar dos veces)
-- ══════════════════════════════════════════════════════════════════════════════

/*
-- Ejecutar PASO 6 dos veces seguidas.
-- Verificar que NO se duplican las paradas intermedias.
-- Las paradas con ReferenciaExterna 'INTER-V{IdViaje}-{N}' deben aparecer solo una vez.

DECLARE @IdPedidoIdemp INT = 12345; -- ← Ajustar

EXEC Z_SP_ProcesarRuteoIntermedio @IdPedido = @IdPedidoIdemp;
EXEC Z_SP_ProcesarRuteoIntermedio @IdPedido = @IdPedidoIdemp;

-- Contar paradas intermedias (debe ser = número de intermedios configurados, NO el doble)
SELECT 
    COUNT(*) AS TotalParadasIntermedias
FROM Parada
WHERE IdViaje = (
    SELECT TOP 1 P2.IdViaje 
    FROM Parada P2 
    WHERE P2.IdPedido = @IdPedidoIdemp 
    ORDER BY P2.IdParada DESC
)
AND ReferenciaExterna LIKE 'INTER-V%';
*/

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'TEST: Finalizado. Descomentar secciones según necesidad.';
PRINT '═══════════════════════════════════════════════════════════════';
GO
