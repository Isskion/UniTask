USE [UNIGIS_DataRepository_EUROPASTRY]
GO
/****** Object:  StoredProcedure [dbo].[Z_SP_CrearPedidoCero]    Script Date: 13/05/2026 15:12:27 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[Z_SP_CrearPedidoCero] @IdPedido INT
AS
BEGIN
    SET NOCOUNT ON;

    /*--------------------------------------------------
     0. Leer valores anteriores para Bitácora de ajustes
    --------------------------------------------------*/
    DECLARE
        @OldIdTipoPedido      INT,
        @OldIdDepositoSalida  INT,
        @OldIdDepositoLlegada INT,
        @OldIdDomicilioOrden2 INT,
        @OldIdCategoriaPedido INT,
        @OldInicioHorario1    INT,
        @OldFinHorario1       INT,
		@IdEstadoPedido       INT;

    SELECT
        @OldIdTipoPedido      = IdTipoPedido,
        @OldIdDepositoSalida  = IdDepositoSalida,
        @OldIdDepositoLlegada = IdDepositoLlegada,
        @OldIdDomicilioOrden2 = IdDomicilioOrden2,
        @OldIdCategoriaPedido = IdCategoriaPedido,
        @OldInicioHorario1    = InicioHorario1,
        @OldFinHorario1       = FinHorario1,
		@IdEstadoPedido		  = IdEstadoPedido
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    /*--------------------------------------------------
     1. Ajustes iniciales del Pedido y se 
	 reinicia el mensaje de validacion en Pedido_Dyn
    --------------------------------------------------*/

	Update Pedido_Dyn Set MensajeValidacion = NULL Where IdPedido=@IdPedido;

    BEGIN
        UPDATE P
        SET
            IdTipoPedido =
                CASE 
                    WHEN P.IdTipoPedido IS NULL OR P.IdTipoPedido = 0 THEN 1
                    ELSE P.IdTipoPedido
                END,

            IdDepositoSalida =
                CASE 
                    WHEN P.IdDepositoSalida IS NULL 
                         OR P.IdDepositoSalida = 0 
                         OR P.IdDepositoSalida = 60
                    THEN O.IdDepositoSalida
                    ELSE P.IdDepositoSalida
                END,

            IdDepositoLlegada =
                CASE 
                    WHEN ISNULL(P.IdDepositoLlegada,0) = 0
                    THEN O.IdDepositoSalida
                    ELSE P.IdDepositoLlegada
                END,

            IdDomicilioOrden2 =
                CASE
                    WHEN ISNULL(P.IdTipoPedido, 0) = 2 -- Rellenar DomicilioOrden2 con IdDomicilioOrden cuando es recogidas
                    THEN DO.IdDomicilioOrden
                    ELSE P.IdDomicilioOrden2
                END,

            IdCategoriaPedido =
                CASE
                    WHEN ISNULL(P.IdCategoriaPedido,0) = 0 THEN 1
                    ELSE P.IdCategoriaPedido
                END,

            InicioHorario1 =
                CASE 
                    WHEN ISNULL(P.InicioHorario1,0) > 0 AND P.InicioHorario1 < 100 THEN P.InicioHorario1 * 100
                    WHEN ISNULL(P.InicioHorario1,0) = 0 THEN 800
                    ELSE P.InicioHorario1
                END,

            FinHorario1 =
                CASE 
                    WHEN ISNULL(P.FinHorario1,0) > 0 AND P.FinHorario1 < 100 THEN P.FinHorario1 * 100
                    WHEN ISNULL(P.FinHorario1,0) = 0 THEN 1800
                    ELSE P.FinHorario1
                END,
			IdTipoVerificacion=
				CASE 
					WHEN P.Direccion=D.Direccion THEN 2
					ELSE 1
				END,
			Descripcion =
				CASE WHEN P.IdTipoCanal=2 AND CO.Contacto <> P.Descripcion THEN CO.Contacto
					ELSE P.Descripcion
				END

        FROM Pedido P
        INNER JOIN Operacion O			ON O.IdOperacion = P.IdOperacion  
        INNER JOIN DomicilioOrden DO	ON DO.IdDomicilioOrden = P.IdDomicilioOrden
		INNER JOIN Deposito D			ON D.IdDeposito = P.IdDepositoSalida
		INNER JOIN ClienteOrden CO		ON CO.IdClienteOrden= P.IdClienteOrden
        WHERE P.IdPedido = @IdPedido;
    END;

    /*--------------------------------------------------
     1b. Detectar cambios de ajustes para Bitácora
    --------------------------------------------------*/
    DECLARE
        @NewIdTipoPedido      INT,
        @NewIdDepositoSalida  INT,
        @NewIdDepositoLlegada INT,
        @NewIdDomicilioOrden2 INT,
        @NewIdCategoriaPedido INT,
        @NewInicioHorario1    INT,
        @NewFinHorario1       INT;

    SELECT
        @NewIdTipoPedido      = IdTipoPedido,
        @NewIdDepositoSalida  = IdDepositoSalida,
        @NewIdDepositoLlegada = IdDepositoLlegada,
        @NewIdDomicilioOrden2 = IdDomicilioOrden2,
        @NewIdCategoriaPedido = IdCategoriaPedido,
        @NewInicioHorario1    = InicioHorario1,
        @NewFinHorario1       = FinHorario1
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    DECLARE @BitacoraAjustes VARCHAR(1000) = '';

    IF ISNULL(@OldIdTipoPedido, 0)      <> ISNULL(@NewIdTipoPedido, 0)
        SET @BitacoraAjustes += 'TipoPedido '      + ISNULL(CONVERT(VARCHAR,@OldIdTipoPedido),'∅')      + '→' + CONVERT(VARCHAR,@NewIdTipoPedido)      + ' | ';
    IF ISNULL(@OldIdDepositoSalida, 0)  <> ISNULL(@NewIdDepositoSalida, 0)
        SET @BitacoraAjustes += 'DepositoSalida '  + ISNULL(CONVERT(VARCHAR,@OldIdDepositoSalida),'∅')  + '→' + CONVERT(VARCHAR,@NewIdDepositoSalida)  + ' | ';
    IF ISNULL(@OldIdDepositoLlegada, 0) <> ISNULL(@NewIdDepositoLlegada, 0)
        SET @BitacoraAjustes += 'DepositoLlegada ' + ISNULL(CONVERT(VARCHAR,@OldIdDepositoLlegada),'∅') + '→' + CONVERT(VARCHAR,@NewIdDepositoLlegada) + ' | ';
    IF ISNULL(@OldIdDomicilioOrden2, 0) <> ISNULL(@NewIdDomicilioOrden2, 0)
        SET @BitacoraAjustes += 'DomicilioOrden2 ' + ISNULL(CONVERT(VARCHAR,@OldIdDomicilioOrden2),'∅') + '→' + CONVERT(VARCHAR,@NewIdDomicilioOrden2) + ' | ';
    IF ISNULL(@OldIdCategoriaPedido, 0) <> ISNULL(@NewIdCategoriaPedido, 0)
        SET @BitacoraAjustes += 'CategoriaPedido ' + ISNULL(CONVERT(VARCHAR,@OldIdCategoriaPedido),'∅') + '→' + CONVERT(VARCHAR,@NewIdCategoriaPedido) + ' | ';
    IF ISNULL(@OldInicioHorario1, 0)    <> ISNULL(@NewInicioHorario1, 0)
        SET @BitacoraAjustes += 'InicioHorario1 '  + ISNULL(CONVERT(VARCHAR,@OldInicioHorario1),'∅')    + '→' + CONVERT(VARCHAR,@NewInicioHorario1)    + ' | ';
    IF ISNULL(@OldFinHorario1, 0)       <> ISNULL(@NewFinHorario1, 0)
        SET @BitacoraAjustes += 'FinHorario1 '     + ISNULL(CONVERT(VARCHAR,@OldFinHorario1),'∅')       + '→' + CONVERT(VARCHAR,@NewFinHorario1)        + ' | ';

    /*--------------------------------------------------
     2. Asegurar registro en Pedido_Dyn
    --------------------------------------------------*/
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM Pedido_Dyn WHERE IdPedido = @IdPedido)
        BEGIN
            INSERT INTO Pedido_Dyn (IdPedido) VALUES (@IdPedido)
        END
    END;

    /*--------------------------------------------------
     3. Leer Pedido una sola vez
    --------------------------------------------------*/
    BEGIN
        DECLARE
            @IdCliente          INT,
            @FechaEntrega       DATETIME,
            @FechaRecoleccion   DATETIME,
            @IdOperacion        INT,
            @ReferenciaAdicional VARCHAR(50),
            @Bultos             INT,
            @IdCategoriaPedido2 INT,
            @InicioHorario1     INT,
            @FinHorario1        INT,
            @Direccion          VARCHAR(500),
            @CodigoPostal       VARCHAR(20);

        SELECT
            @IdCliente           = IdCliente,
            @FechaEntrega        = FechaEntrega,
            @FechaRecoleccion    = FechaRecoleccion,
            @IdOperacion         = IdOperacion,
            @ReferenciaAdicional = ReferenciaAdicional,
            @Bultos              = Bultos,
            @IdCategoriaPedido2  = IdCategoriaPedido,
            @InicioHorario1      = InicioHorario1,
            @FinHorario1         = FinHorario1,
            @Direccion           = Direccion,
            @CodigoPostal        = CodigoPostal
        FROM Pedido
        WHERE IdPedido = @IdPedido;
    END;

    /*--------------------------------------------------
     4. Validaciones
    --------------------------------------------------*/
    DECLARE @MensajeValidacion VARCHAR(3000) = '';
    BEGIN
        IF @IdCliente IS NULL OR @IdCliente = 1
            SET @MensajeValidacion += '-|- Cliente Dador de Carga NO EXISTE en maestro ';
        IF (@FechaEntrega IS NOT NULL AND @FechaEntrega < DATEADD(DAY,-1,GETUTCDATE())) OR 
           (@FechaRecoleccion IS NOT NULL AND @FechaRecoleccion < DATEADD(DAY,-1,GETUTCDATE()))
            SET @MensajeValidacion += '-|- Fecha de Entrega o Recoleccion antigua ';
        IF @IdOperacion IS NULL OR @IdOperacion = 1
            SET @MensajeValidacion += '-|- Debe Asignar Operacion al Pedido ';
        IF @ReferenciaAdicional IS NULL OR @ReferenciaAdicional = ''
            SET @MensajeValidacion += '-|- No hay Número de Referencia Adicional de Pedido ';
        IF @Bultos IS NULL OR @Bultos = 0
            SET @MensajeValidacion += '-|- No tiene Bultos registrados ';
        IF NOT EXISTS (SELECT 1 FROM PedidoItem WHERE IdPedido = @IdPedido)
            SET @MensajeValidacion += '-|- Pedido no contiene items ';
        IF @IdCategoriaPedido2 IS NULL
            SET @MensajeValidacion += '-|- Pedido sin Categoría ';
        IF (@InicioHorario1 IS NULL OR @InicioHorario1 = 0) OR (@FinHorario1 IS NULL OR @FinHorario1 = 0)
            SET @MensajeValidacion += '-|- Pedido y/o domicilio sin Horarios ';
        IF @Direccion IS NULL OR LTRIM(RTRIM(@Direccion)) = ''
            SET @MensajeValidacion += '-|- Pedido y/o domicilio sin Dirección Valida ';
        IF @CodigoPostal IS NULL OR @CodigoPostal = '0'
            SET @MensajeValidacion += '-|- Pedido y/o domicilio sin codigo Postal Valido ';
    END;

    /*--------------------------------------------------
     5. Preparar mensaje final
    --------------------------------------------------*/
    BEGIN
        SET @MensajeValidacion =
            CASE
                WHEN @MensajeValidacion = '' THEN 'Validaciones OK'
                ELSE LEFT(@MensajeValidacion,300)
            END;

        UPDATE Pedido_Dyn
        SET MensajeValidacion = @MensajeValidacion
        WHERE IdPedido = @IdPedido;
    END;

    /*--------------------------------------------------
     6. Cambio de estado (GRABADO)
    --------------------------------------------------*/
    BEGIN
        IF @MensajeValidacion = 'Validaciones OK' AND @IdEstadoPedido NOT IN ( 2, 108)
        BEGIN
            INSERT INTO CambioEstadoSolicitud
            (Entidad, IdEntidad, IdEstadoDestino, ValidarTransicion, MismoEstado, FechaCreacion, FechaEjecucion, Observacion, Estado, Intento, IdProceso)
            VALUES
            ('Pedido', @IdPedido, 4, 0, 0, GETUTCDATE(), GETUTCDATE(), 'Validaciones OK', 'PENDIENTE', 0, NULL);
        END
        ELSE
		IF @MensajeValidacion <> 'Validaciones OK' AND @IdEstadoPedido NOT IN ( 2, 108)
        BEGIN
            INSERT INTO CambioEstadoSolicitud
            (Entidad, IdEntidad, IdEstadoDestino, ValidarTransicion, MismoEstado, FechaCreacion, FechaEjecucion, Observacion, Estado, Intento, IdProceso)
            VALUES
            ('Pedido', @IdPedido, 3, 0, 0, GETUTCDATE(), GETUTCDATE(), 'Validaciones NO OK', 'PENDIENTE', 0, NULL);
        END
    END;

    /*--------------------------------------------------
     7. Bitácora
    --------------------------------------------------*/
    BEGIN
        DECLARE @BitacoraFinal VARCHAR(4000) = 'CrearPedidoCero: ';

        IF @BitacoraAjustes <> ''
            SET @BitacoraFinal += 'Ajustes[' + LEFT(@BitacoraAjustes, LEN(@BitacoraAjustes) - 3) + '] | ';

        SET @BitacoraFinal += @MensajeValidacion;

        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (@IdPedido, @BitacoraFinal, GETUTCDATE(), 'SYSTEM');
    END;

END
