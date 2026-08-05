// Carga el dataset real de la Matriz de Estados TSP (Transpais) en /UniTrace/transpais.
// Fuente: docx "Evolutivo_MaquinaEstados_TSP" (Secciones 2, 3, 10, 11) + spec original
// UNITASK_TransicionesTSP_spec.md (tabla de estados base 3.1/3.2).
//
// Decisión de modelado importante: el usuario pidió explícitamente que los ESTADOS no vayan
// tipados por operación (solo las transiciones). Pero varios códigos de estado se REUTILIZAN
// con significados distintos entre Internacional e Intermodal (ej. Pedido código 101 =
// "PROG. DIR. DESTINO" en Internacional vs "EN PLANIFICACION" en Intermodal — no son la misma
// cosa, Intermodal colapsa 5 sub-estados de programación en uno solo). Los dos documentos fuente
// tampoco coinciden siempre entre sí en los códigos numéricos exactos de cada estado.
// Para evitar arriesgar datos incorrectos, este script NO intenta adivinar/reconciliar códigos
// numéricos "reales" de UNIGIS: asigna un codigo interno propio y SECUENCIAL por cada nombre de
// estado distinto dentro de cada entidad, en el orden en que aparece (Internacional primero,
// Intermodal después). Esto garantiza que el enlace origen→destino de cada transición sea
// correcto dentro de la herramienta, aunque el número no sea el mismo que en la base de datos
// real de UNIGIS (eso requeriría acceso directo a esa base, que no tenemos aquí).

const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(resolve(__dirname, '../serviceAccountKey.json'), 'utf8'))) });
}
const db = admin.firestore();

const SLUG = 'transpais';

// ── Catálogo de estados por entidad, en orden de aparición (nombre único por entidad) ──
const ESTADOS_POR_ENTIDAD = {
    Pedido: [
        'INGRESADO', 'ERROR-REQUIERE AJUSTE', 'GRABADO', 'CONFIRMADO',
        'PROG. DIR. DESTINO', 'PROG. RECOLECCIÓN', 'PROG. DIR. SALIDA', 'PROG. ARRASTRE', 'PROG. REPARTO',
        'ENTREGADO', 'ENTREGA PARCIAL', 'NO ENTREGADO',
        'RECOLECTADO', 'NO RECOLECTADO', 'RECOLECTADO PARCIAL',
        'LIQUIDADO',
        'RESERVA', 'EN PLANIFICACION',
    ],
    Orden: ['PENDIENTE', 'PLANIFICADA', 'EN TRÁNSITO', 'FINALIZADA', 'RECOLECTADO'],
    Ruta: ['CREADA', 'EN RUTA', 'FINALIZADA'],
    Viaje: [
        'INACTIVO', 'ASIGNADO / PENDIENTE', 'CONFIRMADO', 'RECHAZADO',
        'ACTIVO / EN EJECUCIÓN', 'FINALIZADO', 'RENDIDO', 'LIQUIDABLE', 'LIQUIDADO',
    ],
    Parada: [
        'PENDIENTE', 'EN VIAJE', 'VISITADO / EN GEOCERCA',
        'CARGADO', 'CARGADO PARCIAL', 'NO CARGADO',
        'ENTREGADO', 'ENTREGA PARCIAL', 'NO ENTREGADO',
        'RECOLECTADO EN DEVOLUCIÓN', 'NO RECOLECTADO', 'RECOLECTADO PARCIAL',
    ],
};

function buildEstadosCatalog() {
    const estados = [];
    let nid = 1;
    const codeOf = {}; // codeOf[entidad][nombre] = codigo
    for (const entidad of Object.keys(ESTADOS_POR_ENTIDAD)) {
        codeOf[entidad] = {};
        ESTADOS_POR_ENTIDAD[entidad].forEach((nombre, i) => {
            const codigo = i + 1;
            codeOf[entidad][nombre] = codigo;
            estados.push({ id: nid++, entidad, codigo, nombre, momento: '', descripcion: '', activo: true });
        });
    }
    return { estados, codeOf, nextEstadoId: nid };
}

