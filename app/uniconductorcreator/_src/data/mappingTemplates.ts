export interface MappingTemplate {
    id: string;
    name: string;
    description: string;
    mapping: Record<string, string>;
}

export const MAPPING_TEMPLATES: MappingTemplate[] = [
    {
        id: 'standard',
        name: '👤 Conductor Estándar',
        description: 'Mapeo básico con identidad, documento y contacto (sin transportes/operaciones).',
        mapping: {
            'Root.Conductor.Login': 'Login',
            'Root.Conductor.Nombre': 'Nombre',
            'Root.Conductor.Apellido': 'Apellido',
            'Root.Conductor.NroDocumento': 'DNI',
            'Root.Conductor.TipoDocumento': 'Tipo Documento',
            'Root.Conductor.EMail': 'Email',
            'Root.Conductor.Telefono1': 'Telefono',
            'Root.Conductor.ReferenciaExterna': 'Codigo Chofer',
        },
    },
    {
        id: 'detailed',
        name: '🚚 Conductor con Licencia y Transporte',
        description: 'Incluye licencia de conducir, tipo de conductor y un transporte asignado.',
        mapping: {
            'Root.Conductor.Login': 'Login',
            'Root.Conductor.Nombre': 'Nombre',
            'Root.Conductor.Apellido': 'Apellido',
            'Root.Conductor.NroDocumento': 'NIF',
            'Root.Conductor.TipoDocumento': 'Tipo Doc',
            'Root.Conductor.EMail': 'Email',
            'Root.Conductor.Telefono1': 'Telefono 1',
            'Root.Conductor.ReferenciaExterna': 'Cod Interno',
            'Root.Conductor.TipoConductor': 'Tipo Conductor',
            'Root.Conductor.Licencia': 'Nro Licencia',
            'Root.Conductor.Expedicion': 'Fecha Expedicion',
            'Root.Conductor.Vencimiento': 'Fecha Vencimiento',
            'Root.Conductor.transportes[1].Referencia': 'Transporte',
            'Root.Conductor.transportes[1].HabilitadoAdministrativo': 'Habilitado Admin',
            'Root.Conductor.transportes[1].HabilitadoOperativo': 'Habilitado Operativo',
            'Root.Conductor.operaciones[1].IdOperacion': 'Id Operacion 1',
            'Root.Conductor.operaciones[2].IdOperacion': 'Id Operacion 2',
        },
    },
];
