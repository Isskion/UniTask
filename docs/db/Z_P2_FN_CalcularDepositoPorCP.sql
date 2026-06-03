-- =============================================================================
-- SQL Script: [P2] Función de Cálculo de Depósito por CP (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Dada una cadena de CP, normaliza a 5 dígitos y devuelve
--                  el IdDeposito del Hub asignado a esa provincia.
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
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

    -- 1. Normalización básica del CP
    SET @CP_Norm = LTRIM(RTRIM(@CodigoPostal));
    
    IF LEN(@CP_Norm) < 5 AND ISNUMERIC(@CP_Norm) = 1
        SET @CP_Norm = RIGHT('00000' + @CP_Norm, 5);

    -- 2. Obtener el prefijo de la provincia
    SET @Prefijo = LEFT(@CP_Norm, 2);

    -- 3. Buscar el depósito en la tabla de configuración
    SELECT @IdDeposito = IdDeposito
    FROM Z_ProvinciaDepositoConfig
    WHERE PrefijoCP = @Prefijo
      AND Activo = 1;

    RETURN @IdDeposito;
END
GO
