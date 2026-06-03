-- ==============================================================================
-- DIAGNÓSTICO DE PARADA DE RENDICIÓN - VIAJE ID 76
-- ==============================================================================
-- Este script simula el motor lógico de [Z_SP_GenerarRendicion_V2] 
-- para entender por qué no se ha generado la parada de rendición.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

DECLARE @IdViaje INT = 76;

-- 1. RESUMEN DEL VIAJE Y SUS PARADAS
PRINT '--- 1. RESUMEN DEL VIAJE Y SUS PARADAS ---';
SELECT 
    V.IdViaje,
    V.Descripcion AS Viaje_Descripcion,
    V.IdDepositoLlegada AS Viaje_DepositoLlegada,
    P.IdParada,
    P.Orden,
    P.IdTipoParada,
    TP.Descripcion AS TipoParada_Desc,
    P.IdEstadoParada,
    EP.Descripcion AS EstadoParada_Desc,
    P.ReferenciaExterna AS Parada_RefExterna
FROM Viaje V WITH (NOLOCK)
INNER JOIN Parada P WITH (NOLOCK) ON P.IdViaje = V.IdViaje
LEFT JOIN TipoParada TP WITH (NOLOCK) ON TP.IdTipoParada = P.IdTipoParada
LEFT JOIN EstadoParada EP WITH (NOLOCK) ON EP.IdEstadoParada = P.IdEstadoParada
WHERE V.IdViaje = @IdViaje
ORDER BY P.Orden;


-- 1b. COLUMNAS REALES DE LA TABLA VIAJE EN TU BASE DE DATOS (PARA REFERENCIA)
PRINT '--- 1B. ESTRUCTURA DE LA TABLA VIAJE (COLUMNAS) ---';
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Viaje'
ORDER BY COLUMN_NAME;


-- 2. ANÁLISIS DE ITEMS POR PARADA (SIMULACIÓN DE SOBRANTES)
PRINT '--- 2. ANÁLISIS DE ITEMS Y CANTIDADES (SOBRANTES / RECOGIDAS) ---';
SELECT 
    P.IdParada,
    P.Orden,
    P.IdEstadoParada, -- Añadido para análisis de visitado
    PE.IdPedido,
    PE.IdTipoPedido,
    PE.IdEstadoPedido,
    PI.IdParadaItem,
    PI.CodigoProducto,
    PI.Descripcion AS Producto,
    PI.Cantidad AS CantidadOriginal,
    ISNULL(SUM(PIC.Cantidad), 0) AS CantidadEntregada,
    (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) AS EvaluadoSobrante,
    -- Simulación de la lógica real del SP (corregida para usar EstadoParada)
    CASE 
        WHEN PE.IdTipoPedido <> 2 AND P.IdEstadoParada IN (100, 101, 102, 103, 104) AND (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) > 0 THEN 'SI (Genera Rendición por Sobrante)'
        WHEN PE.IdTipoPedido = 2 AND P.IdEstadoParada IN (100, 101, 103, 104) AND ISNULL(SUM(PIC.Cantidad), PI.Cantidad) > 0 THEN 'SI (Genera Rendición por Recogida)'
        ELSE 'NO CUMPLE REGLAS'
    END AS ResultadoReglaRendicion
FROM Parada P WITH (NOLOCK)
INNER JOIN Pedido PE WITH (NOLOCK) ON PE.IdPedido = P.IdPedido
INNER JOIN ParadaItem PI WITH (NOLOCK) ON PI.IdParada = P.IdParada
LEFT JOIN ParadaItemCantidad PIC WITH (NOLOCK) ON PIC.IdParadaItem = PI.IdParadaItem
WHERE P.IdViaje = @IdViaje
  AND P.IdTipoParada <> 10 -- Excluir si ya existe rendición
GROUP BY 
    P.IdParada, P.Orden, P.IdEstadoParada, PE.IdPedido, PE.IdTipoPedido, PE.IdEstadoPedido,
    PI.IdParadaItem, PI.CodigoProducto, PI.Descripcion, PI.Cantidad
ORDER BY P.Orden, PI.CodigoProducto;


-- 3. VERIFICACIÓN DE EXISTENCIA DE LA PARADA DE RENDICIÓN
PRINT '--- 3. EXISTENCIA DE RENDICIÓN REGISTRADA ---';
DECLARE @RefRendicion VARCHAR(50) = 'REND-V' + CAST(@IdViaje AS VARCHAR(20));

SELECT 
    IdParada,
    ReferenciaExterna,
    IdTipoParada,
    IdEstadoParada,
    FechaCreacion,
    IdDeposito
FROM Parada WITH (NOLOCK)
WHERE IdViaje = @IdViaje
  AND IdTipoParada = 10
  AND ReferenciaExterna = @RefRendicion;


-- 4. [NUEVO] INSPECCIÓN DE ESTRUCTURAS DE TABLAS
PRINT '--- 4. ESTRUCTURA DE LAS TABLAS DE CANTIDADES ---';
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH AS LONGITUD
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('ParadaItem', 'ParadaItemCantidad')
ORDER BY TABLE_NAME, ORDINAL_POSITION;


-- 5. [NUEVO] REGISTROS CRUDOS DE PARADAITEM Y PARADAITEMCANTIDAD
PRINT '--- 5. DETALLE DE REGISTROS EN PARADAITEMCANTIDAD ---';
SELECT 
    PI.IdParada,
    PI.IdParadaItem,
    PI.CodigoProducto,
    PI.Cantidad AS Cantidad_Original_PI,
    PIC.*
FROM ParadaItem PI WITH (NOLOCK)
INNER JOIN Parada P WITH (NOLOCK) ON P.IdParada = PI.IdParada
LEFT JOIN ParadaItemCantidad PIC WITH (NOLOCK) ON PIC.IdParadaItem = PI.IdParadaItem
WHERE P.IdViaje = @IdViaje
ORDER BY PI.IdParada, PI.CodigoProducto;
GO

