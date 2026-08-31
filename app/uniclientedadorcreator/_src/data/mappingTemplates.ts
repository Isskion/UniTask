export interface MappingTemplate {
    id: string;
    name: string;
    description: string;
    mapping: Record<string, string>;
}

export const MAPPING_TEMPLATES: MappingTemplate[] = [
    {
        id: 'standard',
        name: '🏭 Cliente Dador Estándar',
        description: 'Mapeo básico con referencia, razón social y datos de contacto.',
        mapping: {
            'Root.ClienteDador.ReferenciaExterna': 'Referencia',
            'Root.ClienteDador.RazonSocial': 'Razon Social',
            'Root.ClienteDador.NombreFantasia': 'Nombre Fantasia',
            'Root.ClienteDador.Cuit': 'CIF_NIF',
            'Root.ClienteDador.Telefono1': 'Telefono',
            'Root.ClienteDador.Direccion': 'Direccion',
            'Root.ClienteDador.Localidad': 'Localidad',
            'Root.ClienteDador.eMailGestorDeFlota': 'Email',
        },
    },
    {
        id: 'detailed',
        name: '⚙️ Cliente Dador con Operación',
        description: 'Incluye vinculación de operación y centro de costos.',
        mapping: {
            'Root.ClienteDador.ReferenciaExterna': 'Cod_Dador',
            'Root.ClienteDador.RazonSocial': 'Empresa',
            'Root.ClienteDador.NombreFantasia': 'Nombre Comercial',
            'Root.ClienteDador.Cuit': 'CIF',
            'Root.ClienteDador.Telefono1': 'Telefono 1',
            'Root.ClienteDador.Telefono2': 'Telefono 2',
            'Root.ClienteDador.Direccion': 'Direccion',
            'Root.ClienteDador.Localidad': 'Poblacion',
            'Root.ClienteDador.eMailGestorDeFlota': 'Email Gestor',
            'Root.ClienteDador.CentroDeCosto': 'Centro Costo',
            'Root.ClienteDador.IdEstado': 'Estado',
            'Root.ClienteDador.operaciones.IdOperacion': 'Id Operacion',
            'Root.ClienteDador.operaciones.Descripcion': 'Operacion Desc',
            'Root.ClienteDador.operaciones.Sucursal': 'Sucursal',
        },
    },
];

