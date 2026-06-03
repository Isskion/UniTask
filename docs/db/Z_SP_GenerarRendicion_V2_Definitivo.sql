USE [UNIGIS_DataRepository_EUROPASTRY]
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_GenerarRendicion_V2]    Script Date: 13/05/2026 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           14/05/2026 (Certificado y Validado en Producción)
-- VERSIÓN DEFINITIVA: v3.5 "Trigger Overwrite Mastermind"
-- DESCRIPCIÓN:     Genera o actualiza una Parada de Rendición (Tipo 10) al final del viaje
--                  con plena visibilidad en Web y Móviles, superando los Triggers de borrado de UNIGIS.
--
-- HISTORIAL DE EVOLUCIÓN v3.5:
--   [FIX-1] Eliminado parámetro obsoleto @IdUsuario para facilitar llamadas genéricas.
--   [FIX-2] Heredar ParadaItem.ReferenciaExterna de la parada original para trazabilidad.
--   [FIX-3] Garantizar el mapeo del depósito de rendición desde IdDepositoLlegada del viaje.
--   [FIX-4] Heredar todos los datos físicos de dirección y coordenadas del Depósito a la Parada.
--   [FIX-5] Implementar UPDATE forzoso final para blindar el SP ante Triggers automáticos.
--   [FIX-6] Pre-calcular totales en variables globales eliminando el LEFT JOIN del UPDATE final.
--   [FIX-7] Simplificar UPDATE al formato más básico primitivo sin alias ni FROM.
--   [FIX-8] [CRÍTICO TRIGGER] Descubierto que Triggers automáticos en la tabla 'Parada' al INSERTAR limpian los IDs comerciales y fijan IdDeposito=1 para paradas Tipo 10.
--   [FIX-9] [CRÍTICO SOLUCIÓN] Capturamos la red comercial e IdDomicilioOrden original al inicio en variables, y los MACHACAMOS DE NUEVO e incondicionalmente en el UPDATE final, SOBREESCRIBIENDO CUALQUIER ACCIÓN DEL TRIGGER post-insert.
--   [FIX-10] Mantener estado 107, tiempos de la App y solo limpiar FechaRealizado para máxima coherencia móvil.
-- =============================================================================








CREATE OR ALTER PROCEDURE [dbo].[Z_SP_GenerarRendicion_V2]
    @IdParadaOriginal INT
