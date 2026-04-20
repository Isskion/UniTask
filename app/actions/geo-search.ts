'use server';

export interface BoundaryFeature {
    osmId: string;
    displayName: string;
    shortName: string;
    addressType: string;
    geometry: { type: string; coordinates: unknown };
}

export type IsochroneProfile = 'driving' | 'walking' | 'cycling';

const HDR = {
    'User-Agent':      'UniTask-GeoModule/2.0 (contacto@unisolutions.com)',
    'Accept-Language': 'es,en',
    'Accept':          'application/json',
};

const TYPE_LABELS: Record<string, string> = {
    municipality: 'Municipio', province: 'Provincia', state: 'C. Autónoma',
    postcode: 'Código Postal', postal_code: 'Código Postal',
    city: 'Ciudad', town: 'Localidad', village: 'Localidad', hamlet: 'Localidad',
    county: 'Comarca', administrative: 'Administrativo',
    suburb: 'Barrio', quarter: 'Barrio', district: 'Distrito',
    region: 'Región', country: 'País',
};

const NON_ZONE_CLASSES = new Set(['building', 'highway', 'amenity', 'shop', 'leisure', 'man_made', 'place']);

function isCP(q: string) { return /^\d{4,6}$/.test(q.trim()); }

async function nominatimGet(params: Record<string, string>, revalidate = 300) {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`;
    const res = await fetch(url, { headers: HDR, next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
}

async function nominatimReverse(lat: string, lon: string, zoom: string) {
    const url = `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({
        lat, lon, zoom, format: 'geojson', polygon_geojson: '1', addressdetails: '1',
    })}`;
    const res = await fetch(url, { headers: HDR, next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function polygonFromFeature(feature: any, cpCode: string): BoundaryFeature | null {
    const gType = feature?.geometry?.type;
    if (gType !== 'Polygon' && gType !== 'MultiPolygon') return null;
    const cls = feature?.properties?.class ?? '';
    if (NON_ZONE_CLASSES.has(cls)) return null;

    const p = feature.properties ?? {};
    const a = p.address ?? {};
    const name =
        p.name ??
        a.suburb ?? a.neighbourhood ?? a.city_district ??
        a.town ?? a.city ?? a.municipality ??
        `CP ${cpCode}`;

    return {
        osmId:       `rev_${cpCode}`,
        displayName: p.display_name ?? `CP ${cpCode}`,
        shortName:   name,
        addressType: `Zona (CP ${cpCode})`,
        geometry:    feature.geometry,
    };
}

async function searchPostalCode(q: string, countryCode: string): Promise<BoundaryFeature[]> {
    // 1. Nominatim directo — algunos CPs tienen polígono propio en OSM
    try {
        const fc = await nominatimGet({
            postalcode: q, countrycodes: countryCode,
            format: 'geojson', polygon_geojson: '1', addressdetails: '1', limit: '5',
        }, 86400);
        if (fc?.features?.length) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const hits = fc.features.filter((f: any) =>
                (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') &&
                !NON_ZONE_CLASSES.has(f.properties?.class ?? '')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ).map((f: any) => {
                const p = f.properties;
                return {
                    osmId: `${p.osm_type ?? 'N'}${p.osm_id}`,
                    displayName: p.display_name ?? `CP ${q}`,
                    shortName: p.name ?? `CP ${q}`,
                    addressType: 'Código Postal',
                    geometry: f.geometry,
                };
            });
            if (hits.length) return hits;
        }
    } catch { /* continúa */ }

    // 2. Obtener centroide del CP
    let lat = '', lon = '';
    for (const attempt of [
        { postalcode: q, countrycodes: countryCode, format: 'json', limit: '1' } as Record<string, string>,
        { q: `${q} Spain`, format: 'json', limit: '1' } as Record<string, string>,
    ]) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pts: any[] = await nominatimGet(attempt, 86400) ?? [];
            if (pts?.length) { lat = pts[0].lat; lon = pts[0].lon; break; }
        } catch { /* siguiente */ }
    }

    if (!lat) return [];

    // 3. Reverse geocoding en escalera de zoom: barrio → distrito → municipio → comarca
    for (const zoom of ['14', '12', '10', '8']) {
        try {
            const feature = await nominatimReverse(lat, lon, zoom);
            const result = polygonFromFeature(feature, q);
            if (result) return [result];
        } catch { /* siguiente zoom */ }
    }

    return [];
}

export async function searchBoundaries(
    query: string,
    countryCode = 'es'
): Promise<BoundaryFeature[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();

    if (isCP(q)) return searchPostalCode(q, countryCode);

    try {
        const fc = await nominatimGet({
            q,
            format: 'geojson', polygon_geojson: '1', polygon_threshold: '0.003',
            countrycodes: countryCode, limit: '10', addressdetails: '1',
        });
        if (!fc) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return fc.features
            .filter((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((f: any) => {
                const p = f.properties ?? {};
                const at = p.addresstype ?? p.type ?? p.class ?? 'administrative';
                return {
                    osmId: `${p.osm_type ?? 'W'}${p.osm_id ?? Math.random()}`,
                    displayName: p.display_name ?? '',
                    shortName: p.name ?? p.display_name?.split(',')[0] ?? q,
                    addressType: TYPE_LABELS[at] ?? at,
                    geometry: f.geometry,
                };
            });
    } catch { return []; }
}

// ─── Isócrona Mapbox ──────────────────────────────────────────────────────────

interface IsochroneParams { lng: number; lat: number; minutes: number; profile: IsochroneProfile; }

export async function fetchIsochrone(p: IsochroneParams) {
    const token = process.env.MAPBOX_TOKEN;
    if (!token) return null;
    const url = `https://api.mapbox.com/isochrone/v1/mapbox/${p.profile}/${p.lng},${p.lat}?contours_minutes=${p.minutes}&polygons=true&access_token=${token}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        return res.ok ? res.json() : null;
    } catch { return null; }
}
