USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_ResolverRutaInterDepositos] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           15/05/2026
-- VERSIÓN:         v1.0
-- DESCRIPCIÓN:     Dado un Pedido, consulta si su combinación DepositoSalida → DepositoLlegada
--                  tiene depósitos intermedios configurados en Z_RutaInterDepositoConfig.
--                  Devuelve:
--                    - Parámetro OUTPUT @TieneIntermedios (BIT): 1 si hay ruta, 0 si no.
--                    - Resultset con la secuencia de depósitos intermedios ordenados.
--
-- LLAMADO DESDE:   Z_SP_ProcesarRuteoIntermedio (orquestador)
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_ResolverRutaInterDepositos]
    @IdPedido          INT,
    @TieneIntermedios  BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdDepSalida  INT,
            @IdDepLlegada INT,
            @CantidadIntermedios INT;

    -- ── 1. Obtener los depósitos del Pedido ──────────────────────────────────
    DECLARE @CP_Entrega VARCHAR(20);

    SELECT 
        @IdDepSalida  = IdDepositoSalida,
        @IdDepLlegada = IdDepositoLlegada,
        @CP_Entrega   = CodigoPostal
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    -- [NUEVO: INTELIGENCIA CP] Si el pedido no tiene destino, lo calculamos dinámicamente
    IF (@IdDepLlegada IS NULL OR @IdDepLlegada = 0) AND @CP_Entrega IS NOT NULL
    BEGIN
        SET @IdDepLlegada = [dbo].[Z_FN_CalcularDepositoPorCP](@CP_Entrega);
        
        IF @IdDepLlegada IS NOT NULL
        BEGIN
            PRINT 'ResolverRuta: Destino calculado por CP (' + @CP_Entrega + ') -> Hub ' + CAST(@IdDepLlegada AS VARCHAR(10));
            -- Actualizamos el pedido para que la planificación sea consistente
            UPDATE Pedido SET IdDepositoLlegada = @IdDepLlegada WHERE IdPedido = @IdPedido;
        END
    END

    -- Validación: Pedido no encontrado
    IF @IdDepSalida IS NULL
    BEGIN
        SET @TieneIntermedios = 0;
        PRINT 'ResolverRuta: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' no encontrado o sin DepositoSalida.';
        RETURN;
    END

    -- Validación: Sin depósito de llegada
    IF @IdDepLlegada IS NULL OR @IdDepLlegada = 0
    BEGIN
        SET @TieneIntermedios = 0;
        PRINT 'ResolverRuta: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' sin DepositoLlegada asignado.';
        RETURN;
    END

    -- Validación: Origen y destino iguales (no necesita intermedios)
    IF @IdDepSalida = @IdDepLlegada
    BEGIN
        SET @TieneIntermedios = 0;
        PRINT 'ResolverRuta: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' tiene mismo Origen y Destino (' + CAST(@IdDepSalida AS VARCHAR(10)) + '). Sin intermedios.';
        RETURN;
    END

    -- ── 2. Consultar si existe ruta intermedia configurada y activa ──────────
    SELECT @CantidadIntermedios = COUNT(*)
    FROM Z_RutaInterDepositoConfig
    WHERE IdDepositoOrigen  = @IdDepSalida
      AND IdDepositoDestino = @IdDepLlegada
      AND Activo = 1;

    IF @CantidadIntermedios > 0
        SET @TieneIntermedios = 1;
    ELSE
        SET @TieneIntermedios = 0;

    PRINT 'ResolverRuta: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) 
        + ' | Origen=' + CAST(@IdDepSalida AS VARCHAR(10))
        + ' → Destino=' + CAST(@IdDepLlegada AS VARCHAR(10))
        + ' | Intermedios encontrados: ' + CAST(@CantidadIntermedios AS VARCHAR(5));

    -- ── 3. Devolver la secuencia de depósitos intermedios ────────────────────
    -- El consumidor (SP orquestador) procesará este resultset
    SELECT 
        C.IdConfig,
        C.IdDepositoIntermedio,
        C.Orden,
        C.TipoTransferencia,
        C.TiempoEstimadoMinutos,
        C.Observaciones,
        -- Datos enriquecidos del depósito para la generación de Paradas
        D.Descripcion       AS NombreDeposito,
        D.Direccion          AS DireccionDeposito,
        D.Calle              AS CalleDeposito,
        D.CodigoPostal       AS CodigoPostalDeposito,
        D.EntreCalle         AS EntreCalleDeposito,
        D.Localidad          AS LocalidadDeposito,
        D.Provincia          AS ProvinciaDeposito,
        D.Pais               AS PaisDeposito,
        ISNULL(D.Latitud, 0)  AS LatitudDeposito,
        ISNULL(D.Longitud, 0) AS LongitudDeposito
    FROM Z_RutaInterDepositoConfig C
    INNER JOIN Deposito D ON D.IdDeposito = C.IdDepositoIntermedio
    WHERE C.IdDepositoOrigen  = @IdDepSalida
      AND C.IdDepositoDestino = @IdDepLlegada
      AND C.Activo = 1
    ORDER BY C.Orden ASC;

END
GO
