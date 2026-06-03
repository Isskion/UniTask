USE [UNIGIS_DataRepository_EUROPASTRY]
GO

-- =============================================================================
-- SCRIPT: Estados y Transiciones para Crossdock
-- FECHA:  15/05/2026
-- DESCRIPCIÓN: Crea el estado "Crossdock" y las transiciones:
--   - Aprobado planificar (4) → Crossdock (6)     [dispara SP]
--   - Crossdock (6) → Aprobado planificar (4)     [anulación]
-- =============================================================================

-- ═══ ESTADO CROSSDOCK ═══════════════════════════════════════════════════════
SET IDENTITY_INSERT EstadoPedido ON;

IF NOT EXISTS (SELECT 1 FROM EstadoPedido WHERE IdEstadoPedido = 6)
BEGIN
    INSERT INTO EstadoPedido 
    (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, 
     WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, 
     PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, 
     FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES 
    (6, 'Crossdock', 16744448, 99999, 'Crossdock', 
     NULL, NULL, 'Crossdock', 0, 
     0, NULL, 0, 
     GETUTCDATE(), NULL, 0);

    PRINT '✓ Estado 6 (Crossdock) creado.';
END
ELSE
    PRINT '⚠ Estado 6 ya existe, no se insertó.';

SET IDENTITY_INSERT EstadoPedido OFF;
GO

-- ═══ TRANSICIONES ═══════════════════════════════════════════════════════════
SET IDENTITY_INSERT EstadoPedidoTransicion ON;

-- Transición: Aprobado planificar (4) → Crossdock (6)
IF NOT EXISTS (SELECT 1 FROM EstadoPedidoTransicion WHERE IdEstadoPedidoOrigen = 4 AND IdEstadoPedidoDestino = 6)
BEGIN
    INSERT INTO EstadoPedidoTransicion
    (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino,
     IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta,
     PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto,
     RequiereObservaciones, RequiereEncuesta, Contactless,
     IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot)
    VALUES
    (4, 4, 6,
     NULL, NULL, NULL, NULL, NULL,
     0, 0, 0, 0,
     0, 0, 0,
     NULL, NULL, NULL, NULL, NULL);

    PRINT '✓ Transición 4→6 (Planificar → Crossdock) creada.';
END
ELSE
    PRINT '⚠ Transición 4→6 ya existe.';

-- Transición: Crossdock (6) → Aprobado planificar (4) [ANULACIÓN]
IF NOT EXISTS (SELECT 1 FROM EstadoPedidoTransicion WHERE IdEstadoPedidoOrigen = 6 AND IdEstadoPedidoDestino = 4)
BEGIN
    INSERT INTO EstadoPedidoTransicion
    (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino,
     IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta,
     PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto,
     RequiereObservaciones, RequiereEncuesta, Contactless,
     IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot)
    VALUES
    (5, 6, 4,
     NULL, NULL, NULL, NULL, NULL,
     0, 1, 0, 0,
     1, 0, 0,
     NULL, NULL, NULL, NULL, NULL);

    PRINT '✓ Transición 6→4 (Crossdock → Planificar / Anulación) creada. RequiereMotivo=1, RequiereObservaciones=1.';
END
ELSE
    PRINT '⚠ Transición 6→4 ya existe.';

SET IDENTITY_INSERT EstadoPedidoTransicion OFF;
GO

PRINT '═══════════════════════════════════════════════════════════════';
PRINT 'Estados y Transiciones Crossdock: Completado.';
PRINT '═══════════════════════════════════════════════════════════════';
GO
