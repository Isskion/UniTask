USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Tabla de Configuración: Rutas con Depósitos Intermedios ******/
/****** Miniproyecto UNIGIS EUP — Ruteo Intermedio               ******/
/****** Fecha: 15/05/2026                                         ******/

-- =============================================================================
-- DESCRIPCIÓN:
--   Tabla de configuración que define las rutas obligatorias entre depósitos.
--   Para cada combinación Origen → Destino, se especifican los depósitos
--   intermedios por los que debe pasar el Pedido, con su orden secuencial.
--
-- EJEMPLO DE USO:
--   Si un Pedido sale de CP Barcelona (Id=5) y va a CP Madrid (Id=12),
--   y existe configuración con Hub Zaragoza (Id=8, Orden=1) y Hub Guadalajara
--   (Id=15, Orden=2), el sistema generará 2 paradas intermedias obligatorias.
--
-- NOTAS DE DISEÑO:
--   - El campo Activo permite desactivar rutas sin borrarlas (soft-delete).
--   - TipoTransferencia indica si la parada es de paso (TRANSITO) o requiere
--     descarga y recarga (CROSS-DOCK), afectando la generación de ParadaItems.
--   - TiempoEstimadoMinutos es informativo para planificación.
-- =============================================================================

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- Verificar si la tabla ya existe para evitar errores en re-ejecución
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Z_RutaInterDepositoConfig')
BEGIN
    CREATE TABLE [dbo].[Z_RutaInterDepositoConfig] (
        IdConfig              INT IDENTITY(1,1) PRIMARY KEY,
        IdDepositoOrigen      INT           NOT NULL,    -- CP de Salida del Pedido
        IdDepositoDestino     INT           NOT NULL,    -- CP de Llegada del Pedido
        IdDepositoIntermedio  INT           NOT NULL,    -- Depósito de paso obligatorio
        Orden                 INT           NOT NULL,    -- Secuencia dentro de la ruta (1, 2, 3...)
        TipoTransferencia    VARCHAR(20)   NOT NULL DEFAULT 'CROSS-DOCK',  -- TRANSITO | CROSS-DOCK
        TiempoEstimadoMinutos INT          NULL,         -- Tiempo estimado de tránsito (informativo)
        Activo                BIT           NOT NULL DEFAULT 1,
        Observaciones         VARCHAR(500)  NULL,
        FechaCreacion         DATETIME      NOT NULL DEFAULT GETUTCDATE(),
        FechaModificacion     DATETIME      NULL,

        -- Restricciones de integridad
        CONSTRAINT FK_Z_RutaInter_Origen     FOREIGN KEY (IdDepositoOrigen)     REFERENCES Deposito(IdDeposito),
        CONSTRAINT FK_Z_RutaInter_Destino    FOREIGN KEY (IdDepositoDestino)    REFERENCES Deposito(IdDeposito),
        CONSTRAINT FK_Z_RutaInter_Intermedio FOREIGN KEY (IdDepositoIntermedio) REFERENCES Deposito(IdDeposito),

        -- Unicidad: no puede haber dos configuraciones con la misma combinación origen-destino-intermedio-orden
        CONSTRAINT UQ_Z_RutaInter_Combinacion UNIQUE (IdDepositoOrigen, IdDepositoDestino, IdDepositoIntermedio, Orden),

        -- Validación: el intermedio no puede ser ni el origen ni el destino
        CONSTRAINT CK_Z_RutaInter_NoCircular CHECK (
            IdDepositoIntermedio <> IdDepositoOrigen 
            AND IdDepositoIntermedio <> IdDepositoDestino
        ),

        -- Validación: el tipo de transferencia debe ser uno de los valores permitidos
        CONSTRAINT CK_Z_RutaInter_TipoTransferencia CHECK (
            TipoTransferencia IN ('TRANSITO', 'CROSS-DOCK')
        )
    );

    PRINT 'Tabla Z_RutaInterDepositoConfig creada exitosamente.';
END
ELSE
BEGIN
    PRINT 'Tabla Z_RutaInterDepositoConfig ya existe, no se realizaron cambios.';
END
GO

-- Índice para consultas frecuentes por Origen+Destino (la query principal del resolver)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Z_RutaInter_OrigenDestino' AND object_id = OBJECT_ID('Z_RutaInterDepositoConfig'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Z_RutaInter_OrigenDestino
    ON [dbo].[Z_RutaInterDepositoConfig] (IdDepositoOrigen, IdDepositoDestino)
    INCLUDE (IdDepositoIntermedio, Orden, TipoTransferencia, Activo)
    WHERE Activo = 1;

    PRINT 'Índice IX_Z_RutaInter_OrigenDestino creado.';
END
GO
