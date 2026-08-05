// Siembra (o actualiza in-place si ya existe) la plantilla maestra de Discovery
// (tenants/{TENANT_ID}/discoveryTemplates) a partir de la Guía de Descubrimiento UNIGIS TMS.
// Estructura completa de 22 secciones (mismo orden que el documento), con contenido real de
// preguntas en todas ellas. Los catálogos de N filas del documento original (vehículos, tarifas,
// integraciones, datos maestros, KPIs, matriz de requisitos, gap analysis, checklist, hitos...)
// usan el tipo de campo 'table' (ver types/relevamiento.ts DiscoveryField/DiscoveryFieldColumn),
// poblable vía import de Excel en modo tabla (lib/discoveryImporter.ts).
//
// Simplificación conocida y deliberada: las secciones 16 (Decisiones de Diseño), 18 (Matriz de
// Requisitos), 19 (Gap Analysis) y 20 (Checklist de Workshops) se modelan aquí como secciones
// normales con un campo tabla — el diseño original (ver memoria del proyecto) las definía como
// entidades independientes (DecisionLog, RequirementsMatrix, GapAnalysis calculado, WorkshopChecklist
// con ciclo de vida propio). Separar esas entidades es trabajo de una fase futura; por ahora quedan
// dentro del mismo modelo plano de Template/Instance/Responses que ya está implementado.
//
// Uso: node scripts/seed_discovery_template.js <tenantId>

const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();
const TENANT_ID = process.argv[2] || '1';

