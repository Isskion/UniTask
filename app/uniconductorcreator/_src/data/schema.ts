/* eslint-disable @typescript-eslint/no-explicit-any */
export type SchemaValue = '' | 'bool' | { _default: string } | string;
export interface ArraySchema { _isArray: true; _itemTag: string; _fields: Record<string, any>; }
export interface SchemaNode { [key: string]: SchemaValue | SchemaNode | ArraySchema; }

// Cantidad de slots fijos para arrays "variables por fila" (Transportes/Operaciones).
// Nota de diseño (2026-09-18): el wizard de Campos Dinámicos (DynamicFieldsWizard) heredado
// de la plantilla NUNCA llegó a conectarse al MapperPanel en ninguna de las 5 herramientas
// anteriores — la pestaña "Dinámicos" siempre tuvo FIELD_GROUPS.Dinamicos = [] y getDynamicFields()
// no se llama desde ningún sitio (código muerto). En vez de arreglar/generalizar ese mecanismo
// roto, aquí se usan slots numerados fijos como campos normales de FIELD_GROUPS — mismo
// mecanismo ya probado en producción (KNOWN_BOOLEAN_PATHS + xmlBuilder ya soporta mapeo
// indexado `path[n].Campo` de forma genérica, ver buildNode "Indexed mappings").
export const MAX_TRANSPORTES = 3;
export const MAX_OPERACIONES = 5;

export const SCHEMA: { Root: SchemaNode } = {
  Root: {
    Conductor: {
      Login: '',
      Nombre: '',
      Apellido: '',
      EMail: '',
      Telefono1: '',
      ReferenciaExterna: '',
      NroDocumento: '',
      TipoDocumento: '',
      SincronizarUsuario: 'bool',
      Licencia: '',
      Expedicion: '',
      Vencimiento: '',
      TipoConductor: '',
      transportes: {
        _isArray: true,
        _itemTag: 'pTransporte',
        _fields: {
          Referencia: '',
          HabilitadoAdministrativo: '',
          HabilitadoOperativo: '',
        },
      },
      operaciones: {
        _isArray: true,
        _itemTag: 'pOperacion',
        _fields: {
          IdOperacion: '',
        },
      },
    },
  },
};

export const KNOWN_BOOLEAN_PATHS: string[] = [
  'Root.Conductor.SincronizarUsuario',
  ...Array.from({ length: MAX_TRANSPORTES }, (_, i) => `Root.Conductor.transportes[${i + 1}].HabilitadoAdministrativo`),
  ...Array.from({ length: MAX_TRANSPORTES }, (_, i) => `Root.Conductor.transportes[${i + 1}].HabilitadoOperativo`),
];

export const FIELD_GROUPS: Record<string, string[]> = {
  pConductor: [
    'Root.Conductor.Login',
    'Root.Conductor.Nombre',
    'Root.Conductor.Apellido',
    'Root.Conductor.EMail',
    'Root.Conductor.Telefono1',
    'Root.Conductor.ReferenciaExterna',
    'Root.Conductor.NroDocumento',
    'Root.Conductor.TipoDocumento',
    'Root.Conductor.SincronizarUsuario',
    'Root.Conductor.Licencia',
    'Root.Conductor.Expedicion',
    'Root.Conductor.Vencimiento',
    'Root.Conductor.TipoConductor',
  ],
  Transportes: Array.from({ length: MAX_TRANSPORTES }, (_, i) => [
    `Root.Conductor.transportes[${i + 1}].Referencia`,
    `Root.Conductor.transportes[${i + 1}].HabilitadoAdministrativo`,
    `Root.Conductor.transportes[${i + 1}].HabilitadoOperativo`,
  ]).flat(),
  Operaciones: Array.from({ length: MAX_OPERACIONES }, (_, i) => `Root.Conductor.operaciones[${i + 1}].IdOperacion`),
  Dinamicos: [],
};

// Valores válidos conocidos en UNIGIS (Europastry, 2026-09-18) — confirmar si aparece un
// código nuevo no listado aquí antes de asumir que es un error de mapeo.
export const TIPO_DOCUMENTO_VALUES = [
  { value: 'DNI', label: 'DNI — Documento nacional de identidad' },
  { value: 'LC', label: 'LC — Libreta cívica' },
  { value: 'CO-REMM', label: 'CO-REMM — Remesa municipal' },
  { value: 'CO-RVM', label: 'CO-RVM — Registro viaje municipal' },
];

export const TIPO_CONDUCTOR_VALUES = [
  { value: 'PROPIO', label: 'PROPIO' },
  { value: 'EXT', label: 'EXT' },
];

export interface DynamicFieldSection { basePath: string; label: string; }
export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {};

export const REQUIRED_FIELDS: string[] = [
  'Root.Conductor.Login',
  'Root.Conductor.Nombre',
  'Root.Conductor.Apellido',
  'Root.Conductor.NroDocumento',
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

// Mantenido solo por compatibilidad con el resto de la plantilla (SavedMappings,
// LayoutExporter, MappingWizard importan DYNAMIC_FIELD_SECTIONS/dynamicFieldCounts) —
// en esta herramienta no hay secciones dinámicas activas, ver nota de diseño arriba.
export function getDynamicFields(_counts: Record<string, number>): string[] {
  return [];
}
