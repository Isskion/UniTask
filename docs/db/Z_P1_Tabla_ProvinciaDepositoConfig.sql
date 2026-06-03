-- =============================================================================
-- SQL Script: [P1] Creación de Tabla Maestra de Provincias y Depósitos (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Mapea los 2 primeros dígitos del CP con el Depósito Hub de destino.
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Z_ProvinciaDepositoConfig')
BEGIN
    CREATE TABLE Z_ProvinciaDepositoConfig (
        IdConfig       INT IDENTITY(1,1) PRIMARY KEY,
        PrefijoCP      CHAR(2) NOT NULL UNIQUE,  -- Los 2 primeros dígitos del CP
        Provincia      VARCHAR(100),             -- Nombre descriptivo (opcional)
        IdDeposito     INT NOT NULL,             -- ID del Depósito Hub en UNIGIS
        Activo         BIT DEFAULT 1,
        FechaCreacion  DATETIME DEFAULT GETDATE()
    );
    PRINT 'P1: Tabla Z_ProvinciaDepositoConfig creada correctamente.';
END
ELSE
BEGIN
    PRINT 'P1: La tabla Z_ProvinciaDepositoConfig ya existe.';
END
GO

-- ── CARGA INICIAL DE DATOS (ESPAÑA) ──────────────────────────────────────────
-- Se asocian provincias a los Hubs principales de HESA. 

-- Insertar solo si no existen para evitar errores en re-ejecución
INSERT INTO Z_ProvinciaDepositoConfig (PrefijoCP, Provincia, IdDeposito)
SELECT Prefijo, Prov, Dep FROM (VALUES 
('08', 'Barcelona', 9),
('17', 'Girona', 9),
('25', 'Lleida', 9),
('43', 'Tarragona', 9),
('28', 'Madrid', 7),
('19', 'Guadalajara', 7),
('45', 'Toledo', 7),
('41', 'Sevilla', 11),
('29', 'Málaga', 11),
('46', 'Valencia', 12),
('03', 'Alicante', 12),
('30', 'Murcia', 12),
('48', 'Vizcaya', 15),
('20', 'Guipúzcoa', 15),
('31', 'Navarra', 15),
('15', 'A Coruña', 16),
('36', 'Pontevedra', 16),
('50', 'Zaragoza', 17)
) AS T(Prefijo, Prov, Dep)
WHERE NOT EXISTS (SELECT 1 FROM Z_ProvinciaDepositoConfig WHERE PrefijoCP = T.Prefijo);

PRINT 'P1: Carga inicial de datos completada.';
GO
