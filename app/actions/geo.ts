'use client'; // Uses Firebase client SDK — no 'use server'

import { db } from '@/lib/firebase';
import {
    collection, doc, addDoc, getDocs, deleteDoc, updateDoc,
    query, where, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import ExcelJS from 'exceljs';
// tokml es módulo CJS sin tipos oficiales
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokml = require('tokml') as (geojson: object) => string;

// Umbral de solapamiento (%) por encima del cual se considera conflicto real
const OVERLAP_THRESHOLD_PCT = 40;

const GEO_ZONES_COLLECTION = 'geographic_zones';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GeoJSONGeometry {
    type: string;
    coordinates: unknown;
}

interface GeoJSONFeature {
    type: 'Feature';
    geometry: GeoJSONGeometry;
    properties?: Record<string, unknown>;
}

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

export interface GeographicZone {
    id: string;
    tenantId: string;
    projectId: string;
    zoneCode: string;
    name: string;
    type: string;
    boundary: GeoJSONGeometry;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

function extractGeometry(geojson: GeoJSONGeometry | GeoJSONFeature): GeoJSONGeometry {
    if ('geometry' in geojson && geojson.type === 'Feature') return geojson.geometry;
    return geojson as GeoJSONGeometry;
}

// ─── Persistencia en Firestore ────────────────────────────────────────────────

/**
 * Guarda una nueva zona geográfica en Firestore.
 * La geometría se almacena como GeoJSON plano (objeto JS).
 */
export async function saveGeographicZone(params: SaveZoneParams): Promise<{ id: string }> {
    const { tenantId, projectId, zoneCode, name, type, geojson, metadata } = params;
    const geometry = extractGeometry(geojson);

    const docRef = await addDoc(collection(db, GEO_ZONES_COLLECTION), {
        tenantId,
        projectId,
        zoneCode,
        name,
        type,
        boundary: geometry,
        metadata: metadata ?? {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return { id: docRef.id };
}

/**
 * Calcula el porcentaje de solapamiento entre una nueva geometría y las zonas existentes.
 * Usa Turf.js en memoria (sin PostGIS) — válido para volúmenes bajos (~20 proyectos/año).
 */
export async function checkZoneOverlap(
    projectId: string,
    feature: GeoJSONFeature
): Promise<OverlapResult[]> {
    try {
        // Import dinámico para evitar bundle en server
        const turf = await import('@turf/turf');

        const zones = await getProjectZones('', projectId);
        const newGeom = feature.geometry ?? feature;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newFeature = turf.feature(newGeom as any);
        const newArea = turf.area(newFeature);
        if (newArea === 0) return [];

        const results: OverlapResult[] = [];

        for (const zone of zones) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const existingFeature = turf.feature(zone.boundary as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const intersection = turf.intersect(turf.featureCollection([newFeature as any, existingFeature as any]));
                if (!intersection) continue;

                const intersectionArea = turf.area(intersection);
                const overlapPct = (intersectionArea / newArea) * 100;

                if (overlapPct >= OVERLAP_THRESHOLD_PCT) {
                    results.push({
                        zoneCode: zone.zoneCode,
                        name: zone.name,
                        overlapPercentage: Math.round(overlapPct * 10) / 10,
                    });
                }
            } catch { /* zona individual con geometría inválida, se omite */ }
        }

        return results;
    } catch (error) {
        console.error('Error al calcular solapamiento:', error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Recupera todas las zonas de un proyecto desde Firestore.
 * tenantId es opcional en la query (el projectId ya es suficientemente selectivo),
 * pero se usa como filtro adicional si se proporciona.
 */
export async function getProjectZones(tenantId: string, projectId: string): Promise<GeographicZone[]> {
    try {
        const constraints = [
            where('projectId', '==', projectId),
            orderBy('createdAt', 'desc'),
        ];
        if (tenantId) constraints.unshift(where('tenantId', '==', tenantId));

        const q = query(collection(db, GEO_ZONES_COLLECTION), ...constraints);
        const snap = await getDocs(q);

        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                tenantId: data.tenantId,
                projectId: data.projectId,
                zoneCode: data.zoneCode,
                name: data.name,
                type: data.type,
                boundary: data.boundary,
                metadata: data.metadata ?? {},
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
            };
        });
    } catch (error) {
        console.error('Error al recuperar zonas del proyecto:', error instanceof Error ? error.message : error);
        return [];
    }
}

/**
 * Elimina una zona por su ID de documento Firestore.
 */
export async function deleteGeographicZone(zoneId: string): Promise<void> {
    await deleteDoc(doc(db, GEO_ZONES_COLLECTION, zoneId));
}

/**
 * Actualiza los metadatos (nombre, tipo) de una zona existente.
 */
export async function updateGeographicZoneMetadata(
    zoneId: string,
    data: { name?: string; type?: string }
): Promise<void> {
    const docRef = doc(db, GEO_ZONES_COLLECTION, zoneId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ─── Exportaciones ────────────────────────────────────────────────────────────

export async function exportZonesToExcel(tenantId: string, projectId: string): Promise<Buffer> {
    const zones = await getProjectZones(tenantId, projectId);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Zonas Geográficas');

    worksheet.columns = [
        { header: 'ID',        key: 'id',        width: 28 },
        { header: 'Código',    key: 'zoneCode',   width: 15 },
        { header: 'Nombre',    key: 'name',       width: 30 },
        { header: 'Tipo',      key: 'type',       width: 15 },
        { header: 'Metadatos', key: 'metadata',   width: 50 },
        { header: 'Creado',    key: 'createdAt',  width: 20 },
    ];

    for (const zone of zones) {
        worksheet.addRow({
            id:        zone.id,
            zoneCode:  zone.zoneCode,
            name:      zone.name,
            type:      zone.type,
            metadata:  JSON.stringify(zone.metadata),
            createdAt: zone.createdAt.toISOString(),
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}

export async function exportZonesToExcelBase64(tenantId: string, projectId: string): Promise<string> {
    const buffer = await exportZonesToExcel(tenantId, projectId);
    return buffer.toString('base64');
}

export async function exportZonesToGeoJSON(tenantId: string, projectId: string) {
    const zones = await getProjectZones(tenantId, projectId);
    return {
        type: 'FeatureCollection',
        features: zones.map(z => ({
            type: 'Feature',
            geometry: z.boundary,
            properties: {
                id:       z.id,
                name:     z.name,
                zoneCode: z.zoneCode,
                type:     z.type,
                metadata: z.metadata,
            },
        })),
    };
}

export async function exportZonesToKML(tenantId: string, projectId: string): Promise<string> {
    const zones = await getProjectZones(tenantId, projectId);
    const featureCollection = {
        type: 'FeatureCollection',
        features: zones.map(z => ({
            type: 'Feature',
            geometry: z.boundary,
            properties: {
                name:        z.name,
                description: `Código: ${z.zoneCode} | Tipo: ${z.type}`,
            },
        })),
    };
    return tokml(featureCollection);
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
    municipality:   'Municipio',
    province:       'Provincia',
    state:          'C. Autónoma',
    postcode:       'Código Postal',
    postal_code:    'Código Postal',
    city:           'Ciudad',
    town:           'Localidad',
    village:        'Localidad',
    hamlet:         'Localidad',
    county:         'Comarca',
    administrative: 'Administrativo',
    suburb:         'Barrio',
    quarter:        'Barrio',
    district:       'Distrito',
    region:         'Región',
    country:        'País',
};

const NOMINATIM_HEADERS = {
    'User-Agent':    'UniTask-GeoModule/2.0 (contacto@unisolutions.com)',
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
                osmId:       `${props.osm_type ?? 'W'}${props.osm_id ?? Math.random()}`,
                displayName: props.display_name ?? '',
                shortName:   props.name ?? props.display_name?.split(',')[0] ?? fallbackQuery,
                addressType: TYPE_LABELS[addressType] ?? addressType,
                geometry:    f.geometry,
            };
        });
}

async function searchPostalCodeViaOverpass(postalCode: string, countryCode: string): Promise<BoundaryFeature[]> {
    const countryTag = countryCode.toUpperCase();
    const overpassQuery = `
[out:json][timeout:25];
area["ISO3166-1"="${countryTag}"][admin_level=2]->.pais;
(
  relation["postal_code"="${postalCode}"]["boundary"="postal_code"](area.pais);
  relation["addr:postcode"="${postalCode}"]["boundary"="postal_code"](area.pais);
);
out geom;`.trim();

    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': NOMINATIM_HEADERS['User-Agent'] },
            body:    `data=${encodeURIComponent(overpassQuery)}`,
            cache:   'force-cache',
        });
        if (!res.ok) return [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: { elements: any[] } = await res.json();
        const results: BoundaryFeature[] = [];

        for (const el of data.elements) {
            if (el.type !== 'relation' || !el.members) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const outerWays = el.members.filter((m: any) => m.type === 'way' && m.role === 'outer' && m.geometry);
            if (outerWays.length === 0) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rings: number[][][] = outerWays.map((w: any) =>
                w.geometry.map((pt: { lat: number; lon: number }) => [pt.lon, pt.lat])
            );

            const closedRings = rings.map(ring => {
                if (ring.length < 2) return ring;
                const [first, last] = [ring[0], ring[ring.length - 1]];
                if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
                return ring;
            });

            results.push({
                osmId:       `R${el.id}`,
                displayName: `CP ${postalCode}${el.tags?.name ? ` — ${el.tags.name}` : ''}`,
                shortName:   `CP ${postalCode}`,
                addressType: 'Código Postal',
                geometry: {
                    type:        closedRings.length === 1 ? 'Polygon' : 'MultiPolygon',
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

export async function searchBoundaries(
    query: string,
    countryCode = 'es'
): Promise<BoundaryFeature[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();
    const isCP = isPostalCode(q);

    if (isCP) {
        // 1. Nominatim con parámetro postalcode (devuelve polígono si OSM lo tiene)
        try {
            const params = new URLSearchParams({
                postalcode:      q,
                countrycodes:    countryCode,
                format:          'geojson',
                polygon_geojson: '1',
                addressdetails:  '1',
                limit:           '5',
            });
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
                headers: NOMINATIM_HEADERS,
                cache: 'no-store',
            });
            if (res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fc: { features: any[] } = await res.json();
                const hits = nominatimFeaturesToBoundaries(fc.features, q);
                if (hits.length > 0) return hits;
            }
        } catch { /* continúa */ }

        // 2. Overpass API — relaciones boundary=postal_code de OSM España
        const overpassHits = await searchPostalCodeViaOverpass(q, countryCode);
        if (overpassHits.length > 0) return overpassHits;

        // 3. Reverse geocoding desde centroide del CP:
        //    Muchos CPs españoles no tienen polígono propio en OSM.
        //    Obtenemos la ubicación del CP y hacemos reverse geocoding para
        //    devolver el barrio/distrito más próximo con polígono disponible.
        try {
            // 3a. Obtener coordenadas del CP (resultado puntual)
            const pointParams = new URLSearchParams({
                postalcode:   q,
                countrycodes: countryCode,
                format:       'json',
                limit:        '1',
            });
            const pointRes = await fetch(`https://nominatim.openstreetmap.org/search?${pointParams}`, {
                headers: NOMINATIM_HEADERS,
                cache: 'no-store',
            });
            if (pointRes.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const points: any[] = await pointRes.json();
                if (points.length > 0) {
                    const { lat, lon, display_name } = points[0];

                    // 3b. Reverse en nivel barrio/distrito (zoom 14)
                    for (const zoom of ['14', '12', '10']) {
                        const revParams = new URLSearchParams({
                            lat, lon,
                            format:          'geojson',
                            polygon_geojson: '1',
                            zoom,
                            addressdetails:  '1',
                        });
                        const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?${revParams}`, {
                            headers: NOMINATIM_HEADERS,
                            cache: 'no-store',
                        });
                        if (!revRes.ok) continue;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const feature: any = await revRes.json();
                        const geomType = feature?.geometry?.type;
                        if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                            const props = feature.properties ?? {};
                            return [{
                                osmId:       `rev_${q}_z${zoom}`,
                                displayName: props.display_name ?? display_name ?? `CP ${q}`,
                                shortName:   props.name ?? props.address?.suburb ?? props.address?.town ?? props.address?.city ?? `CP ${q}`,
                                addressType: `Zona aproximada (CP ${q})`,
                                geometry:    feature.geometry,
                            }];
                        }
                    }
                }
            }
        } catch { /* sin resultados */ }

        return [];
    }

    // Búsqueda general: municipio, provincia, región
    try {
        const params = new URLSearchParams({
            q,
            format:          'geojson',
            polygon_geojson: '1',
            polygon_threshold: '0.003',
            countrycodes:    countryCode,
            limit:           '10',
            addressdetails:  '1',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS,
            cache: 'no-store',
        });
        if (!res.ok) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc: { features: any[] } = await res.json();
        return nominatimFeaturesToBoundaries(fc.features, q);
    } catch (error) {
        console.error('Error al buscar límites:', error instanceof Error ? error.message : error);
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

export async function fetchIsochrone(params: IsochroneParams): Promise<MapboxIsochroneResponse | null> {
    const token = process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
        console.error('MAPBOX_TOKEN no configurado.');
        return null;
    }
    const { lng, lat, minutes, profile } = params;
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${token}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return res.json() as Promise<MapboxIsochroneResponse>;
    } catch {
        return null;
    }
}
