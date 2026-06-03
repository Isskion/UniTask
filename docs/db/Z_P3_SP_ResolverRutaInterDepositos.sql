-- =============================================================================
-- SQL Script: [P3] Integración de Resolución Dinámica en Orquestador (HESA)
-- AUTOR:           Antigravity
-- FECHA:           16/05/2026
-- DESCRIPCIÓN:     Modifica el SP para que autocalcule el destino si no existe.
-- =============================================================================

USE [UNIGIS_DataRepository_HESA]
GO

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_ResolverRutaInterDepositos]
    @IdPedido          INT,
    @TieneIntermedios  BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdDepSalida  INT,
            @IdDepLlegada INT,
            @CantidadIntermedios INT,
            @CP_Entrega VARCHAR(20);

    -- ── 1. Obtener los datos del Pedido ──────────────────────────────────
    SELECT 
        @IdDepSalida  = IdDepositoSalida,
        @IdDepLlegada = IdDepositoLlegada,
        @CP_Entrega   = CodigoPostal
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    -- [P3: INTELIGENCIA CP] Validación y cálculo dinámico de destino
    IF @CP_Entrega IS NULL OR LTRIM(RTRIM(@CP_Entrega)) = ''
    BEGIN
        UPDATE Pedido SET Mensaje = ISNULL(Mensaje, '') + '-|- Error Crossdock: Sin CP definido.' WHERE IdPedido = @IdPedido;
        SET @TieneIntermedios = 0; RETURN;
    END

    IF (@IdDepLlegada IS NULL OR @IdDepLlegada = 0)
    BEGIN
        SET @IdDepLlegada = [dbo].[Z_FN_CalcularDepositoPorCP](@CP_Entrega);
        
        IF @IdDepLlegada IS NULL
        BEGIN
            UPDATE Pedido SET Mensaje = ISNULL(Mensaje, '') + '-|- Error Crossdock: CP ' + @CP_Entrega + ' no zonificado.' WHERE IdPedido = @IdPedido;
            SET @TieneIntermedios = 0; RETURN;
        END
        ELSE
        BEGIN
            PRINT 'P3: Destino calculado por CP (' + @CP_Entrega + ') -> Hub ' + CAST(@IdDepLlegada AS VARCHAR(10));
            UPDATE Pedido SET IdDepositoLlegada = @IdDepLlegada WHERE IdPedido = @IdPedido;
        END
    END

    -- Validación de Arcos (Rutas entre Depósitos)
    IF @IdDepSalida IS NULL OR @IdDepLlegada IS NULL OR @IdDepSalida = @IdDepLlegada
    BEGIN
        SET @TieneIntermedios = 0;
        RETURN;
    END

    -- ── 2. Consultar si existe ruta intermedia configurada ──────────────────
    SELECT @CantidadIntermedios = COUNT(*)
    FROM Z_RutaInterDepositoConfig
    WHERE IdDepositoOrigen  = @IdDepSalida
      AND IdDepositoDestino = @IdDepLlegada
      AND Activo = 1;

    IF @CantidadIntermedios = 0 AND @IdDepSalida <> @IdDepLlegada
    BEGIN
        -- Si no hay arcos definidos para esta combinación, registramos el aviso
        UPDATE Pedido 
        SET Mensaje = ISNULL(Mensaje, '') + '-|- Aviso Crossdock: Ruta ' + CAST(@IdDepSalida AS VARCHAR(5)) + '->' + CAST(@IdDepLlegada AS VARCHAR(5)) + ' no declarada en tabla de arcos.'
        WHERE IdPedido = @IdPedido;
    END

    SET @TieneIntermedios = CASE WHEN @CantidadIntermedios > 0 THEN 1 ELSE 0 END;

    -- ── 3. Devolver la secuencia de depósitos intermedios ────────────────────
    SELECT 
        C.IdConfig,
        C.IdDepositoIntermedio,
        C.Orden,
        C.TipoTransferencia,
        D.Descripcion       AS NombreDeposito,
        D.Direccion          AS DireccionDeposito
    FROM Z_RutaInterDepositoConfig C
    INNER JOIN Deposito D ON D.IdDeposito = C.IdDepositoIntermedio
    WHERE C.IdDepositoOrigen  = @IdDepSalida
      AND C.IdDepositoDestino = @IdDepLlegada
      AND C.Activo = 1
    ORDER BY C.Orden ASC;

END
GO
