USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_GenerarParadasIntermedias] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           15/05/2026
-- VERSIÓN:         v1.0
-- DESCRIPCIÓN:     Genera las Paradas intermedias obligatorias en el Viaje activo
--                  de un Pedido, basándose en la configuración de Z_RutaInterDepositoConfig.
--
-- PATRÓN:          Reutiliza la técnica probada de Z_SP_GenerarRendicion_V2 (v3.5):
--                  - Clonación de Parada vía SELECT INTO #Temp → mutaciones → INSERT dinámico
--                  - UPDATE blindaje post-INSERT para sobreescribir efectos de Triggers UNIGIS
--                  - ReferenciaExterna con prefijo para idempotencia
--
-- ASUNCIONES:
--   - El Pedido ya tiene un Viaje activo asociado (se busca por IdPedido en Parada→IdViaje)
--   - IdTipoParada = 11 para paradas intermedias (TRANSFERENCIA). Si no existe en el catálogo,
--     usar el tipo más apropiado disponible (configurable vía @IdTipoParadaIntermedia).
--   - Las paradas intermedias se insertan ANTES de la última parada del viaje (destino final).
--   - Para CROSS-DOCK: se clonan los ParadaItems del pedido original.
--   - Para TRANSITO: no se generan ParadaItems (solo parada de paso).
--
-- LLAMADO DESDE:   Z_SP_ProcesarRuteoIntermedio (orquestador)
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_GenerarParadasIntermedias]
    @IdPedido INT
