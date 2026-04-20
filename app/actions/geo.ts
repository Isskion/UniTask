'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import ExcelJS from 'exceljs';
// tokml es módulo CJS sin tipos oficiales; declaración inline
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokml = require('tokml') as (geojson: object) => string;

// Reducción de precisión GEOS para evitar TopologyException en booleanos espaciales complejos
const GRID_SIZE = 0.0000001;
// Umbral de solapamiento (%) por encima del cual se considera conflicto real
const OVERLAP_THRESHOLD_PCT = 40;

interface SaveZoneParams {
    tenantId: string;
    projectId: string;
    zoneCode: string;
    name: string;
    type: 'TRANSPORTE' | 'DEPOSITO';
    geojson: GeoJSONGeometry | GeoJSONFeature;
    metadata?: Record<string, unknown>;
}

interface OverlapResult {
    zoneCode: string;
    name: string;
    overlapPercentage: number;
}

interface GeoJSONGeometry {
    type: string;
    coordinates: unknown;
}

interface GeoJSONFeature {
    type: 'Feature';
    geometry: GeoJSONGeometry;
    properties?: Record<string, unknown>;
}

function extractGeometry(geojson: GeoJSONGeometry | GeoJSONFeature): string {
    const geom = 'geometry' in geojson && geojson.type === 'Feature'
        ? geojson.geometry
        : geojson;
    return JSON.stringify(geom);
}

/**
 * Persiste una nueva zona geográfica.
 * REGLA DE ORO: las zonas son inmutables tras su creación; toda modificación requiere
 * destrucción y recreación del polígono.
 *
 * ST_Subdivide NO se usa en VALUES porque es set-returning (retorna N filas).
 * Se almacena el polígono original como MultiPolygon; el índice GiST garantiza
 * rendimiento de consulta sin necesidad de segmentación en tabla principal.
 */
export async function saveGeographicZone(params: SaveZoneParams) {
    const { tenantId, projectId, zoneCode, name, type, geojson, metadata } = params;

    try {
        const geomString = extractGeometry(geojson);

        await prisma.$executeRaw`
            INSERT INTO geographic_zones (
                tenant_id,
                project_id,
                zone_code,
                name,
                type,
                boundary,
                metadata
            ) VALUES (
                ${tenantId}::uuid,
                ${projectId}::uuid,
                ${zoneCode},
                ${name},
                ${type}::"ZoneType",
                ST_Multi(ST_GeomFromGeoJSON(${geomString})::geometry),
                ${JSON.stringify(metadata ?? {})}::jsonb
            )
        `;

        revalidatePath('/uniflux/geo');
        return { success: true };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Error al persistir zona geográfica:', msg);
        return { success: false, error: msg };
    }
}

/**
 * Calcula el porcentaje de solapamiento entre un polígono nuevo y las zonas existentes
 * del proyecto. Usa gridSize en ST_Intersection para evitar errores de redondeo de
 * punto flotante en el motor GEOS subyacente de PostGIS.
 *
 * Solo retorna zonas cuyo solapamiento supera OVERLAP_THRESHOLD_PCT.
 */
