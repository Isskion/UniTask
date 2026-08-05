-- Script Completo de Upsert de Estados TSP (Consolidado Final)
-- Incluye los 5 estados de programación de Pedido, estados espejo, Viaje Finalizado y Parada Recolectado Parcial.

-- ---------------------------------------------------------
-- ENTIDAD: ESTADOPEDIDO
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 1)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'INGRESADO', Color = 14210386, TiempoMaximo = 99999999, ReferenciaExterna = 'INGRESADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'INGRESADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 1
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (1, 'INGRESADO', 14210386, 99999999, 'INGRESADO', 0, NULL, 'INGRESADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 2)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'ERROR-REQUIERE AJUSTE', Color = 255, TiempoMaximo = 99999999, ReferenciaExterna = 'ERROR-REQUIERE AJUSTE', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'ERROR-REQUIERE AJUSTE', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 2
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (2, 'ERROR-REQUIERE AJUSTE', 255, 99999999, 'ERROR-REQUIERE AJUSTE', 0, NULL, 'ERROR-REQUIERE AJUSTE', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 3)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'GRABADO', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'GRABADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'GRABADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 3
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (3, 'GRABADO', 65280, 99999999, 'GRABADO', 0, NULL, 'GRABADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 100)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'CONFIRMADO', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'CONFIRMADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'CONFIRMADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 100
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (100, 'CONFIRMADO', 65280, 99999999, 'CONFIRMADO', 0, NULL, 'CONFIRMADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 101)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'PROGRAMAR DIRECTO REMITENTE DESTINO', Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'PROGRAMAR DIRECTO REMITENTE DESTINO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'PROGRAMAR DIRECTO REMITENTE DESTINO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 1, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 101
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (101, 'PROGRAMAR DIRECTO REMITENTE DESTINO', 65535, 99999999, 'PROGRAMAR DIRECTO REMITENTE DESTINO', 0, NULL, 'PROGRAMAR DIRECTO REMITENTE DESTINO', 0, 1, 0, 1, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 102)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'PROGRAMAR RECOLECCIÓN', Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'PROGRAMAR RECOLECCIÓN', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'PROGRAMAR RECOLECCIÓN', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (102, 'PROGRAMAR RECOLECCIÓN', 65535, 99999999, 'PROGRAMAR RECOLECCIÓN', 0, NULL, 'PROGRAMAR RECOLECCIÓN', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 103)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 1, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (103, 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', 65535, 99999999, 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', 0, NULL, 'PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO', 0, 1, 0, 1, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 104)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'PROGRAMAR ARRASTRE', Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'PROGRAMAR ARRASTRE', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'PROGRAMAR ARRASTRE', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 104
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (104, 'PROGRAMAR ARRASTRE', 65535, 99999999, 'PROGRAMAR ARRASTRE', 0, NULL, 'PROGRAMAR ARRASTRE', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 105)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'PROGRAMAR REPARTO', Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'PROGRAMAR REPARTO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'PROGRAMAR REPARTO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 105
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (105, 'PROGRAMAR REPARTO', 65535, 99999999, 'PROGRAMAR REPARTO', 0, NULL, 'PROGRAMAR REPARTO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 303)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'ENTREGADO', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'ENTREGADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'ENTREGADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (303, 'ENTREGADO', 65280, 99999999, 'ENTREGADO', 0, NULL, 'ENTREGADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 304)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'ENTREGA PARCIAL', Color = 14210386, TiempoMaximo = 99999999, ReferenciaExterna = 'ENTREGA PARCIAL', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'ENTREGA PARCIAL', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (304, 'ENTREGA PARCIAL', 14210386, 99999999, 'ENTREGA PARCIAL', 0, NULL, 'ENTREGA PARCIAL', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 305)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'NO ENTREGADO', Color = 255, TiempoMaximo = 99999999, ReferenciaExterna = 'NO ENTREGADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'NO ENTREGADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 1, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (305, 'NO ENTREGADO', 255, 99999999, 'NO ENTREGADO', 0, NULL, 'NO ENTREGADO', 0, 1, 0, 1, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 400)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'RECOLECTADO', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'RECOLECTADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'RECOLECTADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (400, 'RECOLECTADO', 65280, 99999999, 'RECOLECTADO', 0, NULL, 'RECOLECTADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 404)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'NO RECOLECTADO', Color = 255, TiempoMaximo = 99999999, ReferenciaExterna = 'NO RECOLECTADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'NO RECOLECTADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 1, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 404
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (404, 'NO RECOLECTADO', 255, 99999999, 'NO RECOLECTADO', 0, NULL, 'NO RECOLECTADO', 0, 1, 0, 1, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 405)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'RECOLECTADO PARCIAL', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'RECOLECTADO PARCIAL', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'RECOLECTADO PARCIAL', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 405
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (405, 'RECOLECTADO PARCIAL', 65280, 99999999, 'RECOLECTADO PARCIAL', 0, NULL, 'RECOLECTADO PARCIAL', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoPedido WHERE IdEstadoPedido = 502)
BEGIN
    UPDATE dbo.EstadoPedido
    SET Descripcion = 'LIQUIDADO', Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'LIQUIDADO', WorkflowStep = 0, Icono = NULL, DescripcionExterna = 'LIQUIDADO', WorkflowStepTransicionB2C = 0, PermiteLeerEtiqueta = 1, InformaMotivoEnB2C = 0, Anulacion = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, PermiteCrearCita = 0
    WHERE IdEstadoPedido = 502
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoPedido ON;
    INSERT INTO dbo.EstadoPedido (IdEstadoPedido, Descripcion, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Icono, DescripcionExterna, WorkflowStepTransicionB2C, PermiteLeerEtiqueta, InformaMotivoEnB2C, Anulacion, FechaCreacion, FechaUltimaModificacion, PermiteCrearCita)
    VALUES (502, 'LIQUIDADO', 65280, 99999999, 'LIQUIDADO', 0, NULL, 'LIQUIDADO', 0, 1, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoPedido OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOORDEN
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoOrden WHERE IdEstadoOrden = 102)
BEGIN
    UPDATE dbo.EstadoOrden
    SET Descripcion = 'PENDIENTE', LlamadaExterna = 'PENDIENTE', Color = 65535, Anulacion = 0, TiempoMaximo = 99999999, ReferenciaExterna = 'PENDIENTE', WorkflowStep = 0, Final = 0, Barcode = 0, Dispatch = 0, PermiteCrearPedido = 0, B2C = 0, PermiteLeerEtiqueta = 1, PermiteCrearCita = 0
    WHERE IdEstadoOrden = 102
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrden ON;
    INSERT INTO dbo.EstadoOrden (IdEstadoOrden, Descripcion, LlamadaExterna, Color, Anulacion, TiempoMaximo, ReferenciaExterna, WorkflowStep, Final, Barcode, Dispatch, PermiteCrearPedido, B2C, PermiteLeerEtiqueta, PermiteCrearCita)
    VALUES (102, 'PENDIENTE', 'PENDIENTE', 65535, 0, 99999999, 'PENDIENTE', 0, 0, 0, 0, 0, 0, 1, 0);
    SET IDENTITY_INSERT dbo.EstadoOrden OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrden WHERE IdEstadoOrden = 104)
BEGIN
    UPDATE dbo.EstadoOrden
    SET Descripcion = 'PLANIFICADA', LlamadaExterna = 'PLANIFICADA', Color = 65535, Anulacion = 0, TiempoMaximo = 99999999, ReferenciaExterna = 'PLANIFICADA', WorkflowStep = 0, Final = 0, Barcode = 0, Dispatch = 0, PermiteCrearPedido = 0, B2C = 0, PermiteLeerEtiqueta = 1, PermiteCrearCita = 0
    WHERE IdEstadoOrden = 104
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrden ON;
    INSERT INTO dbo.EstadoOrden (IdEstadoOrden, Descripcion, LlamadaExterna, Color, Anulacion, TiempoMaximo, ReferenciaExterna, WorkflowStep, Final, Barcode, Dispatch, PermiteCrearPedido, B2C, PermiteLeerEtiqueta, PermiteCrearCita)
    VALUES (104, 'PLANIFICADA', 'PLANIFICADA', 65535, 0, 99999999, 'PLANIFICADA', 0, 0, 0, 0, 0, 0, 1, 0);
    SET IDENTITY_INSERT dbo.EstadoOrden OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrden WHERE IdEstadoOrden = 202)
BEGIN
    UPDATE dbo.EstadoOrden
    SET Descripcion = 'EN TRÁNSITO', LlamadaExterna = 'EN TRÁNSITO', Color = 16711680, Anulacion = 0, TiempoMaximo = 99999999, ReferenciaExterna = 'EN TRÁNSITO', WorkflowStep = 0, Final = 0, Barcode = 0, Dispatch = 0, PermiteCrearPedido = 0, B2C = 0, PermiteLeerEtiqueta = 1, PermiteCrearCita = 0
    WHERE IdEstadoOrden = 202
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrden ON;
    INSERT INTO dbo.EstadoOrden (IdEstadoOrden, Descripcion, LlamadaExterna, Color, Anulacion, TiempoMaximo, ReferenciaExterna, WorkflowStep, Final, Barcode, Dispatch, PermiteCrearPedido, B2C, PermiteLeerEtiqueta, PermiteCrearCita)
    VALUES (202, 'EN TRÁNSITO', 'EN TRÁNSITO', 16711680, 0, 99999999, 'EN TRÁNSITO', 0, 0, 0, 0, 0, 0, 1, 0);
    SET IDENTITY_INSERT dbo.EstadoOrden OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrden WHERE IdEstadoOrden = 306)
BEGIN
    UPDATE dbo.EstadoOrden
    SET Descripcion = 'FINALIZADA', LlamadaExterna = 'FINALIZADA', Color = 65280, Anulacion = 0, TiempoMaximo = 99999999, ReferenciaExterna = 'FINALIZADA', WorkflowStep = 0, Final = 1, Barcode = 0, Dispatch = 0, PermiteCrearPedido = 0, B2C = 0, PermiteLeerEtiqueta = 1, PermiteCrearCita = 0
    WHERE IdEstadoOrden = 306
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrden ON;
    INSERT INTO dbo.EstadoOrden (IdEstadoOrden, Descripcion, LlamadaExterna, Color, Anulacion, TiempoMaximo, ReferenciaExterna, WorkflowStep, Final, Barcode, Dispatch, PermiteCrearPedido, B2C, PermiteLeerEtiqueta, PermiteCrearCita)
    VALUES (306, 'FINALIZADA', 'FINALIZADA', 65280, 0, 99999999, 'FINALIZADA', 0, 1, 0, 0, 0, 0, 1, 0);
    SET IDENTITY_INSERT dbo.EstadoOrden OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoOrden WHERE IdEstadoOrden = 400)
