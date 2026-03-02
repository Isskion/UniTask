/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// UNIGIS Order Schema — extracted from the original monolithic app.js
// Contains: SCHEMA, FIELD_GROUPS, KNOWN_BOOLEAN_PATHS, DYNAMIC_FIELD_SECTIONS,
//           REQUIRED_FIELDS, and helper types.
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SchemaValue = '' | 'bool';

export interface ArraySchema {
    _isArray: true;
    _itemTag: string;
    _fields: Record<string, any>;
}

export interface SchemaNode {
    [key: string]: SchemaValue | SchemaNode | ArraySchema;
}

// ---------------------------------------------------------------------------
// SCHEMA — mirror of the SOAP pOrdenPedido structure
// ---------------------------------------------------------------------------
export const SCHEMA: { Orden: SchemaNode } = {
    Orden: {
        // --- SCALARS ---
        RefDocumento: '', RefDocumentoAdicional: '', RefDocumentoAdicional2: '', RefDocumentoOT: '',
        Fecha: '', FechaEntrega: '', FechaEntregaOriginal: '', FechaCreacionOrigen: '',
        Descripcion: '', TipoPedido: '', Estado: '', EstadoOrdenEntrega: '',
        CodigoSucursal: '', CodigoOperacion: '', Categoria: '', Prioridad: '',
        Telefono: '', Telefono2: '', Telefono3: '', Email: '',
        Observaciones: '', ReferenciaOrden: '', ['B2C' + 'Password']: '', UrlB2C: '',
        Direccion: '', Calle: '', NroPuerta: '', EntreCalle: '',
        Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '',
        CodigoPostal: '', Latitud: '', Longitud: '', Distancia: '',
        InicioHorario1: '', FinHorario1: '', InicioHorario2: '', FinHorario2: '', TiempoEspera: '',
        Volumen: '', Peso: '', Bulto: '', Pallets: '', Unidades: '', ValorDeclarado: '',
        Conductor: '', Dominio: '', CoConductor: '', DominioSecundario: '', DominioTerciario: '',
        RefExternaTransporte: '', ReferenciaExternaTipoCarga: '', DescripcionCondicionTemperatura: '',
        Origen: '', Destino: '', ReferenciaWMS: '', ReferenciaFiscal: '',

        // Scalars from WSDL
        FechaRecoleccion: '', DiasPermitidos: '',
        CantidadMaximaConductores: '', AdicionalMaximo1: '', AdicionalMaximo2: '',
        MinutosConsiderarDetenido: '', MinutosParaPerdidaReporte: '', MinutosReporteAtrasado: '',
        TiempoMaximoJornada: '', MilesPerGallon: '', KmsPorLitro: '', VelocidadMaxima: '',
        CantidadAgrupacionesMaximo: '', TiempoDescarga: '', VelocidadDepositoLlegada: '',
        PrioridadSecundaria: '', IdTipoVehiculo: '',
        CostoJornada: '', Color: '', PalletsMaximo: '', PalletsMinimo: '',
        InicioHorarioRecoleccion1: '', FinHorarioRecoleccion1: '',
        InicioHorarioRecoleccion2: '', FinHorarioRecoleccion2: '',
        Datetime1: '', Datetime2: '', Datetime3: '',
        Descripcion2: '', Direccion2: '', Calle2: '', NroPuerta2: '', EntreCalle2: '',
        Barrio2: '', Localidad2: '', Partido2: '', Provincia2: '', Pais2: '',
        Latitud2: '', Longitud2: '', TiempoEspera2: '',
        VigenciaDesde: '', VigenciaHasta: '',
        Varchar1: '', Varchar2: '', Varchar3: '', Varchar4: '', Varchar5: '',
        Varchar6: '', Varchar7: '', Varchar8: '', Varchar9: '',
        Int1: '', Int2: '', Float1: '', Float2: '', Float3: '', Float4: '',
        Tipo: '', TipoCanal: '', TipoVerificacion: '', GrupoRutas: '',

        // --- BOOLEANS ---
        cargaExclusiva: 'bool', requiereTurno: 'bool', ultimaVisita: 'bool',
        requiereAbasto: 'bool', usarProductos: 'bool', ValidarTransicion: 'bool',
        soloInsertarProductos: 'bool', agruparItems: 'bool',
        altaProductos: 'bool', obligarProductoItems: 'bool',
        Primario: 'bool', Secundario: 'bool', VehSecObligatorio: 'bool',
        PrimarioRouting: 'bool', PermiteMultiplesDepositos: 'bool',
        Custodia: 'bool', Reutilizable: 'bool', IntegrarRNDC: 'bool',

        // --- NESTED: Cliente ---
        Cliente: {
            RefCliente: '', RazonSocial: '', NombreFantasia: '', Telefono: '', Telefono2: '', Telefono3: '',
            EMail: '', Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '',
            Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '',
            Latitud: '', Longitud: '', RefDomicilioExterno: '', DomicilioDescripcion: '',
            InicioHorario1: '', FinHorario1: '', InicioHorario2: '', FinHorario2: '',
            TiempoEspera: '', Varchar1: '', Varchar2: '', Grupo: '',
            NumeroDocumento: '', TipoDocumento: '', DomicilioCodigoPostal: '',
            ReferenciaAdicional: '', Contacto: '', RazonSocialFiscal: '',
            IdentificadorFiscal: '', RequiereTurno: '', RefExternaDocumentoFiscal: '',
            GrupoTramo: '', Int1: '', Int2: '', Float1: '', Float2: '',
            Bonificacion: '',
            PesoMaxTipoVehiculo: '', VolumenMaxTipoVehiculo: '', PalletMaxTipoVehiculos: '',
            BultosMaxTipoVehiculo: '', AltoMaxTipoVehiculo: '', AnchoMaxTipoVehiculo: '',
            ProfundidadMaxTipoVehiculo: '',
            DomicilioFiscal: {
                Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '', Barrio: '',
                Localidad: '', Partido: '', Provincia: '', Pais: '',
                Latitud: '', Longitud: '', CodigoPostal: '', EMail: '', IdentificadorFiscal: '',
                RefDomicilio: '', InicioHorario1: '', FinHorario1: '', InicioHorario2: '',
                FinHorario2: '', TiempoEspera: '',
                Varchar1: '', Varchar2: '', Int1: '', Int2: '', Float1: '', Float2: '',
                GrupoRutas: '', CargaExclusiva: 'bool',
                CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
            },
            CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
            CampoDinamicoDomicilio: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
            TipoServicio: { _isArray: true, _itemTag: 'pTipoServicio', _fields: { ReferenciaExterna: '', Descripcion: '' } },
            CargaExclusiva: 'bool', IgnorarOperacion: 'bool',
            IgnorarOperacionDomicilioOrden: 'bool', CrearDomicilioOrden: 'bool',
            ActualizarDomicilioOrden: 'bool', ValidarDomicilioOrden: 'bool',
            IntegrarRNDC: 'bool', IntegrarFiscal: 'bool',
        },

        // --- NESTED: Cliente2 ---
        Cliente2: {
            RefCliente: '', RazonSocial: '', NombreFantasia: '', Telefono: '', Telefono2: '', Telefono3: '',
            EMail: '', Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '',
            Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '',
            Latitud: '', Longitud: '', RefDomicilioExterno: '', DomicilioDescripcion: '',
            InicioHorario1: '', FinHorario1: '', InicioHorario2: '', FinHorario2: '',
            TiempoEspera: '', Varchar1: '', Varchar2: '', Grupo: '',
            NumeroDocumento: '', TipoDocumento: '', DomicilioCodigoPostal: '',
            ReferenciaAdicional: '', Contacto: '', RazonSocialFiscal: '',
            IdentificadorFiscal: '', RequiereTurno: '', RefExternaDocumentoFiscal: '',
        },

        // --- NESTED: ClienteDador ---
        ClienteDador: {
            RefCliente: '', RazonSocial: '', ReferenciaExterna: '', NombreFantasia: '',
            Cuit: '', Telefono1: '', Telefono2: '', Direccion: '', Localidad: '',
            eMailGestorDeFlota: '', CentroDeCosto: '', IdEstado: '',
            DomicilioFiscal: {
                Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '', Barrio: '',
                Localidad: '', Partido: '', Provincia: '', Pais: '',
                Latitud: '', Longitud: '', CodigoPostal: '', EMail: '', IdentificadorFiscal: '',
                RefDomicilio: '', InicioHorario1: '', FinHorario1: '', InicioHorario2: '',
                FinHorario2: '', TiempoEspera: '',
                Varchar1: '', Varchar2: '', Int1: '', Int2: '', Float1: '', Float2: '',
                GrupoRutas: '', CargaExclusiva: 'bool',
                CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
            },
            operaciones: { _isArray: true, _itemTag: 'pOperacion', _fields: { Descripcion: '', IdOperacion: '', Referencia: '', Sucursal: '', ReferenciaExterna: '' } },
            CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
            IntegrarRNDC: 'bool', IntegrarFiscal: 'bool',
        },

        // --- depositoSalida ---
        depositoSalida: {
            RefDepositoExterno: '', Descripcion: '', Direccion: '', NroPuerta: '',
            Ciudad: '', Municipio: '', Colonia: '', InicioHorario: '', FinHorario: '',
            TiempoEspera: '', Latitud: '', Longitud: '', Calle: '', EntreCalle: '',
            Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '', X: '', Y: '',
            DistanciaMaxima: '', IntegrarFiscal: 'bool', Eliminado: 'bool',
            CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
        },

        // --- depositoLlegada ---
        depositoLlegada: {
            RefDepositoExterno: '', Descripcion: '', Direccion: '', NroPuerta: '',
            Ciudad: '', Municipio: '', Colonia: '', InicioHorario: '', FinHorario: '',
            TiempoEspera: '', Latitud: '', Longitud: '', Calle: '', EntreCalle: '',
            Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '', X: '', Y: '',
            DistanciaMaxima: '', IntegrarFiscal: 'bool', Eliminado: 'bool',
            CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
        },

        // --- Contenedor ---
        Contenedor: {
            ReferenciaExterna: '', Descripcion: '', ReferenciaAdicional: '', Transporte: '',
            Tipo: { ReferenciaExterna: '', Descripcion: '', PesoMaximo: '', VolumenMaximo: '', BultosMaximo: '', Peso: '', Alto: '', Ancho: '', Profundidad: '' },
        },

        // --- TurnoPedido ---
        TurnoPedido: {
            IdEstadoPedidoTurno: '', FechaTurnoConfirmada: '', InicioHorarioTurno: '', FinHorarioTurno: '',
            ReferenciaExterna: '', Descripcion: '', Comentario: '', Solicitante: '', Contacto: '',
            FechaIngreso: '', FechaSolicitudTurno: '',
        },

        // --- EstadosPedido ---
        EstadosPedido: {
            _isArray: true, _itemTag: 'pEstados',
            _fields: { FechaEstado: '', FechaCreacion: '', Descripcion: '', Observaciones: '', Latitud: '', Longitud: '', Login: '' },
        },

        // --- TiposVehiculos ---
        TiposVehiculos: {
            _isArray: true, _itemTag: 'pOrdenPedidoTipoVehiculo',
            _fields: { TipoVehiculo: '', Permitir: '' },
        },

        // --- Recursos ---
        Recursos: {
            _isArray: true, _itemTag: 'pRecursos',
            _fields: {
                ReferenciaExterna: '', Descripcion: '', DescripcionTipoRecurso: '', ReferenciaExternaEstadoRecurso: '',
                CantidadAltaRecurso: '', Cantidad: '',
            },
        },

        // --- Items ---
        Items: {
            _isArray: true,
            _itemTag: 'pOrdenPedidoItem',
            _fields: {
                RefDocumento: '', RefDocumentoAdicional: '', RefDocumentoItemOT: '',
                Cantidad: '', Unidades: '', Descripcion: '',
                CodigoProducto: '', UnidadMedida: '', FechaEntrega: '',
                PrecioUnitario: '', ImporteCosto: '',
                Volumen: '', Peso: '', Bulto: '', Pallets: '',
                LPN: '', EstadoPedidoItem: '', Motivo: '',
                Varchar1: '', Varchar2: '', Int1: '', Int2: '',
                IdPedidoItem: '', ValorCorte: '', ReferenciaCantidad: '', ReferenciaValor: '',
                VigenciaDesde: '', VigenciaHasta: '', ProcesarVolumetria: '', Apilable: '',
                Alto: '', Ancho: '', Profundidad: '',

                Producto: {
                    RefProducto: '', Descripcion: '', Volumen: '', Peso: '',
                    Bultos: '', Alto: '', Ancho: '', Profundidad: '', Codigo: '',
                    RazonSocial: '', Rotacion: '', RotacionesPermitidas: '',
                    Linea: '', SubLinea: '', TipoProducto: '', CategoriaProducto: '', UnidadMedida: '',
                    TiempoDescarga: '', Costo: '', Ordenamiento: '', Apilable: '', IdEstado: '',
                    ClienteDador: {
                        ReferenciaExterna: '', RazonSocial: '', NombreFantasia: '', Cuit: '',
                        Telefono1: '', Telefono2: '', Direccion: '', Localidad: '',
                        eMailGestorDeFlota: '', CentroDeCosto: '', IdEstado: '', IntegrarRNDC: 'bool',
                        operaciones: { _isArray: true, _itemTag: 'pOperacion', _fields: { Descripcion: '', IdOperacion: '', Referencia: '', Sucursal: '', ReferenciaExterna: '' } },
                        CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                    },
                    ConversionUnidadMedida: {
                        UnidadMedidaCompra: '', UnidadMedidaAlmacenamiento: '', UnidadMedidaExpedicion: '',
                        FactorConversionCompraAAlmacenamiento: '', FactorConversionAlmacenamientoAExpedicion: '', FactorConversionCompraAExpedicion: '',
                    },
                    TiposPack: {
                        _isArray: true, _itemTag: 'pTipoPack',
                        _fields: {
                            ReferenciaExterna: '', Deposito: '', ProveedorOrden: '', TipoPack: '',
                            CajasPorCapa: '', CapasAltura: '', UnidadesPorCaja: '', UnidadesTotales: '',
                            Alto: '', Ancho: '', Profundidad: '', IdEstado: '',
                        },
                    },
                    ProveedoresOrden: { _isArray: true, _itemTag: 'string', _fields: { _value: '' } },
                    CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                },

                DomicilioDestino: {
                    RefCliente: '', RazonSocial: '', Telefono: '', Telefono2: '', Telefono3: '', EMail: '',
                    Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '', Barrio: '', Localidad: '',
                    Partido: '', Provincia: '', Pais: '', Latitud: '', Longitud: '', RefDomicilioExterno: '',
                    DomicilioDescripcion: '', InicioHorario1: '', FinHorario1: '', InicioHorario2: '', FinHorario2: '',
                    TiempoEspera: '', Varchar1: '', Varchar2: '', Grupo: '', NumeroDocumento: '', TipoDocumento: '',
                    DomicilioCodigoPostal: '', ReferenciaAdicional: '', Contacto: '', RazonSocialFiscal: '',
                    IdentificadorFiscal: '', RequiereTurno: '', RefExternaDocumentoFiscal: '', GrupoTramo: '',
                    Int1: '', Int2: '', Float1: '', Float2: '', CargaExclusiva: 'bool',
                    DomicilioFiscal: {
                        Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '', Barrio: '',
                        Localidad: '', Partido: '', Provincia: '', Pais: '',
                        Latitud: '', Longitud: '', CodigoPostal: '', EMail: '', IdentificadorFiscal: '',
                        RefDomicilio: '', InicioHorario1: '', FinHorario1: '', InicioHorario2: '',
                        FinHorario2: '', TiempoEspera: '',
                        Varchar1: '', Varchar2: '', Int1: '', Int2: '', Float1: '', Float2: '',
                        GrupoRutas: '', CargaExclusiva: 'bool',
                        CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                    },
                    CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                    CampoDinamicoDomicilio: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                    TipoServicio: { _isArray: true, _itemTag: 'pTipoServicio', _fields: { ReferenciaExterna: '', Descripcion: '' } },
                },

                CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
                Etiquetas: { _isArray: true, _itemTag: 'pEtiqueta', _fields: { Etiqueta: '', Cantidad: '' } },
                TiposImpuesto: { _isArray: true, _itemTag: 'pTipoImpuesto', _fields: { IdTipoImpuesto: '', Descripcion: '', ReferenciaExterna: '', Alicuota: '' } },
                PedidoItemCantidad: { _isArray: true, _itemTag: 'pPedidoItemCantidad', _fields: { RefDocumento: '', Cantidad: '', EstadoPedidoItem: '', Motivo: '' } },
            },
        },

        // --- serviciosAdicionales ---
        serviciosAdicionales: {
            _isArray: true,
            _itemTag: 'pServicioAdicional',
            _fields: { Codigo: '', Descripcion: '', Cantidad: '', Importe: '' },
        },

        // --- Documentos ---
        Documentos: {
            _isArray: true,
            _itemTag: 'pDocumento',
            _fields: {
                TipoDocumento: '', Referencia: '', FechaEmision: '', FechaExpiracion: '',
                Categoria: '', Clase: '', Observaciones: '', ReferenciaEstadoDocumento: '',
                ReferenciaConductor: '', EmisorDocumento: '', ForzarActualizacion: '',
                ArchivosAsociados: {
                    _isArray: true, _itemTag: 'pArchivoDoc',
                    _fields: { Descripcion: '', TipoArchivo: '', Contenido: '', ClasificacionArchivo: '', AsociacionDirecta: '' },
                },
                Asociaciones: {
                    ReferenciaConductor: '', ReferenciaVehiculo: '', ReferenciaOrden: '', ReferenciaPedido: '',
                    ReferenciaCliente: '', ReferenciaClienteOrden: '', ReferenciaDomicilioOrden: '',
                    ReferenciaTransporte: '', ReferenciaPropietario: '', ReferenciaGuia: '',
                    ReferenciaViaje: '', ReferenciaLiquidacion: '', ReferenciaParada: '',
                },
            },
        },

        // --- CampoDinamico (Order level) ---
        CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },

        // --- EstadoDetalle ---
        EstadoDetalle: {
            Estado: '',
            EstadoFecha: '',
            ValidarTransicion: 'bool',
            Login: '',
        },
    },
};

// ---------------------------------------------------------------------------
// KNOWN BOOLEAN PATHS (for UI rendering logic)
// ---------------------------------------------------------------------------
export const KNOWN_BOOLEAN_PATHS: string[] = [
    'Orden.cargaExclusiva', 'Orden.requiereTurno', 'Orden.ultimaVisita',
    'Orden.requiereAbasto', 'Orden.usarProductos', 'Orden.ValidarTransicion',
    'Orden.soloInsertarProductos', 'Orden.agruparItems',
    'Orden.altaProductos', 'Orden.obligarProductoItems',
    'Orden.Cliente.CargaExclusiva', 'Orden.Cliente.IgnorarOperacion',
    'Orden.Cliente.IgnorarOperacionDomicilioOrden', 'Orden.Cliente.CrearDomicilioOrden',
    'Orden.Cliente.ActualizarDomicilioOrden', 'Orden.Cliente.ValidarDomicilioOrden',
    'Orden.Cliente.IntegrarRNDC', 'Orden.Cliente.IntegrarFiscal',
    'Orden.ClienteDador.IntegrarRNDC', 'Orden.ClienteDador.IntegrarFiscal',
    'Orden.depositoSalida.IntegrarFiscal', 'Orden.depositoSalida.Eliminado',
    'Orden.depositoLlegada.IntegrarFiscal', 'Orden.depositoLlegada.Eliminado',
    'Orden.EstadoDetalle.ValidarTransicion',
];

// ---------------------------------------------------------------------------
// FIELD GROUPS — which fields belong to each mapper tab
// ---------------------------------------------------------------------------
export const FIELD_GROUPS: Record<string, string[]> = {
    pOrdenPedido: [
        'Orden.RefDocumento', 'Orden.RefDocumentoAdicional', 'Orden.RefDocumentoAdicional2', 'Orden.RefDocumentoOT',
        'Orden.ReferenciaOrden', 'Orden.ReferenciaWMS',
        'Orden.TipoPedido', 'Orden.Estado', 'Orden.EstadoOrdenEntrega', 'Orden.Categoria', 'Orden.Prioridad',
        'Orden.PrioridadSecundaria', 'Orden.Color', 'Orden.TipoVerificacion',
        'Orden.Fecha', 'Orden.FechaEntrega', 'Orden.FechaEntregaOriginal', 'Orden.FechaCreacionOrigen',
        'Orden.InicioHorario1', 'Orden.FinHorario1', 'Orden.InicioHorario2', 'Orden.FinHorario2', 'Orden.TiempoEspera',
        'Orden.TiempoMaximoJornada', 'Orden.TiempoDescarga',
        'Orden.MinutosConsiderarDetenido', 'Orden.MinutosParaPerdidaReporte', 'Orden.MinutosReporteAtrasado',
        'Orden.Datetime1', 'Orden.Datetime2', 'Orden.Datetime3', 'Orden.DiasPermitidos', 'Orden.VigenciaDesde', 'Orden.VigenciaHasta',
        'Orden.FechaRecoleccion',
        'Orden.InicioHorarioRecoleccion1', 'Orden.FinHorarioRecoleccion1',
        'Orden.InicioHorarioRecoleccion2', 'Orden.FinHorarioRecoleccion2',
        'Orden.CodigoSucursal', 'Orden.CodigoOperacion',
        'Orden.Descripcion', 'Orden.Observaciones',
        'Orden.Telefono', 'Orden.Telefono2', 'Orden.Telefono3', 'Orden.Email', 'Orden.B2C' + 'Password', 'Orden.UrlB2C',
        'Orden.Direccion', 'Orden.Calle', 'Orden.NroPuerta', 'Orden.EntreCalle',
        'Orden.Barrio', 'Orden.Localidad', 'Orden.Partido', 'Orden.Provincia', 'Orden.Pais',
        'Orden.CodigoPostal', 'Orden.Latitud', 'Orden.Longitud', 'Orden.Distancia',
        'Orden.Origen', 'Orden.Destino', 'Orden.GrupoRutas',
        'Orden.Descripcion2', 'Orden.Direccion2', 'Orden.Calle2', 'Orden.NroPuerta2', 'Orden.EntreCalle2',
        'Orden.Barrio2', 'Orden.Localidad2', 'Orden.Partido2', 'Orden.Provincia2', 'Orden.Pais2',
        'Orden.Latitud2', 'Orden.Longitud2', 'Orden.TiempoEspera2',
        'Orden.Volumen', 'Orden.Peso', 'Orden.Bulto', 'Orden.Pallets', 'Orden.Unidades', 'Orden.ValorDeclarado',
        'Orden.PalletsMaximo', 'Orden.PalletsMinimo',
        'Orden.ReferenciaExternaTipoCarga', 'Orden.DescripcionCondicionTemperatura',
        'Orden.Conductor', 'Orden.Dominio', 'Orden.CoConductor', 'Orden.DominioSecundario', 'Orden.DominioTerciario',
        'Orden.RefExternaTransporte', 'Orden.IdTipoVehiculo',
        'Orden.CantidadMaximaConductores', 'Orden.CantidadAgrupacionesMaximo',
        'Orden.AdicionalMaximo1', 'Orden.AdicionalMaximo2',
        'Orden.MilesPerGallon', 'Orden.KmsPorLitro', 'Orden.VelocidadMaxima', 'Orden.VelocidadDepositoLlegada',
        'Orden.CostoJornada',
        'Orden.Varchar1', 'Orden.Varchar2', 'Orden.Varchar3', 'Orden.Varchar4', 'Orden.Varchar5',
        'Orden.Varchar6', 'Orden.Varchar7', 'Orden.Varchar8', 'Orden.Varchar9',
        'Orden.Int1', 'Orden.Int2', 'Orden.Float1', 'Orden.Float2', 'Orden.Float3', 'Orden.Float4',
        'Orden.Tipo', 'Orden.TipoCanal',
        'Orden.cargaExclusiva', 'Orden.requiereTurno', 'Orden.ultimaVisita',
        'Orden.requiereAbasto', 'Orden.usarProductos', 'Orden.ValidarTransicion',
        'Orden.soloInsertarProductos', 'Orden.agruparItems',
        'Orden.altaProductos', 'Orden.obligarProductoItems',
    ],
    Cliente: [
        'Orden.Cliente.RefCliente', 'Orden.Cliente.RazonSocial', 'Orden.Cliente.NombreFantasia',
        'Orden.Cliente.Telefono', 'Orden.Cliente.Telefono2', 'Orden.Cliente.Telefono3', 'Orden.Cliente.EMail',
        'Orden.Cliente.NumeroDocumento', 'Orden.Cliente.TipoDocumento', 'Orden.Cliente.Contacto', 'Orden.Cliente.ReferenciaAdicional', 'Orden.Cliente.Grupo',
        'Orden.Cliente.Direccion', 'Orden.Cliente.Calle', 'Orden.Cliente.NumeroPuerta', 'Orden.Cliente.EntreCalle',
        'Orden.Cliente.Barrio', 'Orden.Cliente.Localidad', 'Orden.Cliente.Partido', 'Orden.Cliente.Provincia', 'Orden.Cliente.Pais',
        'Orden.Cliente.Latitud', 'Orden.Cliente.Longitud', 'Orden.Cliente.RefDomicilioExterno', 'Orden.Cliente.DomicilioDescripcion', 'Orden.Cliente.DomicilioCodigoPostal',
        'Orden.Cliente.InicioHorario1', 'Orden.Cliente.FinHorario1', 'Orden.Cliente.InicioHorario2', 'Orden.Cliente.FinHorario2', 'Orden.Cliente.TiempoEspera',
        'Orden.Cliente.RazonSocialFiscal', 'Orden.Cliente.IdentificadorFiscal', 'Orden.Cliente.RefExternaDocumentoFiscal', 'Orden.Cliente.GrupoTramo', 'Orden.Cliente.Bonificacion',
        'Orden.Cliente.PesoMaxTipoVehiculo', 'Orden.Cliente.VolumenMaxTipoVehiculo', 'Orden.Cliente.PalletMaxTipoVehiculos',
        'Orden.Cliente.BultosMaxTipoVehiculo', 'Orden.Cliente.AltoMaxTipoVehiculo', 'Orden.Cliente.AnchoMaxTipoVehiculo', 'Orden.Cliente.ProfundidadMaxTipoVehiculo',
        'Orden.Cliente.Varchar1', 'Orden.Cliente.Varchar2', 'Orden.Cliente.Int1', 'Orden.Cliente.Int2', 'Orden.Cliente.Float1', 'Orden.Cliente.Float2',
        'Orden.Cliente.CargaExclusiva', 'Orden.Cliente.IgnorarOperacion',
        'Orden.Cliente.IgnorarOperacionDomicilioOrden', 'Orden.Cliente.CrearDomicilioOrden',
        'Orden.Cliente.ActualizarDomicilioOrden', 'Orden.Cliente.ValidarDomicilioOrden',
        'Orden.Cliente.IntegrarRNDC', 'Orden.Cliente.IntegrarFiscal',
    ],
    Cliente2: [
        'Orden.Cliente2.RefCliente', 'Orden.Cliente2.RazonSocial', 'Orden.Cliente2.NombreFantasia',
        'Orden.Cliente2.Telefono', 'Orden.Cliente2.EMail', 'Orden.Cliente2.Contacto',
        'Orden.Cliente2.Direccion', 'Orden.Cliente2.Localidad', 'Orden.Cliente2.Latitud', 'Orden.Cliente2.Longitud',
        'Orden.Cliente2.InicioHorario1', 'Orden.Cliente2.FinHorario1',
    ],
    ClienteDador: [
        'Orden.ClienteDador.RefCliente', 'Orden.ClienteDador.ReferenciaExterna',
        'Orden.ClienteDador.operaciones.Descripcion', 'Orden.ClienteDador.operaciones.IdOperacion',
        'Orden.ClienteDador.operaciones.Referencia', 'Orden.ClienteDador.operaciones.Sucursal', 'Orden.ClienteDador.operaciones.ReferenciaExterna',
        'Orden.ClienteDador.RazonSocial', 'Orden.ClienteDador.NombreFantasia', 'Orden.ClienteDador.Cuit',
        'Orden.ClienteDador.Telefono1', 'Orden.ClienteDador.Telefono2',
        'Orden.ClienteDador.Direccion', 'Orden.ClienteDador.Localidad',
        'Orden.ClienteDador.eMailGestorDeFlota', 'Orden.ClienteDador.CentroDeCosto', 'Orden.ClienteDador.IdEstado',
        'Orden.ClienteDador.IntegrarRNDC', 'Orden.ClienteDador.IntegrarFiscal',
    ],
    depositoSalida: [
        'Orden.depositoSalida.RefDepositoExterno', 'Orden.depositoSalida.Descripcion',
        'Orden.depositoSalida.Direccion', 'Orden.depositoSalida.NroPuerta',
        'Orden.depositoSalida.Calle', 'Orden.depositoSalida.EntreCalle', 'Orden.depositoSalida.Barrio',
        'Orden.depositoSalida.Ciudad', 'Orden.depositoSalida.Municipio', 'Orden.depositoSalida.Colonia',
        'Orden.depositoSalida.Localidad', 'Orden.depositoSalida.Partido', 'Orden.depositoSalida.Provincia', 'Orden.depositoSalida.Pais',
        'Orden.depositoSalida.Latitud', 'Orden.depositoSalida.Longitud',
        'Orden.depositoSalida.InicioHorario', 'Orden.depositoSalida.FinHorario', 'Orden.depositoSalida.TiempoEspera', 'Orden.depositoSalida.DistanciaMaxima',
        'Orden.depositoSalida.IntegrarFiscal', 'Orden.depositoSalida.Eliminado',
    ],
    depositoLlegada: [
        'Orden.depositoLlegada.RefDepositoExterno', 'Orden.depositoLlegada.Descripcion',
        'Orden.depositoLlegada.Direccion', 'Orden.depositoLlegada.NroPuerta',
        'Orden.depositoLlegada.Calle', 'Orden.depositoLlegada.EntreCalle', 'Orden.depositoLlegada.Barrio',
        'Orden.depositoLlegada.Ciudad', 'Orden.depositoLlegada.Municipio', 'Orden.depositoLlegada.Colonia',
        'Orden.depositoLlegada.Localidad', 'Orden.depositoLlegada.Partido', 'Orden.depositoLlegada.Provincia', 'Orden.depositoLlegada.Pais',
        'Orden.depositoLlegada.Latitud', 'Orden.depositoLlegada.Longitud',
        'Orden.depositoLlegada.InicioHorario', 'Orden.depositoLlegada.FinHorario', 'Orden.depositoLlegada.TiempoEspera', 'Orden.depositoLlegada.DistanciaMaxima',
        'Orden.depositoLlegada.IntegrarFiscal', 'Orden.depositoLlegada.Eliminado',
    ],
    Contenedor: [
        'Orden.Contenedor.ReferenciaExterna', 'Orden.Contenedor.Descripcion',
        'Orden.Contenedor.ReferenciaAdicional', 'Orden.Contenedor.Transporte',
    ],
    TurnoPedido: [
        'Orden.TurnoPedido.IdEstadoPedidoTurno', 'Orden.TurnoPedido.FechaTurnoConfirmada',
        'Orden.TurnoPedido.InicioHorarioTurno', 'Orden.TurnoPedido.FinHorarioTurno',
        'Orden.TurnoPedido.ReferenciaExterna', 'Orden.TurnoPedido.Descripcion',
    ],
    Items: [
        'Orden.Items.RefDocumento', 'Orden.Items.RefDocumentoAdicional',
        'Orden.Items.Cantidad', 'Orden.Items.Unidades', 'Orden.Items.Descripcion',
        'Orden.Items.CodigoProducto', 'Orden.Items.UnidadMedida',
        'Orden.Items.FechaEntrega', 'Orden.Items.PrecioUnitario', 'Orden.Items.ImporteCosto',
        'Orden.Items.Volumen', 'Orden.Items.Peso', 'Orden.Items.Bulto', 'Orden.Items.Pallets',
        'Orden.Items.LPN', 'Orden.Items.EstadoPedidoItem', 'Orden.Items.Motivo',
        'Orden.Items.Varchar1', 'Orden.Items.Varchar2', 'Orden.Items.Int1', 'Orden.Items.Int2',
        'Orden.Items.Etiquetas.Etiqueta', 'Orden.Items.Etiquetas.Cantidad',
        'Orden.Items.TiposImpuesto.IdTipoImpuesto', 'Orden.Items.TiposImpuesto.Descripcion',
        'Orden.Items.TiposImpuesto.ReferenciaExterna', 'Orden.Items.TiposImpuesto.Alicuota',
    ],
    ServiciosAdicionales: [
        'Orden.serviciosAdicionales.Codigo', 'Orden.serviciosAdicionales.Descripcion',
        'Orden.serviciosAdicionales.Cantidad', 'Orden.serviciosAdicionales.Importe',
    ],
    Documentos: [
        'Orden.Documentos.TipoDocumento', 'Orden.Documentos.Referencia',
        'Orden.Documentos.FechaEmision', 'Orden.Documentos.FechaExpiracion',
        'Orden.Documentos.Categoria', 'Orden.Documentos.Clase',
        'Orden.Documentos.Observaciones', 'Orden.Documentos.ReferenciaEstadoDocumento',
        'Orden.Documentos.ReferenciaConductor', 'Orden.Documentos.EmisorDocumento', 'Orden.Documentos.ForzarActualizacion',
        'Orden.Documentos.ArchivosAsociados.Descripcion', 'Orden.Documentos.ArchivosAsociados.TipoArchivo', 'Orden.Documentos.ArchivosAsociados.Contenido',
    ],
    Producto: [
        'Orden.Items.Producto.RefProducto', 'Orden.Items.Producto.Codigo', 'Orden.Items.Producto.Descripcion',
        'Orden.Items.Producto.Volumen', 'Orden.Items.Producto.Peso', 'Orden.Items.Producto.Bultos',
        'Orden.Items.Producto.Alto', 'Orden.Items.Producto.Ancho', 'Orden.Items.Producto.Profundidad',
        'Orden.Items.Producto.RazonSocial', 'Orden.Items.Producto.Rotacion', 'Orden.Items.Producto.Linea',
        'Orden.Items.Producto.SubLinea', 'Orden.Items.Producto.TipoProducto', 'Orden.Items.Producto.CategoriaProducto',
        'Orden.Items.Producto.UnidadMedida', 'Orden.Items.Producto.TiempoDescarga', 'Orden.Items.Producto.Costo',
        'Orden.Items.Producto.IdEstado',
        'Orden.Items.Producto.ConversionUnidadMedida.FactorConversionCompraAAlmacenamiento',
        'Orden.Items.Producto.ClienteDador.ReferenciaExterna', 'Orden.Items.Producto.ClienteDador.RazonSocial',
        'Orden.Items.Producto.ClienteDador.Cuit', 'Orden.Items.Producto.ClienteDador.IdEstado',
        'Orden.Items.Producto.ClienteDador.IntegrarRNDC',
        'Orden.Items.Producto.TiposPack.ReferenciaExterna', 'Orden.Items.Producto.TiposPack.Deposito',
        'Orden.Items.Producto.TiposPack.TipoPack', 'Orden.Items.Producto.TiposPack.UnidadesTotales',
        'Orden.Items.Producto.TiposPack.Alto', 'Orden.Items.Producto.TiposPack.Ancho', 'Orden.Items.Producto.TiposPack.Profundidad',
    ],
    ItemsDomicilio: [
        'Orden.Items.DomicilioDestino.RefCliente', 'Orden.Items.DomicilioDestino.RazonSocial',
        'Orden.Items.DomicilioDestino.Telefono', 'Orden.Items.DomicilioDestino.EMail',
        'Orden.Items.DomicilioDestino.Direccion', 'Orden.Items.DomicilioDestino.Calle', 'Orden.Items.DomicilioDestino.NumeroPuerta',
        'Orden.Items.DomicilioDestino.Barrio', 'Orden.Items.DomicilioDestino.Localidad', 'Orden.Items.DomicilioDestino.Partido',
        'Orden.Items.DomicilioDestino.Provincia', 'Orden.Items.DomicilioDestino.Pais',
        'Orden.Items.DomicilioDestino.Latitud', 'Orden.Items.DomicilioDestino.Longitud',
        'Orden.Items.DomicilioDestino.RefDomicilioExterno', 'Orden.Items.DomicilioDestino.DomicilioDescripcion',
        'Orden.Items.DomicilioDestino.InicioHorario1', 'Orden.Items.DomicilioDestino.FinHorario1',
        'Orden.Items.DomicilioDestino.IdentificadorFiscal',
    ],
    TiposVehiculos: [
        'Orden.TiposVehiculos.TipoVehiculo', 'Orden.TiposVehiculos.Permitir',
    ],
    EstadosPedido: [
        'Orden.EstadosPedido.FechaEstado', 'Orden.EstadosPedido.Descripcion',
        'Orden.EstadosPedido.Observaciones', 'Orden.EstadosPedido.Latitud', 'Orden.EstadosPedido.Longitud', 'Orden.EstadosPedido.Login',
        'Orden.EstadoDetalle.Estado', 'Orden.EstadoDetalle.EstadoFecha', 'Orden.EstadoDetalle.ValidarTransicion', 'Orden.EstadoDetalle.Login',
    ],
    Recursos: [
        'Orden.Recursos.ReferenciaExterna', 'Orden.Recursos.Descripcion', 'Orden.Recursos.ReferenciaExternaEstadoRecurso',
        'Orden.Recursos.Cantidad',
    ],
    Fiscal: [
        'Orden.ReferenciaFiscal',
        'Orden.Cliente.RazonSocialFiscal', 'Orden.Cliente.IdentificadorFiscal',
        'Orden.Cliente.DomicilioFiscal.Direccion', 'Orden.Cliente.DomicilioFiscal.IdentificadorFiscal',
        'Orden.Cliente2.RazonSocialFiscal', 'Orden.Cliente2.IdentificadorFiscal',
        'Orden.ClienteDador.Cuit',
        'Orden.ClienteDador.DomicilioFiscal.Direccion', 'Orden.ClienteDador.DomicilioFiscal.IdentificadorFiscal',
        'Orden.Items.DomicilioDestino.RazonSocialFiscal', 'Orden.Items.DomicilioDestino.IdentificadorFiscal',
        'Orden.Items.DomicilioDestino.DomicilioFiscal.Direccion', 'Orden.Items.DomicilioDestino.DomicilioFiscal.IdentificadorFiscal',
    ],
    Dinamicos: [], // Populated dynamically via getDynamicFields()
};

// ---------------------------------------------------------------------------
// DYNAMIC FIELD SECTIONS — base paths per scope
// ---------------------------------------------------------------------------
export interface DynamicFieldSection {
    basePath: string;
    label: string;
}

export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {
    Orden: { basePath: 'Orden.CampoDinamico', label: 'Pedido' },
    Cliente: { basePath: 'Orden.Cliente.CampoDinamico', label: 'Cliente' },
    ClienteDomicilio: { basePath: 'Orden.Cliente.CampoDinamicoDomicilio', label: 'Cliente Domicilio' },
    Items: { basePath: 'Orden.Items.CampoDinamico', label: 'Items' },
    ItemsDomicilio: { basePath: 'Orden.Items.DomicilioDestino.CampoDinamico', label: 'Items Domicilio' },
};

// ---------------------------------------------------------------------------
// REQUIRED FIELDS for a valid UNIGIS order
// ---------------------------------------------------------------------------
export const REQUIRED_FIELDS: string[] = [
    'Orden.RefDocumento',
    'Orden.Cliente.RefCliente',
    'Orden.Cliente.RazonSocial',
];

// ---------------------------------------------------------------------------
// Helper: Get all field paths from schema recursively
// ---------------------------------------------------------------------------
export function getAllFields(obj: Record<string, any> = SCHEMA, prefix = ''): string[] {
    const fields: string[] = [];
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        const fullPath = prefix ? `${prefix}.${key}` : key;
        if (val && typeof val === 'object' && !val._isArray) {
            fields.push(...getAllFields(val, fullPath));
        } else {
            fields.push(fullPath);
        }
    }
    return fields;
}

// ---------------------------------------------------------------------------
// Helper: Get dynamic fields based on counts
// ---------------------------------------------------------------------------
export function getDynamicFields(counts: Record<string, number>): string[] {
    const fields: string[] = [];
    for (const [section, count] of Object.entries(counts)) {
        const sectionConfig = DYNAMIC_FIELD_SECTIONS[section];
        if (!sectionConfig || count <= 0) continue;
        for (let i = 1; i <= count; i++) {
            fields.push(`${sectionConfig.basePath}[${i}].Campo`);
            fields.push(`${sectionConfig.basePath}[${i}].Valor`);
        }
    }
    return fields;
}
