USE [UNIGIS_DataRepository_EUROPASTRY]
GO

-- =============================================================================
-- SCRIPT DE TEST: Validación de Resolución Dinámica por CP
-- FECHA: 16/05/2026
-- =============================================================================

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'TEST: Inteligencia Geográfica por CP (Crossdock)';
PRINT '═══════════════════════════════════════════════════════════════';

-- 1. Verificar Función
PRINT '';
PRINT '── Paso 1: Verificación de la Función Z_FN_CalcularDepositoPorCP ──';

DECLARE @CP_BCN VARCHAR(10) = '08001';
DECLARE @CP_MAD VARCHAR(10) = '28001';
DECLARE @CP_SEV VARCHAR(10) = '41001';
DECLARE @CP_BAD VARCHAR(10) = '8005'; -- 4 dígitos para testear normalización

SELECT 
    'Barcelona' AS Ciudad, @CP_BCN AS CP, [dbo].[Z_FN_CalcularDepositoPorCP](@CP_BCN) AS IdDepositoEsperado_9
UNION ALL
SELECT 
    'Madrid', @CP_MAD, [dbo].[Z_FN_CalcularDepositoPorCP](@CP_MAD) AS IdDepositoEsperado_7
UNION ALL
SELECT 
    'Sevilla', @CP_SEV, [dbo].[Z_FN_CalcularDepositoPorCP](@CP_SEV) AS IdDepositoEsperado_11
UNION ALL
SELECT 
    'BCN (Corto)', @CP_BAD, [dbo].[Z_FN_CalcularDepositoPorCP](@CP_BAD) AS IdDepositoEsperado_9;

-- 2. Verificar Resolución Automática en el SP
PRINT '';
PRINT '── Paso 2: Simulación de Resolución Automática en SP ──';

-- Para este test, necesitamos un ID de pedido real o temporal. 
-- Aquí simulamos la llamada lógica interna del SP.

DECLARE @PedidoCP VARCHAR(20) = '08302'; -- Maresme, Barcelona
DECLARE @IdCalculado INT;

SET @IdCalculado = [dbo].[Z_FN_CalcularDepositoPorCP](@PedidoCP);

IF @IdCalculado = 9
    PRINT '  ✓ ÉXITO: El CP ' + @PedidoCP + ' resolvió correctamente al Hub 9 (Barcelona).';
ELSE
    PRINT '  ❌ FALLO: El CP ' + @PedidoCP + ' resolvió a ' + ISNULL(CAST(@IdCalculado AS VARCHAR(10)), 'NULL') + ' (Esperado: 9).';

-- 3. Verificación de Integración (Consulta la nueva lógica en el SP)
PRINT '';
PRINT '── Paso 3: Verificación de Integración en Z_SP_ResolverRutaInterDepositos ──';
PRINT 'Nota: Para ejecutar esto con un pedido real, use:';
PRINT 'EXEC Z_SP_ResolverRutaInterDepositos @IdPedido = [ID], @TieneIntermedios = @OutVar OUTPUT';

PRINT '';
PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'FIN DEL TEST DE GEOGRAFÍA';
PRINT '═══════════════════════════════════════════════════════════════';
GO
