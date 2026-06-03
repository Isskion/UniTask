-- =============================================================================
-- SQL Script: Creación de Tabla Maestra de Provincias y Depósitos (UNIGIS EUP)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Mapea los 2 primeros dígitos del CP con el Depósito Hub de destino.
-- =============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Z_ProvinciaDepositoConfig')
BEGIN
    CREATE TABLE Z_ProvinciaDepositoConfig (
        IdConfig       INT IDENTITY(1,1) PRIMARY KEY,
        PrefijoCP      CHAR(2) NOT NULL UNIQUE,  -- Los 2 primeros dígitos del CP
        Provincia      VARCHAR(100),             -- Nombre descriptivo (opcional)
        IdDeposito     INT NOT NULL,             -- ID del Depósito Hub en UNIGIS
        Activo         BIT DEFAULT 1,
        FechaCreacion  DATETIME DEFAULT GETDATE(),
        
        -- Relación con la tabla maestra de Depósitos (si existe en este esquema)
        -- CONSTRAINT FK_ProvinciaDep_Deposito FOREIGN KEY (IdDeposito) REFERENCES Deposito(IdDeposito)
    );
    PRINT 'Tabla Z_ProvinciaDepositoConfig creada correctamente.';
END
ELSE
BEGIN
    PRINT 'La tabla Z_ProvinciaDepositoConfig ya existe.';
END
GO

-- ── CARGA INICIAL DE DATOS (ESPAÑA) ──────────────────────────────────────────
-- Se asocian provincias a los Hubs principales conocidos. 
-- NOTA: Estos IDs de depósito son ejemplos basados en la lógica actual (MAD=7, BCN=9).
-- El usuario o administrador deberá ajustar estos mapeos según la realidad operativa.

-- Limpiar para recarga si fuera necesario en desarrollo
-- TRUNCATE TABLE Z_ProvinciaDepositoConfig;

INSERT INTO Z_ProvinciaDepositoConfig (PrefijoCP, Provincia, IdDeposito)
VALUES 
('08', 'Barcelona', 9),
('17', 'Girona', 9),
('25', 'Lleida', 9),
('43', 'Tarragona', 9),
('28', 'Madrid', 7),
('19', 'Guadalajara', 7),
('45', 'Toledo', 7),
('41', 'Sevilla', 11),  -- Ejemplo ID 11 para Sevilla
('29', 'Málaga', 11),
('46', 'Valencia', 12), -- Ejemplo ID 12 para Levante
('03', 'Alicante', 12),
('30', 'Murcia', 12),
('48', 'Vizcaya', 15),   -- Ejemplo ID 15 para Norte
('20', 'Guipúzcoa', 15),
('31', 'Navarra', 15),
('15', 'A Coruña', 16),  -- Ejemplo ID 16 para Galicia
('36', 'Pontevedra', 16),
('50', 'Zaragoza', 17);  -- Ejemplo ID 17 para Aragón

PRINT 'Carga inicial de Z_ProvinciaDepositoConfig completada.';
GO
