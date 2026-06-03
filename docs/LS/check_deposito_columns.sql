-- =============================================================================
-- SCRIPT: Validación de Columnas de la Tabla Deposito - Proyecto LUIS SIMOES (LS)
-- FECHA:  19/05/2026
-- DESCRIPCIÓN: Devuelve la lista completa de columnas de la tabla Deposito
--              para asegurar que existen las propiedades geográficas y de dirección
--              necesarias para la clonación de paradas intermedias.
-- =============================================================================

USE [UNIGIS_DataRepository_LUIS_SIMOES];
GO

SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Deposito'
ORDER BY COLUMN_NAME;
