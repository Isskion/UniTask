-- =============================================================================
-- SCRIPT: Chequeo de Esquema Específico - Proyecto LUIS SIMOES (LS)
-- FECHA:  19/05/2026
-- DESCRIPCIÓN: Consultas breves para validar campos de depósitos, existencia
--              de tablas crossdock y registros de ejemplo sin saturar la consola.
-- =============================================================================

USE [UNIGIS_DataRepository_LUIS_SIMOES];
GO

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '1. VALIDACIÓN DE COLUMNAS CLAVE EN PEDIDO';
PRINT '═════════════════════════════════════════════════════════════════════════════';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Pedido'
  AND (COLUMN_NAME LIKE '%Deposito%' 
       OR COLUMN_NAME LIKE '%Hub%' 
       OR COLUMN_NAME LIKE '%Referencia%' 
       OR COLUMN_NAME LIKE '%Direccion%')
ORDER BY COLUMN_NAME;

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '2. EXISTENCIA DE TABLAS DE CONFIGURACIÓN DE RUTAS INTERMEDIAS / CROSSDOCK';
PRINT '═════════════════════════════════════════════════════════════════════════════';
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%RutaInter%' 
   OR TABLE_NAME LIKE '%DepositoConfig%' 
   OR TABLE_NAME LIKE '%Crossdock%'
ORDER BY TABLE_NAME;

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '3. MUESTRA DE PEDIDOS RECIENTES Y SUS DEPOSITOS';
PRINT '═════════════════════════════════════════════════════════════════════════════';
-- Mapea los últimos 5 pedidos para observar qué depósitos reales se están registrando
SELECT TOP 5
    IdPedido,
    IdEstadoPedido,
    IdTipoPedido,
    IdDepositoSalida,
    IdDepositoLlegada,
    Direccion
FROM Pedido
ORDER BY IdPedido DESC;

PRINT '═════════════════════════════════════════════════════════════════════════════';
PRINT '4. MUESTRA DE VIAJES RECIENTES';
PRINT '═════════════════════════════════════════════════════════════════════════════';
-- Mapea los últimos 5 viajes para ver sus estados y descripciones reales
SELECT TOP 5
    IdViaje,
    Descripcion,
    IdEstadoViaje,
    FechaCreacion
FROM Viaje
ORDER BY IdViaje DESC;
