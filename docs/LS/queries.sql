-- =============================================================================
-- SCRIPT: Descubrimiento y Mapeo de Base de Datos - Proyecto LUIS SIMOES (LS)
-- FECHA:  19/05/2026
-- DESCRIPCIÓN: Consultas de diagnóstico para identificar estados, transiciones,
--              depósitos, tipos de pedido y campos dinámicos en el entorno LS.
-- =============================================================================

-- ═════════════════════════════════════════════════════════════════════════════
-- 0. IDENTIFICACIÓN DE LA BASE DE DATOS
-- ═════════════════════════════════════════════════════════════════════════════
-- Ejecuta esta consulta en 'master' si no estás seguro del nombre exacto de la base de datos de LUIS SIMOES.
/*
SELECT name 
FROM sys.databases 
WHERE name LIKE '%LS%' OR name LIKE '%SIMOES%' OR name LIKE '%LUIS%';
*/

-- Cambiar al repositorio del proyecto LS (Ajustar nombre según corresponda)
USE [UNIGIS_DataRepository_LUIS_SIMOES];
GO


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. CATÁLOGO DE ESTADOS DE UNIGIS
-- ═════════════════════════════════════════════════════════════════════════════

PRINT '--- 1.1 ESTADOS DE PEDIDOS ---';
SELECT 
    IdEstadoPedido, 
    Descripcion, 
    ReferenciaExterna, 
    Color, 
    Anulacion, 
    PermiteLeerEtiqueta, 
    PermiteCrearCita
FROM EstadoPedido
ORDER BY IdEstadoPedido;

PRINT '--- 1.2 ESTADOS DE VIAJES / RUTAS ---';
SELECT 
    IdEstadoViaje, 
    Descripcion, 
    ReferenciaExterna, 
    Color
FROM EstadoViaje
ORDER BY IdEstadoViaje;

PRINT '--- 1.3 ESTADOS DE ORDENES ---';
SELECT 
    IdEstadoOrden, 
    Descripcion, 
    ReferenciaExterna
FROM EstadoOrden
ORDER BY IdEstadoOrden;

PRINT '--- 1.4 ESTADOS DE PARADAS ---';
SELECT 
    IdEstadoParada, 
    Descripcion, 
    ReferenciaExterna
FROM EstadoParada
ORDER BY IdEstadoParada;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. MÁQUINA DE ESTADOS Y TRANSICIONES DE PEDIDOS
-- ═════════════════════════════════════════════════════════════════════════════

PRINT '--- 2.1 TRANSICIONES DE ESTADO DE PEDIDOS ---';
-- Muestra qué transiciones de origen a destino están permitidas en LS y sus requisitos.
SELECT 
    t.IdEstadoPedidoTransicion,
    t.IdEstadoPedidoOrigen,
    orig.Descripcion AS EstadoOrigen,
    t.IdEstadoPedidoDestino,
    dest.Descripcion AS EstadoDestino,
    t.RequiereMotivo,
    t.RequiereFirma,
    t.RequiereFoto,
    t.RequiereObservaciones,
    t.IdTipoPedido,
    tp.Descripcion AS TipoPedidoFiltro
FROM EstadoPedidoTransicion t
INNER JOIN EstadoPedido orig ON t.IdEstadoPedidoOrigen = orig.IdEstadoPedido
INNER JOIN EstadoPedido dest ON t.IdEstadoPedidoDestino = dest.IdEstadoPedido
LEFT JOIN TipoPedido tp ON t.IdTipoPedido = tp.IdTipoPedido
ORDER BY t.IdEstadoPedidoOrigen, t.IdEstadoPedidoDestino;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. MAESTROS E INFRAESTRUCTURA OPERATIVA
-- ═════════════════════════════════════════════════════════════════════════════

PRINT '--- 3.0 COLUMNAS DISPONIBLES EN DEPOSITO ---';
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Deposito'
ORDER BY COLUMN_NAME;

PRINT '--- 3.1 DEPÓSITOS / HUBS CONFIGURADOS ---';
-- Identifica las ubicaciones físicas/hubs de LUIS SIMOES con las columnas core estándares.
SELECT 
    IdDeposito, 
    Descripcion, 
    Direccion, 
    Latitud, 
    Longitud
FROM Deposito
ORDER BY IdDeposito;

PRINT '--- 3.2 TIPOS DE PEDIDO ---';
-- Define qué clasificaciones de pedidos existen (ej. Arrastre, Reparto, Devolución).
SELECT 
    IdTipoPedido, 
    Descripcion, 
    ReferenciaExterna
FROM TipoPedido
ORDER BY IdTipoPedido;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. DIAGNÓSTICO DE ESTRUCTURA Y CAMPOS DINÁMICOS
-- ═════════════════════════════════════════════════════════════════════════════

PRINT '--- 4.1 COLUMNAS Y CAMPOS DINÁMICOS DE PEDIDO ---';
-- Busca columnas específicas de LS o campos agregados (ej. IdDepositoSalida, IdDepositoLlegada, Hubs, etc.)
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Pedido'
ORDER BY COLUMN_NAME;

PRINT '--- 4.2 COMPROBAR EXISTENCIA DE TABLAS DE CONFIGURACIÓN CROSSDOCK ---';
-- Verifica si ya se crearon las tablas de configuración crossdock/intermedias o si se usan tablas nativas de UNIGIS.
SELECT 
    TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE '%RutaInter%' 
   OR TABLE_NAME LIKE '%DepositoConfig%' 
   OR TABLE_NAME LIKE '%Crossdock%';


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. DIAGNÓSTICO DE DATOS DE MUESTRA (DATOS REALES RECIENTES)
-- ═════════════════════════════════════════════════════════════════════════════

PRINT '--- 5.1 ÚLTIMOS 10 PEDIDOS REGISTRADOS ---';
-- Selecciona los últimos 10 pedidos con columnas seguras de dirección y estado.
SELECT TOP 10 
    IdPedido, 
    FechaCreacion, 
    IdEstadoPedido, 
    IdTipoPedido, 
    IdDepositoSalida, 
    IdDepositoLlegada, 
    Direccion
FROM Pedido
ORDER BY IdPedido DESC;

PRINT '--- 5.2 COLUMNAS DISPONIBLES EN VIAJE ---';
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'Viaje'
ORDER BY COLUMN_NAME;

PRINT '--- 5.3 ÚLTIMOS 10 VIAJES REGISTRADOS ---';
-- Mapea los últimos 10 viajes sin columnas dependientes de la configuración.
SELECT TOP 10 
    IdViaje, 
    Descripcion, 
    FechaCreacion, 
    IdEstadoViaje, 
    IdVehiculo, 
    IdConductor
FROM Viaje
ORDER BY IdViaje DESC;
