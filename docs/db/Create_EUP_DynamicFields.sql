-- =============================================================================
-- SQL Script: Creación de Campos Dinámicos para EUP (UniSolutions)
-- Tablas: parada_dyn, ParadaItem_dyn
-- =============================================================================

-- NOTA: Se asume que las tablas parada_dyn e ParadaItem_dyn tienen una estructura de metadatos.
-- Si las tablas no existen, este script las creará con una estructura estándar.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'parada_dyn')
BEGIN
    CREATE TABLE parada_dyn (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Etiqueta NVARCHAR(100),
        TipoDato NVARCHAR(50) DEFAULT 'String',
        Activo BIT DEFAULT 1
    );
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ParadaItem_dyn')
BEGIN
    CREATE TABLE ParadaItem_dyn (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Nombre NVARCHAR(100) NOT NULL,
        Etiqueta NVARCHAR(100),
        TipoDato NVARCHAR(50) DEFAULT 'String',
        Activo BIT DEFAULT 1
    );
END

-- -----------------------------------------------------------------------------
-- INSERTS PARA parada_dyn (Campos a nivel de Parada/Pedido)
-- -----------------------------------------------------------------------------

-- Habilitar inserción de identidad si fuera necesario (aunque aquí dejamos que se generen)
-- SET IDENTITY_INSERT parada_dyn ON; 

INSERT INTO parada_dyn (Nombre, Etiqueta, TipoDato) VALUES 
('Z_Alicuota', 'Alícuota 1', 'Float'),
('Z_Alicuota2', 'Alícuota 2', 'Float'),
('Z_Alicuota3', 'Alícuota 3', 'Float'),
('Z_CodigoAutorizacionEntrega', 'Código Autorización Entrega', 'String'),
('Z_Entrega', 'Información Entrega', 'String'),
('Z_FormaPago2', 'Forma de Pago 2', 'String'),
('Z_FormaPago3', 'Forma de Pago 3', 'String'),
('Z_FormaPago4', 'Forma de Pago 4', 'String'),
('Z_FormaPagoPreferente', 'Forma de Pago Preferente', 'String'),
('Z_RSocial', 'Razón Social (Impresión)', 'String'),
('Z_RequiereCobroObligatorioParcial', 'Requiere Cobro Obligatorio Parcial', 'Boolean'),
('Z_RequiereCobroObligatorioTotal', 'Requiere Cobro Obligatorio Total', 'Boolean'),
('Z_TipoBonificacion', 'Tipo Bonificación', 'String'),
('Z_TipoImpuesto', 'Tipo Impuesto 1', 'String'),
('Z_TipoImpuesto2', 'Tipo Impuesto 2', 'String'),
('Z_TipoImpuesto3', 'Tipo Impuesto 3', 'String'),
('Z_TipoValorBonificacion', 'Tipo Valor Bonificación', 'String'),
('Z_TotalACobrar', 'Total a Cobrar', 'Float'),
('Z_ValorBonificacion', 'Valor Bonificación', 'Float'),
('Z_ValorImpuesto', 'Valor Impuesto 1', 'Float'),
('Z_ValorImpuesto2', 'Valor Impuesto 2', 'Float'),
('Z_ValorMinimoACobrar', 'Valor Mínimo a Cobrar', 'Float'),
('Z_ValorTotalACobrar', 'Valor Total a Cobrar (Final)', 'Float'),
-- CAMPOS PORTIC COPINO
('Z_COPINO_Numero', 'Nº Mensaje COPINO', 'String'),
('Z_FechaMensaje', 'Fecha del Mensaje', 'DateTime'),
('Z_Buque_IMO', 'IMO del Buque', 'String'),
('Z_Buque_Nombre', 'Nombre del Buque', 'String'),
('Z_ETA', 'Fecha Prevista Arribo (ETA)', 'DateTime'),
('Z_Booking', 'Booking / Reserva', 'String'),
('Z_Viaje', 'Número de Viaje', 'String'),
('Z_Transportista_Cod', 'Código Transportista', 'String'),
('Z_Transportista_Nom', 'Nombre Transportista', 'String');

-- SET IDENTITY_INSERT parada_dyn OFF;

-- -----------------------------------------------------------------------------
-- INSERTS PARA ParadaItem_dyn (Campos a nivel de Producto/Item/Contenedor)
-- -----------------------------------------------------------------------------

-- SET IDENTITY_INSERT ParadaItem_dyn ON;

INSERT INTO ParadaItem_dyn (Nombre, Etiqueta, TipoDato) VALUES 
('Z_Alicuota', 'Alícuota 1', 'Float'),
('Z_Alicuota2', 'Alícuota 2', 'Float'),
('Z_CantidadPreparada', 'Cantidad Preparada', 'Float'),
('Z_FactorConversionUMsecundaria', 'Factor Conversión UM Sec.', 'Float'),
('Z_ImporteBruto', 'Importe Bruto', 'Float'),
('Z_ImprimirUMsecundaria', 'Imprimir UM Secundaria', 'Boolean'),
('Z_IndicadorImprimirDescuento', 'Indicador Imprimir Descuento', 'Boolean'),
('Z_LineaObsequio', 'Línea Obsequio', 'Boolean'),
('Z_PrecioParaImpresion', 'Precio para Impresión', 'Float'),
('Z_PromocionCampana', 'Promoción/Campaña', 'String'),
('Z_TipoBonificacion', 'Tipo Bonificación 1', 'String'),
('Z_TipoBonificacion2', 'Tipo Bonificación 2', 'String'),
('Z_TipoBonificacion3', 'Tipo Bonificación 3', 'String'),
('Z_TipoImpuesto', 'Tipo Impuesto 1', 'String'),
('Z_TipoImpuesto2', 'Tipo Impuesto 2', 'String'),
('Z_TipoValorBonificacion', 'Tipo Valor Bonificación 1', 'String'),
('Z_TipoValorBonificacion2', 'Tipo Valor Bonificación 2', 'String'),
('Z_TipoValorBonificacion3', 'Tipo Valor Bonificación 3', 'String'),
('Z_UMsecundaria', 'UM Secundaria', 'String'),
('Z_ValorACobrar', 'Valor a Cobrar', 'Float'),
('Z_ValorBonificacion', 'Valor Bonificación 1', 'Float'),
('Z_ValorBonificacion2', 'Valor Bonificación 2', 'Float'),
('Z_ValorBonificacion3', 'Valor Bonificación 3', 'Float'),
('Z_ValorTotalACobrar', 'Valor Total a Cobrar Item', 'Float'),
('Z_ValorUnitario', 'Valor Unitario', 'Float'),
-- CAMPOS PORTIC COPINO (EQUIPMENT/GOODS)
('Z_Contenedor_Numero', 'Número Contenedor', 'String'),
('Z_Contenedor_Tipo', 'Tipo ISO Contenedor', 'String'),
('Z_Precinto', 'Número de Precinto', 'String'),
('Z_PesoBruto', 'Peso Bruto (kg)', 'Float'),
('Z_Longitud', 'Longitud Contenedor', 'String'),
('Z_Bultos', 'Cantidad Bultos', 'Int'),
('Z_UN_Number', 'Código UN (Peligrosas)', 'String'),
('Z_IMDG_Clase', 'Clase IMDG', 'String');

-- SET IDENTITY_INSERT ParadaItem_dyn OFF;

GO
