-- =============================================================================
-- SQL Script: [P0] Extensión de Esquema - Campo Mensaje en Pedido (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Añade la columna 'Mensaje' a la tabla Pedido para soporte
--                  de logs de planificación y validación.
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Pedido') AND name = 'Mensaje')
BEGIN
    -- Añadimos el campo Mensaje. Usamos VARCHAR(2000) para compatibilidad con logs extensos.
    ALTER TABLE Pedido ADD Mensaje VARCHAR(2000) NULL;
    PRINT 'P0: Campo [Mensaje] creado correctamente en la tabla Pedido.';
END
ELSE
BEGIN
    PRINT 'P0: El campo [Mensaje] ya existe en la tabla Pedido.';
END
GO
