-- ==============================================================================
-- BUSCAR COLUMNA DE NOMBRE DE CLIENTE EN PARADA 388
-- ==============================================================================
-- Este script busca qué columna contiene el texto 'Mihilla' en la parada 388
-- para poder limpiarlo también en la Parada de Rendición.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

DECLARE @SearchString NVARCHAR(100) = 'Mihilla';

-- Buscar en todas las columnas de tipo texto de la tabla Parada para el ID 388
DECLARE @Sql NVARCHAR(MAX) = N'';

SELECT @Sql += N'SELECT ''' + c.name + ''' AS NombreColumna, CAST(' + QUOTENAME(c.name) + ' AS NVARCHAR(MAX)) AS Valor '
            + N'FROM Parada WHERE IdParada = 388 AND CAST(' + QUOTENAME(c.name) + ' AS NVARCHAR(MAX)) LIKE ''%' + @SearchString + '%'' UNION ALL '
FROM sys.columns c
INNER JOIN sys.types t ON c.system_type_id = t.system_type_id
WHERE c.object_id = OBJECT_ID('dbo.Parada')
  AND t.name IN ('char', 'varchar', 'nchar', 'nvarchar', 'text', 'ntext');

-- Eliminar el último 'UNION ALL '
IF LEN(@Sql) > 10
BEGIN
    SET @Sql = LEFT(@Sql, LEN(@Sql) - 10);
    EXEC sp_executesql @Sql;
END
ELSE
BEGIN
    PRINT 'No se encontraron columnas de texto.';
END
GO