export async function checkZoneOverlap(projectId: string, geojson: GeoJSONGeometry | GeoJSONFeature): Promise<OverlapResult[]> {
    try {
        const geomString = extractGeometry(geojson);

        const overlaps = await prisma.$queryRaw<OverlapResult[]>`
            SELECT
                zone_code AS "zoneCode",
                name,
                ROUND(
                    (
                        ST_Area(ST_Intersection(boundary, ST_GeomFromGeoJSON(${geomString})::geometry, ${GRID_SIZE}))
                        / NULLIF(ST_Area(boundary), 0)
                    ) * 100
                )::float AS "overlapPercentage"
            FROM
                geographic_zones
            WHERE
                project_id = ${projectId}::uuid
                AND ST_Intersects(boundary, ST_GeomFromGeoJSON(${geomString})::geometry)
            HAVING
                ROUND(
                    (
                        ST_Area(ST_Intersection(boundary, ST_GeomFromGeoJSON(${geomString})::geometry, ${GRID_SIZE}))
                        / NULLIF(ST_Area(boundary), 0)
                    ) * 100
                ) > ${OVERLAP_THRESHOLD_PCT}
        `;

        return overlaps;
    } catch (error: unknown) {
        console.error('Error al calcular solapamiento espacial:', error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Exporta las zonas del proyecto a Excel usando la Streams API de ExcelJS.
 * Los datos se paginan desde PostgreSQL en lotes de 500 para evitar OOM en el heap.
 * Retorna el buffer para que el caller lo envíe como response.
 */
export async function exportZonesToExcel(tenantId: string, projectId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Zonas Geográficas');

    worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Código', key: 'zoneCode', width: 15 },
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Tipo', key: 'type', width: 15 },
        { header: 'Metadatos', key: 'metadata', width: 50 },
        { header: 'Creado', key: 'createdAt', width: 20 },
    ];

    const BATCH_SIZE = 500;
    let cursor = 0;
    let batch: Array<{ id: string; zoneCode: string; name: string; type: string; metadata: unknown; createdAt: Date }>;

    do {
        batch = await prisma.geographicZone.findMany({
            where: { tenantId, projectId },
            select: { id: true, zoneCode: true, name: true, type: true, metadata: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
            skip: cursor,
            take: BATCH_SIZE,
        });

        for (const zone of batch) {
            worksheet.addRow({
                id: zone.id,
                zoneCode: zone.zoneCode,
                name: zone.name,
                type: zone.type,
                metadata: JSON.stringify(zone.metadata),
                createdAt: zone.createdAt.toISOString(),
            });
        }

        cursor += batch.length;
    } while (batch.length === BATCH_SIZE);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

/**
 * Versión base64 del export Excel para consumir desde Client Components
 * (los Server Actions no pueden devolver Buffer directamente al browser).
 */
export async function exportZonesToExcelBase64(tenantId: string, projectId: string): Promise<string> {
    const buffer = await exportZonesToExcel(tenantId, projectId);
    return buffer.toString('base64');
}

/**
 * Exporta las zonas del proyecto a GeoJSON nativo (via ST_AsGeoJSON de PostGIS).
 */
export async function exportZonesToGeoJSON(tenantId: string, projectId: string) {
    const zones = await prisma.$queryRaw<Array<{ id: string; name: string; zoneCode: string; type: string; metadata: unknown; boundary: unknown }>>`
        SELECT
            id::text,
            name,
            zone_code AS "zoneCode",
            type::text,
            metadata,
            ST_AsGeoJSON(boundary)::jsonb AS boundary
        FROM
            geographic_zones
        WHERE
            tenant_id = ${tenantId}::uuid
            AND project_id = ${projectId}::uuid
        ORDER BY
            created_at DESC
    `;

    return {
        type: 'FeatureCollection',
        features: zones.map(z => ({
            type: 'Feature',
            geometry: z.boundary,
            properties: {
                id: z.id,
                name: z.name,
                zoneCode: z.zoneCode,
                type: z.type,
                metadata: z.metadata,
            },
        })),
    };
}

/**
 * Recupera todas las zonas de un proyecto con su geometría como GeoJSON.
 */
export async function getProjectZones(tenantId: string, projectId: string) {
    try {
        const zones = await prisma.$queryRaw<Array<{
            id: string;
            zoneCode: string;
            name: string;
            type: string;
            metadata: unknown;
            boundary: unknown;
        }>>`
            SELECT
                id::text,
                zone_code AS "zoneCode",
                name,
                type::text,
                metadata,
                ST_AsGeoJSON(boundary)::jsonb AS boundary
            FROM
                geographic_zones
            WHERE
                tenant_id = ${tenantId}::uuid
                AND project_id = ${projectId}::uuid
            ORDER BY
                created_at DESC
        `;
        return zones;
    } catch (error) {
        console.error('Error al recuperar zonas del proyecto:', error instanceof Error ? error.message : error);
        return [];
    }
}

// ─── Búsqueda de Límites Administrativos (Nominatim / OSM) ───────────────────

export interface BoundaryFeature {
    osmId: string;
    displayName: string;
    shortName: string;
    addressType: string;
    geometry: { type: string; coordinates: unknown };
}

const TYPE_LABELS: Record<string, string> = {
    municipality:    'Municipio',
    province:        'Provincia',
    state:           'C. Autónoma',
    postcode:        'Código Postal',
    postal_code:     'Código Postal',
    city:            'Ciudad',
    town:            'Localidad',
    village:         'Localidad',
    hamlet:          'Localidad',
    county:          'Comarca',
    administrative:  'Administrativo',
    suburb:          'Barrio',
    quarter:         'Barrio',
    district:        'Distrito',
    region:          'Región',
    country:         'País',
};

const NOMINATIM_HEADERS = {
    'User-Agent': 'UniTask-GeoModule/2.0 (contacto@unisolutions.com)',
    'Accept-Language': 'es,en',
};

function isPostalCode(query: string): boolean {
    return /^\d{4,6}$/.test(query.trim());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nominatimFeaturesToBoundaries(features: any[], fallbackQuery: string): BoundaryFeature[] {
    return features
        .filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
        .map((f) => {
            const props = f.properties;
            const addressType = props.addresstype ?? props.type ?? props.class ?? 'administrative';
            return {
                osmId: `${props.osm_type ?? 'W'}${props.osm_id ?? Math.random()}`,
                displayName: props.display_name ?? '',
                shortName: props.name ?? props.display_name?.split(',')[0] ?? fallbackQuery,
                addressType: TYPE_LABELS[addressType] ?? addressType,
                geometry: f.geometry,
            };
        });
}

/**
 * Busca el polígono de un código postal en Overpass (OSM).
 * Usado como fallback cuando Nominatim no devuelve polígono para el CP.
 * Overpass sí tiene las relaciones boundary=postal_code de OSM España.
 */
async function searchPostalCodeViaOverpass(postalCode: string, countryCode: string): Promise<BoundaryFeature[]> {
    // OverpassQL: filtra estrictamente por país (ISO3166-1) para evitar resultados de otros países
    const countryTag = countryCode.toUpperCase();
    const overpassQuery = `
[out:json][timeout:20];
area["ISO3166-1"="${countryTag}"][admin_level=2]->.pais;
(
  relation["postal_code"="${postalCode}"]["boundary"="postal_code"](area.pais);
  relation["addr:postcode"="${postalCode}"]["boundary"="postal_code"](area.pais);
);
out geom;
`.trim();

    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': NOMINATIM_HEADERS['User-Agent'] },
            body: `data=${encodeURIComponent(overpassQuery)}`,
            next: { revalidate: 3600 }, // caché 1h — límites postales son estables
        });

        if (!res.ok) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: { elements: any[] } = await res.json();
        const results: BoundaryFeature[] = [];

        for (const el of data.elements) {
            if (el.type !== 'relation' || !el.members) continue;

            // Ensamblar polígono desde los ways miembros de la relación
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outerWays = el.members.filter((m: any) => m.type === 'way' && m.role === 'outer' && m.geometry);
            if (outerWays.length === 0) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rings: number[][][] = outerWays.map((w: any) =>
                w.geometry.map((pt: { lat: number; lon: number }) => [pt.lon, pt.lat])
            );

            // Cerrar cada anillo si es necesario
            const closedRings = rings.map(ring => {
                if (ring.length < 2) return ring;
                const first = ring[0], last = ring[ring.length - 1];
                if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
                return ring;
            });

            results.push({
                osmId: `R${el.id}`,
                displayName: `CP ${postalCode}${el.tags?.name ? ` — ${el.tags.name}` : ''}`,
                shortName: `CP ${postalCode}`,
                addressType: 'Código Postal',
                geometry: {
                    type: closedRings.length === 1 ? 'Polygon' : 'MultiPolygon',
                    coordinates: closedRings.length === 1 ? closedRings : closedRings.map(r => [r]),
                },
            });
        }

        return results;
    } catch (error) {
        console.error('Overpass error para CP:', error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Busca límites administrativos en Nominatim (OSM).
 * Para códigos postales usa estrategia en cascada:
 *   1. Nominatim con parámetro postalcode específico
 *   2. Overpass API (OSM) como fallback con polígonos de relaciones boundary
 *   3. Búsqueda del municipio/distrito asociado al CP como último recurso
 */
export async function searchBoundaries(
    query: string,
    countryCode = 'es'
): Promise<BoundaryFeature[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();
    const isCP = isPostalCode(q);

    // ── Para códigos postales: estrategia dedicada ────────────────────────────
    if (isCP) {
        // 1. Intentar Nominatim con parámetro postalcode específico
        const nominatimCpParams = new URLSearchParams({
            postalcode: q,
            countrycodes: countryCode,
            format: 'geojson',
            polygon_geojson: '1',
            polygon_threshold: '0.001',
            addressdetails: '1',
            limit: '5',
        });

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimCpParams}`, {
                headers: NOMINATIM_HEADERS,
                next: { revalidate: 3600 },
            });
            if (res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fc: { features: any[] } = await res.json();
                const hits = nominatimFeaturesToBoundaries(fc.features, q);
                if (hits.length > 0) return hits;
            }
        } catch { /* continúa con fallback */ }

        // 2. Overpass API — tiene relaciones boundary=postal_code de OSM España
        const overpassHits = await searchPostalCodeViaOverpass(q, countryCode);
        if (overpassHits.length > 0) return overpassHits;

        // 3. Fallback: buscar el municipio asociado al CP (Nominatim q genérico)
        const fallbackParams = new URLSearchParams({
            q,
            countrycodes: countryCode,
            format: 'geojson',
            polygon_geojson: '1',
            polygon_threshold: '0.003',
            addressdetails: '1',
            limit: '5',
        });
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${fallbackParams}`, {
                headers: NOMINATIM_HEADERS,
                next: { revalidate: 300 },
            });
            if (res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fc: { features: any[] } = await res.json();
                return nominatimFeaturesToBoundaries(fc.features, q)
                    .map(b => ({ ...b, addressType: `Municipio (CP ${q})` }));
            }
        } catch { /* sin resultados */ }

        return [];
    }

    // ── Para búsquedas generales (nombre de municipio, provincia, región) ─────
    const params = new URLSearchParams({
        q,
        format: 'geojson',
        polygon_geojson: '1',
        polygon_threshold: '0.003',
        countrycodes: countryCode,
        limit: '10',
        addressdetails: '1',
    });

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS,
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            console.error('Nominatim error:', res.status, res.statusText);
            return [];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc: { features: any[] } = await res.json();
        return nominatimFeaturesToBoundaries(fc.features, q);
    } catch (error) {
        console.error('Error al buscar límites en Nominatim:', error instanceof Error ? error.message : error);
        return [];
    }
}

// ─── Isócrona Mapbox ──────────────────────────────────────────────────────────

export type IsochroneProfile = 'driving' | 'walking' | 'cycling';

interface IsochroneParams {
    lng: number;
    lat: number;
    minutes: number;
    profile: IsochroneProfile;
}

interface MapboxIsochroneResponse {
    type: 'FeatureCollection';
    features: Array<{
        type: 'Feature';
        geometry: { type: string; coordinates: unknown };
        properties: Record<string, unknown>;
    }>;
}

/**
 * Obtiene una isócrona de la API de Mapbox y devuelve el polígono GeoJSON.
 * Requiere MAPBOX_TOKEN en variables de entorno del servidor.
 * Uso: ~20 llamadas/año → coste inferior a $0.02 anuales.
 */
export async function fetchIsochrone(params: IsochroneParams): Promise<MapboxIsochroneResponse | null> {
    const token = process.env.MAPBOX_TOKEN;
    if (!token) {
        console.error('MAPBOX_TOKEN no configurado en variables de entorno.');
        return null;
    }

    const { lng, lat, minutes, profile } = params;
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${token}`;

    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text();
            console.error(`Mapbox Isochrone API error ${res.status}:`, body);
            return null;
        }
        return res.json() as Promise<MapboxIsochroneResponse>;
    } catch (error) {
        console.error('Error al llamar a la API de isócronas:', error instanceof Error ? error.message : error);
        return null;
    }
}

// ─── Exportación KML ──────────────────────────────────────────────────────────

/**
 * Exporta las zonas del proyecto a KML (Keyhole Markup Language) listo para
 * importar en dispositivos GPS físicos o Google Earth.
 * Los campos name y zoneCode del metadata se mapean a <name> y <description> nativos de KML.
 */
export async function exportZonesToKML(tenantId: string, projectId: string): Promise<string> {
    const zones = await prisma.$queryRaw<Array<{
        id: string;
        name: string;
        zoneCode: string;
        type: string;
        metadata: unknown;
        boundary: unknown;
    }>>`
        SELECT
            id::text,
            name,
            zone_code AS "zoneCode",
            type::text,
            metadata,
            ST_AsGeoJSON(boundary)::jsonb AS boundary
        FROM
            geographic_zones
        WHERE
            tenant_id = ${tenantId}::uuid
            AND project_id = ${projectId}::uuid
        ORDER BY
            created_at DESC
    `;

    const featureCollection = {
        type: 'FeatureCollection',
        features: zones.map(z => ({
            type: 'Feature',
            geometry: z.boundary,
            properties: {
                // tokml mapea 'name' → <name> y 'description' → <description> en KML
                name: z.name,
                description: `Código: ${z.zoneCode} | Tipo: ${z.type}`,
            },
        })),
    };

    return tokml(featureCollection);
}