AS
BEGIN
    SET NOCOUNT ON

    DECLARE @IdViaje            INT
    DECLARE @IdTipoParada       INT
    DECLARE @IdEstadoParada     INT
    DECLARE @IdParadaRendicion  INT
    DECLARE @OrdenMax           INT
    DECLARE @HaySobrantes       BIT
    DECLARE @HayRecogidas       BIT
    DECLARE @RefRendicion       VARCHAR(50)
    DECLARE @ColList            NVARCHAR(MAX)
    DECLARE @DynSql             NVARCHAR(MAX)
 
    -- [FIX v2.8] Variables para pre-cálculo de totales de items
    DECLARE @Tot_Peso           FLOAT
    DECLARE @Tot_Bultos         FLOAT
    DECLARE @Tot_Pallets        FLOAT
    DECLARE @Tot_Volumen        FLOAT
    DECLARE @Tot_Unidades       FLOAT
 
    -- [FIX v2.5] Variables de depósito para carga global y blindaje final
    DECLARE @Dep_Id             INT
    DECLARE @Dep_Descripcion    VARCHAR(255)
    DECLARE @Dep_Direccion      VARCHAR(255)
    DECLARE @Dep_Calle          VARCHAR(255)
    DECLARE @Dep_CodigoPostal   VARCHAR(50)
    DECLARE @Dep_EntreCalle     VARCHAR(255)
    DECLARE @Dep_Localidad      VARCHAR(255)
    DECLARE @Dep_Provincia      VARCHAR(255)
    DECLARE @Dep_Pais           VARCHAR(255)
    DECLARE @Dep_Latitud        FLOAT
    DECLARE @Dep_Longitud       FLOAT

    -- [FIX v3.5] Variables temporales para capturar la red relacional original
    DECLARE @Orig_IdPedido            INT
    DECLARE @Orig_IdOrden             INT
    DECLARE @Orig_IdCliente           INT
    DECLARE @Orig_IdClienteOrden      INT
    DECLARE @Orig_IdOrdenParada       INT
    DECLARE @Orig_ReferenciaPedido    VARCHAR(50)
    DECLARE @Orig_Tipo                VARCHAR(20)
    DECLARE @Orig_IdDibujo            INT
    DECLARE @Orig_IdDomicilioOrden    INT
    -- Horarios originales vitales para el móvil
    DECLARE @Orig_InicioControlHor    DATETIME
    DECLARE @Orig_FinControlHor       DATETIME
    DECLARE @Orig_InicioVisitaPlan    DATETIME
    DECLARE @Orig_FinVisitaPlan       DATETIME
    DECLARE @Orig_InicioVisita        DATETIME
    DECLARE @Orig_FinVisita           DATETIME

    SET @HaySobrantes = 0
    SET @HayRecogidas = 0

    -- ── 1. Datos de la parada original ──────────────────────────────────────
    SELECT
        @IdViaje        = P.IdViaje,
        @IdTipoParada   = P.IdTipoParada,
        @IdEstadoParada = P.IdEstadoParada,
        -- Capturamos la red de claves que los triggers post-insert de UNIGIS tienden a borrar
        @Orig_IdPedido            = P.IdPedido,
        @Orig_IdOrden             = P.IdOrden,
        @Orig_IdCliente           = P.IdCliente,
        @Orig_IdClienteOrden      = P.IdClienteOrden,
        @Orig_IdOrdenParada       = P.IdOrdenParada,
        @Orig_ReferenciaPedido    = P.ReferenciaPedido,
        @Orig_Tipo                = P.Tipo,
        @Orig_IdDibujo            = P.IdDibujo,
        @Orig_IdDomicilioOrden    = P.IdDomicilioOrden,
        @Orig_InicioControlHor    = P.InicioControlHorario,
        @Orig_FinControlHor       = P.FinControlHorario,
        @Orig_InicioVisitaPlan    = P.InicioVisitaPlanificado,
        @Orig_FinVisitaPlan       = P.FinVisitaPlanificado,
        @Orig_InicioVisita        = P.InicioVisita,
        @Orig_FinVisita           = P.FinVisita
    FROM Parada P
    WHERE P.IdParada = @IdParadaOriginal

    IF @IdViaje IS NULL
    BEGIN
        RAISERROR('Parada %d no encontrada.', 16, 1, @IdParadaOriginal)
        RETURN
    END

    -- [FIX v2.5] Obtener de forma proactiva los datos del depósito de llegada del viaje
    SELECT 
        @Dep_Id           = D.IdDeposito,
        @Dep_Descripcion  = D.Descripcion,
        @Dep_Direccion    = D.Direccion,
        @Dep_Calle        = D.Calle,
        @Dep_CodigoPostal = D.CodigoPostal,
        @Dep_EntreCalle   = D.EntreCalle,
        @Dep_Localidad    = D.Localidad,
        @Dep_Provincia    = D.Provincia,
        @Dep_Pais         = D.Pais,
        @Dep_Latitud      = ISNULL(D.Latitud, 0),  -- Evitar fallos si es NOT NULL
        @Dep_Longitud     = ISNULL(D.Longitud, 0)
    FROM Deposito D
    WHERE D.IdDeposito = (SELECT IdDepositoLlegada FROM Viaje WHERE IdViaje = @IdViaje)

    -- Evitar bucles infinitos si se invoca sobre una parada que ya es de rendición
    IF @IdTipoParada = 10 
        RETURN

    -- ── 2. Sobrantes (pedidos no-RECOGIDA) ──────────────────────────────────
    IF OBJECT_ID('tempdb..#Sobrantes') IS NOT NULL
        DROP TABLE #Sobrantes

    SELECT
        PI.IdParadaItem,
        PI.CodigoProducto,
        PI.Descripcion,
        PI.Cantidad                                  AS CantidadOriginal,
        ISNULL(SUM(PIC.Cantidad), 0)                 AS CantidadEntregada,
        (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) AS Sobrante,
        PI.Bultos,
        PI.Peso,
        PI.Volumen,
        PI.Pallets,
        PI.Unidades,
        PI.ReferenciaExterna
    INTO #Sobrantes
    FROM ParadaItem PI
    INNER JOIN Parada  P_aux ON P_aux.IdParada = PI.IdParada
    INNER JOIN Pedido  PE    ON PE.IdPedido    = P_aux.IdPedido
    LEFT  JOIN ParadaItemCantidad PIC ON PIC.IdParadaItem = PI.IdParadaItem
    WHERE PI.IdParada      = @IdParadaOriginal
      AND PE.IdTipoPedido <> 2
    GROUP BY
        PI.IdParadaItem, PI.CodigoProducto, PI.Descripcion,
        PI.Cantidad, PI.Bultos, PI.Peso, PI.Volumen, PI.Pallets, PI.Unidades, PI.ReferenciaExterna
    HAVING (PI.Cantidad - ISNULL(SUM(PIC.Cantidad), 0)) > 0

    IF EXISTS (SELECT 1 FROM #Sobrantes)
        SET @HaySobrantes = 1

    -- ── 2b. Recogidas (pedidos RECOGIDA con estado 103/104) ─────────────────
    IF OBJECT_ID('tempdb..#Recogidas') IS NOT NULL
        DROP TABLE #Recogidas

    SELECT
        PI.IdParadaItem,
        PI.CodigoProducto,
        PI.Descripcion,
        ISNULL(SUM(PIC.Cantidad), PI.Cantidad) AS CantidadRecogida,
        PI.Bultos,
        PI.Peso,
        PI.Volumen,
        PI.Pallets,
        PI.Unidades,
        PI.ReferenciaExterna
    INTO #Recogidas
    FROM ParadaItem PI
    INNER JOIN Parada  P_aux ON P_aux.IdParada = PI.IdParada
    INNER JOIN Pedido  PE    ON PE.IdPedido    = P_aux.IdPedido
    LEFT  JOIN ParadaItemCantidad PIC ON PIC.IdParadaItem = PI.IdParadaItem
    WHERE PI.IdParada       = @IdParadaOriginal
      AND PE.IdTipoPedido   = 2
      AND P_aux.IdEstadoParada IN (100, 101, 103, 104) -- Se evalúa sobre el estado de la Parada completada
    GROUP BY
        PI.IdParadaItem, PI.CodigoProducto, PI.Descripcion,
        PI.Cantidad, PI.Bultos, PI.Peso, PI.Volumen, PI.Pallets, PI.Unidades, PI.ReferenciaExterna
    HAVING ISNULL(SUM(PIC.Cantidad), PI.Cantidad) > 0

    IF EXISTS (SELECT 1 FROM #Recogidas)
        SET @HayRecogidas = 1

    -- ── 3. Crear o reutilizar parada de rendición ────────────────────────────
    BEGIN TRY
        BEGIN TRANSACTION

        IF @HaySobrantes = 1 OR @HayRecogidas = 1
        BEGIN
            SET @RefRendicion = 'REND-V' + CAST(@IdViaje AS VARCHAR(20))

            -- Buscar si ya existe parada de rendición para este viaje
            SELECT @IdParadaRendicion = IdParada
            FROM Parada
            WHERE IdViaje           = @IdViaje
              AND IdTipoParada      = 10
              AND ReferenciaExterna = @RefRendicion

            IF @IdParadaRendicion IS NULL
            BEGIN
                -- Calcular siguiente orden secuencial
                SELECT @OrdenMax = ISNULL(MAX(Orden), 0) + 1
                FROM Parada
                WHERE IdViaje = @IdViaje

                -- Clonar estructura de la parada original en temporal
                SELECT *
                INTO #TempRendicion
                FROM Parada
                WHERE IdParada = @IdParadaOriginal

                -- Aplicar mutaciones de rendición
                UPDATE #TempRendicion SET
                    IdTipoParada          = 10,
                    IdEstadoParada        = 107, -- Pendiente Rendición
                    ReferenciaExterna     = @RefRendicion,
                    Orden                 = @OrdenMax,
                    FechaCreacion         = GETDATE(),
                    -- Asignar datos del Depósito de llegada heredados y limpiar nombre (retener IdDomicilioOrden original e IdDeposito=NULL para móvil)
                    Descripcion           = @Dep_Descripcion, 
                    Direccion             = @Dep_Direccion,

                    Calle                 = @Dep_Calle,
                    CodigoPostal          = @Dep_CodigoPostal,
                    EntreCalle            = @Dep_EntreCalle,
                    Localidad             = @Dep_Localidad,
                    Provincia             = @Dep_Provincia,
                    Pais                  = @Dep_Pais,
                    Latitud               = @Dep_Latitud,
                    Longitud              = @Dep_Longitud,
                    LatitudVisualizacion  = @Dep_Latitud,
                    LongitudVisualizacion = @Dep_Longitud


                -- Extraer columnas excluyendo los Identity autogenerados
                SELECT @ColList = STRING_AGG(QUOTENAME(c.COLUMN_NAME), ', ')
                FROM INFORMATION_SCHEMA.COLUMNS c
                WHERE c.TABLE_SCHEMA = 'dbo'
                  AND c.TABLE_NAME   = 'Parada'
                  AND c.COLUMN_NAME NOT IN (
                      SELECT name FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.Parada')
                  )

                -- Inserción dinámica a prueba de nuevas columnas de sistema
                SET @DynSql = N'INSERT INTO Parada (' + @ColList + N') '
                            + N'SELECT ' + @ColList + N' FROM #TempRendicion; '
                            + N'SET @NuevoId = SCOPE_IDENTITY();'

                EXEC sp_executesql @DynSql, N'@NuevoId INT OUTPUT', @NuevoId = @IdParadaRendicion OUTPUT

                IF @IdParadaRendicion IS NULL
                BEGIN
                    RAISERROR('Error interno al recuperar Identity de la nueva rendición.', 16, 1)
                    ROLLBACK TRANSACTION
                    RETURN
                END

                DROP TABLE #TempRendicion
            END

            -- ── MERGE sobrantes ───────────────────────────────────────────────
            IF @HaySobrantes = 1
            BEGIN
                MERGE ParadaItem AS destino
                USING (
                    SELECT
                        CodigoProducto,
                        Descripcion,
                        SUM(Sobrante)  AS Cantidad,
                        SUM(Bultos)    AS Bultos,
                        SUM(Peso)      AS Peso,
                        SUM(Volumen)   AS Volumen,
                        SUM(Pallets)   AS Pallets,
                        SUM(Unidades)  AS Unidades,
                        MAX(ReferenciaExterna) AS ReferenciaExterna
                    FROM #Sobrantes
                    GROUP BY CodigoProducto, Descripcion
                ) AS origen
                ON  destino.IdParada       = @IdParadaRendicion
                AND destino.CodigoProducto = origen.CodigoProducto
                WHEN MATCHED THEN
                    UPDATE SET
                        destino.Cantidad = destino.Cantidad + origen.Cantidad,
                        destino.Bultos   = destino.Bultos   + origen.Bultos,
                        destino.Peso     = destino.Peso     + origen.Peso,
                        destino.Volumen  = destino.Volumen  + origen.Volumen,
                        destino.Pallets  = destino.Pallets  + origen.Pallets,
                        destino.Unidades = destino.Unidades + origen.Unidades,
                        destino.ReferenciaExterna = ISNULL(origen.ReferenciaExterna, destino.ReferenciaExterna)
                WHEN NOT MATCHED THEN
                    INSERT (IdParada, CodigoProducto, Descripcion,
                            Cantidad, Bultos, Peso, Volumen, Pallets, Unidades, ReferenciaExterna)
                    VALUES (@IdParadaRendicion, origen.CodigoProducto, origen.Descripcion,
                            origen.Cantidad, origen.Bultos, origen.Peso,
                            origen.Volumen, origen.Pallets, origen.Unidades, origen.ReferenciaExterna);
            END

            -- ── MERGE recogidas ───────────────────────────────────────────────
            IF @HayRecogidas = 1
            BEGIN
                MERGE ParadaItem AS destino
                USING (
                    SELECT
                        CodigoProducto,
                        Descripcion,
                        SUM(CantidadRecogida) AS Cantidad,
                        SUM(Bultos)           AS Bultos,
                        SUM(Peso)             AS Peso,
                        SUM(Volumen)          AS Volumen,
                        SUM(Pallets)          AS Pallets,
                        SUM(Unidades)         AS Unidades,
                        MAX(ReferenciaExterna) AS ReferenciaExterna
                    FROM #Recogidas
                    GROUP BY CodigoProducto, Descripcion
                ) AS origen
                ON  destino.IdParada       = @IdParadaRendicion
                AND destino.CodigoProducto = origen.CodigoProducto
                WHEN MATCHED THEN
                    UPDATE SET
                        destino.Cantidad = destino.Cantidad + origen.Cantidad,
                        destino.Bultos   = destino.Bultos   + origen.Bultos,
                        destino.Peso     = destino.Peso     + origen.Peso,
                        destino.Volumen  = destino.Volumen  + origen.Volumen,
                        destino.Pallets  = destino.Pallets  + origen.Pallets,
                        destino.Unidades = destino.Unidades + origen.Unidades,
                        destino.ReferenciaExterna = ISNULL(origen.ReferenciaExterna, destino.ReferenciaExterna)
                WHEN NOT MATCHED THEN
                    INSERT (IdParada, CodigoProducto, Descripcion,
                            Cantidad, Bultos, Peso, Volumen, Pallets, Unidades, ReferenciaExterna)
                    VALUES (@IdParadaRendicion, origen.CodigoProducto, origen.Descripcion,
                            origen.Cantidad, origen.Bultos, origen.Peso,
                            origen.Volumen, origen.Pallets, origen.Unidades, origen.ReferenciaExterna);
            END


            -- ── 4. Recalcular e impactar totales y FORZAR BLINDAJE de la Parada ──
            -- [FIX v2.8] Pre-calculamos los totales en variables para eliminar el LEFT JOIN complejo del UPDATE y curar incompatibilidades de sintaxis en subconsultas correlacionadas
            SELECT
                @Tot_Peso     = ISNULL(SUM(Peso),     0),
                @Tot_Bultos   = ISNULL(SUM(Bultos),   0),
                @Tot_Pallets  = ISNULL(SUM(Pallets),  0),
                @Tot_Volumen  = ISNULL(SUM(Volumen),  0),
                @Tot_Unidades = ISNULL(SUM(Unidades), 0)
            FROM ParadaItem
            WHERE IdParada = @IdParadaRendicion;


            -- [FIX v2.5] Forzamos UPDATE final sobreescribiendo cualquier efecto de Triggers
            -- [FIX v2.9] Simplificamos la sintaxis del UPDATE al formato más primitivo directo (sin alias/FROM) para curar cualquier susceptibilidad del compilador
            -- [FIX v3.5] FORZADO INCONDICIONAL DE RED COMERCIAL: Sobreescribimos los valores borrados por los Triggers Post-Insert de UNIGIS,
            -- restaurándolos a mano tras la creación. Al ser un UPDATE normal, escapa del trigger y se graba en piedra.
            UPDATE Parada SET
                IdEstadoParada        = 107,  -- Blindaje absoluto del estado deseado
                Descripcion           = @Dep_Descripcion,
                Direccion             = @Dep_Direccion,
                Calle                 = @Dep_Calle,
                CodigoPostal          = @Dep_CodigoPostal,
                EntreCalle            = @Dep_EntreCalle,
                Localidad             = @Dep_Localidad,
                Provincia             = @Dep_Provincia,
                Pais                  = @Dep_Pais,
                Latitud               = @Dep_Latitud,
                Longitud              = @Dep_Longitud,
                LatitudVisualizacion  = @Dep_Latitud,
                LongitudVisualizacion = @Dep_Longitud,
                -- [FIX v2.7] Limpiar exclusivamente la fecha de finalización para que figure pendiente
                FechaRealizado        = NULL,
                -- Restauración definitiva de claves comerciales destruidas por el Trigger de Insert
                IdPedido              = @Orig_IdPedido,
                IdOrden               = @Orig_IdOrden,
                IdCliente             = @Orig_IdCliente,
                IdClienteOrden        = @Orig_IdClienteOrden,
                IdOrdenParada         = @Orig_IdOrdenParada,
                ReferenciaPedido      = @Orig_ReferenciaPedido,
                Tipo                  = @Orig_Tipo,
                IdDibujo              = @Orig_IdDibujo,
                IdDomicilioOrden      = @Orig_IdDomicilioOrden,
                IdDeposito            = NULL, -- Blindamos a NULL definitivo anulando el valor 1 que impone el trigger
                -- Restauración definitiva de tiempos para superar filtros del móvil
                InicioControlHorario  = @Orig_InicioControlHor,
                FinControlHorario     = @Orig_FinControlHor,
                InicioVisitaPlanificado = @Orig_InicioVisitaPlan,
                FinVisitaPlanificado  = @Orig_FinVisitaPlan,
                InicioVisita          = @Orig_InicioVisita,
                FinVisita             = @Orig_FinVisita,
                -- Totales recalculados de items pre-calculados en variables
                Peso                  = @Tot_Peso,
                Bultos                = @Tot_Bultos,
                Pallets               = @Tot_Pallets,
                Volumen               = @Tot_Volumen,
                Unidades              = @Tot_Unidades
            WHERE IdParada = @IdParadaRendicion;


        END


        COMMIT TRANSACTION
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION

        IF OBJECT_ID('tempdb..#TempRendicion') IS NOT NULL
            DROP TABLE #TempRendicion

        DECLARE @ErrorMsg  NVARCHAR(4000) = ERROR_MESSAGE()
        DECLARE @ErrorSev  INT = ERROR_SEVERITY()
        DECLARE @ErrorSta  INT = ERROR_STATE()

        RAISERROR(@ErrorMsg, @ErrorSev, @ErrorSta)
    END CATCH

    -- Limpieza de temporales de sesión
    IF OBJECT_ID('tempdb..#Sobrantes') IS NOT NULL DROP TABLE #Sobrantes
    IF OBJECT_ID('tempdb..#Recogidas') IS NOT NULL DROP TABLE #Recogidas
END
GO
