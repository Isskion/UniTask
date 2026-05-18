/* eslint-disable @typescript-eslint/no-explicit-any */
export type SchemaValue = '' | 'bool';
export interface ArraySchema { _isArray: true; _itemTag: string; _fields: Record<string, any>; }
export interface SchemaNode { [key: string]: SchemaValue | SchemaNode | ArraySchema; }

export const SCHEMA: { Root: SchemaNode } = {
  Root: {
    CodigoSucursal: '', CodigoOperacion: '',
    Cliente: {
      RefCliente: '', RazonSocial: '', Telefono: '', Telefono2: '', Telefono3: '',
      EMail: '', Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '',
      Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '',
      Latitud: '', Longitud: '', RefDomicilioExterno: '', DomicilioDescripcion: '',
      InicioHorario1: '', InicioHorario2: '', FinHorario1: '', FinHorario2: '',
      TiempoEspera: '', Varchar1: '', Varchar2: '', Grupo: '',
      NumeroDocumento: '', TipoDocumento: '', DomicilioCodigoPostal: '',
      Contacto: '', RazonSocialFiscal: '', IdentificadorFiscal: '', RefExternaDocumentoFiscal: '',
      Int1: { _default: '-1' }, Int2: { _default: '-1' },
      Float1: { _default: '-1' }, Float2: { _default: '-1' }, Bonificacion: { _default: '-1' },
      RequiereTurno: 'bool', CargaExclusiva: 'bool', IgnorarOperacion: 'bool',
      IgnorarOperacionDomicilioOrden: 'bool', CrearDomicilioOrden: 'bool',
      ActualizarDomicilioOrden: 'bool', ValidarDomicilioOrden: 'bool',
      DomicilioFiscal: {
        Direccion: '', Calle: '', NumeroPuerta: '', EntreCalle: '',
        Barrio: '', Localidad: '', Partido: '', Provincia: '', Pais: '',
        Latitud: '', Longitud: '', InicioHorario1: '', InicioHorario2: '',
        FinHorario1: '', FinHorario2: '', TiempoEspera: '',
        Int1: '', Int2: '', Varchar1: '', Varchar2: '', Float1: '', Float2: '',
        GrupoRutas: '', CargaExclusiva: 'bool', CodigoPostal: '', EMail: '', IdentificadorFiscal: '',
      },
      CampoDinamico: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
      CampoDinamicoDomicilio: { _isArray: true, _itemTag: 'CampoValor', _fields: { Campo: '', Valor: '' } },
    },
  },
};

export const KNOWN_BOOLEAN_PATHS: string[] = [
  'Root.Cliente.RequiereTurno','Root.Cliente.CargaExclusiva','Root.Cliente.IgnorarOperacion',
  'Root.Cliente.IgnorarOperacionDomicilioOrden','Root.Cliente.CrearDomicilioOrden',
  'Root.Cliente.ActualizarDomicilioOrden','Root.Cliente.ValidarDomicilioOrden',
  'Root.Cliente.DomicilioFiscal.CargaExclusiva',
];

