/* ───────────────────────────────────────────
   Swagger Integrator – Types & Constants
   ─────────────────────────────────────────── */

export interface SwaggerSpec {
    swagger?: string;
    info?: { title?: string; version?: string };
    basePath?: string;
    paths: Record<string, Record<string, SwaggerOperation>>;
    definitions?: Record<string, SchemaNode>;
    [key: string]: unknown;
}

export interface SwaggerOperation {
    tags?: string[];
    operationId?: string;
    parameters?: SwaggerParam[];
    responses?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface SwaggerParam {
    name: string;
    in: string;
    schema?: SchemaNode;
    type?: string;
    required?: boolean;
}

export interface SchemaNode {
    type?: string;
    properties?: Record<string, SchemaNode>;
    items?: SchemaNode;
    $ref?: string;
    allOf?: SchemaNode[];
    description?: string;
    format?: string;
    example?: unknown;
    enum?: string[];
}

export interface SwaggerMethod {
    path: string;
    verb: string;
    definition: SwaggerOperation;
    displayName: string;
    tag: string;
}

export interface SwaggerField {
    name: string;
    type: string;
}

export interface LogEntry {
    id: number;
    msg: string;
    type: 'info' | 'success' | 'warning' | 'error';
    time: string;
}

export const UNIGIS_ERRORS: Record<string, string> = {
    "1": "OK", "-1": "Operación no encontrada", "-2": "Vehículo no encontrado",
    "-3": "Prestador no encontrado", "-4": "Sucursal no encontrada",
    "-5": "Referencia no encontrada", "-6": "Error en Fecha",
    "-7": "No encontrado en base de datos", "-8": "Depósito no encontrado",
    "-20": "Registro duplicado", "-27": "Campo sin completar",
    "-28": "Producto no encontrado", "-32": "Cambio no permitido por estado",
    "-49": "Tipo Orden no encontrado", "-50": "Empresa no encontrada",
    "-100": "Error con la API Key", "-200": "Error al iniciar sesión"
};

export const HIDDEN_TAGS = [
    'logisticasync', 'inforasync', 'alerts', 'appointmentsasync',
    'mapserver', 'calculateddistance', 'resources', 'searchaddress',
    'searchpoi', 'shipmentevents', 'shipments', 'searchzipcode',
    'shipmentsstate', 'unigisrouted'
];