BEGIN
    UPDATE dbo.EstadoOrden
    SET Descripcion = 'RECOLECTADO', LlamadaExterna = 'RECOLECTADO', Color = 65280, Anulacion = 0, TiempoMaximo = 99999999, ReferenciaExterna = 'RECOLECTADO', WorkflowStep = 0, Final = 0, Barcode = 0, Dispatch = 0, PermiteCrearPedido = 0, B2C = 0, PermiteLeerEtiqueta = 1, PermiteCrearCita = 0
    WHERE IdEstadoOrden = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoOrden ON;
    INSERT INTO dbo.EstadoOrden (IdEstadoOrden, Descripcion, LlamadaExterna, Color, Anulacion, TiempoMaximo, ReferenciaExterna, WorkflowStep, Final, Barcode, Dispatch, PermiteCrearPedido, B2C, PermiteLeerEtiqueta, PermiteCrearCita)
    VALUES (400, 'RECOLECTADO', 'RECOLECTADO', 65280, 0, 99999999, 'RECOLECTADO', 0, 0, 0, 0, 0, 0, 1, 0);
    SET IDENTITY_INSERT dbo.EstadoOrden OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOVIAJE
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 105)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'INACTIVO', IdSeguimientoEstado = NULL, Color = 16711680, TiempoMaximo = 99999999, ReferenciaExterna = 'INACTIVO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 2, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 105
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (105, 'INACTIVO', NULL, 16711680, 99999999, 'INACTIVO', 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 106)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'ASIGNADO / PENDIENTE', IdSeguimientoEstado = NULL, Color = 65535, TiempoMaximo = 99999999, ReferenciaExterna = 'ASIGNADO / PENDIENTE', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 2, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 106
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (106, 'ASIGNADO / PENDIENTE', NULL, 65535, 99999999, 'ASIGNADO / PENDIENTE', 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 107)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'RECHAZADO', IdSeguimientoEstado = NULL, Color = 255, TiempoMaximo = 99999999, ReferenciaExterna = 'RECHAZADO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 2, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 107
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (107, 'RECHAZADO', NULL, 255, 99999999, 'RECHAZADO', 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 108)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'CONFIRMADO', IdSeguimientoEstado = NULL, Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'CONFIRMADO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 2, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 108
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (108, 'CONFIRMADO', NULL, 65280, 99999999, 'CONFIRMADO', 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 200)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'ACTIVO / EN EJECUCIÓN', IdSeguimientoEstado = NULL, Color = 16711680, TiempoMaximo = 99999999, ReferenciaExterna = 'ACTIVO / EN EJECUCIÓN', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 3, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 200
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (200, 'ACTIVO / EN EJECUCIÓN', NULL, 16711680, 99999999, 'ACTIVO / EN EJECUCIÓN', 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 403)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'FINALIZADO', IdSeguimientoEstado = NULL, Color = 14210386, TiempoMaximo = 99999999, ReferenciaExterna = 'FINALIZADO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 1, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 4, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 403
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (403, 'FINALIZADO', NULL, 14210386, 99999999, 'FINALIZADO', 0, 0, 0, 1, 0, 0, 0, 4, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 402)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'RENDIDO', IdSeguimientoEstado = NULL, Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'RENDIDO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 4, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 402
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (402, 'RENDIDO', NULL, 65280, 99999999, 'RENDIDO', 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 500)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'LIQUIDABLE', IdSeguimientoEstado = NULL, Color = 14210386, TiempoMaximo = 99999999, ReferenciaExterna = 'LIQUIDABLE', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 5, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 500
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (500, 'LIQUIDABLE', NULL, 14210386, 99999999, 'LIQUIDABLE', 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoViaje WHERE IdEstadoViaje = 501)
BEGIN
    UPDATE dbo.EstadoViaje
    SET Descripcion = 'LIQUIDADO', IdSeguimientoEstado = NULL, Color = 65280, TiempoMaximo = 99999999, ReferenciaExterna = 'LIQUIDADO', WorkflowStep = 0, Expedicion = 0, Recepcion = 0, Final = 0, PlanificacionRecursos = 0, PermitePublicarTendering = 0, VisibleMobile = 0, IdEstadoFase = 5, VisibleTendering = 0, VisibleYard = 0, IdTipoAlarmaTiempoMaximo = NULL, EnMuelle = 0, PermiteAsignarMuelle = 0, PermiteDesasignarMuelle = 0, PermiteLiberarMuelle = 0, PermiteActivacionAutomatica = 0, Dispatch = 0, AnalizarArriboProximo = 0, PermiteRendicionRecursos = 0, AnalizarArriboEstimado = 0, PermiteModificarMuelleSalida = 0, PermiteModificarMuelleLlegada = 0, PermiteTarifarRetroactivo = 0, PermiteAdministrarRecursosDescartables = 0, DispatchToAssign = 0, FechaCreacion = NULL, FechaUltimaModificacion = NULL, InicioCarga = 0
    WHERE IdEstadoViaje = 501
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoViaje ON;
    INSERT INTO dbo.EstadoViaje (IdEstadoViaje, Descripcion, IdSeguimientoEstado, Color, TiempoMaximo, ReferenciaExterna, WorkflowStep, Expedicion, Recepcion, Final, PlanificacionRecursos, PermitePublicarTendering, VisibleMobile, IdEstadoFase, VisibleTendering, VisibleYard, IdTipoAlarmaTiempoMaximo, EnMuelle, PermiteAsignarMuelle, PermiteDesasignarMuelle, PermiteLiberarMuelle, PermiteActivacionAutomatica, Dispatch, AnalizarArriboProximo, PermiteRendicionRecursos, AnalizarArriboEstimado, PermiteModificarMuelleSalida, PermiteModificarMuelleLlegada, PermiteTarifarRetroactivo, PermiteAdministrarRecursosDescartables, DispatchToAssign, FechaCreacion, FechaUltimaModificacion, InicioCarga)
    VALUES (501, 'LIQUIDADO', NULL, 65280, 99999999, 'LIQUIDADO', 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, NULL, 0);
    SET IDENTITY_INSERT dbo.EstadoViaje OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADOPARADA
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 203)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'PENDIENTE', Color = 65535, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'PENDIENTE', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 0, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 203
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (203, 'PENDIENTE', 65535, 0, 0, 'PENDIENTE', 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 204)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'EN VIAJE', Color = 16711680, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'EN VIAJE', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 0, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 204
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (204, 'EN VIAJE', 16711680, 0, 0, 'EN VIAJE', 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 205)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'VISITADO / EN GEOCERCA', Color = 14210386, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'VISITADO / EN GEOCERCA', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 0, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 205
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (205, 'VISITADO / EN GEOCERCA', 14210386, 0, 0, 'VISITADO / EN GEOCERCA', 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 300)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'CARGADO', Color = 65280, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'CARGADO', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 300
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (300, 'CARGADO', 65280, 0, 0, 'CARGADO', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 301)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'CARGADO PARCIAL', Color = 65280, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'CARGADO PARCIAL', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 301
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (301, 'CARGADO PARCIAL', 65280, 0, 0, 'CARGADO PARCIAL', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 302)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'NO CARGADO', Color = 255, Anulacion = 1, DesasociarOrden = 0, ReferenciaExterna = 'NO CARGADO', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 302
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (302, 'NO CARGADO', 255, 1, 0, 'NO CARGADO', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 303)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'ENTREGADO', Color = 65280, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'ENTREGADO', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 303
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (303, 'ENTREGADO', 65280, 0, 0, 'ENTREGADO', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 304)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'ENTREGA PARCIAL', Color = 14210386, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'ENTREGA PARCIAL', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 0, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 304
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (304, 'ENTREGA PARCIAL', 14210386, 0, 0, 'ENTREGA PARCIAL', 0, 0, 0, 0, 0, 0, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 305)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'NO ENTREGADO', Color = 255, Anulacion = 1, DesasociarOrden = 0, ReferenciaExterna = 'NO ENTREGADO', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 305
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (305, 'NO ENTREGADO', 255, 1, 0, 'NO ENTREGADO', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 400)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'RECOLECTADO EN DEVOLUCIÓN', Color = 255, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'RECOLECTADO EN DEVOLUCIÓN', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 400
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (400, 'RECOLECTADO EN DEVOLUCIÓN', 255, 0, 0, 'RECOLECTADO EN DEVOLUCIÓN', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 404)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'NO RECOLECTADO', Color = 255, Anulacion = 1, DesasociarOrden = 0, ReferenciaExterna = 'NO RECOLECTADO', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 404
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (404, 'NO RECOLECTADO', 255, 1, 0, 'NO RECOLECTADO', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoParada WHERE IdEstadoParada = 405)
BEGIN
    UPDATE dbo.EstadoParada
    SET Descripcion = 'RECOLECTADO PARCIAL', Color = 65280, Anulacion = 0, DesasociarOrden = 0, ReferenciaExterna = 'RECOLECTADO PARCIAL', VisitaReal = 0, OrdenVisualizacion = 0, PermiteMobile = 0, Costo = 0, Venta = 0, Realizado = 1, Icono = NULL, RealizadoParcial = 0, Dispatch = 0, PrimeraVisitaEfectiva = 0, WorkflowStep = 0, NoRealizado = 0, EsperaDescarga = 0, InformaMotivoEnB2C = 0, PermiteEstadia = 0, EnProgreso = 0, LiberarComoOrdenAlFinalizarViaje = 0, CheckInCheckOut = 0
    WHERE IdEstadoParada = 405
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoParada ON;
    INSERT INTO dbo.EstadoParada (IdEstadoParada, Descripcion, Color, Anulacion, DesasociarOrden, ReferenciaExterna, VisitaReal, OrdenVisualizacion, PermiteMobile, Costo, Venta, Realizado, Icono, RealizadoParcial, Dispatch, PrimeraVisitaEfectiva, WorkflowStep, NoRealizado, EsperaDescarga, InformaMotivoEnB2C, PermiteEstadia, EnProgreso, LiberarComoOrdenAlFinalizarViaje, CheckInCheckOut)
    VALUES (405, 'RECOLECTADO PARCIAL', 65280, 0, 0, 'RECOLECTADO PARCIAL', 0, 0, 0, 0, 0, 1, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    SET IDENTITY_INSERT dbo.EstadoParada OFF;
END
GO


-- ---------------------------------------------------------
-- ENTIDAD: ESTADORUTA
-- ---------------------------------------------------------
IF EXISTS (SELECT 1 FROM dbo.EstadoRuta WHERE IdEstadoRuta = 103)
BEGIN
    UPDATE dbo.EstadoRuta
    SET Descripcion = 'CREADA', Color = 14210386, LlamadaExterna = 'CREADA', Dispatch = 0
    WHERE IdEstadoRuta = 103
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRuta ON;
    INSERT INTO dbo.EstadoRuta (IdEstadoRuta, Descripcion, Color, LlamadaExterna, Dispatch)
    VALUES (103, 'CREADA', 14210386, 'CREADA', 0);
    SET IDENTITY_INSERT dbo.EstadoRuta OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoRuta WHERE IdEstadoRuta = 201)
