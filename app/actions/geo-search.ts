'use server';

/**
 * Server-side geographic search — runs on Next.js server (not browser) so:
 *  - Nominatim User-Agent header se envía correctamente
 *  - next.revalidate cachea respuestas y evita rate-limiting
 *  - Sin problemas de CORS con APIs de terceros
 */

export interface BoundaryFeature {
    osmId: string;
    displayName: string;
    shortName: string;
    addressType: string;
    geometry: { type: string; coordinates: unknown };
}

export type IsochroneProfile = 'driving' | 'walking' | 'cycling';

const NOMINATIM_HEADERS = {
    'User-Agent':      'UniTask-GeoModule/2.0 (contacto@unisolutions.com)',
    'Accept-Language': 'es,en',
    'Accept':          'application/json',
};

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

// Mirrors públicos de Overpass — rotamos para evitar rate-limiting
const OVERPASS_MIRRORS = [
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
];

function isPostalCode(q: string) { return /^\d{4,6}$/.test(q.trim()); }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function featuresToBoundaries(features: any[], fallback: string): BoundaryFeature[] {
    return features
        .filter(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
        .map(f => {
            const p = f.properties ?? {};
            const at = p.addresstype ?? p.type ?? p.class ?? 'administrative';
            return {
                osmId:       `${p.osm_type ?? 'W'}${p.osm_id ?? Math.random()}`,
                displayName: p.display_name ?? '',
                shortName:   p.name ?? p.display_name?.split(',')[0] ?? fallback,
                addressType: TYPE_LABELS[at] ?? at,
                geometry:    f.geometry,
            };
        });
}

/**
 * Busca el polígono administrativo de un CP español usando la estrategia:
 *
 *   1. Nominatim `postalcode=` → si OSM tiene polígono directo, lo devuelve
 *   2. Overpass `is_in(lat,lon)` → encuentra la relación administrativa
 *      (admin_level 9→8→7) que CONTIENE el centroide del CP y devuelve su polígono
 *   3. Nominatim `/reverse` → último recurso por si Overpass falla
 *
 * El paso 2 usa admin_level, NO busca tags de CP en edificios/calles,
 * garantizando que siempre devolvemos una ZONA (polígono municipal/barrio),
 * nunca un punto ni un edificio concreto.
 */
async function searchCP(q: string, countryCode: string): Promise<BoundaryFeature[]> {

    // ── 1. Nominatim directo (funciona cuando OSM tiene boundary=postal_code) ──
    try {
        const params = new URLSearchParams({
            postalcode: q, countrycodes: countryCode,
            format: 'geojson', polygon_geojson: '1', addressdetails: '1', limit: '5',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS, next: { revalidate: 86400 },
        });
        if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fc: { features: any[] } = await res.json();
            const hits = featuresToBoundaries(fc.features, q);
            if (hits.length > 0) return hits;
        }
    } catch { /* continúa */ }

    // ── 2. Obtener centroide del CP y buscar polígono admin con Overpass is_in ──
    let lat: string | null = null;
    let lon: string | null = null;
    let cpDisplayName = `CP ${q}`;

    try {
        const params = new URLSearchParams({
            postalcode: q, countrycodes: countryCode, format: 'json', limit: '1',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS, next: { revalidate: 86400 },
        });
        if (res.ok) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pts: any[] = await res.json();
            if (pts.length > 0) {
                lat = pts[0].lat;
                lon = pts[0].lon;
                cpDisplayName = pts[0].display_name ?? cpDisplayName;
            }
        }
    } catch { /* sin centroide */ }

    if (lat && lon) {
        // is_in devuelve áreas OSM que contienen el punto. Convertimos a relaciones y
        // pedimos la más pequeña (mayor admin_level) disponible.
        // admin_level 9 = barrio (Madrid) | 8 = municipio | 7 = comarca | 6 = provincia
        const overpassQuery = `
[out:json][timeout:15];
is_in(${lat},${lon})->.areas;
(
  rel(pivot.areas)[admin_level="9"][boundary=administrative];
  rel(pivot.areas)[admin_level="8"][boundary=administrative];
  rel(pivot.areas)[admin_level="7"][boundary=administrative];
);
out geom;`.trim();

        for (const mirror of OVERPASS_MIRRORS) {
            try {
                const res = await fetch(mirror, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: `data=${encodeURIComponent(overpassQuery)}`,
                    next: { revalidate: 86400 },
                    signal: AbortSignal.timeout(8000),
                });
                if (!res.ok) continue;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const data: { elements: any[] } = await res.json();
                if (!data.elements?.length) continue;

                // Tomar la relación con admin_level más alto (más específica)
                const sorted = data.elements
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((el: any) => el.type === 'relation' && el.members)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .sort((a: any, b: any) =>
                        parseInt(b.tags?.admin_level ?? '0') - parseInt(a.tags?.admin_level ?? '0')
                    );

                for (const el of sorted) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const outerWays = el.members.filter((m: any) =>
                        m.type === 'way' && m.role === 'outer' && Array.isArray(m.geometry) && m.geometry.length > 2
                    );
                    if (outerWays.length === 0) continue;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const rings: number[][][] = outerWays.map((w: any) =>
                        w.geometry.map((pt: { lat: number; lon: number }) => [pt.lon, pt.lat])
                    );

                    const closedRings = rings.map(ring => {
                        const [first, last] = [ring[0], ring[ring.length - 1]];
                        if (first[0] !== last[0] || first[1] !== last[1]) ring.push([...first]);
                        return ring;
                    }).filter(r => r.length >= 4);

                    if (closedRings.length === 0) continue;

                    const adminLevel = parseInt(el.tags?.admin_level ?? '8');
                    const areaLabel = adminLevel >= 9 ? 'Barrio' : adminLevel === 8 ? 'Municipio' : 'Comarca';
                    const zoneName = el.tags?.name ?? cpDisplayName.split(',')[0];

                    return [{
                        osmId:       `R${el.id}`,
                        displayName: `${zoneName} (CP ${q})`,
                        shortName:   zoneName,
                        addressType: `${areaLabel} (CP ${q})`,
                        geometry: {
                            type:        closedRings.length === 1 ? 'Polygon' : 'MultiPolygon',
                            coordinates: closedRings.length === 1 ? closedRings : closedRings.map(r => [r]),
                        },
                    }];
                }
            } catch { continue; }
        }

        // ── 3. Último recurso: Nominatim /reverse ─────────────────────────────
        for (const zoom of ['12', '10', '8']) {
            try {
                const params = new URLSearchParams({
                    lat, lon, zoom,
                    format: 'geojson', polygon_geojson: '1', addressdetails: '1',
                });
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
                    headers: NOMINATIM_HEADERS, next: { revalidate: 86400 },
                });
                if (!res.ok) continue;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const feature: any = await res.json();
                const gType = feature?.geometry?.type;
                if (gType === 'Polygon' || gType === 'MultiPolygon') {
                    const p = feature.properties ?? {};
                    const a = p.address ?? {};
                    const name = p.name ?? a.suburb ?? a.town ?? a.city ?? `CP ${q}`;
                    return [{
                        osmId:       `rev_${q}_z${zoom}`,
                        displayName: p.display_name ?? cpDisplayName,
                        shortName:   name,
                        addressType: `Zona aproximada (CP ${q})`,
                        geometry:    feature.geometry,
                    }];
                }
            } catch { /* siguiente zoom */ }
        }
    }

    return [];
}

