/* eslint-disable @typescript-eslint/no-explicit-any */
export type SchemaValue = '' | 'bool' | { _default: string } | string;
export interface ArraySchema { _isArray: true; _itemTag: string; _fields: Record<string, any>; }
export interface SchemaNode { [key: string]: SchemaValue | SchemaNode | ArraySchema; }

export const SCHEMA: { Root: SchemaNode } = {
  Root: {
    ClienteDador: {
      ReferenciaExterna: '',
      RazonSocial: '',
      NombreFantasia: '',
      Cuit: '',
      Telefono1: '',
      Telefono2: '',
      Direccion: '',
      Localidad: '',
      eMailGestorDeFlota: '',
      CentroDeCosto: '',
      operaciones: {
        _isArray: true,
        _itemTag: 'pOperacion',
        _fields: {
          Descripcion: '',
          IdOperacion: '',
          Referencia: '',
          Sucursal: '',
          ReferenciaExterna: '',
        },
      },
      CampoDinamico: {
        _isArray: true,
        _itemTag: 'CampoValor',
        _fields: { Campo: '', Valor: '' },
      },
      IdEstado: '',
      IntegrarRNDC: 'bool',
    },
  },
};

export const KNOWN_BOOLEAN_PATHS: string[] = [
  'Root.ClienteDador.IntegrarRNDC',
];

export const FIELD_GROUPS: Record<string, string[]> = {
  pClienteDador: [
    'Root.ClienteDador.ReferenciaExterna',
    'Root.ClienteDador.RazonSocial',
    'Root.ClienteDador.NombreFantasia',
    'Root.ClienteDador.Cuit',
    'Root.ClienteDador.Telefono1',
    'Root.ClienteDador.Telefono2',
    'Root.ClienteDador.Direccion',
    'Root.ClienteDador.Localidad',
    'Root.ClienteDador.eMailGestorDeFlota',
    'Root.ClienteDador.CentroDeCosto',
    'Root.ClienteDador.IdEstado',
    'Root.ClienteDador.IntegrarRNDC',
  ],
  Operaciones: [
    'Root.ClienteDador.operaciones.Descripcion',
    'Root.ClienteDador.operaciones.IdOperacion',
    'Root.ClienteDador.operaciones.Referencia',
    'Root.ClienteDador.operaciones.Sucursal',
    'Root.ClienteDador.operaciones.ReferenciaExterna',
  ],
  Dinamicos: [],
};

export interface DynamicFieldSection { basePath: string; label: string; }
export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {
  ClienteDador: { basePath: 'Root.ClienteDador.CampoDinamico', label: 'Campos Dinámicos Cliente Dador' },
};

export const REQUIRED_FIELDS: string[] = [
  'Root.ClienteDador.ReferenciaExterna',
  'Root.ClienteDador.RazonSocial',
];

export function getAllFields(obj: Record<string, any> = SCHEMA, prefix = ''): string[] {
  const fields: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && val._isArray && val._fields && key !== 'CampoDinamico') {
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
