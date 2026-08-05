-- =========================================================
-- Script de Corrección a Mayúsculas para Todos los Estados
-- =========================================================

-- ENTIDAD: ESTADOORDEN
UPDATE dbo.EstadoOrden 
SET Descripcion = UPPER(Descripcion),
    ReferenciaExterna = UPPER(ReferenciaExterna),
    LlamadaExterna = UPPER(LlamadaExterna);

-- ENTIDAD: ESTADOPEDIDO
UPDATE dbo.EstadoPedido 
SET Descripcion = UPPER(Descripcion),
    ReferenciaExterna = UPPER(ReferenciaExterna),
    DescripcionExterna = UPPER(DescripcionExterna);

-- ENTIDAD: ESTADOPARADA
UPDATE dbo.EstadoParada 
SET Descripcion = UPPER(Descripcion),
    ReferenciaExterna = UPPER(ReferenciaExterna);

-- ENTIDAD: ESTADORUTA
UPDATE dbo.EstadoRuta 
SET Descripcion = UPPER(Descripcion),
    LlamadaExterna = UPPER(LlamadaExterna);

-- ENTIDAD: ESTADOVIAJE
UPDATE dbo.EstadoViaje 
SET Descripcion = UPPER(Descripcion),
    ReferenciaExterna = UPPER(ReferenciaExterna);

-- ENTIDAD: ESTADOPARADAVISITA
UPDATE dbo.EstadoParadaVisita
SET Descripcion = UPPER(Descripcion);

GO
