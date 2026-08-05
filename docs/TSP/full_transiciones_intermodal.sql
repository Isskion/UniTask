-- =========================================================
-- Transiciones de Estados de la Operación INTERMODAL (TSP)
-- Offset ID: +3000 | IdOperacion = 3
-- =========================================================

-- ENTIDAD: ESTADOPEDIDOTRANSICION
IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3001)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 2, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3001
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3001, 1, 2, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3002)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 1, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3002
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3002, 1, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3003)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 2, IdEstadoPedidoDestino = 3, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3003
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3003, 2, 3, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3100)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 3, IdEstadoPedidoDestino = 100, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3100, 3, 100, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3101)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 100, IdEstadoPedidoDestino = 101, IdEstadoOrden = 102, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3101, 100, 101, 102, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3301)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3301, 101, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3302)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3302, 101, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3303)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3303, 101, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3304)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 400, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3304, 101, 400, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3305)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 404, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3305, 101, 404, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3306)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 101, IdEstadoPedidoDestino = 405, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3306, 101, 405, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3410)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3410
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3410, 400, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3411)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3411
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3411, 400, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3412)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3412
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3412, 400, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3420)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 303, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3420
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3420, 405, 303, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3421)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 304, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3421
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3421, 405, 304, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3422)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 305, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3422
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3422, 405, 305, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3501)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 303, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3501, 303, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3502)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 304, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3502
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3502, 304, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3503)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 400, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3503
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3503, 400, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedidoTransicion WHERE IdEstadoPedidoTransicion = 3504)
BEGIN
    UPDATE dbo.EstadoPedidoTransicion
    SET IdEstadoPedidoOrigen = 405, IdEstadoPedidoDestino = 502, IdEstadoOrden = NULL, IdTipoPedido = NULL, IdEstadoPedidoItem = NULL, IdEstadoGuia = NULL, IdEncuesta = NULL, PermiteObtenerEvidencias = 0, RequiereMotivo = 0, RequiereFirma = 0, RequiereFoto = 0, RequiereObservaciones = 0, RequiereEncuesta = 0, Contactless = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdEstadoPedidoTurno = NULL, IdEstadoCitaSlot = NULL, IdEstadoParada = NULL
    WHERE IdEstadoPedidoTransicion = 3504
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion ON;
    INSERT INTO dbo.EstadoPedidoTransicion (IdEstadoPedidoTransicion, IdEstadoPedidoOrigen, IdEstadoPedidoDestino, IdEstadoOrden, IdTipoPedido, IdEstadoPedidoItem, IdEstadoGuia, IdEncuesta, PermiteObtenerEvidencias, RequiereMotivo, RequiereFirma, RequiereFoto, RequiereObservaciones, RequiereEncuesta, Contactless, IdEmpresa, IdOperacion, IdTipoOperacion, IdEstadoPedidoTurno, IdEstadoCitaSlot, IdEstadoParada)
    VALUES (3504, 405, 502, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, NULL, 3, NULL, NULL, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoPedidoTransicion OFF;
END
GO


-- ENTIDAD: ESTADOORDENTRANSICION
IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 3100)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 102, IdEstadoDestino = 104, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = 203, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 3, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 3100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (3100, 102, 104, 0, NULL, 203, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 3200)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 104, IdEstadoDestino = 202, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 3, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 3200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (3200, 104, 202, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 3300)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 202, IdEstadoDestino = 306, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 3, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 3300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (3300, 202, 306, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrdenTransicion WHERE IdEstadoOrdenTransicion = 3400)
BEGIN
    UPDATE dbo.EstadoOrdenTransicion
    SET IdEstadoOrigen = 202, IdEstadoDestino = 400, RequiereMotivo = 0, IdEstadoRuta = NULL, IdEstadoParada = NULL, IdEstadoPedido = NULL, IdTipoOrden = NULL, IdTipoOperacion = NULL, IdTipoAlarma = NULL, IdEstadoMuelleCita = NULL, IdEmpresa = NULL, IdOperacion = 3, IdEstadoOrdenRelacion = NULL, IdTipoOrdenRelacion = NULL
    WHERE IdEstadoOrdenTransicion = 3400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion ON;
    INSERT INTO dbo.EstadoOrdenTransicion (IdEstadoOrdenTransicion, IdEstadoOrigen, IdEstadoDestino, RequiereMotivo, IdEstadoRuta, IdEstadoParada, IdEstadoPedido, IdTipoOrden, IdTipoOperacion, IdTipoAlarma, IdEstadoMuelleCita, IdEmpresa, IdOperacion, IdEstadoOrdenRelacion, IdTipoOrdenRelacion)
    VALUES (3400, 202, 400, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, NULL);
    SET IDENTITY_INSERT dbo.EstadoOrdenTransicion OFF;