AS
BEGIN
    SET NOCOUNT ON;

    -- ══════════════════════════════════════════════════════════════════════════
    -- VARIABLES PRINCIPALES
    -- ══════════════════════════════════════════════════════════════════════════
    DECLARE @IdViaje                INT,
            @IdParadaOriginal       INT,
            @IdDepSalida            INT,
            @IdDepLlegada           INT,
            @OrdenActual            INT,
            @OrdenMaxExistente      INT,
            @IdNuevaParada          INT,
            @RefIntermedia          VARCHAR(50),
            @ColList                NVARCHAR(MAX),
            @DynSql                 NVARCHAR(MAX);

    -- Configuración del tipo de parada para intermedias
    -- NOTA: Ajustar según catálogo de TipoParada del cliente.
    -- Valores comunes: 1=Entrega, 2=Recogida, 10=Rendición, 11=Transferencia
    DECLARE @IdTipoParadaIntermedia INT = 11;
    DECLARE @IdEstadoParadaInicial  INT = 107; -- Pendiente (coherente con patrón existente)

    -- Variables de captura de la parada original (para clonación y blindaje)
    DECLARE @Orig_IdOrden          INT,
            @Orig_IdCliente        INT,
            @Orig_IdClienteOrden   INT,
            @Orig_IdOrdenParada    INT,
            @Orig_ReferenciaPedido VARCHAR(50),
            @Orig_Tipo             VARCHAR(20),
            @Orig_IdDibujo         INT,
            @Orig_IdDomicilioOrden INT,
            @Orig_InicioControlHor DATETIME,
            @Orig_FinControlHor    DATETIME;

    -- ══════════════════════════════════════════════════════════════════════════
    -- 1. LOCALIZAR VIAJE ACTIVO Y PARADA ORIGINAL DEL PEDIDO
    -- ══════════════════════════════════════════════════════════════════════════
    SELECT TOP 1
        @IdViaje          = P.IdViaje,
        @IdParadaOriginal = P.IdParada,
        -- Capturar red relacional para blindaje anti-trigger
        @Orig_IdOrden          = P.IdOrden,
        @Orig_IdCliente        = P.IdCliente,
        @Orig_IdClienteOrden   = P.IdClienteOrden,
        @Orig_IdOrdenParada    = P.IdOrdenParada,
        @Orig_ReferenciaPedido = P.ReferenciaPedido,
        @Orig_Tipo             = P.Tipo,
        @Orig_IdDibujo         = P.IdDibujo,
        @Orig_IdDomicilioOrden = P.IdDomicilioOrden,
        @Orig_InicioControlHor = P.InicioControlHorario,
        @Orig_FinControlHor    = P.FinControlHorario
    FROM Parada P
    INNER JOIN Viaje V ON V.IdViaje = P.IdViaje
    WHERE P.IdPedido = @IdPedido
      AND P.IdTipoParada NOT IN (10, @IdTipoParadaIntermedia)  -- Excluir rendiciones y paradas intermedias existentes
      AND V.IdEstadoViaje NOT IN (108)  -- Excluir viajes cancelados
    ORDER BY P.IdParada DESC;  -- Tomar la más reciente

    IF @IdViaje IS NULL
    BEGIN
        PRINT 'GenerarIntermedias: Pedido ' + CAST(@IdPedido AS VARCHAR(20)) + ' no tiene Viaje activo asociado. Abortando.';
        RETURN;
    END

    -- Obtener depósitos del Pedido
    SELECT @IdDepSalida = IdDepositoSalida,
           @IdDepLlegada = IdDepositoLlegada
    FROM Pedido
    WHERE IdPedido = @IdPedido;

    PRINT 'GenerarIntermedias: Pedido=' + CAST(@IdPedido AS VARCHAR(10)) 
        + ' | Viaje=' + CAST(@IdViaje AS VARCHAR(10))
        + ' | ParadaBase=' + CAST(@IdParadaOriginal AS VARCHAR(10));

    -- ══════════════════════════════════════════════════════════════════════════
    -- 2. CARGAR SECUENCIA DE DEPÓSITOS INTERMEDIOS EN TABLA TEMPORAL
    -- ══════════════════════════════════════════════════════════════════════════
    IF OBJECT_ID('tempdb..#Intermedios') IS NOT NULL
        DROP TABLE #Intermedios;

    SELECT 
        ROW_NUMBER() OVER (ORDER BY C.Orden ASC) AS SecuenciaLocal,
        C.IdDepositoIntermedio,
        C.Orden                AS OrdenConfig,
        C.TipoTransferencia,
        D.Descripcion          AS NombreDeposito,
        D.Direccion            AS DireccionDeposito,
        D.Calle                AS CalleDeposito,
        D.CodigoPostal         AS CodigoPostalDeposito,
        D.EntreCalle           AS EntreCalleDeposito,
        D.Localidad            AS LocalidadDeposito,
        D.Provincia            AS ProvinciaDeposito,
        D.Pais                 AS PaisDeposito,
        ISNULL(D.Latitud, 0)   AS LatitudDeposito,
        ISNULL(D.Longitud, 0)  AS LongitudDeposito
    INTO #Intermedios
    FROM Z_RutaInterDepositoConfig C
    INNER JOIN Deposito D ON D.IdDeposito = C.IdDepositoIntermedio
    WHERE C.IdDepositoOrigen  = @IdDepSalida
      AND C.IdDepositoDestino = @IdDepLlegada
      AND C.Activo = 1
    ORDER BY C.Orden ASC;

    DECLARE @TotalIntermedios INT = (SELECT COUNT(*) FROM #Intermedios);

    IF @TotalIntermedios = 0
    BEGIN
        PRINT 'GenerarIntermedias: No hay intermedios configurados para Origen=' + CAST(@IdDepSalida AS VARCHAR(10)) 
            + ' → Destino=' + CAST(@IdDepLlegada AS VARCHAR(10)) + '. Nada que hacer.';
        RETURN;
    END

    PRINT 'GenerarIntermedias: ' + CAST(@TotalIntermedios AS VARCHAR(5)) + ' depósitos intermedios a generar.';

    -- ══════════════════════════════════════════════════════════════════════════
    -- 3. GENERAR PARADAS INTERMEDIAS (BUCLE)
    -- ══════════════════════════════════════════════════════════════════════════
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Obtener el orden máximo actual del viaje para insertar antes del destino
        SELECT @OrdenMaxExistente = ISNULL(MAX(Orden), 0)
        FROM Parada
        WHERE IdViaje = @IdViaje;

        -- Reordenar: Desplazar las paradas existentes para dejar hueco
        -- Sumamos @TotalIntermedios a todas las paradas con Orden >= 2 (después de la primera salida)
        -- para crear espacio para las intermedias
        UPDATE Parada
        SET Orden = Orden + @TotalIntermedios
        WHERE IdViaje = @IdViaje
          AND Orden > 1  -- No mover la parada de salida (Orden=1)
          AND IdTipoParada NOT IN (@IdTipoParadaIntermedia) -- No mover intermedias ya existentes de ejecuciones previas
          AND ReferenciaExterna NOT LIKE 'INTER-V' + CAST(@IdViaje AS VARCHAR(20)) + '-%'; -- Idempotencia

        -- Recorrer cada depósito intermedio
        DECLARE @Idx INT = 1;

        WHILE @Idx <= @TotalIntermedios
        BEGIN
            DECLARE @DepIntermedioId   INT,
                    @DepNombre         VARCHAR(255),
                    @DepDireccion      VARCHAR(255),
                    @DepCalle          VARCHAR(255),
                    @DepCodigoPostal   VARCHAR(50),
                    @DepEntreCalle     VARCHAR(255),
                    @DepLocalidad      VARCHAR(255),
                    @DepProvincia      VARCHAR(255),
                    @DepPais           VARCHAR(255),
                    @DepLatitud        FLOAT,
                    @DepLongitud       FLOAT,
                    @DepTipoTransfer   VARCHAR(20);

            SELECT 
                @DepIntermedioId = IdDepositoIntermedio,
                @DepNombre       = NombreDeposito,
                @DepDireccion    = DireccionDeposito,
                @DepCalle        = CalleDeposito,
                @DepCodigoPostal = CodigoPostalDeposito,
                @DepEntreCalle   = EntreCalleDeposito,
                @DepLocalidad    = LocalidadDeposito,
                @DepProvincia    = ProvinciaDeposito,
                @DepPais         = PaisDeposito,
                @DepLatitud      = LatitudDeposito,
                @DepLongitud     = LongitudDeposito,
                @DepTipoTransfer = TipoTransferencia
            FROM #Intermedios
            WHERE SecuenciaLocal = @Idx;

            -- Referencia única para idempotencia
            SET @RefIntermedia = 'INTER-V' + CAST(@IdViaje AS VARCHAR(20)) + '-' + CAST(@Idx AS VARCHAR(5));

            -- ── IDEMPOTENCIA: Verificar si ya existe esta parada intermedia ──
            SELECT @IdNuevaParada = IdParada
            FROM Parada
            WHERE IdViaje           = @IdViaje
              AND ReferenciaExterna = @RefIntermedia;

            IF @IdNuevaParada IS NULL
            BEGIN
                -- ── CLONACIÓN (patrón probado de GenerarRendicion v3.5) ──
                -- Paso A: Clonar estructura completa de la parada original
                IF OBJECT_ID('tempdb..#TempIntermedia') IS NOT NULL
                    DROP TABLE #TempIntermedia;

                SELECT * INTO #TempIntermedia
                FROM Parada
                WHERE IdParada = @IdParadaOriginal;

                -- Paso B: Aplicar mutaciones de parada intermedia
                UPDATE #TempIntermedia SET
                    IdTipoParada          = @IdTipoParadaIntermedia,
                    IdEstadoParada        = @IdEstadoParadaInicial,
                    ReferenciaExterna     = @RefIntermedia,
                    Orden                 = 1 + @Idx,  -- Después de la salida (Orden=1), secuencial
                    FechaCreacion         = GETDATE(),
                    -- Datos del depósito intermedio
                    Descripcion           = @DepNombre + ' [INTERMEDIO ' + CAST(@Idx AS VARCHAR(3)) + '/' + CAST(@TotalIntermedios AS VARCHAR(3)) + ']',
                    Direccion             = @DepDireccion,
                    Calle                 = @DepCalle,
                    CodigoPostal          = @DepCodigoPostal,
                    EntreCalle            = @DepEntreCalle,
                    Localidad             = @DepLocalidad,
                    Provincia             = @DepProvincia,
                    Pais                  = @DepPais,
                    Latitud               = @DepLatitud,
                    Longitud              = @DepLongitud,
                    LatitudVisualizacion  = @DepLatitud,
                    LongitudVisualizacion = @DepLongitud,
                    -- Limpiar campos de ejecución
                    FechaRealizado        = NULL,
                    InicioVisita          = NULL,
                    FinVisita             = NULL;

                -- Paso C: INSERT dinámico (excluir columnas Identity)
                SET @ColList = NULL;

                SELECT @ColList = STRING_AGG(QUOTENAME(c.COLUMN_NAME), ', ')
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_SCHEMA = 'dbo'
                  AND c.TABLE_NAME   = 'Parada'
                  AND c.COLUMN_NAME NOT IN (
                      SELECT name FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.Parada')
                  );

                SET @DynSql = N'INSERT INTO Parada (' + @ColList + N') '
                            + N'SELECT ' + @ColList + N' FROM #TempIntermedia; '
                            + N'SET @NuevoId = SCOPE_IDENTITY();';

                SET @IdNuevaParada = NULL;
                EXEC sp_executesql @DynSql, N'@NuevoId INT OUTPUT', @NuevoId = @IdNuevaParada OUTPUT;

                IF @IdNuevaParada IS NULL
                BEGIN
                    RAISERROR('Error interno al recuperar Identity de parada intermedia %d.', 16, 1, @Idx);
                    ROLLBACK TRANSACTION;
                    RETURN;
                END

                DROP TABLE #TempIntermedia;

                PRINT 'GenerarIntermedias: Parada intermedia ' + CAST(@Idx AS VARCHAR(3)) 
                    + '/' + CAST(@TotalIntermedios AS VARCHAR(3))
                    + ' CREADA → IdParada=' + CAST(@IdNuevaParada AS VARCHAR(10))
                    + ' | Depósito=' + @DepNombre
                    + ' | Tipo=' + @DepTipoTransfer;
            END
            ELSE
            BEGIN
                PRINT 'GenerarIntermedias: Parada intermedia ' + CAST(@Idx AS VARCHAR(3)) 
                    + ' ya existe (IdParada=' + CAST(@IdNuevaParada AS VARCHAR(10)) + '). Reutilizando.';
            END

            -- ── BLINDAJE POST-INSERT (patrón anti-trigger de GenerarRendicion v3.5) ──
            -- Los Triggers de UNIGIS en tabla Parada limpian IdDeposito, claves comerciales, etc.
            -- Este UPDATE forzoso se ejecuta DESPUÉS del trigger y sobreescribe sus cambios.
            UPDATE Parada SET
                IdEstadoParada        = @IdEstadoParadaInicial,
                -- Restaurar datos del depósito (el trigger puede haberlos alterado)
                Descripcion           = @DepNombre + ' [INTERMEDIO ' + CAST(@Idx AS VARCHAR(3)) + '/' + CAST(@TotalIntermedios AS VARCHAR(3)) + ']',
                Direccion             = @DepDireccion,
                Calle                 = @DepCalle,
                CodigoPostal          = @DepCodigoPostal,
                EntreCalle            = @DepEntreCalle,
                Localidad             = @DepLocalidad,
                Provincia             = @DepProvincia,
                Pais                  = @DepPais,
                Latitud               = @DepLatitud,
                Longitud              = @DepLongitud,
                LatitudVisualizacion  = @DepLatitud,
                LongitudVisualizacion = @DepLongitud,
                -- Restaurar red comercial destruida por el Trigger
                IdPedido              = @IdPedido,
                IdOrden               = @Orig_IdOrden,
                IdCliente             = @Orig_IdCliente,
                IdClienteOrden        = @Orig_IdClienteOrden,
                IdOrdenParada         = @Orig_IdOrdenParada,
                ReferenciaPedido      = @Orig_ReferenciaPedido,
                Tipo                  = @Orig_Tipo,
                IdDibujo              = @Orig_IdDibujo,
                IdDomicilioOrden      = @Orig_IdDomicilioOrden,
                IdDeposito            = NULL,  -- Blindar a NULL (el trigger lo pone a 1)
                -- Tiempos de control
                InicioControlHorario  = @Orig_InicioControlHor,
                FinControlHorario     = @Orig_FinControlHor,
                -- Limpieza de ejecución
                FechaRealizado        = NULL
            WHERE IdParada = @IdNuevaParada;

            -- ── GENERAR ParadaItems SI ES CROSS-DOCK ──
            IF @DepTipoTransfer = 'CROSS-DOCK'
            BEGIN
                -- Solo insertar si aún no existen items para esta parada intermedia
                IF NOT EXISTS (SELECT 1 FROM ParadaItem WHERE IdParada = @IdNuevaParada)
                BEGIN
                    INSERT INTO ParadaItem (IdParada, CodigoProducto, Descripcion, 
                                            Cantidad, Bultos, Peso, Volumen, Pallets, Unidades, ReferenciaExterna)
                    SELECT 
                        @IdNuevaParada,
                        PI.CodigoProducto,
                        PI.Descripcion,
                        PI.Cantidad,
                        PI.Bultos,
                        PI.Peso,
                        PI.Volumen,
                        PI.Pallets,
                        PI.Unidades,
                        PI.ReferenciaExterna
                    FROM ParadaItem PI
                    WHERE PI.IdParada = @IdParadaOriginal;

                    PRINT 'GenerarIntermedias: ParadaItems clonados para CROSS-DOCK en parada ' + CAST(@IdNuevaParada AS VARCHAR(10));
                END
            END

            -- Siguiente depósito intermedio
            SET @Idx = @Idx + 1;
        END

        -- ══════════════════════════════════════════════════════════════════════
        -- 4. ACTUALIZAR TOTALES DE LA PARADA SI HAY ITEMS
        -- ══════════════════════════════════════════════════════════════════════
        -- Recalcular peso/bultos/volumen para cada parada intermedia que tenga items
        UPDATE P SET
            Peso     = ISNULL(Totales.SumPeso, 0),
            Bultos   = ISNULL(Totales.SumBultos, 0),
            Pallets  = ISNULL(Totales.SumPallets, 0),
            Volumen  = ISNULL(Totales.SumVolumen, 0),
            Unidades = ISNULL(Totales.SumUnidades, 0)
        FROM Parada P
        INNER JOIN (
            SELECT 
                PI.IdParada,
                SUM(PI.Peso)     AS SumPeso,
                SUM(PI.Bultos)   AS SumBultos,
                SUM(PI.Pallets)  AS SumPallets,
                SUM(PI.Volumen)  AS SumVolumen,
                SUM(PI.Unidades) AS SumUnidades
            FROM ParadaItem PI
            INNER JOIN Parada P2 ON P2.IdParada = PI.IdParada
            WHERE P2.IdViaje = @IdViaje
              AND P2.ReferenciaExterna LIKE 'INTER-V' + CAST(@IdViaje AS VARCHAR(20)) + '-%'
            GROUP BY PI.IdParada
        ) Totales ON P.IdParada = Totales.IdParada;

        -- ══════════════════════════════════════════════════════════════════════
        -- 5. BITÁCORA
        -- ══════════════════════════════════════════════════════════════════════
        INSERT INTO BitacoraPedido (IdPedido, Bitacora, Fecha, Login)
        VALUES (
            @IdPedido, 
            'GenerarIntermedias: ' + CAST(@TotalIntermedios AS VARCHAR(5)) + ' paradas intermedias generadas/actualizadas'
            + ' | Viaje=' + CAST(@IdViaje AS VARCHAR(10))
            + ' | Ruta: Dep' + CAST(@IdDepSalida AS VARCHAR(10)) + '→Dep' + CAST(@IdDepLlegada AS VARCHAR(10)),
            GETUTCDATE(), 
            'SYSTEM'
        );

        COMMIT TRANSACTION;

        PRINT 'GenerarIntermedias: ✓ Proceso completado exitosamente. ' + CAST(@TotalIntermedios AS VARCHAR(5)) + ' paradas intermedias.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        IF OBJECT_ID('tempdb..#TempIntermedia') IS NOT NULL
            DROP TABLE #TempIntermedia;

        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSev INT = ERROR_SEVERITY();
        DECLARE @ErrorSta INT = ERROR_STATE();

        PRINT 'GenerarIntermedias: ✗ ERROR - ' + @ErrorMsg;
        RAISERROR(@ErrorMsg, @ErrorSev, @ErrorSta);
    END CATCH;

    -- Limpieza de temporales
    IF OBJECT_ID('tempdb..#Intermedios') IS NOT NULL
        DROP TABLE #Intermedios;

END
GO
