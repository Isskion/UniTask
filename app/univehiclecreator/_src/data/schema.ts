/* eslint-disable @typescript-eslint/no-explicit-any */
// =============================================================================
// UNIGIS Vehicle Schema
// Contains: SCHEMA, FIELD_GROUPS, KNOWN_BOOLEAN_PATHS, DYNAMIC_FIELD_SECTIONS,
//           REQUIRED_FIELDS, and helper types.
// =============================================================================

export type SchemaValue = '' | 'bool' | { _default: string };

export interface ArraySchema {
    _isArray: true;
    _itemTag: string;
    _fields: Record<string, any>;
}

export interface SchemaNode {
    [key: string]: SchemaValue | SchemaNode | ArraySchema;
}

// ---------------------------------------------------------------------------
// SCHEMA — mirrors the CrearVehiculos payload structure
// ---------------------------------------------------------------------------
export const SCHEMA: { Vehiculo: SchemaNode } = {
    Vehiculo: {
        // --- SCALARS ---
        Dominio: '',
        DominioSemi: '',
        NroSerie: '',
        Prestador: '',
        Flota: '',
        Chasis: '',
        Volumen: '',
        Peso: '',
        Ciudad: '',
        Marca: '',
        Modelo: '',
        Combustible: '',
        TipoVehiculo: '',
        TipoCarroceria: '',
        Propietario: '',
        Conductor: '',
        CoConductor: '',
        Aseguradora: '',
        Transporte: '',
        Categoria: '',
        ReferenciaExterna: '',
        Linea: '',
        Color: '',
        TipoEjes: '',
        Contrato: '',
        TipoCarga: '',
        RefTipoVehiculo: '',
        Varchar1: '',
        Varchar2: '',
        Varchar3: '',
        Varchar4: '',
        Varchar5: '',
        Varchar6: '',
        Varchar7: '',
        Varchar8: '',
        DiasPermitidos: '',

        // Nested lists (simple and complex)
        Grupos: {
            _isArray: true,
            _itemTag: 'string',
            _fields: { _value: '' }
        },

        // Nested objects
        pPropietario: {
            DNI_CUIT_CUIL: '',
            Nombre: '',
            Apellido: '',
            EMail: '',
            Telefono1: '',
            Telefono2: '',
            ReferenciaExterna: '',
            Observaciones: '',
            Barrio: '',
            Localidad: '',
            Calle: '',
            Numero: '',
            TipoPropietario: '',
            Partido: '',
            Provincia: '',
            EntidadIntegracion: {
                _isArray: true,
                _itemTag: 'CampoValor',
                _fields: { Campo: '', Valor: '' }
            },
            IdEstado: { _default: '-1' },
            IntegrarRNDC: 'bool',
            IntegrarCTE: 'bool'
        },

        pTransporte: {
            Referencia: '',
            ReferenciaAdicional: '',
            Descripcion: '',
            Cuit: '',
            Direccion: '',
            Telefono1: '',
            Telefono2: '',
            HabilitadoAdministrativo: '',
            HabilitadoOperativo: '',
            RazonSocial: '',
            NombreFantasia: '',
            Email: '',
            TipoTransporte: '',
            Partido: '',
            Provincia: '',
            Localidad: '',
            ReferenciaExternaEstadoTransporte: '',
            Contacto: '',
            CodigoPostal: '',
            DescripcionEstado: '',
            DescripcionGrupoTendering: '',
            Conductores: {
                _isArray: true,
                _itemTag: 'pConductorTransporte',
                _fields: { ReferenciaExterna: '', NroDocumento: '' }
            },
            IdEstado: { _default: '-1' },
            HorarioDesdeTendering: { _default: '-1' },
            HorarioHastaTendering: { _default: '-1' },
            PrioridadTendering: { _default: '-1' },
            HorarioPublicacionDesdeTendering: { _default: '-1' },
            HorarioPublicacionHastaTendering: { _default: '-1' },
            Calificacion: { _default: '-1' },
            Latitud: { _default: '-1' },
            Longitud: { _default: '-1' },
            HabilitadoTendering: 'bool',
            IntegrarRNDC: 'bool'
        },

        CampoDinamico: {
            _isArray: true,
            _itemTag: 'CampoValor',
            _fields: { Campo: '', Valor: '' }
        },

        // Vehicle metadata defaults
        Tara: { _default: '-1' },
        FechaFabricacion: { _default: '0001-01-01T00:00:00' },
        IdEstado: { _default: '-1' },
        IdEstadoVehiculo: { _default: '-1' },
        Int1: { _default: '-1' },
        Int2: { _default: '-1' },
        Float1: { _default: '-1' },
        Float2: { _default: '-1' },
        IntegrarRNDC: 'bool',
        IntegrarCTE: 'bool'
    }
};

