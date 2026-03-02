export interface MappingTemplate {
    id: string;
    name: string;
    description: string;
    mapping: Record<string, string>;
}

export const MAPPING_TEMPLATES: MappingTemplate[] = [
    {
        id: 'standard',
        name: '📦 Pedido Estándar',
        description: 'Mapeo básico para pedidos simples con un solo destino.',
        mapping: {
            'Orden.RefDocumento': 'Referencia',
            'Orden.Fecha': 'Fecha',
            'Orden.Cliente.RefCliente': 'ID Cliente',
            'Orden.Cliente.RazonSocial': 'Nombre Cliente',
            'Orden.Cliente.Domicilio.Calle': 'Calle',
            'Orden.Cliente.Domicilio.NumeroPuerta': 'Numero',
            'Orden.Cliente.Domicilio.Colonia': 'Colonia',
            'Orden.Cliente.Domicilio.Localidad': 'Ciudad',
            'Orden.Cliente.Domicilio.Provincia': 'Estado',
            'Orden.Cliente.Domicilio.Pais': 'Pais',
            'Orden.Cliente.Telefono': 'Telefono',
            'Orden.Cliente.Email': 'Email',
            'Orden.FechaEntrega': 'Fecha Entrega',
        },
    },
    {
        id: 'detailed',
        name: '🚛 Pedido Detallado (Peso/Vol)',
        description: 'Incluye dimensiones, peso y franja horaria.',
        mapping: {
            'Orden.RefDocumento': 'Pedido ID',
            'Orden.Fecha': 'Fecha Creacion',
            'Orden.Cliente.RefCliente': 'Cliente ID',
            'Orden.Cliente.RazonSocial': 'Cliente Nombre',
            'Orden.Cliente.Domicilio.Calle': 'Direccion Calle',
            'Orden.Cliente.Domicilio.NumeroPuerta': 'Direccion Numero',
            'Orden.Cliente.Domicilio.Colonia': 'Direccion Colonia',
            'Orden.Cliente.Domicilio.Localidad': 'Ciudad',
            'Orden.Cliente.Domicilio.Provincia': 'Estado',
            'Orden.Cliente.Domicilio.Pais': 'Pais',
            'Orden.Cliente.Telefono': 'Contacto Tel',
            'Orden.Cliente.Email': 'Contacto Email',
            'Orden.FechaEntrega': 'Fecha Req',
            'Orden.FranjaHoraria': 'Horario',
            'Orden.Peso': 'Peso Kg',
            'Orden.Volumen': 'Volumen m3',
            'Orden.Bultos': 'Bultos',
            'Orden.ValorDeclarado': 'Valor',
        },
    },
];
