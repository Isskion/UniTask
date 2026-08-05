-- =========================================================
-- Script Completo de Transiciones y Triggers TSP (Master)
-- =========================================================

-- ---------------------------------------------------------
-- ENTIDAD: ESTADOPEDIDOTRANSICION
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 1)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 2, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 1
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (1, 1, 2, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 2)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 2
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (2, 1, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 2, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3, 2, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 100)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 3, IdEstadoPedidoDestino = 100, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (100, 3, 100, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 101)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 101, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (101, 100, 101, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 102)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 102, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (102, 100, 102, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 103)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 103, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (103, 100, 103, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 104)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 104, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 104
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (104, 100, 104, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 105)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 105, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 105
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (105, 100, 105, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 301)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (301, 101, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 302)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (302, 101, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 303)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (303, 101, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 304)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (304, 101, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 305)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (305, 101, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 306)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (306, 101, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 321)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 321
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (321, 102, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 322)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 322
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (322, 102, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 323)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 323
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (323, 102, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 324)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 324
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (324, 102, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 325)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 325
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (325, 102, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 326)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 102, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 326
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (326, 102, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 341)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 341
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (341, 103, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 342)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 342
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (342, 103, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 343)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 343
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (343, 103, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 344)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 344
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (344, 103, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 345)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 345
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (345, 103, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 346)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 103, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 346
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (346, 103, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 361)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 361
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (361, 104, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 362)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 362
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (362, 104, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 363)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 363
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (363, 104, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 364)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 364
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (364, 104, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 365)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 365
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (365, 104, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 366)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 104, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 366
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (366, 104, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 381)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 381
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (381, 105, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 382)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 382
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (382, 105, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 383)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 383
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (383, 105, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 384)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 384
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (384, 105, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 385)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 385
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (385, 105, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 386)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 105, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 386
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (386, 105, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 410)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 410
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (410, 400, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 411)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 411
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (411, 400, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 412)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 412
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (412, 400, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 420)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 420
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (420, 405, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 421)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 421
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (421, 405, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 422)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 422
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (422, 405, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 501)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 303, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (501, 303, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 502)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 304, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 502
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (502, 304, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 503)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 503
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (503, 400, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 504)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 504
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (504, 405, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 1, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOORDENTRANSICION
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 100)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 102, IdEstadoDestino = 104, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = 203, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 1, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (100, 102, 104, 0, NULL, 203, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 200)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 104, IdEstadoDestino = 202, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 1, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (200, 104, 202, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 300)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 202, IdEstadoDestino = 306, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 1, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (300, 202, 306, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 400)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 202, IdEstadoDestino = 400, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 1, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (400, 202, 400, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADORUTATRANSICION
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoRutaTransicion WHERE IdEstadoRutaTransicion = 100)
BEGIN
    UPDATE dbo.EstadoRutaTransicion
    SET IdEstadoRutaOrigen = 103, IdEstadoRutaDestino = 201, IdEstadoJornada = NULL, IdEstadoViaje = NULL, CambioEstadoDistribuido = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL
    WHERE IdEstadoRutaTransicion = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion ON;
    INSERT INTO dbo.EstadoRutaTransicion (IdEstadoRutaTransicion, IdEstadoRutaOrigen, IdEstadoRutaDestino, IdEstadoJornada, IdEstadoViaje, CambioEstadoDistribuido, IdEmpresa, IdOperacion, IdTipoOperacion)
    VALUES (100, 103, 201, NULL, NULL, 0, NULL, 1, NULL);
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoRutaTransicion WHERE IdEstadoRutaTransicion = 400)
BEGIN
    UPDATE dbo.EstadoRutaTransicion
    SET IdEstadoRutaOrigen = 201, IdEstadoRutaDestino = 401, IdEstadoJornada = NULL, IdEstadoViaje = NULL, CambioEstadoDistribuido = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL
    WHERE IdEstadoRutaTransicion = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion ON;
    INSERT INTO dbo.EstadoRutaTransicion (IdEstadoRutaTransicion, IdEstadoRutaOrigen, IdEstadoRutaDestino, IdEstadoJornada, IdEstadoViaje, CambioEstadoDistribuido, IdEmpresa, IdOperacion, IdTipoOperacion)
    VALUES (400, 201, 401, NULL, NULL, 0, NULL, 1, NULL);
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOVIAJETRANSICION
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 100)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 105, IdEstadoViajeDestino = 106, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (100, 105, 106, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 101)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 106, IdEstadoViajeDestino = 108, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (101, 106, 108, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 102)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 106, IdEstadoViajeDestino = 107, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 1, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (102, 106, 107, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 1, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 103)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 107, IdEstadoViajeDestino = 106, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (103, 107, 106, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 200)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 108, IdEstadoViajeDestino = 200, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (200, 108, 200, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 300)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 200, IdEstadoViajeDestino = 403, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (300, 200, 403, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 400)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 403, IdEstadoViajeDestino = 402, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (400, 403, 402, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 500)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 402, IdEstadoViajeDestino = 500, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 500
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (500, 402, 500, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 501)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 500, IdEstadoViajeDestino = 501, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (501, 500, 501, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 1, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOPARADATRANSICION
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 200)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 203, IdEstadoParadaDestino = 204, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 202, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (200, 203, 204, 0, 0, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, 0, 202, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 201)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 1, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 201
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (201, 204, 205, 0, 0, NULL, 1, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 202)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 2, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 202
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (202, 204, 205, 0, 0, NULL, 2, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 203)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 3, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 203
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (203, 204, 205, 0, 0, NULL, 3, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 204)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 4, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 204
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (204, 204, 205, 0, 0, NULL, 4, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 300)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 300, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (300, 204, 300, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 301)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 301, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (301, 204, 301, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 302)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 302, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (302, 204, 302, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 303)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 303, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 303, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (303, 204, 303, 0, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 303, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 304)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 304, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 304, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (304, 204, 304, 1, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 304, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 305)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 305, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 305, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (305, 204, 305, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 305, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 306)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 400, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 400, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (306, 204, 400, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 400, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 307)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 404, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 404, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 307
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (307, 204, 404, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 404, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 308)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 405, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 405, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 308
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (308, 204, 405, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 405, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 320)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 300, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 320
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (320, 205, 300, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 321)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 301, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 321
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (321, 205, 301, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 322)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 302, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 322
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (322, 205, 302, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 323)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 303, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 303, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 323
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (323, 205, 303, 0, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 303, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 324)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 304, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 304, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 324
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (324, 205, 304, 1, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 304, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 325)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 305, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 305, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 325
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (325, 205, 305, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 305, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 326)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 400, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 400, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 326
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (326, 205, 400, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 400, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 327)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 404, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 404, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 327
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (327, 205, 404, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 404, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 328)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 405, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 1, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 405, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 328
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (328, 205, 405, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 405, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO
