-- ==============================================================================
-- DIAGNÓSTICO DE PARADA DE RENDICIÓN - VIAJE ID 79 (NUEVO ESCENARIO)
-- ==============================================================================
-- Este script simula el motor lógico de [Z_SP_GenerarRendicion_V2] 
-- para el caso de Viaje 79 y vuelca las definiciones de estados.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

DECLARE @IdViaje INT = 79;

-- ── SECCIÓN 0. DICCIONARIO DE ESTADOS DE PARADA EN LA BASE DE DATOS ──────────
PRINT '--- 0. DICCIONARIO DE ESTADOS DE PARADA (ESTADOPARADA) ---';
SELECT 
    IdEstadoParada,
    Descripcion
FROM EstadoParada WITH (NOLOCK)
ORDER BY IdEstadoParada;



-- ── SECCIÓN 1. RESUMEN DEL VIAJE 79 Y SUS PARADAS ────────────────────────────
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


-- ── SECCIÓN 2. ANÁLISIS DE ÍTEMS Y REGLA DE NEGOCIO PARA RENDICIÓN ───────────
PRINT '--- 2. ANÁLISIS DE ITEMS Y CANTIDADES (SOBRANTES / RECOGIDAS) ---';
SELECT 
    P.IdParada,
    P.Orden,
    P.IdEstadoParada,
    PE.IdPedido,
    PE.IdTipoPedido,
    PE.IdEstadoPedido,
    PI.IdParadaItem,
    PI.CodigoProducto,
    PI.Descripcion AS Producto,
    PI.Cantidad AS CantidadOriginal,
    ISNULL(SUM(PIC.Cantidad), 0) AS CantidadEntregada,
    (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) AS EvaluadoSobrante,
    
    -- Simulación de la lógica del SP actual (V2_Definitivo)
    CASE 
        WHEN PE.IdTipoPedido <> 2 AND P.IdEstadoParada IN (100, 101, 102, 103, 104) AND (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) > 0 THEN 'SI (Genera Rendición por Sobrante)'
        WHEN PE.IdTipoPedido = 2 AND P.IdEstadoParada IN (100, 101, 103, 104) AND ISNULL(SUM(PIC.Cantidad), PI.Cantidad) > 0 THEN 'SI (Genera Rendición por Recogida)'
        ELSE 'NO CUMPLE REGLAS (Por qué?: Validar EstadoParada y TipoPedido)'
    END AS ResultadoReglaRendicion
FROM Parada P WITH (NOLOCK)
INNER JOIN Pedido PE WITH (NOLOCK) ON PE.IdPedido = P.IdPedido
INNER JOIN ParadaItem PI WITH (NOLOCK) ON PI.IdParada = P.IdParada
LEFT JOIN ParadaItemCantidad PIC WITH (NOLOCK) ON PIC.IdParadaItem = PI.IdParadaItem
WHERE P.IdViaje = @IdViaje
  AND P.IdTipoParada <> 10
GROUP BY 
    P.IdParada, P.Orden, P.IdEstadoParada, PE.IdPedido, PE.IdTipoPedido, PE.IdEstadoPedido,
    PI.IdParadaItem, PI.CodigoProducto, PI.Descripcion, PI.Cantidad
ORDER BY P.Orden, PI.CodigoProducto;


-- ── SECCIÓN 3. REGISTROS CRUDOS DE RECOGIDAS (PARA VER CANTIDADES) ───────────
PRINT '--- 3. DETALLE DE REGISTROS EN PARADAITEMCANTIDAD ---';
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
