-- ==============================================================================
-- COMPARATIVA COLUMNA POR COLUMNA: PARADA VISIBLE VS INVISIBLE
-- ==============================================================================
-- Este script compara el registro 389 (visible) con el 397 (invisible)
-- para encontrar EXACTAMENTE qué columna está provocando que no se muestre.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

PRINT '📊 Comparativa vertical de columnas entre Parada 389 (Visible) y Parada 397 (Rendición):';

DECLARE @Sql NVARCHAR(MAX) = N'';

SELECT @Sql += N'SELECT ' 
            + N'''' + c.name + ''' AS [Columna], '
            + N'(SELECT CAST(' + QUOTENAME(c.name) + ' AS NVARCHAR(MAX)) FROM Parada WHERE IdParada = 389) AS [Parada_389_Visible], '
            + N'(SELECT CAST(' + QUOTENAME(c.name) + ' AS NVARCHAR(MAX)) FROM Parada WHERE IdParada = 397) AS [Parada_397_Rendicion] '
            + N'UNION ALL '
FROM sys.columns c
WHERE c.object_id = OBJECT_ID('dbo.Parada')
  -- Excluir columnas tipo BINARY/IMAGE que fallen en el CAST simple
  AND c.system_type_id NOT IN (34, 35, 165, 173, 189) 
ORDER BY c.column_id;

-- Eliminar el último 'UNION ALL '
IF LEN(@Sql) > 10
BEGIN
    SET @Sql = LEFT(@Sql, LEN(@Sql) - 10);
    EXEC sp_executesql @Sql;
END
ELSE
BEGIN
    PRINT 'Error al generar la consulta dinámica.';
END
GO