// ─── Búsqueda general (municipio, provincia, región) ──────────────────────────

export async function searchBoundaries(
    query: string,
    countryCode = 'es'
): Promise<BoundaryFeature[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();

    if (isPostalCode(q)) return searchCP(q, countryCode);

    try {
        const params = new URLSearchParams({
            q,
            format: 'geojson', polygon_geojson: '1', polygon_threshold: '0.003',
            countrycodes: countryCode, limit: '10', addressdetails: '1',
        });
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
            headers: NOMINATIM_HEADERS, next: { revalidate: 300 },
        });
        if (!res.ok) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc: { features: any[] } = await res.json();
        return featuresToBoundaries(fc.features, q);
    } catch { return []; }
}

// ─── Isócrona Mapbox ──────────────────────────────────────────────────────────

interface IsochroneParams { lng: number; lat: number; minutes: number; profile: IsochroneProfile; }

interface MapboxIsochroneResponse {
    type: 'FeatureCollection';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    features: any[];
}

export async function fetchIsochrone(params: IsochroneParams): Promise<MapboxIsochroneResponse | null> {
    const token = process.env.MAPBOX_TOKEN;
    if (!token) return null;
    const { lng, lat, minutes, profile } = params;
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?contours_minutes=${minutes}&polygons=true&access_token=${token}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        return res.ok ? res.json() : null;
    } catch { return null; }
}