END
GO


-- ENTIDAD: ESTADORUTATRANSICION
IF EXISTS (SELECT 1 FROM dbo.EstadoRutaTransicion WHERE IdEstadoRutaTransicion = 3100)
BEGIN
    UPDATE dbo.EstadoRutaTransicion
    SET IdEstadoRutaOrigen = 103, IdEstadoRutaDestino = 201, IdEstadoJornada = NULL, IdEstadoViaje = NULL, CambioEstadoDistribuido = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL
    WHERE IdEstadoRutaTransicion = 3100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion ON;
    INSERT INTO dbo.EstadoRutaTransicion (IdEstadoRutaTransicion, IdEstadoRutaOrigen, IdEstadoRutaDestino, IdEstadoJornada, IdEstadoViaje, CambioEstadoDistribuido, IdEmpresa, IdOperacion, IdTipoOperacion)
    VALUES (3100, 103, 201, NULL, NULL, 0, NULL, 3, NULL);
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoRutaTransicion WHERE IdEstadoRutaTransicion = 3400)
BEGIN
    UPDATE dbo.EstadoRutaTransicion
    SET IdEstadoRutaOrigen = 201, IdEstadoRutaDestino = 401, IdEstadoJornada = NULL, IdEstadoViaje = NULL, CambioEstadoDistribuido = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL
    WHERE IdEstadoRutaTransicion = 3400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion ON;
    INSERT INTO dbo.EstadoRutaTransicion (IdEstadoRutaTransicion, IdEstadoRutaOrigen, IdEstadoRutaDestino, IdEstadoJornada, IdEstadoViaje, CambioEstadoDistribuido, IdEmpresa, IdOperacion, IdTipoOperacion)
    VALUES (3400, 201, 401, NULL, NULL, 0, NULL, 3, NULL);
    SET IDENTITY_INSERT dbo.EstadoRutaTransicion OFF;
END
GO


