-- ==============================================================================
-- INSPECCIÓN DE ESTRUCTURA DE DIRECCIÓN PARA PARADA Y DEPÓSITO
-- ==============================================================================
-- Este script muestra las columnas de dirección de ambas tablas para saber 
-- exactamente cuáles copiar desde Deposito hacia la Parada de Rendición.
-- ==============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

PRINT '📌 COLUMNAS DE DIRECCIÓN EN LA TABLA Parada:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Parada'
  AND (
       COLUMN_NAME LIKE '%Direccion%' 
       OR COLUMN_NAME LIKE '%Domicilio%' 
       OR COLUMN_NAME LIKE '%Calle%' 
       OR COLUMN_NAME LIKE '%Localidad%'
       OR COLUMN_NAME LIKE '%Lat%'
       OR COLUMN_NAME LIKE '%Lon%'
       OR COLUMN_NAME LIKE '%Postal%'
       OR COLUMN_NAME LIKE '%Provincia%'
       OR COLUMN_NAME LIKE '%Pais%'
  )
ORDER BY COLUMN_NAME;


PRINT '📌 COLUMNAS DE DIRECCIÓN EN LA TABLA Deposito:';
SELECT 
    COLUMN_NAME, 
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Deposito'
  AND (
       COLUMN_NAME LIKE '%Direccion%' 
       OR COLUMN_NAME LIKE '%Domicilio%' 
       OR COLUMN_NAME LIKE '%Calle%' 
       OR COLUMN_NAME LIKE '%Localidad%'
       OR COLUMN_NAME LIKE '%Lat%'
       OR COLUMN_NAME LIKE '%Lon%'
       OR COLUMN_NAME LIKE '%Postal%'
       OR COLUMN_NAME LIKE '%Provincia%'
       OR COLUMN_NAME LIKE '%Pais%'
  )
ORDER BY COLUMN_NAME;

PRINT '🔍 CONSULTANDO LOS DATOS DE EJEMPLO DE LA PARADA DE DEPÓSITO ACTUAL (ID: 389) Y SU DEPÓSITO ASOCIADO:';
SELECT 
    P.IdParada,
    P.IdTipoParada,
    P.IdDeposito,
    P.Direccion,
    P.Latitud,
    P.Longitud
FROM Parada P WITH (NOLOCK)
WHERE P.IdParada = 389;

SELECT 
    D.IdDeposito,
    D.Descripcion,
    D.Direccion,
    D.Latitud,
    D.Longitud
FROM Deposito D WITH (NOLOCK)
WHERE D.IdDeposito = (SELECT IdDepositoLlegada FROM Viaje WHERE IdViaje = 79);
GO
