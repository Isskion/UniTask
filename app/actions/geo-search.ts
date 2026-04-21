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

const NON_ZONE_CLASSES = new Set(['building', 'highway', 'amenity', 'shop', 'leisure', 'man_made']);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function zippopotamLookup(cp: string): Promise<{ lat: string; lon: string; placeName: string; state: string } | null> {
    try {
        const res = await fetch(`https://api.zippopotam.us/ES/${cp}`, {
            headers: { 'User-Agent': HDR['User-Agent'] },
            next: { revalidate: 86400 },
        });
        if (!res.ok) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        const place = data?.places?.[0];
        if (!place) return null;
        return { lat: place.latitude, lon: place.longitude, placeName: place['place name'], state: place.state };
    } catch { return null; }
}

// Andrew's monotone chain — convex hull sin dependencias externas
function convexHull(pts: [number, number][]): [number, number][] | null {
    if (pts.length < 3) return null;
    const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o: [number,number], a: [number,number], b: [number,number]) =>
        (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);
    const lower: [number,number][] = [];
    for (const p of s) {
        while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper: [number,number][] = [];
    for (const p of [...s].reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], p) <= 0) upper.pop();
        upper.push(p);
    }
    upper.pop(); lower.pop();
    const hull = [...lower, ...upper];
    if (hull.length < 3) return null;
    return [...hull, hull[0]]; // cerrar el anillo
}