const SECTIONS = [
    {
        id: 'sec_01_resumen',
        order: 1,
        title: '1. Resumen Ejecutivo',
        fields: [
            { id: 'f_01_01_nombre_proyecto', type: 'text', label: 'Nombre del proyecto' },
            { id: 'f_01_02_cliente', type: 'text', label: 'Cliente' },
            { id: 'f_01_03_fecha_inicio', type: 'text', label: 'Fecha de inicio prevista' },
            { id: 'f_01_04_fecha_golive', type: 'text', label: 'Fecha de go-live prevista' },
            { id: 'f_01_05_resp_unigis', type: 'text', label: 'Responsable UNIGIS' },
            { id: 'f_01_06_resp_cliente', type: 'text', label: 'Responsable cliente' },
            { id: 'f_01_07_paises', type: 'text', label: 'Países / delegaciones en alcance' },
            { id: 'f_01_08_empresas', type: 'text', label: 'Empresas legales en alcance' },
        ],
    },
    {
        id: 'sec_02_compania',
        order: 2,
        title: '2. Información General de la Compañía',
        fields: [
            { id: 'f_02_01_actividad', type: 'text', label: 'Actividad principal y sectores a los que sirve', helpText: 'Ej. Europastry: alimentación / panadería congelada.' },
            { id: 'f_02_02_cobertura', type: 'text', label: 'Cobertura geográfica actual (países)' },
            { id: 'f_02_03_empresas_legales', type: 'number', label: 'Número de empresas legales en el alcance del proyecto' },
            { id: 'f_02_04_delegaciones', type: 'text', label: 'Delegaciones, almacenes o centros logísticos' },
            { id: 'f_02_05_pedidos_dia', type: 'text', label: 'Pedidos / expediciones / rutas por día (promedio)' },
            { id: 'f_02_06_dias_punta', type: 'text', label: 'Días punta (estacionalidad)' },
            { id: 'f_02_07_modelo_logistico', type: 'select', label: 'Modelo logístico', options: ['Propio', 'Tercerizado', 'Mixto'] },
            { id: 'f_02_08_tms_actual', type: 'text', label: '¿Tienen TMS actualmente? ¿Cuál?' },
            { id: 'f_02_09_motivo_cambio', type: 'text', label: '¿Por qué quieren cambiar de TMS o implantar uno nuevo?' },
        ],
    },
    {
        id: 'sec_03_tipologia',
        order: 3,
        title: '3. Tipología de Operaciones de Transporte',
        fields: [
            { id: 'f_03_01_tipos_servicio', type: 'multiselect', label: 'Tipos de operativa que aplican', options: ['Distribución capilar / última milla', 'FTL', 'LTL / grupaje', 'Paquetería', 'Intermodal', 'Internacional', 'Granel', '4PL', 'Industrial', 'Devoluciones', 'Transferencias entre centros'] },
            { id: 'f_03_02_predominante', type: 'text', label: 'Tipo de servicio predominante en volumen' },
            { id: 'f_03_03_modos', type: 'multiselect', label: 'Modos de transporte', options: ['Terrestre', 'Marítimo', 'Ferroviario', 'Aéreo', 'Multimodal'] },
            { id: 'f_03_04_tipologia_carga', type: 'text', label: 'Tipología de carga y restricciones (pallets, ADR, temperatura controlada, contenedores...)' },
        ],
    },
    {
        id: 'sec_04_red',
        order: 4,
        title: '4. Red Logística y Geografía',
        fields: [
            { id: 'f_04_01_nodos', type: 'text', label: 'Nodos de la red (almacenes, plantas, cross-docks, puertos)' },
            { id: 'f_04_02_zonas', type: 'text', label: '¿Cómo están definidas las zonas de distribución? (CP, polígonos, radios)' },
            { id: 'f_04_03_restricciones_horarias', type: 'text', label: 'Zonas con restricciones horarias (ZBE, carga/descarga, acceso a puerto)' },
            { id: 'f_04_04_geocodificacion', type: 'text', label: '¿Qué % de direcciones de clientes están geocodificadas? ¿Con qué proveedor?' },
        ],
    },
    {
        id: 'sec_05_pedidos',
        order: 5,
        title: '5. Gestión de Pedidos',
        fields: [
            { id: 'f_05_01_canales', type: 'multiselect', label: 'Canales de entrada de pedidos', options: ['ERP', 'WMS', 'EDI', 'Portic', 'Transporeon', 'API', 'Portal web', 'Manual', 'Email/teléfono'] },
            { id: 'f_05_02_cutoff', type: 'text', label: '¿Existe hora de corte (cut-off)? ¿Cuál?' },
            { id: 'f_05_03_prerreservas', type: 'boolean', label: '¿Se planifica sobre pedidos no confirmados (prerreservas)?' },
            { id: 'f_05_04_tipologia_pedido', type: 'text', label: 'Tipologías de pedido y particularidades del flujo' },
            { id: 'f_05_05_modificaciones', type: 'text', label: '¿Pueden modificarse los pedidos tras confirmarse? ¿Hasta qué momento?' },
        ],
    },
    {
        id: 'sec_06_planificacion',
        order: 6,
        title: '6. Planificación del Transporte',
        fields: [
            { id: 'f_06_01_modelo', type: 'select', label: 'Modelo de planificación actual', options: ['Manual', 'Asistida por herramienta', 'Automática'] },
            { id: 'f_06_02_herramienta_actual', type: 'text', label: 'Herramienta actual (Excel, TMS legacy, papel)' },
            { id: 'f_06_03_rutas_fijas', type: 'boolean', label: '¿Existen rutas maestras (master routes) predefinidas por zona/cliente?' },
            { id: 'f_06_04_criterio_orden', type: 'text', label: 'Criterio para ordenar las paradas dentro de una ruta' },
            { id: 'f_06_05_criterios_asignacion', type: 'text', label: 'Criterios de asignación de vehículo/conductor (capacidad, ventana horaria, zona, coste...)' },
            { id: 'f_06_06_restricciones_vehiculo', type: 'text', label: 'Restricciones de vehículo (capacidad, temperatura, ADR, nº paradas máx.)' },
            { id: 'f_06_07_cierre_planificacion', type: 'text', label: '¿A qué hora se cierra la planificación diaria?' },
        ],
    },
    {
        id: 'sec_07_flota', order: 7, title: '7. Gestión de Flotas, Vehículos y Conductores',
        fields: [
            { id: 'f_07_01_estructura_flota', type: 'text', label: 'Estructura de la flota (propios / dedicados / spot / terceros) y número de vehículos por tipo' },
            {
                id: 'f_07_02_catalogo_vehiculos', type: 'table', label: 'Catálogo de Tipos de Vehículo',
                helpText: 'Importar desde Excel: una fila por tipo de vehículo.',
                columns: [
                    { id: 'codigo', label: 'Código', type: 'text' },
                    { id: 'descripcion', label: 'Descripción', type: 'text' },
                    { id: 'peso_max_kg', label: 'Peso Max (Kg)', type: 'number' },
                    { id: 'volumen_max_m3', label: 'Volumen Max (M3)', type: 'number' },
                    { id: 'bultos_max', label: 'Bultos Max', type: 'number' },
                    { id: 'temperatura', label: 'Temperatura (°C)', type: 'text' },
                    { id: 'habilitaciones', label: 'Habilitaciones Especiales', type: 'text' },
                    { id: 'cantidad', label: 'Cantidad', type: 'number' },
                ],
            },
            { id: 'f_07_03_conductores', type: 'text', label: 'Número de conductores propios y subcontratados que necesitarán acceso a la app' },
            { id: 'f_07_04_app_actual', type: 'text', label: '¿Tienen app de conductor actualmente? ¿Cuál? ¿La sustituye UNIGIS Mobility o se integra?' },
            { id: 'f_07_05_dispositivo', type: 'select', label: 'Tipo de dispositivo del conductor', options: ['PDA dedicada', 'Smartphone Android', 'Smartphone iOS'] },
            { id: 'f_07_06_cobertura_datos', type: 'boolean', label: '¿Tienen cobertura de datos 4G en todas las zonas de reparto?' },
            { id: 'f_07_07_eventos_app', type: 'text', label: 'Eventos que debe registrar el conductor en la app (entrega completa/parcial/fallida, cobro, incidencia...)' },
            { id: 'f_07_08_firma_foto', type: 'multiselect', label: 'Requisitos de entrega', options: ['Firma del destinatario', 'Fotografía del justificante', 'Lectura de código de barras / QR'] },
        ],
    },
    {
        id: 'sec_08_carriers', order: 8, title: '8. Gestión de Transportistas Externos (Carrier Management)',
        fields: [
            { id: 'f_08_01_num_transportistas', type: 'number', label: 'Número de transportistas externos con los que trabaja habitualmente' },
            { id: 'f_08_02_agencias', type: 'boolean', label: '¿Existen agencias de transporte que gestionan sub-red de distribución?' },
            { id: 'f_08_03_paqueteria', type: 'text', label: 'Transportistas de paquetería nacional/internacional integrados (SEUR, MRW, DHL, Nacex...)' },
            { id: 'f_08_04_portal_actual', type: 'text', label: '¿Existe portal o herramienta actual para comunicarse con transportistas?' },
            { id: 'f_08_05_portal_unigis', type: 'boolean', label: '¿Se requiere el Portal de Transportistas de UNIGIS?' },
            { id: 'f_08_06_comunicacion_carga', type: 'text', label: '¿Cómo se comunica la carga al transportista hoy? (teléfono, email, EDI, portal propio, API)' },
            { id: 'f_08_07_sla', type: 'boolean', label: '¿Existen contratos marco con SLA? ¿Hay penalizaciones por incumplimiento?' },
            { id: 'f_08_08_evaluacion', type: 'text', label: '¿Se evalúa el desempeño de los transportistas? ¿Con qué métricas? (OTD, incidencias, reclamaciones)' },
        ],
    },
    {
        id: 'sec_09_tarifas', order: 9, title: '9. Gestión de Tarifas y Liquidación',
        fields: [
            {
                id: 'f_09_01_tarifas_coste', type: 'table', label: 'Modelos Tarifarios de Coste (Transportistas)',
                columns: [
                    { id: 'modelo', label: 'Modelo de Tarifa', type: 'text' },
                    { id: 'detalle', label: 'Detalle', type: 'text' },
                ],
            },
            {
                id: 'f_09_02_recargos', type: 'table', label: 'Recargos y Conceptos Variables',
                columns: [
                    { id: 'concepto', label: 'Recargo / Concepto Adicional', type: 'text' },
                    { id: 'tipo_calculo', label: 'Tipo de Cálculo', type: 'text' },
                ],
            },
            { id: 'f_09_03_venta', type: 'boolean', label: '¿Se gestiona también la tarifa de venta (precio al cliente) en UNIGIS?' },
            { id: 'f_09_04_liquidacion_donde', type: 'select', label: '¿Dónde se calcula la liquidación de transportistas?', options: ['UNIGIS', 'ERP', 'Ambos (UNIGIS calcula, ERP paga)'] },
            { id: 'f_09_05_periodicidad', type: 'text', label: 'Periodicidad de la liquidación (mensual, quincenal, por servicio)' },
            { id: 'f_09_06_factura_contraste', type: 'boolean', label: '¿El transportista emite factura que se contrasta con la liquidación calculada en UNIGIS?' },
        ],
    },
    {
        id: 'sec_10_tracking', order: 10, title: '10. Ejecución, Tracking y Torre de Control',
        fields: [
            { id: 'f_10_01_seguimiento_actual', type: 'text', label: '¿Cómo se hace el seguimiento de expediciones actualmente?' },
            { id: 'f_10_02_gps', type: 'text', label: '¿Existe telemetría GPS en los vehículos? ¿Qué proveedor? (Webfleet, Transics, TomTom...)' },
            { id: 'f_10_03_fuente_tracking', type: 'select', label: 'Fuente de posición para el tracking', options: ['App conductor', 'GPS vehículo', 'Carrier API', 'Todos'] },
            { id: 'f_10_04_torre_control', type: 'boolean', label: '¿Hay una Torre de Control o sala de tráfico con visión centralizada?' },
            { id: 'f_10_05_eta', type: 'boolean', label: '¿Se requiere ETA (tiempo estimado de llegada) dinámico para los clientes?' },
            { id: 'f_10_06_notificaciones', type: 'multiselect', label: 'Canales de notificación a clientes', options: ['Email automático', 'SMS', 'Portal del cliente', 'Notificación push (app propia)', 'Llamada manual', 'API a sistema externo'] },
            {
                id: 'f_10_07_incidencias', type: 'table', label: 'Tipos de Incidencia y Proceso de Resolución',
                columns: [
                    { id: 'tipo', label: 'Tipo de Incidencia', type: 'text' },
                    { id: 'proceso_resolucion', label: 'Proceso de Resolución', type: 'text' },
                    { id: 'impacto_facturacion', label: 'Impacto en Facturación', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_11_portales', order: 11, title: '11. Portal de Clientes y Portal de Transportistas',
        fields: [
            { id: 'f_11_01_portal_clientes', type: 'boolean', label: '¿Los clientes necesitan acceso a un portal para consultar sus envíos?' },
            { id: 'f_11_02_funciones_portal_cliente', type: 'multiselect', label: 'Funciones necesarias del Portal de Clientes', options: ['Tracking', 'Documentos', 'Histórico', 'Reclamaciones', 'Solicitud de recogida'] },
            { id: 'f_11_03_white_label', type: 'boolean', label: '¿El portal debe estar bajo el branding del cliente implantador (white-label)?' },
            {
                id: 'f_11_04_portal_transportistas', type: 'table', label: 'Funciones del Portal de Transportistas',
                columns: [
                    { id: 'funcion', label: 'Función', type: 'text' },
                    { id: 'prioridad', label: 'Prioridad', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_12_integraciones', order: 12, title: '12. Integraciones con Sistemas Externos',
        fields: [
            {
                id: 'f_12_01_mapa_integraciones', type: 'table', label: 'Mapa de Integraciones',
                helpText: 'Una fila por integración (ERP, WMS, GPS, EDI, Portic, carriers...).',
                columns: [
                    { id: 'nombre', label: 'Nombre / descripción', type: 'text' },
                    { id: 'sistema_origen', label: 'Sistema origen', type: 'text' },
                    { id: 'sistema_destino', label: 'Sistema destino', type: 'text' },
                    { id: 'tipo', label: 'Tipo de integración', type: 'text' },
                    { id: 'direccion', label: 'Dirección', type: 'text' },
                    { id: 'frecuencia', label: 'Frecuencia / trigger', type: 'text' },
                    { id: 'tecnologia', label: 'Tecnología', type: 'text' },
                    { id: 'responsable', label: 'Responsable del desarrollo', type: 'text' },
                    { id: 'criticidad', label: 'Criticidad (bloquea go-live)', type: 'text' },
                ],
            },
            { id: 'f_12_02_criticas', type: 'text', label: '¿Cuáles de estas integraciones son críticas para el go-live (sin ellas no se puede arrancar)?' },
        ],
    },
    {
        id: 'sec_13_datos_maestros', order: 13, title: '13. Datos Maestros',
        fields: [
            {
                id: 'f_13_01_datos_maestros', type: 'table', label: 'Entidades de Datos Maestros',
                columns: [
                    { id: 'entidad', label: 'Entidad UNIGIS', type: 'text' },
                    { id: 'origen_actual', label: 'Origen Actual', type: 'text' },
                    { id: 'num_registros', label: 'Nº Registros Estimados', type: 'number' },
                    { id: 'metodo_carga', label: 'Método de Carga', type: 'text' },
                    { id: 'responsable', label: 'Responsable Mantenimiento', type: 'text' },
                    { id: 'calidad', label: 'Calidad Estimada', type: 'text' },
                ],
            },
            { id: 'f_13_02_geocodificacion', type: 'text', label: 'Nivel de calidad actual de los datos de clientes ¿Están geocodificados?' },
            { id: 'f_13_03_historicos', type: 'boolean', label: '¿Existen datos históricos de operaciones que deban migrarse a UNIGIS?' },
        ],
    },
    {
        id: 'sec_14_reporting', order: 14, title: '14. Reporting, KPIs y Business Intelligence',
        fields: [
            {
                id: 'f_14_01_kpis_operativos', type: 'table', label: 'KPIs Operativos',
                columns: [
                    { id: 'kpi', label: 'KPI', type: 'text' },
                    { id: 'se_mide', label: 'Se Mide Actualmente', type: 'text' },
                    { id: 'herramienta', label: 'Herramienta Actual', type: 'text' },
                    { id: 'objetivo_tobe', label: 'Objetivo TO-BE', type: 'text' },
                ],
            },
            {
                id: 'f_14_02_kpis_financieros', type: 'table', label: 'KPIs Financieros',
                columns: [
                    { id: 'kpi', label: 'KPI', type: 'text' },
                    { id: 'se_mide', label: 'Se Mide Actualmente', type: 'text' },
                    { id: 'herramienta', label: 'Herramienta Actual', type: 'text' },
                    { id: 'objetivo_tobe', label: 'Objetivo TO-BE', type: 'text' },
                ],
            },
            {
                id: 'f_14_03_informes', type: 'table', label: 'Informes Operativos Diarios Imprescindibles',
                columns: [
                    { id: 'informe', label: 'Informe', type: 'text' },
                    { id: 'existe', label: '¿Existe Actualmente?', type: 'text' },
                    { id: 'destinatario', label: 'Destinatario', type: 'text' },
                    { id: 'contenido', label: 'Contenido Esperado', type: 'text' },
                ],
            },
            { id: 'f_14_04_bi_externo', type: 'text', label: '¿Usan alguna herramienta de BI externa? (Power BI, Tableau, Qlik...) ¿Con qué frecuencia se exportaría?' },
        ],
    },
    {
        id: 'sec_15_normativa', order: 15, title: '15. Cumplimiento Normativo y Requisitos Sectoriales',
        fields: [
            {
                id: 'f_15_01_normativas', type: 'table', label: 'Normativas y Requisitos Sectoriales',
                helpText: 'ADR, cadena de frío, CMR/TIR/AETR, Reglamento CE 561/2006, aduanas, APPCC, ZBE, FacturaE/VERIFACTU, RGPD...',
                columns: [
                    { id: 'normativa', label: 'Normativa / Requisito', type: 'text' },
                    { id: 'aplica', label: 'Aplica', type: 'boolean' },
                    { id: 'detalle', label: 'Detalle / Impacto en UNIGIS', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_16_decisiones', order: 16, title: '16. Decisiones de Diseño Específicas de UNIGIS',
        fields: [
            {
                id: 'f_16_01_decisiones', type: 'table', label: 'Registro de Decisiones de Diseño',
                helpText: 'Simplificación conocida: en el diseño original esto es un DecisionLog independiente (con autor y fecha), no un campo más del formulario. Se modela aquí como tabla hasta separar la entidad.',
                columns: [
                    { id: 'area', label: 'Área', type: 'text' },
                    { id: 'pregunta', label: 'Pregunta de Diseño', type: 'text' },
                    { id: 'opciones', label: 'Opciones', type: 'text' },
                    { id: 'decision', label: 'Decisión', type: 'text' },
                    { id: 'justificacion', label: 'Justificación', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_17_usuarios', order: 17, title: '17. Gestión del Cambio, Usuarios y Formación',
        fields: [
            {
                id: 'f_17_01_perfiles_usuario', type: 'table', label: 'Perfiles de Usuario en UNIGIS',
                columns: [
                    { id: 'perfil', label: 'Perfil', type: 'text' },
                    { id: 'funcion', label: 'Función en UNIGIS', type: 'text' },
                    { id: 'num_usuarios', label: 'Número de Usuarios', type: 'number' },
                    { id: 'nivel_digital', label: 'Nivel Digital', type: 'text' },
                    { id: 'necesidad_formacion', label: 'Necesidad de Formación', type: 'text' },
                ],
            },
            { id: 'f_17_02_madurez_digital', type: 'text', label: 'Evaluación de madurez digital del equipo operativo y conductores' },
            {
                id: 'f_17_03_plan_formacion', type: 'table', label: 'Plan de Formación',
                columns: [
                    { id: 'perfil', label: 'Perfil', type: 'text' },
                    { id: 'modalidad', label: 'Modalidad de Formación', type: 'text' },
                    { id: 'duracion', label: 'Duración Estimada', type: 'text' },
                    { id: 'materiales', label: 'Materiales Necesarios', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_18_matriz', order: 18, title: '18. Matriz de Requisitos Funcionales',
        fields: [
            {
                id: 'f_18_01_matriz', type: 'table', label: 'Matriz de Requisitos Funcionales',
                helpText: 'Simplificación conocida: en el diseño original esto es una RequirementsMatrix curada por el consultor, entidad independiente del formulario AS-IS. Se modela aquí como tabla hasta separar la entidad.',
                columns: [
                    { id: 'id_req', label: 'ID', type: 'text' },
                    { id: 'requisito', label: 'Requisito', type: 'text' },
                    { id: 'descripcion', label: 'Descripción', type: 'text' },
                    { id: 'modulo', label: 'Módulo UNIGIS', type: 'text' },
                    { id: 'prioridad', label: 'Prioridad', type: 'text' },
                    { id: 'cobertura', label: 'Cobertura Estándar', type: 'text' },
                    { id: 'desarrollo', label: 'Desarrollo Necesario', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_19_gap', order: 19, title: '19. Gap Analysis',
        fields: [
            {
                id: 'f_19_01_gap', type: 'table', label: 'Gap Analysis (AS-IS vs TO-BE)',
                helpText: 'Simplificación conocida: en el diseño original esto es una vista CALCULADA comparando Responses + RequirementsMatrix contra un CoverageBaseline — no un campo de captura manual. Se modela aquí como tabla editable hasta implementar el cálculo automático.',
                columns: [
                    { id: 'area', label: 'Área', type: 'text' },
                    { id: 'as_is', label: 'AS-IS (Situación Actual)', type: 'text' },
                    { id: 'to_be', label: 'TO-BE (Solución UNIGIS)', type: 'text' },
                    { id: 'gap', label: 'Gap', type: 'text' },
                    { id: 'resolucion', label: 'Resolución', type: 'text' },
                    { id: 'impacto', label: 'Impacto', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_20_checklist', order: 20, title: '20. Checklist de Workshops de Descubrimiento',
        fields: [
            {
                id: 'f_20_01_checklist', type: 'table', label: 'Checklist de Sesiones (1-6)',
                helpText: 'Simplificación conocida: en el diseño original esto es un WorkshopChecklist independiente, con su propio ciclo de vida (no espejo 1:1 de las 22 secciones). Se modela aquí como tabla hasta separar la entidad.',
                columns: [
                    { id: 'sesion', label: 'Sesión', type: 'text' },
                    { id: 'item', label: 'Ítem a Verificar', type: 'text' },
                    { id: 'estado', label: 'Estado (Obtenida/Pendiente/No aplica)', type: 'text' },
                    { id: 'responsable_cliente', label: 'Responsable Cliente', type: 'text' },
                    { id: 'fecha_compromiso', label: 'Fecha Compromiso', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_21_plan', order: 21, title: '21. Próximos Pasos y Plan de Proyecto Preliminar',
        fields: [
            {
                id: 'f_21_01_hitos', type: 'table', label: 'Hitos Principales de la Implantación',
                columns: [
                    { id: 'fase', label: 'Fase', type: 'text' },
                    { id: 'descripcion', label: 'Descripción', type: 'text' },
                    { id: 'entregables', label: 'Entregables Clave', type: 'text' },
                    { id: 'duracion', label: 'Duración Estimada', type: 'text' },
                    { id: 'responsable', label: 'Responsable', type: 'text' },
                ],
            },
            {
                id: 'f_21_02_dependencias', type: 'table', label: 'Dependencias Críticas para el Go-Live',
                columns: [
                    { id: 'dependencia', label: 'Dependencia', type: 'text' },
                    { id: 'responsable', label: 'Responsable', type: 'text' },
                    { id: 'estado', label: 'Estado', type: 'text' },
                    { id: 'riesgo', label: 'Riesgo si se retrasa', type: 'text' },
                ],
            },
        ],
    },
    {
        id: 'sec_22_lecciones', order: 22, title: '22. Lecciones Aprendidas de Proyectos Anteriores',
        fields: [
            {
                id: 'f_22_01_lecciones', type: 'table', label: 'Lecciones Aprendidas',
                columns: [
                    { id: 'area', label: 'Área', type: 'text' },
                    { id: 'leccion', label: 'Lección Aprendida', type: 'text' },
                    { id: 'recomendacion', label: 'Recomendación para Proyectos Futuros', type: 'text' },
                ],
            },
        ],
    },
];

const TEMPLATE_VERSION = '1.1'; // 1.0 = solo secciones 1-6 + stubs; 1.1 = 22 secciones con contenido real

async function seed() {
    console.log(`Seeding Discovery Template for tenant ${TENANT_ID}...`);

    const existing = await db
        .collection('tenants').doc(TENANT_ID).collection('discoveryTemplates')
        .where('isActive', '==', true)
        .limit(1)
        .get();

    const payload = {
        name: 'Guía de Descubrimiento UNIGIS TMS',
        version: TEMPLATE_VERSION,
        isActive: true,
        sections: SECTIONS,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!existing.empty) {
        // Actualiza in-place la plantilla ya sembrada (no crea un segundo doc activo).
        // Nota: las ProjectDiscoveryInstance ya creadas antes de esta actualización quedaron con
        // el snapshot de secciones de la versión anterior — no se retro-migran automáticamente.
        const ref = existing.docs[0].ref;
        await ref.update(payload);
        console.log(`Plantilla actualizada: ${ref.id} (${SECTIONS.length} secciones, versión ${TEMPLATE_VERSION}).`);
        return;
    }

    const ref = db.collection('tenants').doc(TENANT_ID).collection('discoveryTemplates').doc();
    await ref.set({ ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`Plantilla creada: ${ref.id} (${SECTIONS.length} secciones, versión ${TEMPLATE_VERSION}).`);
}

seed().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});
