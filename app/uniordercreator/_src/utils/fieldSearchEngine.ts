/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FieldSearchEngine — Motor de búsqueda de campos UNIGIS
 * ─────────────────────────────────────────────────────────
 * Designed for the MappingWizard. Pre-computes an inverted index at module load
 * so every search is O(1) lookup + lightweight scoring. Supports:
 *
 *  1. Exact match (field name, path tail, alias)
 *  2. Prefix / Contains match
 *  3. N-gram fuzzy matching (trigrams)
 *  4. Synonym expansion (Spanish ↔ English ↔ UNIGIS naming)
 *  5. Multi-signal ranking (exact > alias > prefix > contains > ngram > levenshtein)
 *  6. Group-aware search (filter by tab/group)
 *  7. Multi-mapping support (does NOT filter already-mapped fields by default)
 */

import { FIELD_GROUPS, KNOWN_BOOLEAN_PATHS } from '../data/schema';
import { levenshtein } from './levenshtein';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface IndexedField {
    /** Full path: "Orden.Cliente.RazonSocial" */
    path: string;
    /** Short name (last segment): "RazonSocial" */
    shortName: string;
    /** Lowercase short name for comparisons */
    shortLower: string;
    /** Full path lowercase */
    pathLower: string;
    /** Group/tab this field belongs to */
    group: string;
    /** Whether this is a boolean field */
    isBool: boolean;
    /** All searchable tokens (aliases, synonyms, path segments) lowercased */
    tokens: string[];
    /** Trigram set for fuzzy matching */
    trigrams: Set<string>;
    /** Human-readable label for display */
    displayLabel: string;
    /** Parent context: "Cliente", "depositoSalida", etc. */
    parentContext: string;
}

export interface SearchResult {
    field: IndexedField;
    /** Overall relevance score 0-100 */
    score: number;
    /** Which signal matched */
    matchType: 'exact' | 'alias' | 'prefix' | 'contains' | 'ngram' | 'fuzzy';
    /** Highlighted matching part for UI */
    matchedOn: string;
}

export interface SearchOptions {
    /** Max results to return */
    limit?: number;
    /** Filter by group/tab name */
    group?: string;
    /** Fields to exclude from results (already mapped) */
    excludeFields?: Set<string>;
    /** Minimum score threshold (0-100) */
    minScore?: number;
    /** If true, also returns boolean fields even if they score low */
    boostBooleans?: boolean;
}

// ─── Synonym Dictionary ─────────────────────────────────────────────────────────
// Maps common Excel header names (ES/EN) to UNIGIS field names