// ---------------------------------------------------------------------------
// KNOWN BOOLEAN PATHS
// ---------------------------------------------------------------------------
export const KNOWN_BOOLEAN_PATHS: string[] = [
    'Vehiculo.IntegrarRNDC',
    'Vehiculo.IntegrarCTE',
    'Vehiculo.pPropietario.IntegrarRNDC',
    'Vehiculo.pPropietario.IntegrarCTE',
    'Vehiculo.pTransporte.HabilitadoTendering',
    'Vehiculo.pTransporte.IntegrarRNDC'
];

// ---------------------------------------------------------------------------
// FIELD GROUPS
// ---------------------------------------------------------------------------
export const FIELD_GROUPS: Record<string, string[]> = {
    pVehiculo: [
        'Vehiculo.Dominio',
        'Vehiculo.DominioSemi',
        'Vehiculo.NroSerie',
        'Vehiculo.Prestador',
        'Vehiculo.Flota',
        'Vehiculo.Chasis',
        'Vehiculo.Volumen',
        'Vehiculo.Peso',
        'Vehiculo.Ciudad',
        'Vehiculo.Marca',
        'Vehiculo.Modelo',
        'Vehiculo.Combustible',
        'Vehiculo.TipoVehiculo',
        'Vehiculo.TipoCarroceria',
        'Vehiculo.Propietario',
        'Vehiculo.Conductor',
        'Vehiculo.CoConductor',
        'Vehiculo.Aseguradora',
        'Vehiculo.Transporte',
        'Vehiculo.Categoria',
        'Vehiculo.ReferenciaExterna',
        'Vehiculo.Linea',
        'Vehiculo.Color',
        'Vehiculo.TipoEjes',
        'Vehiculo.Contrato',
        'Vehiculo.TipoCarga',
        'Vehiculo.RefTipoVehiculo',
        'Vehiculo.Varchar1',
        'Vehiculo.Varchar2',
        'Vehiculo.Varchar3',
        'Vehiculo.Varchar4',
        'Vehiculo.Varchar5',
        'Vehiculo.Varchar6',
        'Vehiculo.Varchar7',
        'Vehiculo.Varchar8',
        'Vehiculo.DiasPermitidos',
        'Vehiculo.Grupos',
        'Vehiculo.Tara',
        'Vehiculo.FechaFabricacion',
        'Vehiculo.IdEstado',
        'Vehiculo.IdEstadoVehiculo',
        'Vehiculo.Int1',
        'Vehiculo.Int2',
        'Vehiculo.Float1',
        'Vehiculo.Float2',
        'Vehiculo.IntegrarRNDC',
        'Vehiculo.IntegrarCTE'
    ],
    pPropietario: [
        'Vehiculo.pPropietario.DNI_CUIT_CUIL',
        'Vehiculo.pPropietario.Nombre',
        'Vehiculo.pPropietario.Apellido',
        'Vehiculo.pPropietario.EMail',
        'Vehiculo.pPropietario.Telefono1',
        'Vehiculo.pPropietario.Telefono2',
        'Vehiculo.pPropietario.ReferenciaExterna',
        'Vehiculo.pPropietario.Observaciones',
        'Vehiculo.pPropietario.Barrio',
        'Vehiculo.pPropietario.Localidad',
        'Vehiculo.pPropietario.Calle',
        'Vehiculo.pPropietario.Numero',
        'Vehiculo.pPropietario.TipoPropietario',
        'Vehiculo.pPropietario.Partido',
        'Vehiculo.pPropietario.Provincia',
        'Vehiculo.pPropietario.IdEstado',
        'Vehiculo.pPropietario.IntegrarRNDC',
        'Vehiculo.pPropietario.IntegrarCTE'
    ],
    pTransporte: [
        'Vehiculo.pTransporte.Referencia',
        'Vehiculo.pTransporte.ReferenciaAdicional',
        'Vehiculo.pTransporte.Descripcion',
        'Vehiculo.pTransporte.Cuit',
        'Vehiculo.pTransporte.Direccion',
        'Vehiculo.pTransporte.Telefono1',
        'Vehiculo.pTransporte.Telefono2',
        'Vehiculo.pTransporte.HabilitadoAdministrativo',
        'Vehiculo.pTransporte.HabilitadoOperativo',
        'Vehiculo.pTransporte.RazonSocial',
        'Vehiculo.pTransporte.NombreFantasia',
        'Vehiculo.pTransporte.Email',
        'Vehiculo.pTransporte.TipoTransporte',
        'Vehiculo.pTransporte.Partido',
        'Vehiculo.pTransporte.Provincia',
        'Vehiculo.pTransporte.Localidad',
        'Vehiculo.pTransporte.ReferenciaExternaEstadoTransporte',
        'Vehiculo.pTransporte.Contacto',
        'Vehiculo.pTransporte.CodigoPostal',
        'Vehiculo.pTransporte.DescripcionEstado',
        'Vehiculo.pTransporte.DescripcionGrupoTendering',
        'Vehiculo.pTransporte.Conductores.ReferenciaExterna',
        'Vehiculo.pTransporte.Conductores.NroDocumento',
        'Vehiculo.pTransporte.IdEstado',
        'Vehiculo.pTransporte.HorarioDesdeTendering',
        'Vehiculo.pTransporte.HorarioHastaTendering',
        'Vehiculo.pTransporte.PrioridadTendering',
        'Vehiculo.pTransporte.HorarioPublicacionDesdeTendering',
        'Vehiculo.pTransporte.HorarioPublicacionHastaTendering',
        'Vehiculo.pTransporte.Calificacion',
        'Vehiculo.pTransporte.Latitud',
        'Vehiculo.pTransporte.Longitud',
        'Vehiculo.pTransporte.HabilitadoTendering',
        'Vehiculo.pTransporte.IntegrarRNDC'
    ],
    Dinamicos: [],
    Booleans: [
        'Vehiculo.IntegrarRNDC',
        'Vehiculo.IntegrarCTE',
        'Vehiculo.pPropietario.IntegrarRNDC',
        'Vehiculo.pPropietario.IntegrarCTE',
        'Vehiculo.pTransporte.HabilitadoTendering',
        'Vehiculo.pTransporte.IntegrarRNDC'
    ]
};

// ---------------------------------------------------------------------------
// DYNAMIC FIELD SECTIONS
// ---------------------------------------------------------------------------
export interface DynamicFieldSection {
    basePath: string;
    label: string;
}

export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {
    Vehiculo: { basePath: 'Vehiculo.CampoDinamico', label: 'Vehículo' },
    Propietario: { basePath: 'Vehiculo.pPropietario.EntidadIntegracion', label: 'Propietario' }
};

// ---------------------------------------------------------------------------
// REQUIRED FIELDS
// ---------------------------------------------------------------------------
export const REQUIRED_FIELDS: string[] = [
    'Vehiculo.Dominio'
];

// ---------------------------------------------------------------------------
// Helper: Get all fields recursively
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
// Helper: Get dynamic fields count paths
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
