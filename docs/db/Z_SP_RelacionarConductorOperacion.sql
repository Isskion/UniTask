USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Antigravity
-- FECHA:           26/05/2026
-- DESCRIPCIÓN:     Relaciona un conductor con su operación correspondiente
--                  basado en el campo dinámico Conductor_Dyn.operacion2.
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
            DECLARE @IdOperacion INT = NULL;

            -- Obtener el IdOperacion desde la tabla dinámica del conductor
            SELECT @IdOperacion = TRY_CAST(CD.operacion2 AS INT)
            FROM dbo.Conductor_Dyn CD
            WHERE CD.IdConductor = @IdConductor;

            IF @IdOperacion IS NULL
            BEGIN
                PRINT 'Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ': no tiene una operación válida configurada en operacion2.';
            END
            ELSE
            BEGIN
                -- Verificar si ya existe la relación para evitar duplicados
                IF NOT EXISTS (
                    SELECT 1 
                    FROM dbo.OperacionConductor 
                    WHERE IdConductor = @IdConductor 
                      AND IdOperacion = @IdOperacion
                )
                BEGIN
                    -- Se asume que IdOperacionConductor es IDENTITY
                    INSERT INTO dbo.OperacionConductor (IdConductor, IdOperacion)
                    VALUES (@IdConductor, @IdOperacion);

                    PRINT 'Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' vinculado exitosamente a Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + '.';
                END
                ELSE
                BEGIN
                    PRINT 'Conductor ' + CAST(@IdConductor AS VARCHAR(10)) + ' ya está vinculado a la Operación ' + CAST(@IdOperacion AS VARCHAR(10)) + '.';
                END
            END
        END
        -- 2. Caso Procesamiento en Lote (Sincronización o mantenimiento)
        ELSE
        BEGIN
            INSERT INTO dbo.OperacionConductor (IdConductor, IdOperacion)
            SELECT DISTINCT C.IdConductor, TRY_CAST(CD.operacion2 AS INT)
            FROM dbo.Conductor C
            INNER JOIN dbo.Conductor_Dyn CD ON C.IdConductor = CD.IdConductor
            WHERE CD.operacion2 IS NOT NULL
              AND TRY_CAST(CD.operacion2 AS INT) IS NOT NULL
              -- Evitar duplicar relaciones existentes
              AND NOT EXISTS (
                  SELECT 1 
                  FROM dbo.OperacionConductor OC 
                  WHERE OC.IdConductor = C.IdConductor 
                    AND OC.IdOperacion = TRY_CAST(CD.operacion2 AS INT)
              )
              -- Asegurar que la operación de destino existe
              AND EXISTS (
                  SELECT 1 
                  FROM dbo.Operacion O 
                  WHERE O.IdOperacion = TRY_CAST(CD.operacion2 AS INT)
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