// ── Transiciones — Operación Internacional (45 filas reales de la tabla, Sección 10) ──
// [entidad, [origenes...], destino, fo, fi, mo, gp, visita(1-4|null), [triggers...], disparadoPor, nota]
const T_INTERNACIONAL = [
    ['Pedido', ['INGRESADO'], 'ERROR-REQUIERE AJUSTE', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['INGRESADO'], 'GRABADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['ERROR-REQUIERE AJUSTE'], 'GRABADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['GRABADO'], 'CONFIRMADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['CONFIRMADO'], 'PROG. DIR. DESTINO', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['CONFIRMADO'], 'PROG. RECOLECCIÓN', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['CONFIRMADO'], 'PROG. DIR. SALIDA', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['CONFIRMADO'], 'PROG. ARRASTRE', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['CONFIRMADO'], 'PROG. REPARTO', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'ENTREGADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'ENTREGA PARCIAL', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'NO ENTREGADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'RECOLECTADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'NO RECOLECTADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['PROG. DIR. DESTINO','PROG. RECOLECCIÓN','PROG. DIR. SALIDA','PROG. ARRASTRE','PROG. REPARTO'], 'RECOLECTADO PARCIAL', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['ENTREGADO','ENTREGA PARCIAL','RECOLECTADO','RECOLECTADO PARCIAL'], 'LIQUIDADO', 0,0,0,0, null, [], 'Viaje', ''],

    ['Orden', ['PENDIENTE'], 'PLANIFICADA', 0,0,0,0, null, ['Parada = 203', 'Viaje = 105'], null, ''],
    ['Orden', ['PLANIFICADA'], 'EN TRÁNSITO', 0,0,0,0, null, [], null, ''],
    ['Orden', ['EN TRÁNSITO'], 'FINALIZADA', 0,0,0,0, null, [], null, ''],
    ['Orden', ['EN TRÁNSITO'], 'RECOLECTADO', 0,0,0,0, null, [], null, ''],

    ['Ruta', ['CREADA'], 'EN RUTA', 0,0,0,0, null, [], null, ''],
    ['Ruta', ['EN RUTA'], 'FINALIZADA', 0,0,0,0, null, [], null, ''],

    ['Viaje', ['INACTIVO'], 'ASIGNADO / PENDIENTE', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['ASIGNADO / PENDIENTE'], 'CONFIRMADO', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['ASIGNADO / PENDIENTE'], 'RECHAZADO', 0,0,1,0, null, [], null, ''],
    ['Viaje', ['RECHAZADO'], 'ASIGNADO / PENDIENTE', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['CONFIRMADO'], 'ACTIVO / EN EJECUCIÓN', 0,0,0,0, null, ['Ruta = 201'], null, ''],
    ['Viaje', ['ACTIVO / EN EJECUCIÓN'], 'FINALIZADO', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['FINALIZADO'], 'RENDIDO', 0,0,0,0, null, ['Ruta = 401'], null, ''],
    ['Viaje', ['RENDIDO'], 'LIQUIDABLE', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['LIQUIDABLE'], 'LIQUIDADO', 0,0,0,0, null, ['Pedido = 502'], null, ''],

    ['Parada', ['PENDIENTE'], 'EN VIAJE', 0,0,0,0, null, ['Orden = 202'], null, ''],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 1, [], null, 'GPS automático'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 2, [], null, 'GPS automático'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 3, [], null, 'GPS automático'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 4, [], null, 'GPS automático'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO', 0,1,0,0, null, [], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO PARCIAL', 0,1,1,0, null, [], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO CARGADO', 1,0,1,0, null, [], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGADO', 1,1,0,0, null, ['Orden = 306', 'Pedido = 303'], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGA PARCIAL', 1,1,1,0, null, ['Orden = 306', 'Pedido = 304'], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO ENTREGADO', 1,0,1,0, null, ['Pedido = 305'], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO EN DEVOLUCIÓN', 0,1,0,0, null, ['Orden = 400', 'Pedido = 400'], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO RECOLECTADO', 1,0,1,0, null, ['Pedido = 404'], null, ''],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO PARCIAL', 0,1,1,0, null, ['Orden = 400', 'Pedido = 405'], null, ''],
];