// Obtiene todos los elementos OSM con addr:postcode=CP dentro del bbox de Nominatim
// y calcula el convex hull como polígono aproximado del área del CP
async function overpassPostalCode(cp: string, bbox: [number,number,number,number] | null): Promise<BoundaryFeature[]> {
    try {
        // bbox Nominatim: [minLon, minLat, maxLon, maxLat] → Overpass: (minLat,minLon,maxLat,maxLon)
        const bboxStr = bbox ? `(${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]})` : '';
        const query = `[out:json][timeout:25];(way["addr:postcode"="${cp}"]${bboxStr};node["addr:postcode"="${cp}"]${bboxStr};);out center;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': HDR['User-Agent'] },
            body: `data=${encodeURIComponent(query)}`,
            next: { revalidate: 86400 },
        });
        if (!res.ok) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const points: [number,number][] = (data?.elements ?? []).map((el: any) => {
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            return (lat && lon) ? [lon, lat] as [number,number] : null;
        }).filter(Boolean);

        if (points.length < 3) return [];
        const hull = convexHull(points);
        if (!hull) return [];

        return [{
            osmId:       `addr_${cp}`,
            displayName: `CP ${cp}`,
            shortName:   `CP ${cp}`,
            addressType: 'Código Postal',
            geometry:    { type: 'Polygon', coordinates: [hull] },
        }];
    } catch (e) {
        console.error('[Overpass addr:postcode ERROR]', e);
        return [];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cartociudadPostalCode(cp: string): Promise<BoundaryFeature[]> {
    try {
        const filter = `<Filter><PropertyIsEqualTo><PropertyName>codigoPostal</PropertyName><Literal>${cp}</Literal></PropertyIsEqualTo></Filter>`;
        const params = new URLSearchParams({
            SERVICE: 'WFS', VERSION: '1.1.0', REQUEST: 'GetFeature',
            TYPENAME: 'app:CodigoPostal', SRSNAME: 'EPSG:4326',
            OUTPUTFORMAT: 'application/json', FILTER: filter,
        });
        const url = `https://www.cartociudad.es/wfs-cartociudad/services?${params}`;
        const res = await fetch(url, { headers: HDR, next: { revalidate: 86400 } });
        if (!res.ok) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fc: any = await res.json();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fc?.features ?? []).filter((f: any) =>
            f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ).map((f: any) => ({
            osmId:       `cc_${cp}`,
            displayName: `CP ${cp} (CartoCiudad/IGN)`,
            shortName:   `CP ${cp}`,
            addressType: 'Código Postal',
            geometry:    f.geometry,
        }));
    } catch (e) {
        console.error('[CartoCiudad WFS ERROR]', e);
        return [];
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function nominatimMuniPolygon(name: string, countryCode: string, cpCode: string): Promise<BoundaryFeature[]> {
    const fc = await nominatimGet({
        q: name, countrycodes: countryCode,
        format: 'geojson', polygon_geojson: '1', addressdetails: '1', limit: '3',
    }, 86400);
    if (!fc?.features?.length) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fc.features.filter((f: any) =>
        (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') &&
        !NON_ZONE_CLASSES.has(f.properties?.class ?? '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).map((f: any) => {
        const p = f.properties;
        return {
            osmId: `${p.osm_type ?? 'N'}${p.osm_id}`,
            displayName: p.display_name ?? name,
            shortName: p.name ?? name,
            addressType: `Municipio (CP ${cpCode})`,
            geometry: f.geometry,
        };
    });
}

// Radio fijo alrededor del centroide del CP para Overpass.
// El bbox de Nominatim es demasiado grande (28001 Madrid → 9×10 km).
// ±0.025° ≈ ±2.5 km — suficiente para cualquier CP urbano.
const CP_SEARCH_DELTA = 0.025;

async function searchPostalCode(q: string, countryCode: string): Promise<BoundaryFeature[]> {
    // 1. Nominatim — extrae centroide para acotar Overpass; algunos CPs tienen polígono propio
    let centroidBbox: [number,number,number,number] | null = null;
    try {
        const fc = await nominatimGet({
            postalcode: q, countrycodes: countryCode,
            format: 'geojson', polygon_geojson: '1', addressdetails: '1', limit: '3',
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
            // Construir bbox desde el centroide con radio fijo — el bbox de Nominatim
            // para CPs de ciudad es demasiado grande (ej: 28001 Madrid → 9×10 km)
            const coords = fc.features[0]?.geometry?.coordinates as [number, number] | undefined;
            if (coords) {
                const [lon, lat] = coords;
                centroidBbox = [lon - CP_SEARCH_DELTA, lat - CP_SEARCH_DELTA, lon + CP_SEARCH_DELTA, lat + CP_SEARCH_DELTA];
            }
        }
    } catch { /* continúa */ }

    // 2. Overpass addr:postcode → convex hull del CP (basado en edificios/nodos reales)
    const overpassHits = await overpassPostalCode(q, centroidBbox);
    if (overpassHits.length) return overpassHits;

    // 3. CartoCiudad WFS (IGN oficial) — endpoint actualmente bloqueado, se mantiene por si se restaura
    const cartoHits = await cartociudadPostalCode(q);
    if (cartoHits.length) return cartoHits;

    // 4. Zippopotam.us — catálogo fiable de CPs españoles con nombre de municipio correcto
    const zippo = await zippopotamLookup(q);
    if (zippo) {
        // Buscar polígono del municipio por nombre (fuente autoritativa)
        const hits = await nominatimMuniPolygon(zippo.placeName, countryCode, q);
        if (hits.length) return hits;
        // Si el nombre exacto no da resultado, probar con la comunidad autónoma como contexto
        const hitsWithState = await nominatimMuniPolygon(`${zippo.placeName}, ${zippo.state}`, countryCode, q);
        if (hitsWithState.length) return hitsWithState;
    }

    // 5. Fallback Nominatim: obtener centroide + datos de dirección
    let lat = '', lon = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let addressObj: Record<string, string> | null = null;
    for (const attempt of [
        { postalcode: q, countrycodes: countryCode, format: 'json', addressdetails: '1', limit: '1' } as Record<string, string>,
        { q, countrycodes: countryCode, format: 'json', addressdetails: '1', limit: '1' } as Record<string, string>,
    ]) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pts: any[] = await nominatimGet(attempt, 86400) ?? [];
            if (pts?.length) { lat = pts[0].lat; lon = pts[0].lon; addressObj = pts[0].address ?? null; break; }
        } catch { /* siguiente */ }
    }

    if (!lat) return [];

    // 6. Reverse geocoding en escalera de zoom
    for (const zoom of ['14', '12', '10', '8']) {
        try {
            const feature = await nominatimReverse(lat, lon, zoom);
            const result = polygonFromFeature(feature, q);
            if (result) return [result];
        } catch { /* siguiente zoom */ }
    }

    // 7. Último recurso: municipio desde address de Nominatim
    const muniName = addressObj?.municipality ?? addressObj?.city ?? addressObj?.town ?? addressObj?.village ?? addressObj?.county;
    if (muniName) {
        const hits = await nominatimMuniPolygon(muniName, countryCode, q);
        if (hits.length) return hits;
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

export type IsochroneResult =
    | { ok: true; data: unknown }
    | { ok: false; error: string };

const VALHALLA_COSTING: Record<IsochroneProfile, string> = {
    driving: 'auto',
    walking: 'pedestrian',
    cycling: 'bicycle',
};

export async function fetchIsochrone(p: IsochroneParams): Promise<IsochroneResult> {
    const body = JSON.stringify({
        locations: [{ lat: p.lat, lon: p.lng }],
        costing: VALHALLA_COSTING[p.profile],
        contours: [{ time: p.minutes }],
        polygons: true,
    });
    try {
        const res = await fetch('https://valhalla1.openstreetmap.de/isochrone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'UniTask-GeoModule/2.0 (contacto@unisolutions.com)' },
            body,
            cache: 'no-store',
        });
        if (!res.ok) return { ok: false, error: `Valhalla error ${res.status}: ${res.statusText}` };
        return { ok: true, data: await res.json() };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error de red al calcular isócrona.' };
    }
}
