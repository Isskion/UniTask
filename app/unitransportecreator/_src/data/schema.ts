/* eslint-disable @typescript-eslint/no-explicit-any */
export type SchemaValue = '' | 'bool' | { _default: string } | string;
export interface ArraySchema { _isArray: true; _itemTag: string; _fields: Record<string, any>; }
export interface SchemaNode { [key: string]: SchemaValue | SchemaNode | ArraySchema; }

// Contrato real de CrearTransportes (WSDL UNIGIS, confirmado por el usuario 2026-09-16 —
// no generado a partir del Swagger, que traía duplicados "_opcional" ruidosos para los
// mismos campos). Elemento raíz por transporte: unis:pTransporte. Array wrapper: unis:transportes.
export const SCHEMA: { Root: SchemaNode } = {
  Root: {
    Transporte: {
      Referencia: '',
      ReferenciaAdicional: '',
      Descripcion: '',
      Cuit: '',
      Direccion: '',
      Telefono1: '',
      Telefono2: '',
      // Sin comentario "Optional" en el WSDL real (a diferencia de todos los demás campos) —
      // son obligatorios en el contrato SOAP. Se fuerza default 'false' para que la etiqueta
      // siempre se emita aunque la columna Excel no esté mapeada.
      HabilitadoAdministrativo: { _default: 'false' },
      HabilitadoOperativo: { _default: 'false' },
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
        _fields: {
          ReferenciaExterna: '',
          NroDocumento: '',
        },
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
      HabilitadoTendering: { _default: 'false' },
      IntegrarRNDC: { _default: 'false' },
    },
  },
};

export const KNOWN_BOOLEAN_PATHS: string[] = [
  'Root.Transporte.HabilitadoAdministrativo',
  'Root.Transporte.HabilitadoOperativo',
  'Root.Transporte.HabilitadoTendering',
  'Root.Transporte.IntegrarRNDC',
];

export const FIELD_GROUPS: Record<string, string[]> = {
  pTransporte: [
    'Root.Transporte.Referencia',
    'Root.Transporte.ReferenciaAdicional',
    'Root.Transporte.Descripcion',
    'Root.Transporte.Cuit',
    'Root.Transporte.RazonSocial',
    'Root.Transporte.NombreFantasia',
    'Root.Transporte.TipoTransporte',
    'Root.Transporte.Direccion',
    'Root.Transporte.Localidad',
    'Root.Transporte.Partido',
    'Root.Transporte.Provincia',
    'Root.Transporte.CodigoPostal',
    'Root.Transporte.Telefono1',
    'Root.Transporte.Telefono2',
    'Root.Transporte.Contacto',
    'Root.Transporte.Email',
    'Root.Transporte.HabilitadoAdministrativo',
    'Root.Transporte.HabilitadoOperativo',
    'Root.Transporte.IdEstado',
    'Root.Transporte.DescripcionEstado',
    'Root.Transporte.ReferenciaExternaEstadoTransporte',
    'Root.Transporte.IntegrarRNDC',
  ],
  Tendering: [
    'Root.Transporte.HabilitadoTendering',
    'Root.Transporte.DescripcionGrupoTendering',
    'Root.Transporte.HorarioDesdeTendering',
    'Root.Transporte.HorarioHastaTendering',
    'Root.Transporte.PrioridadTendering',
    'Root.Transporte.HorarioPublicacionDesdeTendering',
    'Root.Transporte.HorarioPublicacionHastaTendering',
    'Root.Transporte.Calificacion',
    'Root.Transporte.Latitud',
    'Root.Transporte.Longitud',
  ],
  Conductores: [
    'Root.Transporte.Conductores.ReferenciaExterna',
    'Root.Transporte.Conductores.NroDocumento',
  ],
};

export interface DynamicFieldSection { basePath: string; label: string; }
// CrearTransportes no tiene bloque CampoDinamico en el WSDL (a diferencia de Depositos/ClienteDador) — sin secciones dinámicas.
export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {};

export const REQUIRED_FIELDS: string[] = [
  'Root.Transporte.Referencia',
  'Root.Transporte.RazonSocial',
];

export function getAllFields(obj: Record<string, any> = SCHEMA, prefix = ''): string[] {
  const fields: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && val._isArray && val._fields) {
      for (const fKey of Object.keys(val._fields)) {
        fields.push(`${fullPath}.${fKey}`);
      }
    } else if (val && typeof val === 'object' && !val._isArray) {
      fields.push(...getAllFields(val, fullPath));
    } else {
      fields.push(fullPath);
    }
  }
  return fields;
}

export function getDynamicFields(_counts: Record<string, number>): string[] {
  return [];
}
