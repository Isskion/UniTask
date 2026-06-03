-- ==============================================================================
-- COMPARATIVA CRÍTICA: PARADA ORIGINAL (VISIBLE) VS NUEVA RENDICIÓN (INVISIBLE)
-- ==============================================================================
-- Buscamos columnas vacías en la rendición que la parada original sí tiene rellenas
-- y que el sincronizador del MÓVIL podría estar exigiendo.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

DECLARE @IdParadaOriginal INT = 388
DECLARE @IdParadaNueva INT

-- Recuperar el ID de la nueva parada de rendición generada en el viaje 79
SELECT TOP 1 @IdParadaNueva = IdParada 
FROM Parada WITH (NOLOCK) 
WHERE IdViaje = 79 AND IdTipoParada = 10 
ORDER BY IdParada DESC;

PRINT '🔍 Comparando Parada Original (Visible): ' + CAST(@IdParadaOriginal AS VARCHAR(10))
PRINT '🔍 Con Nueva Rendición (Invisible):    ' + CAST(ISNULL(@IdParadaNueva, 0) AS VARCHAR(10))
PRINT ''

IF @IdParadaNueva IS NULL
BEGIN
    PRINT '⚠️ ERROR: No se encontró ninguna parada de rendición (Tipo 10) en el viaje 79.'
    RETURN
END

-- Consulta dinámica pivotada verticalmente para ver diferencias de nulos/vacíos
DECLARE @SQL NVARCHAR(MAX) = N''

SELECT @SQL = @SQL + 
    N'SELECT ''' + COLUMN_NAME + N''' AS Columna, ' +
    N'CAST(o.[' + COLUMN_NAME + N'] AS NVARCHAR(MAX)) AS [Original_388_Visible], ' +
    N'CAST(n.[' + COLUMN_NAME + N'] AS NVARCHAR(MAX)) AS [Rendicion_' + CAST(@IdParadaNueva AS NVARCHAR(10)) + N'_Invisible] ' +
    N'FROM (SELECT * FROM Parada WHERE IdParada = ' + CAST(@IdParadaOriginal AS NVARCHAR(10)) + N') o ' +
    N'FULL OUTER JOIN (SELECT * FROM Parada WHERE IdParada = ' + CAST(@IdParadaNueva AS NVARCHAR(10)) + N') n ON 1=1 ' +
    N'WHERE ISNULL(CAST(o.[' + COLUMN_NAME + N'] AS NVARCHAR(MAX)), '''') <> ISNULL(CAST(n.[' + COLUMN_NAME + N'] AS NVARCHAR(MAX)), '''') ' +
    N'UNION ALL '
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Parada' 
  AND TABLE_SCHEMA = 'dbo'
  AND DATA_TYPE NOT IN ('text', 'ntext', 'image', 'varbinary', 'binary') -- Evitar tipos no convertibles directamente

-- Quitar el último UNION ALL
IF LEN(@SQL) > 10
    SET @SQL = LEFT(@SQL, LEN(@SQL) - 10) + N' ORDER BY Columna;'

EXEC sp_executesql @SQL;
GO
