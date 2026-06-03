-- ==============================================================================
-- AUDITAR VALORES DE DIBUJO Y COMPLETITUD EN OTRAS RENDICIONES REALES
-- ==============================================================================
-- Este script busca paradas de tipo 10 del pasado para ver cómo tienen relleno
-- el IdDibujo, las fechas y si FechaRealizado está a NULL.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

PRINT '🔍 Inspeccionando paradas de Tipo 10 (Rendición) registradas anteriormente...';

SELECT TOP 5
    IdParada,
    IdViaje,
    IdTipoParada,
    IdEstadoParada,
    IdDibujo,
    FechaRealizado,
    InicioVisitaPlanificado,
    FinVisitaPlanificado,
    InicioControlHorario,
    FinControlHorario,
    IdPedido
FROM Parada WITH (NOLOCK)
WHERE IdTipoParada = 10
ORDER BY IdParada DESC;
GO