BEGIN
    UPDATE dbo.EstadoRuta
    SET Descripcion = 'EN RUTA', Color = 16711680, LlamadaExterna = 'EN RUTA', Dispatch = 0
    WHERE IdEstadoRuta = 201
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRuta ON;
    INSERT INTO dbo.EstadoRuta (IdEstadoRuta, Descripcion, Color, LlamadaExterna, Dispatch)
    VALUES (201, 'EN RUTA', 16711680, 'EN RUTA', 0);
    SET IDENTITY_INSERT dbo.EstadoRuta OFF;
END
GO

IF EXISTS (SELECT 1 FROM dbo.EstadoRuta WHERE IdEstadoRuta = 401)
BEGIN
    UPDATE dbo.EstadoRuta
    SET Descripcion = 'FINALIZADA', Color = 65280, LlamadaExterna = 'FINALIZADA', Dispatch = 0
    WHERE IdEstadoRuta = 401
END
ELSE
BEGIN
    SET IDENTITY_INSERT dbo.EstadoRuta ON;
    INSERT INTO dbo.EstadoRuta (IdEstadoRuta, Descripcion, Color, LlamadaExterna, Dispatch)
    VALUES (401, 'FINALIZADA', 65280, 'FINALIZADA', 0);
    SET IDENTITY_INSERT dbo.EstadoRuta OFF;
END
GO