export const FIELD_GROUPS: Record<string, string[]> = {
  pCliente: [
    'Root.CodigoSucursal','Root.CodigoOperacion',
    'Root.Cliente.RefCliente','Root.Cliente.RazonSocial','Root.Cliente.Telefono','Root.Cliente.Telefono2','Root.Cliente.Telefono3',
    'Root.Cliente.EMail','Root.Cliente.Contacto','Root.Cliente.NumeroDocumento','Root.Cliente.TipoDocumento','Root.Cliente.Grupo',
    'Root.Cliente.Direccion','Root.Cliente.Calle','Root.Cliente.NumeroPuerta','Root.Cliente.EntreCalle',
    'Root.Cliente.Barrio','Root.Cliente.Localidad','Root.Cliente.Partido','Root.Cliente.Provincia','Root.Cliente.Pais',
    'Root.Cliente.Latitud','Root.Cliente.Longitud','Root.Cliente.RefDomicilioExterno','Root.Cliente.DomicilioDescripcion','Root.Cliente.DomicilioCodigoPostal',
    'Root.Cliente.InicioHorario1','Root.Cliente.FinHorario1','Root.Cliente.InicioHorario2','Root.Cliente.FinHorario2','Root.Cliente.TiempoEspera',
    'Root.Cliente.RazonSocialFiscal','Root.Cliente.IdentificadorFiscal','Root.Cliente.RefExternaDocumentoFiscal',
    'Root.Cliente.Varchar1','Root.Cliente.Varchar2','Root.Cliente.Int1','Root.Cliente.Int2','Root.Cliente.Float1','Root.Cliente.Float2','Root.Cliente.Bonificacion',
  ],
  Configuracion: [
    'Root.Cliente.RequiereTurno','Root.Cliente.CargaExclusiva','Root.Cliente.IgnorarOperacion',
    'Root.Cliente.IgnorarOperacionDomicilioOrden','Root.Cliente.CrearDomicilioOrden',
    'Root.Cliente.ActualizarDomicilioOrden','Root.Cliente.ValidarDomicilioOrden',
  ],
  DomicilioFiscal: [
    'Root.Cliente.DomicilioFiscal.Direccion','Root.Cliente.DomicilioFiscal.Calle','Root.Cliente.DomicilioFiscal.NumeroPuerta','Root.Cliente.DomicilioFiscal.EntreCalle',
    'Root.Cliente.DomicilioFiscal.Barrio','Root.Cliente.DomicilioFiscal.Localidad','Root.Cliente.DomicilioFiscal.Partido','Root.Cliente.DomicilioFiscal.Provincia','Root.Cliente.DomicilioFiscal.Pais',
    'Root.Cliente.DomicilioFiscal.Latitud','Root.Cliente.DomicilioFiscal.Longitud','Root.Cliente.DomicilioFiscal.CodigoPostal',
    'Root.Cliente.DomicilioFiscal.EMail','Root.Cliente.DomicilioFiscal.IdentificadorFiscal',
    'Root.Cliente.DomicilioFiscal.InicioHorario1','Root.Cliente.DomicilioFiscal.FinHorario1','Root.Cliente.DomicilioFiscal.InicioHorario2','Root.Cliente.DomicilioFiscal.FinHorario2','Root.Cliente.DomicilioFiscal.TiempoEspera',
    'Root.Cliente.DomicilioFiscal.GrupoRutas','Root.Cliente.DomicilioFiscal.CargaExclusiva',
    'Root.Cliente.DomicilioFiscal.Int1','Root.Cliente.DomicilioFiscal.Int2','Root.Cliente.DomicilioFiscal.Varchar1','Root.Cliente.DomicilioFiscal.Varchar2','Root.Cliente.DomicilioFiscal.Float1','Root.Cliente.DomicilioFiscal.Float2',
  ],
  Dinamicos: [],
};

export interface DynamicFieldSection { basePath: string; label: string; }
export const DYNAMIC_FIELD_SECTIONS: Record<string, DynamicFieldSection> = {
  Cliente: { basePath: 'Root.Cliente.CampoDinamico', label: 'Campos Dinámicos Cliente' },
  ClienteDomicilio: { basePath: 'Root.Cliente.CampoDinamicoDomicilio', label: 'Campos Dinámicos Domicilio' },
};

export const REQUIRED_FIELDS: string[] = ['Root.Cliente.RefCliente','Root.Cliente.RazonSocial'];

export function getAllFields(obj: Record<string, any> = SCHEMA, prefix = ''): string[] {
  const fields: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !val._isArray) { fields.push(...getAllFields(val, fullPath)); }
    else { fields.push(fullPath); }
  }
  return fields;
}

export function getDynamicFields(counts: Record<string, number>): string[] {
  const fields: string[] = [];
  for (const [section, count] of Object.entries(counts)) {
    const sectionConfig = DYNAMIC_FIELD_SECTIONS[section];
    if (!sectionConfig || count <= 0) continue;
    for (let i = 1; i <= count; i++) { fields.push(`${sectionConfig.basePath}[${i}].Campo`); fields.push(`${sectionConfig.basePath}[${i}].Valor`); }
  }
  return fields;
}
