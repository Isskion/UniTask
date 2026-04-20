'use server';

/**
 * Server-side geographic search actions.
 * Runs on the server so that:
 *  - Nominatim User-Agent header is sent correctly (browsers strip custom UA)
 *  - Responses are cached at the server layer
 *  - No CORS issues with third-party APIs
 */

export interface BoundaryFeature {
    osmId: string;
    displayName: string;
    shortName: string;
    addressType: string;
    geometry: { type: string; coordinates: unknown };
}

export type IsochroneProfile = 'driving' | 'walking' | 'cycling';

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

const NOMINATIM_UA = 'UniTask-GeoModule/2.0 (contacto@unisolutions.com)';
const NOMINATIM_HEADERS = {
    'User-Agent':      NOMINATIM_UA,
    'Accept-Language': 'es,en',
    'Accept':          'application/json',
};

function isPostalCode(query: string): boolean {
    return /^\d{4,6}$/.test(query.trim());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function featuresToBoundaries(features: any[], fallbackQuery: string): BoundaryFeature[] {
    return features
        .filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
        .map((f) => {
            const props = f.properties ?? {};
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

/**
 * Búsqueda de límites administrativos.
 * Para CPs españoles:
 *   1. Nominatim postalcode= (polygon si OSM lo tiene)
 *   2. Reverse geocoding desde centroide del CP (barrio → distrito → municipio)
 * Para texto libre: Nominatim q= estándar.
 */
export async function searchBoundaries(
    query: string,
    countryCode = 'es'
): Promise<BoundaryFeature[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim();

    if (isPostalCode(q)) {
        // ── 1. Nominatim polygon directo ───────────────────────────────────────
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
                next: { revalidate: 86400 }, // 24h — los CPs no cambian
            });
            if (res.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const fc: { features: any[] } = await res.json();
                const hits = featuresToBoundaries(fc.features, q);
                if (hits.length > 0) return hits;
            }
        } catch { /* continúa */ }

        // ── 2. Reverse geocoding desde centroide del CP ────────────────────────
        // La mayoría de CPs españoles en OSM son solo puntos, no polígonos.
        // Obtenemos el punto del CP y hacemos reverse para obtener el área admin más próxima.
        try {
            const pointParams = new URLSearchParams({
                postalcode:   q,
                countrycodes: countryCode,
                format:       'json',
                limit:        '1',
            });
            const pointRes = await fetch(`https://nominatim.openstreetmap.org/search?${pointParams}`, {
                headers: NOMINATIM_HEADERS,
                next: { revalidate: 86400 },
            });

            if (pointRes.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const points: any[] = await pointRes.json();

                if (points.length > 0) {
                    const { lat, lon, display_name } = points[0];

                    // Intentar zoom 14 (barrio) → 12 (distrito) → 10 (municipio)
                    for (const zoom of ['14', '12', '10']) {
                        try {
                            const revParams = new URLSearchParams({
                                lat, lon,
                                format:          'geojson',
                                polygon_geojson: '1',
                                zoom,
                                addressdetails:  '1',
                            });
                            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?${revParams}`, {
                                headers: NOMINATIM_HEADERS,
                                next: { revalidate: 86400 },
                            });
                            if (!revRes.ok) continue;

                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const feature: any = await revRes.json();
                            const geomType = feature?.geometry?.type;

                            if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
                                const props = feature.properties ?? {};
                                const addr = props.address ?? {};
                                const areaName =
                                    props.name ??
                                    addr.suburb ?? addr.neighbourhood ??
                                    addr.town ?? addr.city_district ??
                                    addr.city ?? addr.municipality ??
                                    display_name?.split(',')[0] ??
                                    `CP ${q}`;

                                return [{
                                    osmId:       `rev_${q}_z${zoom}`,
                                    displayName: props.display_name ?? display_name ?? `CP ${q}`,
                                    shortName:   areaName,
                                    addressType: `Zona aproximada (CP ${q})`,
                                    geometry:    feature.geometry,
                                }];
                            }
                        } catch { /* siguiente zoom */ }
                    }
                }
            }
        } catch { /* sin resultados */ }

        return [];
    }

    // ── Búsqueda general: municipio, provincia, región ─────────────────────────
    try {
        const params = new URLSearchParams({
            q,
            format:            'geojson',
            polygon_geojson:   '1',
            polygon_threshold: '0.003',
            countrycodes:      countryCode,
            limit:             '10',
            addressdetails:    '1',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS,
            next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc: { features: any[] } = await res.json();
        return featuresToBoundaries(fc.features, q);
    } catch (error) {
        console.error('Error búsqueda límites:', error instanceof Error ? error.message : error);
        return [];
    }
}

// ─── Isócrona Mapbox ──────────────────────────────────────────────────────────

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
    const token = process.env.MAPBOX_TOKEN;
    if (!token) return null;

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
