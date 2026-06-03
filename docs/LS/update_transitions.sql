-- =============================================================================
-- SCRIPT: Actualización de Transiciones de Estado - Proyecto LUIS SIMOES (LS)
-- FECHA:  19/05/2026
-- DESCRIPCIÓN: Habilita las transiciones operativas del flujo OnSite en la 
--              tabla EstadoPedidoTransicion de UNIGIS.
-- =============================================================================

USE [UNIGIS_DataRepository_LUIS_SIMOES];
GO

BEGIN TRANSACTION;
BEGIN TRY

    -- Tabla temporal para definir las transiciones OnSite deseadas
    CREATE TABLE #NuevasTransiciones (
        IdEstado INT,
        IdEstadoDestino INT,
        ValidarTransicion BIT,
        MismoEstado BIT
    );

    INSERT INTO #NuevasTransiciones (IdEstado, IdEstadoDestino, ValidarTransicion, MismoEstado) VALUES
    (1035, 1045, 0, 0), -- Recolectado en Cliente -> Entregado Almacén MD
    (1035, 1315, 0, 0), -- Recolectado en Cliente -> Entregado Destinatario (Flujo 3 Directo)
    (1045, 1055, 0, 0), -- Entregado Almacén MD -> Recolectado Almacén MD
    (1055, 1115, 0, 0), -- Recolectado Almacén MD -> Entregado en Cross-Dock BL
    (1055, 1315, 0, 0), -- Recolectado Almacén MD -> Entregado Destinatario (Flujo 2 Directo)
    (1115, 1215, 0, 0), -- Entregado Cross-Dock BL -> Recolectado en Cross-Dock BL
    (1215, 1255, 0, 0), -- Recolectado Cross-Dock BL -> Entregado en Almacén Llegada GE
    (1255, 1275, 0, 0), -- Entregado Almacén Llegada GE -> Recolectado en Almacén Llegada GE
    (1275, 1315, 0, 0); -- Recolectado Almacén Llegada GE -> Entregado Destinatario (Flujo 1 Reparto)

    -- Inserción segura (solo si la transición no existe previamente)
    INSERT INTO EstadoPedidoTransicion (IdEstado, IdEstadoDestino, ValidarTransicion, MismoEstado)
    SELECT n.IdEstado, n.IdEstadoDestino, n.ValidarTransicion, n.MismoEstado
    FROM #NuevasTransiciones n
    WHERE NOT EXISTS (
        SELECT 1 
        FROM EstadoPedidoTransicion t
        WHERE t.IdEstado = n.IdEstado 
          AND t.IdEstadoDestino = n.IdEstadoDestino
    );

    PRINT 'Inserción de transiciones OnSite finalizada correctamente.';

    DROP TABLE #NuevasTransiciones;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    PRINT 'ERROR al insertar las transiciones OnSite: ' + ERROR_MESSAGE();
    
    IF OBJECT_ID('tempdb..#NuevasTransiciones') IS NOT NULL
        DROP TABLE #NuevasTransiciones;
END CATCH;
GO