// ── Transiciones — Operación Intermodal (60 filas reales de la tabla, Sección 11) ──
const T_INTERMODAL = [
    ['Pedido', ['RESERVA'], 'CONFIRMADO', 0,0,0,0, null, [], null, 'Fusión automática Portic/SIC/Maersk'],
    ['Pedido', ['INGRESADO'], 'ERROR-REQUIERE AJUSTE', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['INGRESADO'], 'GRABADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['ERROR-REQUIERE AJUSTE'], 'GRABADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['GRABADO'], 'CONFIRMADO', 0,0,0,0, null, [], null, ''],
    ['Pedido', ['CONFIRMADO'], 'EN PLANIFICACION', 0,0,0,0, null, ['Orden = 102'], null, ''],
    ['Pedido', ['EN PLANIFICACION'], 'ENTREGADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['EN PLANIFICACION'], 'ENTREGA PARCIAL', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['EN PLANIFICACION'], 'NO ENTREGADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['EN PLANIFICACION'], 'RECOLECTADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['EN PLANIFICACION'], 'NO RECOLECTADO', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['EN PLANIFICACION'], 'RECOLECTADO PARCIAL', 0,0,0,0, null, [], 'Parada', ''],
    ['Pedido', ['RECOLECTADO'], 'ENTREGADO', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida OK'],
    ['Pedido', ['RECOLECTADO'], 'ENTREGA PARCIAL', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida OK'],
    ['Pedido', ['RECOLECTADO'], 'NO ENTREGADO', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida OK'],
    ['Pedido', ['RECOLECTADO PARCIAL'], 'ENTREGADO', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida parcial'],
    ['Pedido', ['RECOLECTADO PARCIAL'], 'ENTREGA PARCIAL', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida parcial'],
    ['Pedido', ['RECOLECTADO PARCIAL'], 'NO ENTREGADO', 0,0,0,0, null, [], 'Parada', 'Round Trip — tras recogida parcial'],
    ['Pedido', ['ENTREGADO'], 'LIQUIDADO', 0,0,0,0, null, [], 'Viaje', ''],
    ['Pedido', ['ENTREGA PARCIAL'], 'LIQUIDADO', 0,0,0,0, null, [], 'Viaje', ''],
    ['Pedido', ['RECOLECTADO'], 'LIQUIDADO', 0,0,0,0, null, [], 'Viaje', ''],
    ['Pedido', ['RECOLECTADO PARCIAL'], 'LIQUIDADO', 0,0,0,0, null, [], 'Viaje', ''],

    ['Orden', ['PENDIENTE'], 'PLANIFICADA', 0,0,0,0, null, ['Parada = 203', 'Viaje = 105'], null, ''],
    ['Orden', ['PLANIFICADA'], 'EN TRÁNSITO', 0,0,0,0, null, [], null, ''],
    ['Orden', ['EN TRÁNSITO'], 'FINALIZADA', 0,0,0,0, null, [], null, ''],
    ['Orden', ['EN TRÁNSITO'], 'RECOLECTADO', 0,0,0,0, null, [], null, ''],

    ['Ruta', ['CREADA'], 'EN RUTA', 0,0,0,0, null, [], null, ''],
    ['Ruta', ['EN RUTA'], 'FINALIZADA', 0,0,0,0, null, [], null, ''],

    ['Viaje', ['INACTIVO'], 'ASIGNADO / PENDIENTE', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['ASIGNADO / PENDIENTE'], 'CONFIRMADO', 0,0,0,0, null, [], null, 'Solicita PIN Code a Portic/Maersk'],
    ['Viaje', ['ASIGNADO / PENDIENTE'], 'RECHAZADO', 0,0,1,0, null, [], null, 'Libera recursos en planificación'],
    ['Viaje', ['RECHAZADO'], 'ASIGNADO / PENDIENTE', 0,0,0,0, null, [], null, ''],
    ['Viaje', ['CONFIRMADO'], 'ACTIVO / EN EJECUCIÓN', 0,0,0,0, null, ['Ruta = 201'], null, 'PIN CODE visible en App del conductor'],
    ['Viaje', ['ACTIVO / EN EJECUCIÓN'], 'FINALIZADO', 0,0,0,0, null, ['Ruta = 401'], null, ''],
    ['Viaje', ['FINALIZADO'], 'RENDIDO', 0,0,0,0, null, [], null, 'Carta de porte + eCMR + Portic sellado'],
    ['Viaje', ['RENDIDO'], 'LIQUIDABLE', 0,0,0,0, null, [], null, 'Validación demoras puerto (>2h), desvíos, gasoil'],
    ['Viaje', ['LIQUIDABLE'], 'LIQUIDADO', 0,0,0,0, null, ['Pedido = 502'], null, 'Preliquidación → BC Sync'],

    ['Parada', ['PENDIENTE'], 'EN VIAJE', 0,0,0,0, null, ['Orden = 202'], null, ''],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 1, [], null, 'GPS automático — geocerca'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 2, [], null, 'GPS automático — geocerca'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 3, [], null, 'GPS automático — geocerca'],
    ['Parada', ['EN VIAJE'], 'VISITADO / EN GEOCERCA', 0,0,0,1, 4, [], null, 'GPS automático — geocerca'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO', 1,1,0,0, null, [], null, 'N.º contenedor + precinto (seal) · Remitente'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO PARCIAL', 0,1,1,0, null, [], null, 'Remitente'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO CARGADO', 1,0,1,0, null, [], null, 'Remitente — Alerta a Tráfico'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGADO', 1,1,0,0, null, ['Orden = 306', 'Pedido = 303'], null, 'POD · Consignatario'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGA PARCIAL', 1,1,1,0, null, ['Orden = 306', 'Pedido = 304'], null, 'Consignatario'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO ENTREGADO', 1,0,1,0, null, ['Pedido = 305'], null, 'Consignatario — Alerta a CS'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO EN DEVOLUCIÓN', 0,1,0,0, null, ['Orden = 400', 'Pedido = 400'], null, 'Firma receptor · Puerto/Depot'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO RECOLECTADO', 1,0,1,0, null, ['Pedido = 404'], null, 'Puerto/Depot — Alerta congestión terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO PARCIAL', 0,1,1,0, null, ['Pedido = 405'], null, 'Puerto/Depot'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO', 1,1,0,0, null, [], null, 'N.º contenedor + precinto · Depósito'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'CARGADO PARCIAL', 0,1,1,0, null, [], null, 'Depósito/Terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO CARGADO', 1,0,1,0, null, [], null, 'Depósito/Terminal — Alerta a Tráfico'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGADO', 1,1,0,0, null, ['Orden = 306', 'Pedido = 303'], null, 'POD · Depósito/Terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'ENTREGA PARCIAL', 1,1,1,0, null, ['Orden = 306', 'Pedido = 304'], null, 'Depósito/Terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO ENTREGADO', 1,0,1,0, null, ['Pedido = 305'], null, 'Depósito/Terminal — Alerta a CS'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO EN DEVOLUCIÓN', 0,1,0,0, null, ['Orden = 400', 'Pedido = 400'], null, 'Firma receptor · Depósito/Terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'NO RECOLECTADO', 1,0,1,0, null, ['Pedido = 404'], null, 'Depósito/Terminal'],
    ['Parada', ['EN VIAJE','VISITADO / EN GEOCERCA'], 'RECOLECTADO PARCIAL', 0,1,1,0, null, ['Pedido = 405'], null, 'Depósito/Terminal'],
];

function buildTransiciones(rows, entidad_codeOf, operacionId, startId) {
    let nid = startId;
    const out = [];
    for (const r of rows) {
        const [entidad, origs, dest, fo, fi, mo, gp, visita, trig, cs, nota] = r;
        const origCodes = origs.map(n => {
            const c = entidad_codeOf[entidad][n];
            if (!c) throw new Error('Estado no encontrado: ' + entidad + ' / ' + n);
            return c;
        });
        const destCode = entidad_codeOf[entidad][dest];
        if (!destCode) throw new Error('Estado destino no encontrado: ' + entidad + ' / ' + dest);
        out.push({
            id: nid++, entidad, operacionId,
            estadoOrigen: origCodes, estadoDestino: destCode,
            requiereFoto: !!fo, requiereFirma: !!fi, requiereMotivo: !!mo, validarGeocerca: !!gp,
            idEstadoParadaVisita: visita, triggerCascada: trig, disparadoPor: cs, nota, activo: true,
        });
    }
    return { rows: out, nextId: nid };
}

async function main() {
    const ref = db.collection('uni_trace').doc(SLUG);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('No existe uni_trace/' + SLUG + ' — créalo primero desde /UniTrace en la app.');

    console.log('Restaurando uni_trace/' + SLUG + ' al estado original de Firestore');

    const { estados, codeOf, nextEstadoId } = buildEstadosCatalog();

    const operaciones = [
        { id: 1, nombre: 'Internacional', descripcion: 'Transporte por carretera directo y con arrastre. Operación base de TSP.', color: 'bl', activo: true },
        { id: 2, nombre: 'Intermodal', descripcion: 'Import, Export y Traslados. Incluye RESERVA, EN PLANIFICACION, PIN CODE y Round Trip.', color: 'gr', activo: true },
    ];

    let nextTId = 1;
    const intl = buildTransiciones(T_INTERNACIONAL, codeOf, 1, nextTId);
    nextTId = intl.nextId;
    const iim = buildTransiciones(T_INTERMODAL, codeOf, 2, nextTId);
    nextTId = iim.nextId;

    const transicionesTsp = [...intl.rows, ...iim.rows];

    console.log('Estados:', estados.length);
    console.log('Operaciones:', operaciones.length);
    console.log('Transiciones Internacional:', intl.rows.length);
    console.log('Transiciones Intermodal:', iim.rows.length);
    console.log('Transiciones totales:', transicionesTsp.length);

    const blankTables = { jornadas: [], matriz: [], transiciones: [], plantillas: [], depositos: [], zonas: [], rutas: [], grupos: [] };
    const freshData = Object.assign({}, blankTables, { estados, operaciones, transicionesTsp });
    const freshNextIds = {
        estados: nextEstadoId, jornadas: 1, matriz: 1, transiciones: 1, plantillas: 1, depositos: 1, zonas: 1, rutas: 1, grupos: 1,
        operaciones: operaciones.length + 1, transicionesTsp: nextTId,
    };

    await ref.update({ data: freshData, nextIds: freshNextIds, updatedAt: new Date(), updatedBy: 'seed_transpais_tsp.js' });
    console.log('\nOK — Restauración de uni_trace/' + SLUG + ' completada.');
}

main().then(() => process.exit(0)).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
