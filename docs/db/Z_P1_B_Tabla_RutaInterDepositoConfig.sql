-- =============================================================================
-- SQL Script: [P1_B] Tabla de Arcos / Rutas entre Depósitos (HESA)
-- AUTOR:           Antigravity
-- FECHA:           18/05/2026
-- DESCRIPCIÓN:     Define los caminos entre Hubs. En este test, todo se
--                  centraliza vía Madrid (7).
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Z_RutaInterDepositoConfig')
BEGIN
    CREATE TABLE [dbo].[Z_RutaInterDepositoConfig] (
        IdConfig              INT IDENTITY(1,1) PRIMARY KEY,
        IdDepositoOrigen      INT           NOT NULL,
        IdDepositoDestino     INT           NOT NULL,
        IdDepositoIntermedio  INT           NOT NULL,
        Orden                 INT           NOT NULL,
        TipoTransferencia     VARCHAR(20)   NOT NULL DEFAULT 'CROSS-DOCK',
        TiempoEstimadoMinutos INT           NULL,
        Activo                BIT           NOT NULL DEFAULT 1,
        Observaciones         VARCHAR(500)  NULL,
        FechaCreacion         DATETIME      NOT NULL DEFAULT GETUTCDATE(),
        FechaModificacion     DATETIME      NULL,

        CONSTRAINT UQ_Z_RutaInter_Combinacion UNIQUE (IdDepositoOrigen, IdDepositoDestino, IdDepositoIntermedio, Orden),
        CONSTRAINT CK_Z_RutaInter_NoCircular CHECK (IdDepositoIntermedio <> IdDepositoOrigen AND IdDepositoIntermedio <> IdDepositoDestino),
        CONSTRAINT CK_Z_RutaInter_TipoTransferencia CHECK (TipoTransferencia IN ('TRANSITO', 'CROSS-DOCK'))
    );

    PRINT 'Tabla Z_RutaInterDepositoConfig creada exitosamente.';

    -- Configuración de prueba: Todo pasa por Madrid (Id 7)
    INSERT INTO Z_RutaInterDepositoConfig (IdDepositoOrigen, IdDepositoDestino, IdDepositoIntermedio, Orden, TipoTransferencia, Observaciones)
    VALUES 
        (11, 9, 7, 1, 'CROSS-DOCK', 'TEST HESA: Sevilla a Barcelona por Madrid'),
        (9, 11, 7, 1, 'CROSS-DOCK', 'TEST HESA: Barcelona a Sevilla por Madrid');

    PRINT 'Datos de prueba insertados.';
END
ELSE
BEGIN
    PRINT 'Tabla Z_RutaInterDepositoConfig ya existe, no se realizaron cambios.';
END
GO
