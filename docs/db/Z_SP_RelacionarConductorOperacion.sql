USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Daniel del Amo
-- FECHA:           26/05/2026
-- DESCRIPCIÓN:     Relaciona un conductor con su operación correspondiente
--                  basado en el campo dinámico Conductor_Dyn.operacion.
--                  Soporta tanto ID numérico como códigos/descripciones de texto.
-- =============================================================================

CREATE OR ALTER PROCEDURE [dbo].[Z_SP_RelacionarConductorOperacion]
    @IdConductor INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    PRINT '═══ Z_SP_RelacionarConductorOperacion: INICIO ═══';

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Caso Conductor Único (Proceso inmediato tras creación/interfaz)
        IF @IdConductor IS NOT NULL
        BEGIN
            DECLARE @ValOperacion NVARCHAR(100) = NULL;
            DECLARE @IdOperacion INT = NULL;

            -- 1.1 Obtener el valor dinámico de operacion
            SELECT @ValOperacion = CD.operacion
            FROM dbo.Conductor_Dyn CD
            WHERE CD.IdConductor = @IdConductor;

            PRINT 'DEBUG: Valor leído en Conductor_Dyn.operacion para el Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' es: ' + ISNULL('"' + @ValOperacion + '"', 'NULL');

            IF @ValOperacion IS NULL OR LTRIM(RTRIM(@ValOperacion)) = ''
            BEGIN
                PRINT 'ADVERTENCIA: El conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' no tiene ningún valor de operación configurado en Conductor_Dyn.operacion.';
            END
            ELSE
            BEGIN
                -- 1.2 RESOLUCIÓN DEL ID DE OPERACIÓN
                -- Caso A: El valor es numérico (ej. "2") y coincide directamente con un IdOperacion
                IF TRY_CAST(@ValOperacion AS INT) IS NOT NULL
                BEGIN
                    DECLARE @IntOperacion INT = CAST(@ValOperacion AS INT);
                    IF EXISTS (SELECT 1 FROM dbo.Operacion WHERE IdOperacion = @IntOperacion)
                    BEGIN
                        SET @IdOperacion = @IntOperacion;
                        PRINT 'DEBUG: Se resolvió IdOperacion = ' + CAST(@IdOperacion AS VARCHAR(10)) + ' directamente por ID numérico.';
                    END
                END
                
                -- Caso B: Si es texto (ej. "BCN") o no coincidió numéricamente, buscar en maestro de Operacion
                IF @IdOperacion IS NULL
                BEGIN
                    SELECT TOP 1 @IdOperacion = IdOperacion
                    FROM dbo.Operacion
                    WHERE ReferenciaExterna = @ValOperacion
                       OR Descripcion = @ValOperacion;
                    
                    IF @IdOperacion IS NOT NULL
                        PRINT 'DEBUG: Se resolvió IdOperacion = ' + CAST(@IdOperacion AS VARCHAR(10)) + ' buscando coincidencia de código/descripción en dbo.Operacion.';
                END

                -- 1.3 Evaluar resolución e insertar
                IF @IdOperacion IS NULL
                BEGIN
                    PRINT 'ERROR: No se encontró ninguna operación en la tabla "Operacion" que coincida con el valor "' + @ValOperacion + '".';
                END
                ELSE
                BEGIN
                    -- Verificar si ya existe la relación en la tabla puente
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM dbo.OperacionConductor 
                        WHERE IdConductor = @IdConductor 
                          AND IdOperacion = @IdOperacion
                    )
                    BEGIN
                        -- Insertar relación
                        INSERT INTO dbo.OperacionConductor (IdConductor, IdOperacion)
                        VALUES (@IdConductor, @IdOperacion);

                        PRINT 'ÉXITO: Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' vinculado exitosamente a la Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + '.';
                    END
                    ELSE
                    BEGIN
                        PRINT 'INFO: La relación ya existe en OperacionConductor para Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' y Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + '.';
                    END
                END
            END
        END
        -- 2. Caso Procesamiento en Lote (Mantenimiento / Bulk)
        ELSE
        BEGIN
            INSERT INTO dbo.OperacionConductor (IdConductor, IdOperacion)
            SELECT DISTINCT C.IdConductor, O.IdOperacion
            FROM dbo.Conductor C
            INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
            INNER JOIN dbo.Operacion O ON (
                -- Coincidencia por ID numérico
                (TRY_CAST(CD.operacion AS INT) IS NOT NULL 
                 AND O.IdOperacion = CAST(CD.operacion AS INT))
                OR
                -- Coincidencia por código de texto
                (TRY_CAST(CD.operacion AS INT) IS NULL 
                 AND (O.ReferenciaExterna = CD.operacion OR O.Descripcion = CD.operacion))
            )
            WHERE CD.operacion IS NOT NULL
              AND LTRIM(RTRIM(CD.operacion)) <> ''
              -- Evitar duplicados
              AND NOT EXISTS (
                  SELECT 1 
                  FROM dbo.OperacionConductor OC 
                  WHERE OC.IdConductor = C.IdConductor 
                    AND OC.IdOperacion = O.IdOperacion
              );

            PRINT 'Procesamiento en lote finalizado. Relaciones creadas: ' + CAST(@@ROWCOUNT AS VARCHAR(10));
        END

        COMMIT TRANSACTION;
        PRINT '═══ Z_SP_RelacionarConductorOperacion: ✓ FIN ═══';

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @Severity INT = ERROR_SEVERITY();
        DECLARE @State INT = ERROR_STATE();
        PRINT 'Z_SP_RelacionarConductorOperacion: ✗ ERROR - ' + @Err;
        RAISERROR(@Err, @Severity, @State);
    END CATCH;
END
GO