-- ENTIDAD: ESTADOVIAJETRANSICION
IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3100)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 105, IdEstadoViajeDestino = 106, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3100, 105, 106, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3101)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 106, IdEstadoViajeDestino = 108, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3101, 106, 108, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3102)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 106, IdEstadoViajeDestino = 107, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 1, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3102, 106, 107, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 1, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3103)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 107, IdEstadoViajeDestino = 106, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3103, 107, 106, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3200)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 108, IdEstadoViajeDestino = 200, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3200, 108, 200, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3300)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 200, IdEstadoViajeDestino = 403, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3300, 200, 403, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3400)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 403, IdEstadoViajeDestino = 402, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3400, 403, 402, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3500)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 402, IdEstadoViajeDestino = 500, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3500
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3500, 402, 500, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViajeTransicion WHERE IdEstadoViajeTransicion = 3501)
BEGIN
    UPDATE dbo.EstadoViajeTransicion
    SET IdEstadoViajeOrigen = 500, IdEstadoViajeDestino = 501, IdEstadoJornada = NULL, IdTipoAlarma = NULL, IdEstadoGuia = NULL, RequiereFoto = 0, IdEncuesta = NULL, PermiteEditarFecha = 0, IdEstadoRecurso = NULL, TransicionTendering = 0, RealizarParadaDistribuida = 0, RequiereMotivo = 0, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, IdTipoViaje = NULL, IdCategoriaViaje = NULL, VehiculoRetorno = 0, RequiereObservacion = 0, Mensaje = NULL, RequiereControlItems = 0, RequiereControlItemsCarga = 0, RequiereControlItemsDescarga = 0, IdEstadoCitaSlotAgrupacion = NULL, InventarioViajeRecurso = 0, VerificarQRMobile = 0
    WHERE IdEstadoViajeTransicion = 3501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion ON;
    INSERT INTO dbo.EstadoViajeTransicion (IdEstadoViajeTransicion, IdEstadoViajeOrigen, IdEstadoViajeDestino, IdEstadoJornada, IdTipoAlarma, IdEstadoGuia, RequiereFoto, IdEncuesta, PermiteEditarFecha, IdEstadoRecurso, TransicionTendering, RealizarParadaDistribuida, RequiereMotivo, IdEmpresa, IdOperacion, IdTipoOperacion, IdTipoViaje, IdCategoriaViaje, VehiculoRetorno, RequiereObservacion, Mensaje, RequiereControlItems, RequiereControlItemsCarga, RequiereControlItemsDescarga, IdEstadoCitaSlotAgrupacion, InventarioViajeRecurso, VerificarQRMobile)
    VALUES (3501, 500, 501, NULL, NULL, NULL, 0, NULL, 0, NULL, 0, 0, 0, NULL, 3, NULL, NULL, NULL, 0, 0, NULL, 0, 0, 0, NULL, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoViajeTransicion OFF;
END
GO


-- ENTIDAD: ESTADOPARADATRANSICION
IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3200)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 203, IdEstadoParadaDestino = 204, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 202, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3200, 203, 204, 0, 0, NULL, NULL, 0, 0, 0, NULL, NULL, NULL, 0, 202, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3201)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 1, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3201
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3201, 204, 205, 0, 0, NULL, 1, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3202)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 2, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3202
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3202, 204, 205, 0, 0, NULL, 2, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3203)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 3, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3203
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3203, 204, 205, 0, 0, NULL, 3, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3204)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 205, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = 4, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 1, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3204
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3204, 204, 205, 0, 0, NULL, 4, 0, 0, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 1, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3301)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 300, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3301, 204, 300, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3302)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 301, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3302, 204, 301, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3303)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 302, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3303, 204, 302, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3304)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 303, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 303, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3304, 204, 303, 0, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 303, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3305)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 304, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 304, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3305, 204, 304, 1, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 304, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3306)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 305, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 305, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3306, 204, 305, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 305, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3307)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 400, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 400, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3307
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3307, 204, 400, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 400, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3308)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 404, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 404, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3308
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3308, 204, 404, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 404, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3309)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 204, IdEstadoParadaDestino = 405, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 405, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3309
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3309, 204, 405, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 405, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3321)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 300, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3321
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3321, 205, 300, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3322)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 301, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3322
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3322, 205, 301, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3323)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 302, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = NULL, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3323
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3323, 205, 302, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3324)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 303, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 303, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3324
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3324, 205, 303, 0, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 303, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3325)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 304, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 306, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 304, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3325
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3325, 205, 304, 1, 0, NULL, NULL, 0, 1, 1, NULL, NULL, NULL, 0, 306, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 304, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3326)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 305, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 305, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3326
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3326, 205, 305, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 305, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3327)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 400, RequiereMotivo = 0, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 400, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3327
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3327, 205, 400, 0, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 400, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3328)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 404, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 0, RequiereFoto = 1, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = NULL, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 404, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3328
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3328, 205, 404, 1, 0, NULL, NULL, 0, 0, 1, NULL, NULL, NULL, 0, NULL, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 404, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParadaTransicion WHERE IdEstadoParadaTransicion = 3329)
BEGIN
    UPDATE dbo.EstadoParadaTransicion
    SET IdEstadoParadaOrigen = 205, IdEstadoParadaDestino = 405, RequiereMotivo = 1, RequiereControl = 0, IdTipoAlarma = NULL, IdEstadoParadaVisita = NULL, RequiereValidacionCantidades = 0, RequiereFirma = 1, RequiereFoto = 0, IdTipoParada = NULL, IdEstadoViaje = NULL, IdEncuesta = NULL, RequiereObservacion = 0, IdEstadoOrden = 400, IdEstadoParadaTransicionAlternativo = NULL, PermiteModificarUbicacion = 0, PermiteActualizarUbicacion = 0, ConsiderarConsolidados = 0, CantidadFoto = NULL, IdTipoEvento = NULL, PermiteRecolectarRecursos = 0, PermiteEntregarRecursos = 0, PermiteEditarFecha = 0, PermiteParadaEtiqueta = 0, ConsiderarDomicilios = 0, ProximaParada = 0, IdAccionIntent = NULL, Contactless = 0, SalidaZona = 0, ValidarGeocerca = 0, CompletarParadaItemCantidad = 0, TemplateNotificacionMovil = NULL, IdEstadoGuia = NULL, IdEmpresa = NULL, IdOperacion = 3, IdTipoOperacion = NULL, PermiteTomarFotosRecursos = 0, PermiteObservacionesRecursos = 0, PermiteControlDocumentacion = 0, PermiteVisualizarCantidades = 0, ForzarEdicionCantidadesValidadas = 0, RequiereMLOCR = 0, PermiteValidarCantidadSecundaria = 0, PermiteValidarFormaPago = 0, PermitePartidasAbiertas = 0, PermiteConfirmacionCobranza = 0, PermiteOffline = 0, AdministrarRecursosDescartables = 0, ValidarFecha = 0, PermiteTomarFotosCategorizadas = 0, PermiteTomarFotosOffline = 0, RequiereControlNumeroTicket = 0, ValidarNFC = 0, RequiereEncuestaCliente = 0, IdEncuestaB2C = NULL, RequiereControlItemsDescarga = 0, IdCategoriaFoto = NULL, ConsiderarTipoParada = 0, IdEstadoPedido = 405, RequiereArchivoWeb = 0
    WHERE IdEstadoParadaTransicion = 3329
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion ON;
    INSERT INTO dbo.EstadoParadaTransicion (IdEstadoParadaTransicion, IdEstadoParadaOrigen, IdEstadoParadaDestino, RequiereMotivo, RequiereControl, IdTipoAlarma, IdEstadoParadaVisita, RequiereValidacionCantidades, RequiereFirma, RequiereFoto, IdTipoParada, IdEstadoViaje, IdEncuesta, RequiereObservacion, IdEstadoOrden, IdEstadoParadaTransicionAlternativo, PermiteModificarUbicacion, PermiteActualizarUbicacion, ConsiderarConsolidados, CantidadFoto, IdTipoEvento, PermiteRecolectarRecursos, PermiteEntregarRecursos, PermiteEditarFecha, PermiteParadaEtiqueta, ConsiderarDomicilios, ProximaParada, IdAccionIntent, Contactless, SalidaZona, ValidarGeocerca, CompletarParadaItemCantidad, TemplateNotificacionMovil, IdEstadoGuia, IdEmpresa, IdOperacion, IdTipoOperacion, PermiteTomarFotosRecursos, PermiteObservacionesRecursos, PermiteControlDocumentacion, PermiteVisualizarCantidades, ForzarEdicionCantidadesValidadas, RequiereMLOCR, PermiteValidarCantidadSecundaria, PermiteValidarFormaPago, PermitePartidasAbiertas, PermiteConfirmacionCobranza, PermiteOffline, AdministrarRecursosDescartables, ValidarFecha, PermiteTomarFotosCategorizadas, PermiteTomarFotosOffline, RequiereControlNumeroTicket, ValidarNFC, RequiereEncuestaCliente, IdEncuestaB2C, RequiereControlItemsDescarga, IdCategoriaFoto, ConsiderarTipoParada, IdEstadoPedido, RequiereArchivoWeb)
    VALUES (3329, 205, 405, 1, 0, NULL, NULL, 0, 1, 0, NULL, NULL, NULL, 0, 400, NULL, 0, 0, 0, NULL, NULL, 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 3, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 0, NULL, 0, 405, 0);
    SET IDENTITY_INSERT dbo.EstadoParadaTransicion OFF;
END
GO