const SYNONYMS: Record<string, string[]> = {
    // ── Identifiers ──
    'refdocumento':     ['referencia', 'pedido', 'orden', 'nropedido', 'nro_pedido', 'order', 'id', 'nro', 'numero', 'folio', 'guia'],
    'refdocumentoadicional': ['ref_adicional', 'referencia2', 'ref2', 'adicional', 'secondary_ref'],
    'refcliente':       ['cod_cliente', 'codigo_cliente', 'client_code', 'customer_id', 'id_cliente', 'clave_cliente', 'codcliente'],
    'razonsocial':      ['nombre', 'name', 'cliente', 'customer', 'razon', 'razon_social', 'company', 'empresa', 'destinatario'],
    'nombrefantasia':   ['fantasia', 'alias', 'brand', 'marca', 'nombre_fantasia'],
    'referenciaexterna': ['ref_externa', 'external_ref', 'codigo_externo', 'ext_ref', 'ref'],

    // ── Dates ──
    'fecha':            ['date', 'fecha_pedido', 'order_date', 'fecha_orden'],
    'fechaentrega':     ['delivery_date', 'fecha_entrega', 'entrega', 'delivery', 'eta', 'fecha_despacho'],
    'fechacreacionorigen': ['creation_date', 'fecha_creacion', 'created', 'creacion'],
    'fecharecoleccion': ['pickup_date', 'fecha_recogida', 'recoleccion', 'pickup', 'recogida'],

    // ── Address ──
    'direccion':        ['address', 'domicilio', 'dir', 'ubicacion', 'location', 'calle_y_numero'],
    'calle':            ['street', 'via', 'avenida', 'av', 'ruta'],
    'nropuerta':        ['numero', 'number', 'nro', 'num', 'no', 'door', 'altura', 'numeropuerta'],
    'localidad':        ['city', 'ciudad', 'poblacion', 'town', 'locality', 'municipio'],
    'partido':          ['county', 'distrito', 'district', 'depto', 'departamento', 'delegacion'],
    'provincia':        ['state', 'estado', 'region', 'province', 'entidad'],
    'pais':             ['country', 'nacion', 'nation'],
    'codigopostal':     ['zip', 'zipcode', 'cp', 'postal', 'codigo_postal', 'postal_code', 'c_p'],
    'latitud':          ['lat', 'latitude', 'y'],
    'longitud':         ['lng', 'lon', 'longitude', 'x', 'long'],
    'barrio':           ['neighborhood', 'colonia', 'sector', 'zona', 'vecindario'],
    'entrecalle':       ['cross_street', 'entre_calles', 'esquina', 'referencia'],

    // ── Contact ──
    'telefono':         ['phone', 'tel', 'fono', 'movil', 'celular', 'mobile', 'cell', 'contacto_tel'],
    'email':            ['correo', 'mail', 'e_mail', 'correo_electronico', 'email_address', 'e-mail'],
    'contacto':         ['contact', 'persona_contacto', 'contact_person', 'contacto_nombre'],

    // ── Logistics ──
    'volumen':          ['volume', 'vol', 'cbm', 'm3', 'metros_cubicos', 'cubic'],
    'peso':             ['weight', 'kg', 'kilos', 'kilogramos', 'mass', 'ton', 'toneladas'],
    'bulto':            ['package', 'paquete', 'bultos', 'packages', 'cajas', 'boxes', 'colli', 'colis'],
    'pallets':          ['pallet', 'tarimas', 'estibas', 'skids', 'paletas'],
    'unidades':         ['units', 'qty', 'cantidad', 'quantity', 'piezas', 'pieces', 'uds'],
    'valordeclarado':   ['value', 'valor', 'monto', 'importe', 'amount', 'declared_value', 'costo'],

    // ── Order type / status ──
    'tipopedido':       ['order_type', 'tipo', 'type', 'tipo_orden', 'modalidad'],
    'estado':           ['status', 'estatus', 'state', 'situacion'],
    'categoria':        ['category', 'cat', 'clasificacion'],
    'prioridad':        ['priority', 'urgencia', 'urgency'],
    'descripcion':      ['description', 'desc', 'detalle', 'detail', 'obs', 'nota'],
    'observaciones':    ['notes', 'notas', 'comments', 'comentarios', 'remarks'],

    // ── Deposits ──
    'refdepositoexterno': ['deposito', 'warehouse', 'almacen', 'bodega', 'cedis', 'centro_distribucion', 'cd', 'planta', 'sucursal'],

    // ── Schedule ──
    'iniciohorario1':   ['hora_inicio', 'start_time', 'desde', 'from', 'apertura', 'horario_desde'],
    'finhorario1':      ['hora_fin', 'end_time', 'hasta', 'to', 'cierre', 'horario_hasta'],
    'tiempoespera':     ['wait_time', 'tiempo', 'service_time', 'estadia', 'permanencia', 'dwell'],

    // ── Vehicle / Driver ──
    'conductor':        ['driver', 'chofer', 'operador', 'piloto'],
    'dominio':          ['plate', 'placa', 'patente', 'matricula', 'placas'],
    'tipovehiculo':     ['vehicle_type', 'tipo_vehiculo', 'vehiculo', 'vehicle', 'unidad', 'camion'],

    // ── Items / Products ──
    'codigoproducto':   ['sku', 'product_code', 'codigo', 'cod_producto', 'item_code', 'articulo', 'material'],
    'unidadmedida':     ['uom', 'unit', 'medida', 'unit_of_measure'],
    'preciountario':    ['price', 'precio', 'unit_price', 'p_u', 'tarifa'],
    'importecosto':     ['cost', 'costo', 'import', 'monto'],

    // ── Fiscal ──
    'identificadorfiscal': ['rfc', 'cuit', 'nit', 'rut', 'tax_id', 'ruc', 'cnpj', 'fiscal_id'],
    'razonsocialfiscal':   ['razon_fiscal', 'fiscal_name', 'nombre_fiscal'],
    'referenciafiscal':    ['ref_fiscal', 'fiscal_ref', 'cfdi', 'factura'],
    'cuit':                ['rfc', 'nit', 'rut', 'tax_id', 'ruc', 'identificador_fiscal'],
};

// Build a reverse mapping: synonym → list of canonical field names
const REVERSE_SYNONYMS = new Map<string, string[]>();
for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    for (const alias of aliases) {
        const existing = REVERSE_SYNONYMS.get(alias) || [];
        existing.push(canonical);
        REVERSE_SYNONYMS.set(alias, existing);
    }
}

