USE [UNIGIS_DataRepository_EUROPASTRY] -- O base de datos de TSP
GO

/****** Object:  StoredProcedure [dbo].[Z_SP_Integracion_Portic_TSP] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           13/05/2026
-- DESCRIPCIÓN:     Procesador de Mensajería XML IFTMINE03 de PORTIC.
--                  Realiza el JOIN por 'WorkOrder' contra la base base de Maersk
--                  y actualiza el Nº de Contenedor y su Ubicación en Terminal (Alojamineto).
-- =============================================================================
CREATE OR ALTER PROCEDURE [dbo].[Z_SP_Integracion_Portic_TSP]
    @XmlData XML
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- ── 1. TABLA TEMPORAL PARA EXTRAER LOS DATOS PLANOS DEL XML ──────────────
        DECLARE @ParsedData TABLE (
            WorkOrder         VARCHAR(50),
            NroContenedor     VARCHAR(50),
            TipoContenedor    VARCHAR(20),
            UbicacionTerminal VARCHAR(100),
            FechaMensaje      DATETIME
        );

        -- ── 2. EXTRACCIÓN CON XPATH Y NODES() ────────────────────────────────────
        -- Extraemos el WorkOrder (Clave JOIN) del Group 3 que tenga Calificador 'WO'
        DECLARE @WorkOrder VARCHAR(50);
        SELECT TOP 1 @WorkOrder = N.value('(trsd_reference/c506_reference/e1154_reference.identifier)[1]', 'VARCHAR(50)')
        FROM @XmlData.nodes('/IFTMINE03/IFTMINE03.GROUP3') AS T(N)
        WHERE N.value('(trsd_reference/c506_reference/e1153_reference.code.qualifier)[1]', 'VARCHAR(10)') = 'WO';

        -- Extraemos el Número de Contenedor del Group 37 (Equipamiento)
        DECLARE @NroContenedor VARCHAR(50), @TipoContenedor VARCHAR(20);
        SELECT TOP 1 
            @NroContenedor  = N.value('(trsd_equipment.details/c237_equipment.identification/e8260_equipment.identifier)[1]', 'VARCHAR(50)'),
            @TipoContenedor = N.value('(trsd_equipment.details/c224_equipment.size.and.type/e8155_equipment.size.and.type.description.code)[1]', 'VARCHAR(20)')
        FROM @XmlData.nodes('/IFTMINE03/IFTMINE03.GROUP37') AS T(N);

        -- Extraemos la Ubicación (Alojamiento) del Group 11 que tenga Calificador '11' (Discharge)
        DECLARE @UbicacionTerminal VARCHAR(100);
        SELECT TOP 1 @UbicacionTerminal = N.value('(trsd_place.location.identification/c517_location.identification/e3225_location.identifier)[1]', 'VARCHAR(100)')
        FROM @XmlData.nodes('/IFTMINE03/IFTMINE03.GROUP11') AS T(N)
        WHERE N.value('(trsd_place.location.identification/e3227_location.function.code.qualifier)[1]', 'VARCHAR(10)') = '11';

        -- Extraemos la Fecha de Generación de la Cabecera
        DECLARE @FechaStr VARCHAR(20), @FechaMensaje DATETIME;
        SELECT TOP 1 @FechaStr = N.value('(trcd_date.time.period/c507_date.time.period/e2380_date.time.period)[1]', 'VARCHAR(20)')
        FROM @XmlData.nodes('/IFTMINE03/IFTMINE03.HEADER') AS T(N);
        
        -- Formatear fecha YYYYMMDDHHMM a DATETIME
        IF LEN(@FechaStr) >= 12
            SET @FechaMensaje = CAST(SUBSTRING(@FechaStr,1,4)+'-'+SUBSTRING(@FechaStr,5,2)+'-'+SUBSTRING(@FechaStr,7,2)+' '+SUBSTRING(@FechaStr,9,2)+':'+SUBSTRING(@FechaStr,11,2) AS DATETIME);

        -- Insertar en tabla de trabajo temporal
        INSERT INTO @ParsedData (WorkOrder, NroContenedor, TipoContenedor, UbicacionTerminal, FechaMensaje)
        VALUES (@WorkOrder, @NroContenedor, @TipoContenedor, @UbicacionTerminal, ISNULL(@FechaMensaje, GETDATE()));

        -- Validar que vino el JOIN Key
        IF @WorkOrder IS NULL
        BEGIN
            RAISERROR('El XML no contiene una referencia de WorkOrder (Calificador WO) válida.', 16, 1);
            RETURN;
        END

        -- ── 3. SIMULACIÓN DE IMPACTO / UPDATE CONTRA BASE DE MAERSK / TSP ───────
        -- NOTA: Se asume la existencia de la tabla operativa de TSP (ej: ContenedorMaersk o ViajeContenedor)
        BEGIN TRANSACTION;

        -- Hacemos el JOIN por WorkOrder y actualizamos los datos enriquecidos por Portic
        UPDATE C
        SET 
            C.NumeroContenedor  = P.NroContenedor,
            C.AlojamientoPuerto = P.UbicacionTerminal,
            C.TipoContenedorISO = P.TipoContenedor,
            C.FechaUltimaActualizacionPortic = P.FechaMensaje,
            C.EstadoLogistico   = 'EN_PUERTO_CONFIRMADO'
        FROM dbo.ContenedorMaersk C -- << Tabla Base del Cliente TSP
        INNER JOIN @ParsedData P ON C.WorkOrder = P.WorkOrder; -- << JOIN CLAVE

        -- Log de Auditoría de Integración
        INSERT INTO LogIntegracionPortic (WorkOrder, XMLRecibido, Estado, FechaProcesado)
        VALUES (@WorkOrder, CAST(@XmlData AS NVARCHAR(MAX)), 'PROCESADO_OK', GETDATE());

        COMMIT TRANSACTION;
        
        SELECT 'OK' AS Resultado, 'Contenedor ' + @NroContenedor + ' vinculado a WorkOrder ' + @WorkOrder + ' exitosamente.' AS Mensaje;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        
        INSERT INTO LogIntegracionPortic (WorkOrder, XMLRecibido, Estado, FechaProcesado, ErrorLog)
        VALUES (ISNULL(@WorkOrder, 'DESCONOCIDO'), CAST(@XmlData AS NVARCHAR(MAX)), 'ERROR', GETDATE(), @ErrorMsg);
        
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH
END
GO
