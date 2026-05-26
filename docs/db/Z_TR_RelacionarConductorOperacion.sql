USE [UNIGIS_DataRepository_EUROPASTRY]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================================================
-- AUTOR:           Daniel del Amo
-- FECHA:           26/05/2026
-- DESCRIPCIÓN:     Trigger en Conductor_Dyn para relacionar automáticamente
--                  al conductor con su operación cuando se inserta o actualiza
--                  su valor dinámico 'operacion'.
-- =============================================================================

CREATE OR ALTER TRIGGER [dbo].[Z_TR_RelacionarConductorOperacion_Dyn]
ON [dbo].[Conductor_Dyn]
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Solo ejecutar si el campo 'operacion' se ha actualizado o es un insert
    IF UPDATE(operacion)
    BEGIN
        DECLARE @IdConductor INT;

        -- Cursor local para procesar múltiples registros (soporte multi-fila de SQL Server)
        DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
            SELECT DISTINCT IdConductor
            FROM inserted
            WHERE operacion IS NOT NULL 
              AND LTRIM(RTRIM(operacion)) <> '';

        OPEN cur;
        FETCH NEXT FROM cur INTO @IdConductor;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Ejecutar el procedimiento para vincular el conductor a su operación
            EXEC dbo.Z_SP_RelacionarConductorOperacion @IdConductor = @IdConductor;

            FETCH NEXT FROM cur INTO @IdConductor;
        END;

        CLOSE cur;
        DEALLOCATE cur;
    END
END
GO