// ─── Priority Field Aliases ─────────────────────────────────────────────────────
// El WSDL de UNIGIS reutiliza el nombre literal "ReferenciaExterna" en varias
// sub-entidades (ClienteDador, Contenedor, TurnoPedido, Recursos, Items.Producto...),
// que ganan por coincidencia exacta de nombre (score 95) al campo de pedido
// equivalente (Orden.RefDocumento, sinónimo score 90). Sin este piso, una búsqueda
// de "ReferenciaExterna" entierra el campo correcto bajo referencias de otras
// entidades que no son las que el usuario busca. Estos alias fuerzan que el campo
// de pedido siempre rankee primero para esta búsqueda concreta.
const PRIORITY_ALIASES: Record<string, string[]> = {
    'Orden.RefDocumento': ['referenciaexterna', 'referencia externa', 'refexterna', 'external reference', 'externalreference'],
};

const PRIORITY_ALIAS_NORM = new Map<string, Set<string>>();
for (const [path, aliases] of Object.entries(PRIORITY_ALIASES)) {
    PRIORITY_ALIAS_NORM.set(path, new Set(aliases.map(normalize)));
}

// ─── Group Colors (for UI) ─────────────────────────────────────────────────────

export const GROUP_COLORS: Record<string, string> = {
    pOrdenPedido:       '#6366f1', // indigo
    Cliente:            '#3b82f6', // blue
    Cliente2:           '#60a5fa', // lightblue
    ClienteDador:       '#8b5cf6', // violet
    depositoSalida:     '#10b981', // emerald
    depositoLlegada:    '#14b8a6', // teal
    Contenedor:         '#f59e0b', // amber
    TurnoPedido:        '#ef4444', // red
    Items:              '#ec4899', // pink
    ServiciosAdicionales: '#f97316', // orange
    Documentos:         '#64748b', // slate
    Producto:           '#d946ef', // fuchsia
    ItemsDomicilio:     '#06b6d4', // cyan
    TiposVehiculos:     '#84cc16', // lime
    EstadosPedido:      '#a855f7', // purple
    Recursos:           '#22d3ee', // sky
    Fiscal:             '#0ea5e9', // sky
    Dinamicos:          '#78716c', // stone
    Booleans:           '#7c3aed', // violet
};

// ─── N-gram Utilities ───────────────────────────────────────────────────────────

function buildTrigrams(str: string): Set<string> {
    const s = `  ${str.toLowerCase()}  `; // padding for edge trigrams
    const set = new Set<string>();
    for (let i = 0; i <= s.length - 3; i++) {
        set.add(s.substring(i, i + 3));
    }
    return set;
}

function trigramSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let intersection = 0;
    for (const t of a) {
        if (b.has(t)) intersection++;
    }
    return intersection / Math.max(a.size, b.size);
}

// ─── Text Normalization ─────────────────────────────────────────────────────────

function normalize(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9]/g, '');       // remove non-alphanumeric
}

