export interface MappingTemplate {
    id: string;
    name: string;
    description: string;
    mapping: Record<string, string>;
}

export const MAPPING_TEMPLATES: MappingTemplate[] = [
    {
        id: 'standard',
        name: '🚚 Transporte Estándar',
        description: 'Mapeo básico con referencia, razón social y datos de contacto.',
        mapping: {
            'Root.Transporte.Referencia': 'Referencia',
            'Root.Transporte.RazonSocial': 'Razon Social',
            'Root.Transporte.NombreFantasia': 'Nombre Fantasia',
            'Root.Transporte.Cuit': 'CIF_NIF',
            'Root.Transporte.Telefono1': 'Telefono',
            'Root.Transporte.Direccion': 'Direccion',
            'Root.Transporte.Localidad': 'Localidad',
            'Root.Transporte.Email': 'Email',
        },
    },
    {
        id: 'detailed',
        name: '📡 Transporte con Tendering',
        description: 'Incluye habilitaciones, estado y configuración de Tendering.',
        mapping: {
            'Root.Transporte.Referencia': 'Cod_Transporte',
            'Root.Transporte.RazonSocial': 'Empresa',
            'Root.Transporte.NombreFantasia': 'Nombre Comercial',
            'Root.Transporte.Cuit': 'CIF',
            'Root.Transporte.Telefono1': 'Telefono 1',
            'Root.Transporte.Telefono2': 'Telefono 2',
            'Root.Transporte.Direccion': 'Direccion',
            'Root.Transporte.Localidad': 'Poblacion',
            'Root.Transporte.Email': 'Email Contacto',
            'Root.Transporte.TipoTransporte': 'Tipo',
            'Root.Transporte.IdEstado': 'Estado',
            'Root.Transporte.HabilitadoAdministrativo': 'Habilitado Admin',
            'Root.Transporte.HabilitadoOperativo': 'Habilitado Operativo',
            'Root.Transporte.HabilitadoTendering': 'Tendering',
            'Root.Transporte.DescripcionGrupoTendering': 'Grupo Tendering',
        },
    },
];
