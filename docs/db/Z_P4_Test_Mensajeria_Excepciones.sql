-- =============================================================================
-- SQL Script: [P4_B] Test de Validación de Mensajería y Excepciones (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Simula escenarios de error (CP nulo, CP desconocido) para 
--                  validar que el SP P3 registra los mensajes correctamente.
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

-- ⚠️ IMPORTANTE: Selecciona un ID de Pedido de pruebas seguro ⚠️
DECLARE @IdPedidoTest INT = (SELECT TOP 1 IdPedido FROM Pedido ORDER BY IdPedido DESC); 

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'P4_B: TEST DE MENSAJERÍA DE EXCEPCIONES EN PEDIDO';
PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'Simulando en Pedido ID: ' + CAST(@IdPedidoTest AS VARCHAR(10));

-- ── ESCENARIO 1: CP NULO ─────────────────────────────────────────────────────
PRINT '';
PRINT '>> Escenario 1: CP Nulo (Debe registrar error de CP no definido)';

-- Limpiamos estado previo
UPDATE Pedido 
SET CodigoPostal = NULL, 
    Mensaje = NULL, 
    IdDepositoLlegada = NULL 
WHERE IdPedido = @IdPedidoTest;

DECLARE @Tiene BIT;
EXEC [dbo].[Z_SP_ResolverRutaInterDepositos] @IdPedido = @IdPedidoTest, @TieneIntermedios = @Tiene OUTPUT;

-- Verificamos resultado
SELECT 
    IdPedido, 
    CodigoPostal, 
    ISNULL(Mensaje, '❌ SIN MENSAJE') AS MensajeResultante
FROM Pedido 
WHERE IdPedido = @IdPedidoTest;


-- ── ESCENARIO 2: CP NO ZONIFICADO ──────────────────────────────────────────
PRINT '';
PRINT '>> Escenario 2: CP Desconocido (Debe registrar error de zonificación)';

-- Ponemos un CP que no esté en nuestra tabla P1 (ej: un CP de otro país o inventado)
UPDATE Pedido 
SET CodigoPostal = '99999', 
    Mensaje = NULL, 
    IdDepositoLlegada = NULL 
WHERE IdPedido = @IdPedidoTest;

EXEC [dbo].[Z_SP_ResolverRutaInterDepositos] @IdPedido = @IdPedidoTest, @TieneIntermedios = @Tiene OUTPUT;

-- Verificamos resultado
SELECT 
    IdPedido, 
    CodigoPostal, 
    ISNULL(Mensaje, '❌ SIN MENSAJE') AS MensajeResultante
FROM Pedido 
WHERE IdPedido = @IdPedidoTest;

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'FIN DEL TEST DE MENSAJERÍA';
PRINT '═══════════════════════════════════════════════════════════════';
GO
