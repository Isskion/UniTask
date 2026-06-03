-- =============================================================================
-- SCRIPT: Chequeo de Objetos Personalizados (Tablas y SPs) - Proyecto LUIS SIMOES (LS)
-- FECHA:  19/05/2026
-- DESCRIPCIÓN: Busca tablas y procedimientos almacenados creados a medida (prefijo Z_)
--              para identificar si ya existe alguna base heredada de EUP/Hesa.
-- =============================================================================

USE [UNIGIS_DataRepository_LUIS_SIMOES];
GO

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '1. TABLAS CREADAS A MEDIDA (Prefijo Z_)';
PRINT '═════════════════════════════════════════════════════════════════════════════';
SELECT TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE 'Z_%'
ORDER BY TABLE_NAME;

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '2. PROCEDIMIENTOS ALMACENADOS A MEDIDA (Prefijo Z_)';
PRINT '═════════════════════════════════════════════════════════════════════════════';
SELECT ROUTINE_NAME, ROUTINE_TYPE, LAST_ALTERED
FROM INFORMATION_SCHEMA.ROUTINES
WHERE ROUTINE_NAME LIKE 'Z_%'
ORDER BY ROUTINE_NAME;