function tokenize(str: string): string[] {
    // Split on camelCase, PascalCase, underscores, dots, spaces, hyphens
    return str
        .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase split
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABCDef → ABC Def
        .replace(/[._\-\/\\]/g, ' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 0);
}

// ─── Index Builder ──────────────────────────────────────────────────────────────

const BOOLEAN_SET = new Set(KNOWN_BOOLEAN_PATHS);

function buildIndex(): IndexedField[] {
    const index: IndexedField[] = [];

    for (const [group, fields] of Object.entries(FIELD_GROUPS)) {
        for (const fieldPath of fields) {
            const parts = fieldPath.split('.');
            const shortName = parts[parts.length - 1];
            const shortLower = shortName.toLowerCase();
            const pathLower = fieldPath.toLowerCase();
            const isBool = BOOLEAN_SET.has(fieldPath);

            // Build parent context (e.g. "Cliente", "depositoSalida")
            const parentContext = parts.length > 2
                ? parts.slice(1, -1).join('.')
                : parts.length === 2 ? 'Orden' : '';

            // Build search tokens from all path segments + synonyms
            const pathTokens = tokenize(fieldPath);
            const tokens = new Set<string>(pathTokens);

            // Add synonyms for the short name
            const shortNorm = normalize(shortName);
            const directSynonyms = SYNONYMS[shortNorm] || [];
            for (const syn of directSynonyms) tokens.add(syn);

            // Add parent context tokens
            if (parentContext) {
                for (const t of tokenize(parentContext)) tokens.add(t);
            }

            // Build trigrams from all tokens + short name + path
            const trigramSource = [shortLower, ...Array.from(tokens)].join(' ');

            // Human-readable label
            const displayLabel = parentContext
                ? `${parentContext} › ${shortName}`
                : shortName;

            index.push({
                path: fieldPath,
                shortName,
                shortLower,
                pathLower,
                group,
                isBool,
                tokens: Array.from(tokens),
                trigrams: buildTrigrams(trigramSource),
                displayLabel,
                parentContext,
            });
        }
    }

    return index;
}

// Pre-compute index at module load
const FIELD_INDEX = buildIndex();

// ─── Search Engine ──────────────────────────────────────────────────────────────

export function searchFields(query: string, options: SearchOptions = {}): SearchResult[] {
    const {
        limit = 15,
        group,
        excludeFields,
        minScore = 15,
        boostBooleans = false,
    } = options;

    if (!query || query.trim().length === 0) {
        // Return all fields (grouped, limited)
        return FIELD_INDEX
            .filter(f => !group || f.group === group)
            .filter(f => !excludeFields || !excludeFields.has(f.path))
            .slice(0, limit)
            .map(f => ({ field: f, score: 0, matchType: 'contains' as const, matchedOn: '' }));
    }

    const queryNorm = normalize(query);
    const queryLower = query.toLowerCase().trim();
    const queryTokens = tokenize(query);
    const queryTrigrams = buildTrigrams(queryNorm);

    // Also check if the query is a known synonym
    const synonymTargets = new Set<string>();
    for (const token of queryTokens) {
        const targets = REVERSE_SYNONYMS.get(token);
        if (targets) {
            for (const t of targets) synonymTargets.add(t);
        }
    }
    // Also check the full normalized query
    const fullTargets = REVERSE_SYNONYMS.get(queryNorm);
    if (fullTargets) {
        for (const t of fullTargets) synonymTargets.add(t);
    }

    const results: SearchResult[] = [];

    for (const field of FIELD_INDEX) {
        // Filter by group
        if (group && field.group !== group) continue;
        // Filter exclusions
        if (excludeFields && excludeFields.has(field.path)) continue;

        let score = 0;
        let matchType: SearchResult['matchType'] = 'fuzzy';
        let matchedOn = '';

        // ── Signal 1: Exact match on short name (100) ──
        if (field.shortLower === queryNorm || field.shortLower === queryLower) {
            score = 100;
            matchType = 'exact';
            matchedOn = field.shortName;
        }
        // ── Signal 2: Exact match on full path tail (95) ──
        else if (field.pathLower.endsWith(`.${queryLower}`) || field.pathLower.endsWith(`.${queryNorm}`)) {
            score = 95;
            matchType = 'exact';
            matchedOn = field.path;
        }
        // ── Signal 3: Synonym match (90) ──
        else if (synonymTargets.has(field.shortLower) || synonymTargets.has(normalize(field.shortName))) {
            score = 90;
            matchType = 'alias';
            matchedOn = `synonym → ${field.shortName}`;
        }
        // ── Signal 4: Field has a synonym that matches the query tokens (85) ──
        else if (field.tokens.some(t => t === queryNorm || t === queryLower)) {
            score = 85;
            matchType = 'alias';
            matchedOn = `token → ${field.shortName}`;
        }
        // ── Signal 5: Prefix match on short name (80) ──
        else if (field.shortLower.startsWith(queryNorm) && queryNorm.length >= 2) {
            score = 80;
            matchType = 'prefix';
            matchedOn = field.shortName;
        }
        // ── Signal 6: Query contains short name or vice versa (70) ──
        else if (
            (queryNorm.includes(field.shortLower) && field.shortLower.length > 2) ||
            (field.shortLower.includes(queryNorm) && queryNorm.length > 2)
        ) {
            score = 70;
            matchType = 'contains';
            matchedOn = field.shortName;
        }
        // ── Signal 7: Multi-token overlap (65) ──
        else if (queryTokens.length > 1) {
            const matchingTokens = queryTokens.filter(qt =>
                field.tokens.some(ft => ft.includes(qt) || qt.includes(ft))
            );
            if (matchingTokens.length >= 2) {
                score = 55 + Math.min(matchingTokens.length * 5, 15);
                matchType = 'contains';
                matchedOn = matchingTokens.join(' + ');
            } else if (matchingTokens.length === 1 && matchingTokens[0].length > 3) {
                score = 50;
                matchType = 'contains';
                matchedOn = matchingTokens[0];
            }
        }
        // ── Signal 8: Any path segment contains query (50) ──
        else if (field.pathLower.includes(queryNorm) && queryNorm.length > 2) {
            score = 50;
            matchType = 'contains';
            matchedOn = field.path;
        }

        // ── Signal 9: Trigram similarity (fuzzy) — only if no strong match yet ──
        if (score < 50 && queryNorm.length >= 3) {
            const triSim = trigramSimilarity(queryTrigrams, field.trigrams);
            if (triSim >= 0.25) {
                const triScore = Math.round(triSim * 55);
                if (triScore > score) {
                    score = triScore;
                    matchType = 'ngram';
                    matchedOn = `~${field.shortName}`;
                }
            }
        }

        // ── Signal 10: Levenshtein as last resort ──
        if (score < 40 && queryNorm.length >= 3) {
            const dist = levenshtein(queryNorm, field.shortLower);
            const maxLen = Math.max(queryNorm.length, field.shortLower.length);
            const similarity = 1 - dist / maxLen;
            if (similarity >= 0.6) {
                const levScore = Math.round(similarity * 45);
                if (levScore > score) {
                    score = levScore;
                    matchType = 'fuzzy';
                    matchedOn = `≈${field.shortName}`;
                }
            }
        }

        // ── Priority override: campos de pedido eclipsados por nombres duplicados en sub-entidades ──
        const priorityAliases = PRIORITY_ALIAS_NORM.get(field.path);
        if (priorityAliases && priorityAliases.has(queryNorm)) {
            score = Math.max(score, 97);
            matchType = 'alias';
            matchedOn = `⭐ ${field.shortName} (campo del pedido)`;
        }

        // Boolean boost
        if (boostBooleans && field.isBool && score > 0 && score < 50) {
            score = Math.min(score + 10, 50);
        }

        if (score >= minScore) {
            results.push({ field, score, matchType, matchedOn });
        }
    }

    // Sort: score desc, then alphabetical by shortName
    results.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.field.shortName.localeCompare(b.field.shortName);
    });

    return results.slice(0, limit);
}

