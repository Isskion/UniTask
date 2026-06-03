-- ==============================================================================
-- BÚSQUEDA DE DÓNDE SE INVOCA EL STORED PROCEDURE EN LA BASE DE DATOS
-- ==============================================================================
-- Este script rastrea si el SP es llamado desde algún Trigger, otro SP o Función
-- para confirmar el origen del disparo.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

PRINT '🔍 Buscando referencias textuales a Z_SP_GenerarRendicion en otros Objetos del Sistema...';

SELECT 
    O.name AS Objeto_Padre,
    O.type_desc AS Tipo_Objeto,
    M.definition AS Extracto_Codigo
FROM sys.sql_modules M
INNER JOIN sys.objects O ON M.object_id = O.object_id
WHERE M.definition LIKE '%Z_SP_GenerarRendicion%'
  AND O.name <> 'Z_SP_GenerarRendicion_V2' -- Excluir la propia declaración
  AND O.name <> 'Z_SP_GenerarRendicion'
ORDER BY O.type_desc, O.name;


PRINT '🔍 Comprobando si existen Triggers activos en la tabla Parada...';
SELECT 
    parent.name AS Tabla,
    trg.name AS Trigger_Name,
    trg.is_disabled AS Esta_Deshabilitado
FROM sys.triggers trg
INNER JOIN sys.objects parent ON trg.parent_id = parent.object_id
WHERE parent.name = 'Parada'
ORDER BY trg.name;
GO
