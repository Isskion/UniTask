-- =========================================================
-- Script de Transiciones y Triggers para PEDIDOS (TSP)
-- =========================================================

-- FASE 1 & FASE 2: Flujo Básico y Planificación
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 1)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 2, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 1
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (1, 1, 2, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 2)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 2
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (2, 1, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 2, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3, 2, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 100)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 3, IdEstadoPedidoDestino = 100, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (100, 3, 100, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 101)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 101, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (101, 100, 101, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 102)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 102, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (102, 100, 102, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 103)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 103, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (103, 100, 103, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 104)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 104, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 104
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (104, 100, 104, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 105)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 105, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 105
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (105, 100, 105, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- FASE 3 & FASE 4: Flujo Espejo de Ejecución Física (Disparados por Parada)
-- Desde Programaciones a Entregas/Cancelaciones

-- PEDIDO PROGRAMADO DIRECTO REMITENTE (101)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 301)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (301, 101, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 302)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (302, 101, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 303)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (303, 101, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 304)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (304, 101, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 305)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (305, 101, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 306)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (306, 101, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- PEDIDO PROGRAMADO RECOLECCIÓN (102)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 321)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 321
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (321, 102, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 322)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 322
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (322, 102, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 323)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 323
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (323, 102, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 324)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 324
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (324, 102, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 325)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 325
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (325, 102, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 326)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 326
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (326, 102, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- PEDIDO PROGRAMADO DIR. DEPÓSITO SALIDA (103)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 341)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 341
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (341, 103, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 342)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 342
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (342, 103, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 343)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 343
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (343, 103, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 344)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 344
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (344, 103, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 345)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 345
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (345, 103, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 346)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 346
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (346, 103, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- PEDIDO PROGRAMADO ARRASTRE (104)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 361)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 361
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (361, 104, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 362)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 362
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (362, 104, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 363)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 363
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (363, 104, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 364)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 364
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (364, 104, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 365)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 365
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (365, 104, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 366)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 366
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (366, 104, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- PEDIDO PROGRAMADO REPARTO (105)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 381)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 381
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (381, 105, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 382)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 382
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (382, 105, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 383)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 383
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (383, 105, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 384)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 384
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (384, 105, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 385)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 385
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (385, 105, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 386)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 386
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (386, 105, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

-- FASE 6: Cierre Financiero (Liquidación)
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 501)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 303, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (501, 303, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 502)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 304, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 502
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (502, 304, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 503)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 503
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (503, 400, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 504)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = NULL, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 504
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (504, 405, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO
