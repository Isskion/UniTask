const fs = require('fs');

const jsonPath = 'C:\\Users\\daniel.delamo\\OneDrive - UNISOLUTIONS MEX SA DE CV\\Documentos\\Oficial Unigis\\Proyectos\\Transpais\\Interfaces\\Maersk\\67009718913_TRANSPAIS.json';
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Format Date to UNIGIS format (YYYY-MM-DDTHH:mm:ss, no timezone offset/Z)
function formatUnigisDate(isoStr) {
    if (!isoStr) return '';
    return isoStr.replace('Z', '').split('+')[0];
}

// Helpers to get references from cargoStuffing[0].references
function getReference(typeCode) {
    const cs = jsonData.transportPlan?.transportOrder?.cargoStuffing?.[0];
    const ref = cs?.references?.find(r => r.referenceTypeCode === typeCode);
    return ref ? ref.reference : '';
}

// Helper to get party by function
function getParty(partyFunction) {
    const p = jsonData.parties?.find(x => x.partyFunction === partyFunction);
    return p ? p.party : null;
}

// Helper to get soft coded value from root
function getRootSoftCoded(name) {
    const sc = jsonData.softCodedValues?.find(s => s.attributeName === name);
    return sc ? sc.value : '';
}

// Helper to get soft coded value from leg
function getLegSoftCoded(legIndex, name) {
    const sc = jsonData.transportPlan?.transportLegs?.[legIndex]?.softCodedValues?.find(s => s.attributeName === name);
    return sc ? sc.value : '';
}

// Helper to get work process status
function getWorkProcessStatus(name) {
    const st = jsonData.workProcesses?.[0]?.workProcessStatus?.find(w => w.workProcessStatusName === name);
    return st ? st.workProcessStatusCode : '';
}

// Helper to escape XML characters
function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Config constants for EUP Sandbox
const USE_EUP_SANDBOX_CODES = true;
const todayDate = new Date().toISOString().split('T')[0]; // Format today as YYYY-MM-DD

const dadorClientCode = USE_EUP_SANDBOX_CODES ? '00001' : (getParty('SHIPPER')?.partyCode || 'ES00286196');
const depotSalidaCode = USE_EUP_SANDBOX_CODES ? 'L02' : (jsonData.transportPlan?.transportLegs?.[0]?.startLocation?.[0]?.location?.businessIdentifier || 'ESALR03');
const depotLlegadaCode = USE_EUP_SANDBOX_CODES ? 'L02' : (jsonData.transportPlan?.transportLegs?.[1]?.endLocation?.[0]?.location?.businessIdentifier || 'ESALRTM');
const customerClientCode = USE_EUP_SANDBOX_CODES ? '1001479709' : (getParty('CUSTOMER')?.partyCode || '1001479709');

const firstLegStart = jsonData.transportPlan?.transportLegs?.[0];
const secondLegEnd = jsonData.transportPlan?.transportLegs?.[1];
const cargoStuffing = jsonData.transportPlan?.transportOrder?.cargoStuffing?.[0] || {};

const data = {
    RefDocumento: jsonData.carrierBookingNumber || '67009718913',
    CodigoOperacion: '101', // EUP operation
    TipoPedido: 'V6', // EUP type
    RefDocumentoAdicional: cargoStuffing.bookingNumber || '270501693',
    RefDocumentoAdicional2: getReference('ZHAUL') || 'GCSS_251091062',
    RefDocumentoOT: getReference('1123') || '7003623663',
    Fecha: formatUnigisDate(jsonData.createTimestamp || todayDate),
    FechaEntrega: formatUnigisDate(secondLegEnd?.latestTimeOfArrival || todayDate + 'T18:00:00'),
    FechaEntregaOriginal: formatUnigisDate(jsonData.deadlines?.find(d => d.deadlineName === 'VESSEL_CUTOFF')?.timestamp || todayDate + 'T18:00:00'),
    FechaRecoleccion: formatUnigisDate(firstLegStart?.earliestTimeOfDeparture || todayDate + 'T08:00:00'),
    VigenciaDesde: formatUnigisDate(jsonData.createTimestamp || todayDate) + 'T00:00:00',
    VigenciaHasta: formatUnigisDate(jsonData.deadlines?.find(d => d.deadlineName === 'VESSEL_CUTOFF')?.timestamp || todayDate + 'T23:59:59'),
    
    // Horarios
    InicioHorario1: '900',
    FinHorario1: '1200',
    InicioHorario2: '1300',
    FinHorario2: '1600',
    InicioHorarioRecoleccion1: '-1',
    FinHorarioRecoleccion1: '-1',
    InicioHorarioRecoleccion2: '-1',
    FinHorarioRecoleccion2: '-1',
    TiempoEspera: '10',
    
    Descripcion: (jsonData.cargoDescription || 'Soap') + ' cargo transport',
    cargaExclusiva: '1',
    Observaciones: 'Creacion desde JSON Maersk - Soap cargo transport',
    
    // Totales
    Volumen: String(cargoStuffing.equipment?.equipmentSizeType?.equipmentProfile?.cubicCapacity || 86),
    Peso: String(jsonData.totalBookedGrossWeight || 29180),
    Bulto: String(jsonData.totalBookedItemQuantity || 1),
    Pallets: '0',
    Unidades: String(jsonData.totalBookedItemQuantity || 1),
    ValorDeclarado: String(jsonData.rate?.totalAmount || 420.9),
    
    // Typified Custom Fields
    Varchar1: jsonData.workProcesses?.[0]?.transportActivity || 'Export',
    Varchar2: cargoStuffing.equipment?.equipmentSizeType?.equipmentType?.equipmentTypeCode || '45DRY96',
    Varchar3: jsonData.uniqueIdentifier || '',
    Varchar4: jsonData.createUserId || '',
    Varchar5: jsonData.createUserEmail || '',
    Varchar6: jsonData.internalVersionNumber || '',
    Varchar7: secondLegEnd?.relatedCarriage?.vessel?.vesselName || '',
    Varchar8: secondLegEnd?.relatedCarriage?.vessel?.vesselMaerskCode || '',
    Varchar9: secondLegEnd?.relatedCarriage?.vesselPortCallStart?.departureVoyageNumber || '',
    
    Int1: String(parseInt(jsonData.transactionType) || 1),
    Int2: String(jsonData.totalBookedNetWeight || 24400),
    
    Float1: String(jsonData.rate?.totalAmount || 420.9),
    Float2: String(jsonData.rate?.rateLines?.find(r => r.chargeType?.chargeTypeCode === 'ZOVERWT_AUTO')?.amount || 75.9),
    
    Datetime1: formatUnigisDate(jsonData.deadlines?.find(d => d.deadlineName === 'EARLIEST_DROPOFF')?.timestamp || todayDate + 'T13:00:00'),
    Datetime2: formatUnigisDate(jsonData.deadlines?.find(d => d.deadlineName === 'VESSEL_CUTOFF')?.timestamp || todayDate + 'T13:00:00'),
    Datetime3: formatUnigisDate(jsonData.updateTimestamp || todayDate + 'T10:48:18'),
    
    ultimaVisita: '0',
    usarProductos: '1',
    ValidarTransicion: '0', // Root level ValidarTransicion: MUST be 0 to bypass transition validations
    agruparItems: '1',
    obligarProductoItems: '0',
    
    depositoSalida: {
        RefDepositoExterno: depotSalidaCode,
        Descripcion: firstLegStart?.startLocation?.[0]?.location?.facilityName || 'STAR CONTAINER DEPOT - COMESA',
        Direccion: firstLegStart?.startLocation?.[0]?.location?.postalAddresses?.[0]?.postalAddressLine1 || 'Pol. Ind. Cortijo Real Parcela J4-J5',
        Calle: firstLegStart?.startLocation?.[0]?.location?.postalAddresses?.[0]?.postalAddressLine1 || 'Pol. Ind. Cortijo Real',
        NroPuerta: firstLegStart?.startLocation?.[0]?.location?.postalAddresses?.[0]?.houseNumber || '0',
        Localidad: firstLegStart?.startLocation?.[0]?.location?.postalAddresses?.[0]?.cityName || 'Algeciras',
        Pais: firstLegStart?.startLocation?.[0]?.location?.postalAddresses?.[0]?.countryName || 'Spain',
        Eliminado: 'false',
        IntegrarFiscal: 'false'
    },
    
    depositoLlegada: {
        RefDepositoExterno: depotLlegadaCode,
        Descripcion: secondLegEnd?.endLocation?.[0]?.location?.facilityName || 'Algeciras - ML Terminal',
        Direccion: secondLegEnd?.endLocation?.[0]?.location?.postalAddresses?.[0]?.postalAddressLine1 || 'Muelle Juan Carlos I S/N',
        Calle: secondLegEnd?.endLocation?.[0]?.location?.postalAddresses?.[0]?.postalAddressLine1 || 'Muelle Juan Carlos I S/N',
        NroPuerta: '0',
        Localidad: secondLegEnd?.endLocation?.[0]?.location?.postalAddresses?.[0]?.cityName || 'Algeciras',
        Pais: secondLegEnd?.endLocation?.[0]?.location?.postalAddresses?.[0]?.countryName || 'Spain',
        Eliminado: 'false',
        IntegrarFiscal: 'false'
    },
    
    CampoDinamico: [
        { Campo: 'FirstCargoReceipt', Valor: getRootSoftCoded('FirstCargoReceipt') || 'ESDOP' },
        { Campo: 'LastCargoDelivery', Valor: getRootSoftCoded('LastCargoDelivery') || 'ESALRTM' },
        { Campo: 'CAD_OFFSET', Valor: getRootSoftCoded('CAD_OFFSET') || '+02:00:00' },
        { Campo: 'GateOutContainerStatus_Leg1', Valor: getLegSoftCoded(0, 'GateOutContainerStatus') || 'EP' },
        { Campo: 'GateOutContainerStatus_Leg2', Valor: getLegSoftCoded(1, 'GateOutContainerStatus') || 'FP' },
        { Campo: 'OceanPortOfLoading', Valor: secondLegEnd?.relatedCarriage?.vesselPortCallStart?.port?.find(p => p.portIdentifier === 'PortOfLoading')?.portName || 'ESALR - Algeciras - ML Terminal' },
        { Campo: 'OceanPortOfDischarge', Valor: secondLegEnd?.relatedCarriage?.vesselPortCallStart?.port?.find(p => p.portIdentifier === 'NextPort')?.portName || 'GBLGP - London Gateway Terminal' },
        { Campo: 'SendByUserId', Valor: getReference('ZUSER') || 'APC052' },
        { Campo: 'ServiceMode', Valor: getReference('ZUMOD') || 'SD/CY' },
        { Campo: 'InvoicingVendorIndicator', Valor: getWorkProcessStatus('InvoicingVendorIndicator') || 'False' },
        { Campo: 'UrgentIndicator', Valor: getWorkProcessStatus('UrgentIndicator') || 'False' }
    ],
    
    ClienteDador: {
        RefCliente: dadorClientCode,
        ReferenciaExterna: dadorClientCode,
        RazonSocial: USE_EUP_SANDBOX_CODES ? 'EUROPASTRY' : (getParty('SHIPPER')?.partyName || 'MERTRAMAR SAU'),
        NombreFantasia: USE_EUP_SANDBOX_CODES ? 'EUROPASTRY' : (getParty('SHIPPER')?.partyName || 'MERTRAMAR SAU'),
        Cuit: dadorClientCode,
        Telefono1: '34 954296320',
        Telefono2: '',
        Direccion: getParty('SHIPPER')?.postalAddresses?.[0]?.postalAddressLine1 || 'CTRA DE LA EXCLUSA POL IND ZAL',
        Localidad: getParty('SHIPPER')?.postalAddresses?.[0]?.cityName || 'Sevilla',
        eMailGestorDeFlota: 'trafico@mertramar.com',
        CentroDeCosto: '',
        IdEstado: '-1',
        IntegrarRNDC: 'false',
        IntegrarFiscal: 'false'
    },
    
    Cliente: {
        RefCliente: customerClientCode,
        RazonSocial: USE_EUP_SANDBOX_CODES ? 'MERTRAMAR SAU' : (getParty('CUSTOMER')?.partyName || 'MERTRAMAR SAU'),
        NombreFantasia: USE_EUP_SANDBOX_CODES ? 'MERTRAMAR SAU' : (getParty('CUSTOMER')?.partyName || 'MERTRAMAR SAU'),
        Telefono: getParty('ContactAtCustomerLocation')?.telecommunicationNumbers?.[0]?.telecommunicationNumber || '34 954296320',
        Telefono2: '',
        Telefono3: '',
        EMail: getParty('ContactAtCustomerLocation')?.emailAddresses?.[0] || 'trafico@mertramar.com',
        Direccion: getParty('CUSTOMER')?.postalAddresses?.[0]?.postalAddressLine1 || 'CTRA DE LA EXCLUSA POL IND ZAL',
        Calle: getParty('CUSTOMER')?.postalAddresses?.[0]?.postalAddressLine1 || 'CTRA DE LA EXCLUSA POL IND ZAL',
        NumeroPuerta: getParty('CUSTOMER')?.postalAddresses?.[0]?.houseNumber || '0',
        Barrio: '',
        Localidad: getParty('CUSTOMER')?.postalAddresses?.[0]?.cityName || 'Sevilla',
        Partido: '',
        Provincia: '',
        Pais: getParty('CUSTOMER')?.postalAddresses?.[0]?.countryName || 'Spain',
        DomicilioCodigoPostal: getParty('CUSTOMER')?.postalAddresses?.[0]?.postalCode || '41011',
        Contacto: getParty('ContactAtCustomerLocation')?.partyName || 'diego.moreno.gomez',
        Int1: '0',
        Int2: '0',
        Float1: '0.0',
        Float2: '0.0',
        Bonificacion: '0.0',
        PesoMaxTipoVehiculo: '0.0',
        VolumenMaxTipoVehiculo: '0.0',
        PalletMaxTipoVehiculos: '0',
        BultosMaxTipoVehiculo: '0',
        AltoMaxTipoVehiculo: '0.0',
        AnchoMaxTipoVehiculo: '0.0',
        ProfundidadMaxTipoVehiculo: '0.0',
        CargaExclusiva: 'false',
        IgnorarOperacion: 'true',
        IgnorarOperacionDomicilioOrden: 'true',
        CrearDomicilioOrden: 'true',
        ActualizarDomicilioOrden: 'true',
        ValidarDomicilioOrden: 'false',
        IntegrarRNDC: 'false',
        IntegrarFiscal: 'false'
    },
    
    Items: [
        {
            RefDocumento: jsonData.carrierBookingNumber || '67009718913',
            RefDocumentoAdicional: cargoStuffing.bookingNumber || '270501693',
            RefDocumentoItemOT: getReference('1123') || '7003623663',
            Cantidad: String(cargoStuffing.cargoStuffingLines?.[0]?.actualStuffedPackageQuantity || 1),
            Unidades: String(cargoStuffing.cargoStuffingLines?.[0]?.actualStuffedPackageQuantity || 1),
            Descripcion: cargoStuffing.commodityCodes?.[0]?.commodityName || 'Soap',
            CodigoProducto: cargoStuffing.commodityCodes?.[0]?.commodityCode || '002908',
            UnidadMedida: cargoStuffing.weightUnit || 'PCE',
            FechaEntrega: formatUnigisDate(secondLegEnd?.latestTimeOfArrival || todayDate),
            PrecioUnitario: String(jsonData.rate?.totalAmount || 420.9),
            ImporteCosto: String(jsonData.rate?.totalAmount || 420.9),
            Volumen: String(cargoStuffing.equipment?.equipmentSizeType?.equipmentProfile?.cubicCapacity || 86),
            Peso: String(cargoStuffing.totalPlannedStuffedGrossWeight || 29180),
            Bulto: String(cargoStuffing.cargoStuffingLines?.[0]?.actualStuffedPackageQuantity || 1),
            Pallets: '0',
            Int1: '0',
            Int2: '0',
            ProcesarVolumetria: '0',
            Apilable: '0',
            Alto: '0.0',
            Ancho: '0.0',
            Profundidad: '0.0',
            Producto: {
                RefProducto: cargoStuffing.commodityCodes?.[0]?.commodityCode || '002908',
                Codigo: cargoStuffing.commodityCodes?.[0]?.commodityCode || '002908',
                Descripcion: cargoStuffing.commodityCodes?.[0]?.commodityName || 'Soap',
                Volumen: String(cargoStuffing.equipment?.equipmentSizeType?.equipmentProfile?.cubicCapacity || 86),
                Peso: String(cargoStuffing.totalPlannedStuffedGrossWeight || 29180),
                Bultos: String(cargoStuffing.cargoStuffingLines?.[0]?.actualStuffedPackageQuantity || 1),
                Alto: '0.0',
                Ancho: '0.0',
                Profundidad: '0.0',
                RazonSocial: USE_EUP_SANDBOX_CODES ? 'EUROPASTRY' : (getParty('SHIPPER')?.partyName || 'MERTRAMAR SAU'),
                UnidadMedida: cargoStuffing.weightUnit || 'PCE',
                Apilable: '0',
                IdEstado: '-1'
            }
        }
    ],
    
    EstadoDetalle: {
        Estado: 'INGRESADO', // Uppercase to match DB
        EstadoFecha: formatUnigisDate(jsonData.updateTimestamp || todayDate + 'T11:27:00'),
        ValidarTransicion: '0', // Set to 0 to skip transition check
        Login: jsonData.updateUserId || 'admin'
    }
};

const SCHEMA_TYPES = {
    RefDocumento: 'string',
    CodigoOperacion: 'string',
    TipoPedido: 'string',
    RefDocumentoAdicional: 'string',
    RefDocumentoAdicional2: 'string',
    RefDocumentoOT: 'string',
    Fecha: 'date',
    FechaEntrega: 'date',
    FechaEntregaOriginal: 'date',
    FechaRecoleccion: 'date',
    VigenciaDesde: 'date',
    VigenciaHasta: 'date',
    InicioHorario1: 'int',
    FinHorario1: 'int',
    InicioHorario2: 'int',
    FinHorario2: 'int',
    InicioHorarioRecoleccion1: 'int',
    FinHorarioRecoleccion1: 'int',
    InicioHorarioRecoleccion2: 'int',
    FinHorarioRecoleccion2: 'int',
    TiempoEspera: 'int',
    Descripcion: 'string',
    cargaExclusiva: 'int',
    Observaciones: 'string',
    Volumen: 'float',
    Peso: 'float',
    Bulto: 'int',
    Pallets: 'float',
    Unidades: 'int',
    ValorDeclarado: 'float',
    Varchar1: 'string',
    Varchar2: 'string',
    Varchar3: 'string',
    Varchar4: 'string',
    Varchar5: 'string',
    Varchar6: 'string',
    Varchar7: 'string',
    Varchar8: 'string',
    Varchar9: 'string',
    Int1: 'int',
    Int2: 'int',
    Float1: 'float',
    Float2: 'float',
    Datetime1: 'date',
    Datetime2: 'date',
    Datetime3: 'date',
    ultimaVisita: 'int',
    usarProductos: 'int',
    ValidarTransicion: 'int',
    agruparItems: 'int',
    obligarProductoItems: 'int',
    depositoSalida: {
        RefDepositoExterno: 'string',
        Descripcion: 'string',
        Direccion: 'string',
        Calle: 'string',
        NroPuerta: 'string',
        Localidad: 'string',
        Pais: 'string',
        Eliminado: 'bool',
        IntegrarFiscal: 'bool'
    },
    depositoLlegada: {
        RefDepositoExterno: 'string',
        Descripcion: 'string',
        Direccion: 'string',
        Calle: 'string',
        NroPuerta: 'string',
        Localidad: 'string',
        Pais: 'string',
        Eliminado: 'bool',
        IntegrarFiscal: 'bool'
    },
    CampoDinamico: {
        _isArray: true,
        _itemTag: 'CampoValor',
        _fields: {
            Campo: 'string',
            Valor: 'string'
        }
    },
    ClienteDador: {
        RefCliente: 'string',
        ReferenciaExterna: 'string',
        RazonSocial: 'string',
        NombreFantasia: 'string',
        Cuit: 'string',
        Telefono1: 'string',
        Telefono2: 'string',
        Direccion: 'string',
        Localidad: 'string',
        eMailGestorDeFlota: 'string',
        CentroDeCosto: 'string',
        IdEstado: 'int',
        IntegrarRNDC: 'bool',
        IntegrarFiscal: 'bool'
    },
    Cliente: {
        RefCliente: 'string',
        RazonSocial: 'string',
        NombreFantasia: 'string',
        Telefono: 'string',
        Telefono2: 'string',
        Telefono3: 'string',
        EMail: 'string',
        Direccion: 'string',
        Calle: 'string',
        NumeroPuerta: 'string',
        Barrio: 'string',
        Localidad: 'string',
        Partido: 'string',
        Provincia: 'string',
        Pais: 'string',
        DomicilioCodigoPostal: 'string',
        Contacto: 'string',
        Int1: 'int',
        Int2: 'int',
        Float1: 'float',
        Float2: 'float',
        Bonificacion: 'float',
        PesoMaxTipoVehiculo: 'float',
        VolumenMaxTipoVehiculo: 'float',
        PalletMaxTipoVehiculos: 'int',
        BultosMaxTipoVehiculo: 'int',
        AltoMaxTipoVehiculo: 'float',
        AnchoMaxTipoVehiculo: 'float',
        ProfundidadMaxTipoVehiculo: 'float',
        CargaExclusiva: 'bool',
        IgnorarOperacion: 'bool',
        IgnorarOperacionDomicilioOrden: 'bool',
        CrearDomicilioOrden: 'bool',
        ActualizarDomicilioOrden: 'bool',
        ValidarDomicilioOrden: 'bool',
        IntegrarRNDC: 'bool',
        IntegrarFiscal: 'bool'
    },
    Items: {
        _isArray: true,
        _itemTag: 'pOrdenPedidoItem',
        _fields: {
            RefDocumento: 'string',
            RefDocumentoAdicional: 'string',
            RefDocumentoItemOT: 'string',
            Cantidad: 'float',
            Unidades: 'float',
            Descripcion: 'string',
            CodigoProducto: 'string',
            UnidadMedida: 'string',
            FechaEntrega: 'date',
            PrecioUnitario: 'float',
            ImporteCosto: 'float',
            Volumen: 'float',
            Peso: 'float',
            Bulto: 'int',
            Pallets: 'float',
            Int1: 'int',
            Int2: 'int',
            ProcesarVolumetria: 'int',
            Apilable: 'int',
            Alto: 'float',
            Ancho: 'float',
            Profundidad: 'float',
            Producto: {
                RefProducto: 'string',
                Codigo: 'string',
                Descripcion: 'string',
                Volumen: 'float',
                Peso: 'float',
                Bultos: 'int',
                Alto: 'float',
                Ancho: 'float',
                Profundidad: 'float',
                RazonSocial: 'string',
                UnidadMedida: 'string',
                Apilable: 'int',
                IdEstado: 'int'
            }
        }
    },
    EstadoDetalle: {
        Estado: 'string',
        EstadoFecha: 'date',
        ValidarTransicion: 'int',
        Login: 'string'
    }
};

const indent = (level) => '  '.repeat(level);

function serializeNode(schema, currentData, level) {
    let xml = '';
    
    for (const key in schema) {
        if (key.startsWith('_')) continue;
        const type = schema[key];
        const val = currentData ? currentData[key] : undefined;
        
        if (typeof type === 'object' && type !== null && type._isArray) {
            const arr = val || [];
            if (arr.length > 0) {
                xml += `${indent(level)}<unis:${key}>\n`;
                arr.forEach(item => {
                    xml += `${indent(level + 1)}<unis:${type._itemTag}>\n`;
                    xml += serializeNode(type._fields, item, level + 2);
                    xml += `${indent(level + 1)}</unis:${type._itemTag}>\n`;
                });
                xml += `${indent(level)}</unis:${key}>\n`;
            }
            continue;
        }
        
        if (typeof type === 'object' && type !== null) {
            const nestedXml = serializeNode(type, val, level + 1);
            if (nestedXml.trim()) {
                xml += `${indent(level)}<unis:${key}>\n${nestedXml}${indent(level)}</unis:${key}>\n`;
            }
            continue;
        }
        
        let content = '';
        if (val !== undefined && val !== null && String(val).trim() !== '') {
            content = String(val).trim();
        } else {
            if (type === 'int') content = '0';
            else if (type === 'float') content = '0.0';
            else if (type === 'bool') content = 'false';
            else if (type === 'date') content = todayDate;
            else content = '';
        }
        
        xml += `${indent(level)}<unis:${key}>${escapeXml(content)}</unis:${key}>\n`;
    }
    
    return xml;
}

const orderXml = serializeNode(SCHEMA_TYPES, data, 4);

const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:unis="http://unisolutions.com.ar/">
   <soapenv:Header/>
   <soapenv:Body>
      <unis:CrearOrdenesPedido>
         <unis:apiKey>FA-57-7F-50-AE-E</unis:apiKey>
         <unis:pedidos>
            <unis:pOrdenPedido>
${orderXml}            </unis:pOrdenPedido>
         </unis:pedidos>
      </unis:CrearOrdenesPedido>
   </soapenv:Body>
</soapenv:Envelope>`;

fs.writeFileSync('maersk_soap_request.xml', soapEnvelope, 'utf8');
console.log("Successfully generated maersk_soap_request.xml V3 with full dynamic mappings");