// ─── Auto-Match Engine ──────────────────────────────────────────────────────────
// Given an Excel header, find the best field match

export interface AutoMatchResult {
    header: string;
    bestMatch: IndexedField | null;
    score: number;
    confidence: 'high' | 'medium' | 'low' | 'none';
    alternatives: SearchResult[];
}

export function autoMatchHeader(header: string, excludeFields?: Set<string>, mappingMemory?: Record<string, string>): AutoMatchResult {
    // #31: Learning from previous sessions
    if (mappingMemory) {
        const memoryMatchPath = mappingMemory[header.toLowerCase().trim()];
        if (memoryMatchPath) {
            const memoryField = FIELD_INDEX.find(f => f.path === memoryMatchPath);
            if (memoryField && (!excludeFields || !excludeFields.has(memoryField.path))) {
                return {
                    header,
                    bestMatch: memoryField,
                    score: 100,
                    confidence: 'high',
                    alternatives: [],
                };
            }
        }
    }

    const results = searchFields(header, {
        limit: 5,
        excludeFields,
        minScore: 20,
    });

    if (results.length === 0) {
        return { header, bestMatch: null, score: 0, confidence: 'none', alternatives: [] };
    }

    const best = results[0];
    let confidence: AutoMatchResult['confidence'] = 'none';

    if (best.score >= 90) confidence = 'high';
    else if (best.score >= 70) confidence = 'medium';
    else if (best.score >= 40) confidence = 'low';

    return {
        header,
        bestMatch: best.field,
        score: best.score,
        confidence,
        alternatives: results.slice(1),
    };
}

// ─── Batch Auto-Match (for wizard initialization) ───────────────────────────────

export function autoMatchHeaders(headers: string[], mappingMemory?: Record<string, string>): AutoMatchResult[] {
    const results: AutoMatchResult[] = [];
    // Don't exclude already-mapped to allow multi-mapping
    for (const header of headers) {
        results.push(autoMatchHeader(header, undefined, mappingMemory));
    }
    return results;
}

// ─── Export index for direct access ─────────────────────────────────────────────

export function getFieldIndex(): IndexedField[] {
    return FIELD_INDEX;
}

export function getFieldsByGroup(group: string): IndexedField[] {
    return FIELD_INDEX.filter(f => f.group === group);
}

export function getGroupNames(): string[] {
    return Object.keys(FIELD_GROUPS);
}
