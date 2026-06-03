-- =============================================================================
-- SQL Script: [P4] Script de Validación de Resolución por CP (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'P4: TEST DE INTELIGENCIA GEOGRÁFICA HESA';
PRINT '═══════════════════════════════════════════════════════════════';

SELECT 
    'BCN (08001)' AS Caso, [dbo].[Z_FN_CalcularDepositoPorCP]('08001') AS IdDepositoCalculado, 9 AS Esperado
UNION ALL
SELECT 
    'MAD (28005)', [dbo].[Z_FN_CalcularDepositoPorCP]('28005'), 7
UNION ALL
SELECT 
    'SEV (41010)', [dbo].[Z_FN_CalcularDepositoPorCP]('41010'), 11;

PRINT '';
PRINT 'Si los valores coinciden, el Paso P2 y la tabla P1 están correctamente vinculados.';
GO
