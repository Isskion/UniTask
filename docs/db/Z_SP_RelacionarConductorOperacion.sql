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
--
-- LLAMADO DESDE:   Proceso post-creación de Conductor / Interfaz de Conductores
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

        -- 1. Caso Conductor Único (Proceso inmediato tras creación)
        IF @IdConductor IS NOT NULL
        BEGIN
            DECLARE @ValOperacion NVARCHAR(100) = NULL;
            DECLARE @IdOperacion INT = NULL;

            -- 1.1 Obtener el valor original del campo dinámico "operacion"
            SELECT @ValOperacion = CD.operacion
            FROM dbo.Conductor_Dyn CD
            WHERE CD.IdConductor = @IdConductor;

            PRINT 'INFO: Valor del campo Conductor_Dyn.operacion para Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' es: ' + ISNULL('"' + @ValOperacion + '"', 'NULL/VACÍO');

            IF @ValOperacion IS NULL OR LTRIM(RTRIM(@ValOperacion)) = ''
            BEGIN
                PRINT 'ADVERTENCIA: El conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' no tiene ningún valor configurado en operacion.';
            END
            ELSE
            BEGIN
                -- 1.2 Intentar resolver el IdOperacion
                -- Caso A: El valor es numérico y coincide con un IdOperacion existente
                IF TRY_CAST(@ValOperacion AS INT) IS NOT NULL
                BEGIN
                    DECLARE @IntOperacion INT = CAST(@ValOperacion AS INT);
                    IF EXISTS (SELECT 1 FROM dbo.Operacion WHERE IdOperacion = @IntOperacion)
                    BEGIN
                        SET @IdOperacion = @IntOperacion;
                        PRINT 'INFO: Resuelto IdOperacion ' + CAST(@IdOperacion AS VARCHAR(10)) + ' directamente por coincidencia numérica.';
                    END
                END
                
                -- Caso B: Si no se resolvió numéricamente, buscar coincidencia por ReferenciaExterna o Nombre
                IF @IdOperacion IS NULL
                BEGIN
                    SELECT TOP 1 @IdOperacion = IdOperacion
                    FROM dbo.Operacion
                    WHERE ReferenciaExterna = @ValOperacion
                       OR Nombre = @ValOperacion;
                    
                    IF @IdOperacion IS NOT NULL
                        PRINT 'INFO: Resuelto IdOperacion ' + CAST(@IdOperacion AS VARCHAR(10)) + ' por coincidencia de texto (ReferenciaExterna/Nombre).';
                END

                -- 1.3 Verificar resultado de la resolución
                IF @IdOperacion IS NULL
                BEGIN
                    PRINT 'ERROR: No se encontró ninguna operación en la tabla Operacion que coincida con el valor "' + @ValOperacion + '".';
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

                        PRINT 'ÉXITO: Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' vinculado a Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + ' (' + @ValOperacion + ').';
                    END
                    ELSE
                    BEGIN
                        PRINT 'INFO: La relación ya existe en OperacionConductor para Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' y Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + '.';
                    END
                END
            END
        END
        -- 2. Caso Procesamiento en Lote (Sincronización o mantenimiento)
        ELSE
        BEGIN
            -- Insertar relaciones válidas masivamente
            INSERT INTO dbo.OperacionConductor (IdConductor, IdOperacion)
            SELECT DISTINCT C.IdConductor, O.IdOperacion
            FROM dbo.Conductor C
            INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
            INNER JOIN dbo.Operacion O ON (
                -- Coincidencia numérica
                (TRY_CAST(CD.operacion AS INT) IS NOT NULL AND O.IdOperacion = CAST(CD.operacion AS INT))
                OR
                -- Coincidencia de texto (ReferenciaExterna o Nombre)
                (TRY_CAST(CD.operacion AS INT) IS NULL AND (O.ReferenciaExterna = CD.operacion OR O.Nombre = CD.operacion))
            )
            WHERE CD.operacion IS NOT NULL
              AND LTRIM(RTRIM(CD.operacion)) <> ''
              -- Evitar duplicar relaciones existentes
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
