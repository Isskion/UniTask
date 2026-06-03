-- =============================================================================
-- SQL Script: Función de Cálculo de Depósito por CP
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Dada una cadena de CP, normaliza a 5 dígitos y devuelve
--                  el IdDeposito del Hub asignado a esa provincia.
-- =============================================================================

USE [UNIGIS_DataRepository_EUROPASTRY]
GO

CREATE OR ALTER FUNCTION [dbo].[Z_FN_CalcularDepositoPorCP] (
    @CodigoPostal VARCHAR(20)
)
RETURNS INT
AS
BEGIN
    DECLARE @Prefijo    CHAR(2);
    DECLARE @IdDeposito INT;
    DECLARE @CP_Norm    VARCHAR(5);

    -- 1. Normalización básica del CP (asegurar 5 caracteres con ceros a la izquierda)
    -- Quitamos espacios y caracteres no numéricos simples si los hubiera
    SET @CP_Norm = LTRIM(RTRIM(@CodigoPostal));
    
    -- Si es numérico y tiene menos de 5 dígitos, rellenamos con ceros (Ej: '8001' -> '08001')
    IF LEN(@CP_Norm) < 5 AND ISNUMERIC(@CP_Norm) = 1
        SET @CP_Norm = RIGHT('00000' + @CP_Norm, 5);

    -- 2. Obtener el prefijo de la provincia (primeros 2 dígitos)
    SET @Prefijo = LEFT(@CP_Norm, 2);

    -- 3. Buscar el depósito en la tabla de configuración
    SELECT @IdDeposito = IdDeposito
    FROM Z_ProvinciaDepositoConfig
    WHERE PrefijoCP = @Prefijo
      AND Activo = 1;

    -- 4. Retornar el ID (si no existe, devolverá NULL, lo cual indica "Zonificación Pendiente")
    RETURN @IdDeposito;
END
GO
