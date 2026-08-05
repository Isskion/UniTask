-- ==============================================================================
-- Proyecto: Transpais (TSP)
-- Propósito: Actualizar las transiciones de estados insertadas ayer para que
--            pertenezcan exclusivamente a la operación de Internacional (IdOperacion = 1).
-- ==============================================================================

-- 1. Actualizar transiciones de pedidos (EstadoPedidoTransicion)
UPDATE dbo.EstadoPedidoTransicion
SET IdOperacion = 1
WHERE IdEstadoPedidoTransicion IN (
    1, 2, 3, 100, 101, 102, 103, 104, 105, 
    301, 302, 303, 304, 305, 306, 
    321, 322, 323, 324, 325, 326, 
    341, 342, 343, 344, 345, 346, 
    361, 362, 363, 364, 365, 366, 
    381, 382, 383, 384, 385, 386, 
    501, 502, 503, 504
);

-- 2. Actualizar transiciones de órdenes (EstadoOrdenTransicion)
UPDATE dbo.EstadoOrdenTransicion
SET IdOperacion = 1
WHERE IdEstadoOrdenTransicion IN (100, 200, 300, 400);

-- 3. Actualizar transiciones de rutas (EstadoRutaTransicion)
UPDATE dbo.EstadoRutaTransicion
SET IdOperacion = 1
WHERE IdEstadoRutaTransicion IN (100, 400);

-- 4. Actualizar transiciones de viajes (EstadoViajeTransicion)
UPDATE dbo.EstadoViajeTransicion
SET IdOperacion = 1
WHERE IdEstadoViajeTransicion IN (100, 101, 102, 103, 200, 300, 400, 500, 501);

-- 5. Actualizar transiciones de paradas (EstadoParadaTransicion)
UPDATE dbo.EstadoParadaTransicion
SET IdOperacion = 1
WHERE IdEstadoParadaTransicion IN (
    200, 201, 202, 203, 204, 
    300, 301, 302, 303, 304, 305, 306, 307, 308, 
    320, 321, 322, 323, 324, 325, 326, 327, 328
);
