'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createGeomanInstance } from '@geoman-io/maplibre-geoman-free';
import '@geoman-io/maplibre-geoman-free/dist/maplibre-geoman.css';
import * as turf from '@turf/turf';
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from 'geojson';
import {
    Map as MapIcon, Layers, PenTool, Hash, Info, AlertTriangle, X,
    ChevronRight, FileDown, Download, Timer, Loader2, Search, Plus,
    CheckCircle2, Globe, Folder, FolderOpen, Eye, EyeOff, Pencil, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { getActiveProjects } from '@/lib/projects';
import type { Project } from '@/types';
import {
    checkZoneOverlap,
    getProjectZones,
    saveGeographicZone,
    deleteGeographicZone,
    updateGeographicZoneMetadata,
    exportZonesToKML,
    exportZonesToExcelBase64,
    exportZonesToGeoJSON,
} from '@/app/actions/geo';
import { searchBoundaries, fetchIsochrone } from '@/app/actions/geo-search';
import type { IsochroneProfile, BoundaryFeature } from '@/app/actions/geo-search';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface GeographicZone {
    id: string;
    name: string;
    zoneCode: string;
    type: 'TRANSPORTE' | 'DEPOSITO';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    boundary: any;
}

interface OverlapResult {
    zoneCode: string;
    name: string;
    overlapPercentage: number;
}

interface PendingZone {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geojson: any;
    overlaps: OverlapResult[];
}

interface GeographicEditorProps {
    initialProjectId?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<string, string> = { TRANSPORTE: '#6366f1', DEPOSITO: '#10b981' };
const ZONE_BORDER_COLORS: Record<string, string> = { TRANSPORTE: '#4f46e5', DEPOSITO: '#059669' };
const ISOCHRONE_SOURCE  = 'isochrone-preview';
const ISOCHRONE_FILL    = 'isochrone-fill';
const ISOCHRONE_OUTLINE = 'isochrone-outline';
const SELECTION_SOURCE  = 'boundary-selection';
const SELECTION_FILL    = 'boundary-selection-fill';
const SELECTION_OUTLINE = 'boundary-selection-outline';

function sid(id: string) { return `zone-${id}`; }

// ─── Componente ───────────────────────────────────────────────────────────────

export default function GeographicEditor({ initialProjectId }: GeographicEditorProps) {
    const { user, tenantId } = useAuth();
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const mapContainer = useRef<HTMLDivElement>(null);
    const map          = useRef<maplibregl.Map | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Proyecto activo (puede cambiar sin recargar la página)
    const [projects, setProjects]           = useState<Project[]>([]);
    const [projectId, setProjectId]         = useState(initialProjectId ?? '');
    const [loadingProjects, setLoadingProjects] = useState(true);

    const [sidebarOpen, setSidebarOpen]   = useState(true);
    const [activeTab, setActiveTab]       = useState<'search' | 'zones' | 'draw' | 'isochrone' | 'export'>('search');
    const [activeTool, setActiveTool]     = useState<string | null>(null);
    const [zones, setZones]               = useState<GeographicZone[]>([]);
    const [isSaving, setIsSaving]         = useState(false);

    // Buscador de territorios
    const [searchQuery, setSearchQuery]             = useState('');
    const [searchResults, setSearchResults]         = useState<BoundaryFeature[]>([]);
    const [isSearching, setIsSearching]             = useState(false);
    const [selectedBoundaries, setSelectedBoundaries] = useState<BoundaryFeature[]>([]);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchAbortControllerRef = useRef<AbortController | null>(null);

    // Modal
    const [pendingZone, setPendingZone] = useState<PendingZone | null>(null);
    const [pendingName, setPendingName] = useState('');
    const [pendingType, setPendingType] = useState<'TRANSPORTE' | 'DEPOSITO'>('TRANSPORTE');

    // Isócrona
    const [isochroneMode, setIsochroneMode]       = useState(false);
    const [isochroneMinutes, setIsochroneMinutes] = useState(15);
    const [isochroneProfile, setIsochroneProfile] = useState<IsochroneProfile>('driving');
    const [isochroneLoading, setIsochroneLoading] = useState(false);
    const [isochroneActive, setIsochroneActive]   = useState(false);

    // Edición y Visibilidad
    const [editingZone, setEditingZone] = useState<GeographicZone | null>(null);
    const [hiddenZones, setHiddenZones] = useState<Set<string>>(new Set());

    // ── Cargar proyectos del tenant según permisos ────────────────────────────

    useEffect(() => {
        if (!user || !tenantId) return;
        setLoadingProjects(true);
        getActiveProjects(tenantId, user.uid)
            .then(data => {
                setProjects(data);
                // Si no hay projectId inicial y solo hay uno, seleccionarlo automáticamente
                if (!projectId && data.length === 1) setProjectId(data[0].id);
            })
            .finally(() => setLoadingProjects(false));
    }, [user, tenantId]);

    // ── Render zonas en mapa ──────────────────────────────────────────────────

    const renderZoneOnMap = useCallback((zone: GeographicZone) => {
        if (!map.current) return;
        const id = sid(zone.id);
        if (map.current.getSource(id)) return;
        map.current.addSource(id, { type: 'geojson', data: zone.boundary });
        map.current.addLayer({ id: `${id}-fill`, type: 'fill', source: id, paint: { 'fill-color': ZONE_COLORS[zone.type] ?? '#6366f1', 'fill-opacity': 0.3 } });
        map.current.addLayer({ id: `${id}-outline`, type: 'line', source: id, paint: { 'line-color': ZONE_BORDER_COLORS[zone.type] ?? '#4f46e5', 'line-width': 2 } });
    }, []);

    // Limpiar capas de zonas del mapa al cambiar de proyecto
    const clearZoneLayers = useCallback(() => {
        if (!map.current) return;
        zones.forEach(z => {
            const id = sid(z.id);
            if (map.current?.getLayer(`${id}-fill`)) map.current.removeLayer(`${id}-fill`);
            if (map.current?.getLayer(`${id}-outline`)) map.current.removeLayer(`${id}-outline`);
            if (map.current?.getSource(id)) map.current.removeSource(id);
        });
    }, [zones]);

    const loadZones = useCallback(async () => {
        if (!tenantId || !projectId) { setZones([]); return; }
        const data = await getProjectZones(tenantId, projectId) as GeographicZone[];
        setZones(data);
        if (map.current && isLoaded) data.forEach(renderZoneOnMap);
    }, [tenantId, projectId, isLoaded, renderZoneOnMap]);

    // Recargar zonas al cambiar de proyecto
    useEffect(() => {
        clearZoneLayers();
        if (isLoaded) loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, isLoaded]);

    // ── Zoom a zona al hacer clic en la lista ─────────────────────────────────

    const flyToZone = useCallback((zone: GeographicZone) => {
        if (!map.current || !zone.boundary) return;
        try {
            const bbox = turf.bbox(turf.feature(zone.boundary));
            map.current.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number], { padding: 60, duration: 800 });
        } catch { /* ignore */ }
    }, []);

    // ── Highlights de solapamiento ────────────────────────────────────────────

    const highlightOverlaps = useCallback((overlaps: OverlapResult[]) => {
        if (!map.current) return;
        const codes = new Set(overlaps.map(o => o.zoneCode));
        zones.forEach(z => {
            const fillId = `${sid(z.id)}-fill`;
            if (!map.current?.getLayer(fillId)) return;
            map.current.setPaintProperty(fillId, 'fill-color', codes.has(z.zoneCode) ? '#ef4444' : (ZONE_COLORS[z.type] ?? '#6366f1'));
            map.current.setPaintProperty(fillId, 'fill-opacity', codes.has(z.zoneCode) ? 0.55 : 0.3);
        });
    }, [zones]);

    const clearHighlights = useCallback(() => {
        if (!map.current) return;
        zones.forEach(z => {
            const fillId = `${sid(z.id)}-fill`;
            if (!map.current?.getLayer(fillId)) return;
            map.current.setPaintProperty(fillId, 'fill-color', ZONE_COLORS[z.type] ?? '#6366f1');
            map.current.setPaintProperty(fillId, 'fill-opacity', 0.3);
        });
    }, [zones]);

    const runOverlapCheck = useCallback(async (feature: Feature<Polygon | MultiPolygon>): Promise<OverlapResult[]> => {
        const turfHit = zones.some(z => { try { return turf.booleanOverlap(feature, z.boundary); } catch { return false; } });
        if (!turfHit) { clearHighlights(); return []; }
        const overlaps = await checkZoneOverlap(projectId, feature as unknown as Parameters<typeof checkZoneOverlap>[1]);
        highlightOverlaps(overlaps);
        return overlaps;
    }, [zones, projectId, highlightOverlaps, clearHighlights]);

    // ── Capa de selección en mapa ─────────────────────────────────────────────

    const updateSelectionLayer = useCallback((boundaries: BoundaryFeature[]) => {
        if (!map.current || !isLoaded) return;
        const fc: FeatureCollection = {
            type: 'FeatureCollection',
            features: boundaries.map(b => ({ type: 'Feature' as const, geometry: b.geometry as Feature<Polygon | MultiPolygon>['geometry'], properties: { osmId: b.osmId } })),
        };
        const src = map.current.getSource(SELECTION_SOURCE) as maplibregl.GeoJSONSource | undefined;
        if (src) {
            src.setData(fc);
        } else {
            map.current.addSource(SELECTION_SOURCE, { type: 'geojson', data: fc });
            map.current.addLayer({ id: SELECTION_FILL, type: 'fill', source: SELECTION_SOURCE, paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.25 } });
            map.current.addLayer({ id: SELECTION_OUTLINE, type: 'line', source: SELECTION_SOURCE, paint: { 'line-color': '#0284c7', 'line-width': 2.5 } });
        }
        if (boundaries.length > 0) {
            const bbox = turf.bbox(turf.featureCollection(boundaries.map(b => turf.feature(b.geometry as Polygon | MultiPolygon))));
            map.current.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]] as [number, number, number, number], { padding: 60, duration: 800, maxZoom: 14 });
        }
    }, [isLoaded]);

    const clearSelectionLayer = useCallback(() => {
        if (!map.current) return;
        if (map.current.getLayer(SELECTION_FILL)) map.current.removeLayer(SELECTION_FILL);
        if (map.current.getLayer(SELECTION_OUTLINE)) map.current.removeLayer(SELECTION_OUTLINE);
        if (map.current.getSource(SELECTION_SOURCE)) map.current.removeSource(SELECTION_SOURCE);
    }, []);

    const addBoundary = useCallback((b: BoundaryFeature) => {
        setSelectedBoundaries(prev => {
            if (prev.some(x => x.osmId === b.osmId)) return prev;
            const next = [...prev, b];
            updateSelectionLayer(next);
            return next;
        });
        setSearchResults([]);
        setSearchQuery('');
    }, [updateSelectionLayer]);

    const removeBoundary = useCallback((osmId: string) => {
        setSelectedBoundaries(prev => {
            const next = prev.filter(x => x.osmId !== osmId);
            if (next.length === 0) clearSelectionLayer(); else updateSelectionLayer(next);
            return next;
        });
    }, [updateSelectionLayer, clearSelectionLayer]);

    // ── Crear zona desde selección ────────────────────────────────────────────

    const createZoneFromSelection = useCallback(async () => {
        if (selectedBoundaries.length === 0 || !projectId) return;
        let merged: Feature<Polygon | MultiPolygon> | null = null;
        for (const b of selectedBoundaries) {
            const feat = turf.feature(b.geometry as Polygon | MultiPolygon);
            if (!merged) { merged = feat; continue; }
            const result = turf.union(turf.featureCollection([merged, feat]));
            if (result) merged = result as Feature<Polygon | MultiPolygon>;
        }
        if (!merged) return;
        const overlaps = await runOverlapCheck(merged);
        setPendingZone({ geojson: merged, overlaps });
        setPendingName(selectedBoundaries.length === 1 ? selectedBoundaries[0].shortName : selectedBoundaries.map(b => b.shortName).join(' + '));
    }, [selectedBoundaries, projectId, runOverlapCheck]);

    // ── Búsqueda con debounce ─────────────────────────────────────────────────

    const handleSearch = useCallback((q: string) => {
        setSearchQuery(q);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        
        // Cancelamos cualquier búsqueda anterior en curso
        if (searchAbortControllerRef.current) {
            searchAbortControllerRef.current.abort();
        }

        if (!q.trim() || q.trim().length < 2) { 
            setSearchResults([]); 
            setIsSearching(false);
            return; 
        }

        searchDebounce.current = setTimeout(async () => {
            const controller = new AbortController();
            searchAbortControllerRef.current = controller;

            setIsSearching(true);
            try {
                const results = await searchBoundaries(q, 'es');
                setSearchResults(results);
            } catch (error: any) {
                if (error.name === 'AbortError') return;
                console.error("Search error:", error);
            } finally {
                // Solo apagamos el loader si esta sigue siendo la búsqueda activa
                if (searchAbortControllerRef.current === controller) {
                    setIsSearching(false);
                }
            }
        }, 700);
    }, []);

    // ── Guardar zona ──────────────────────────────────────────────────────────

    const cancelPending = useCallback(() => { clearHighlights(); setPendingZone(null); setEditingZone(null); setPendingName(''); }, [clearHighlights]);

    // ── Gestión avanzada de zonas ─────────────────────────────────────────────

    const toggleZoneVisibility = useCallback((zoneId: string) => {
        if (!map.current) return;
        const isHidden = hiddenZones.has(zoneId);
        const nextHidden = new Set(hiddenZones);
        if (isHidden) nextHidden.delete(zoneId); else nextHidden.add(zoneId);
        setHiddenZones(nextHidden);

        const fillId = `${sid(zoneId)}-fill`;
        const outlineId = `${sid(zoneId)}-outline`;
        const visibility = isHidden ? 'visible' : 'none';

        if (map.current.getLayer(fillId)) map.current.setLayoutProperty(fillId, 'visibility', visibility);
        if (map.current.getLayer(outlineId)) map.current.setLayoutProperty(outlineId, 'visibility', visibility);
    }, [hiddenZones]);

    const handleDeleteZone = useCallback(async (zoneId: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta zona geográfica de forma permanente?')) return;
        await deleteGeographicZone(zoneId);
        
        // Limpiar del mapa
        if (map.current) {
            const id = sid(zoneId);
            if (map.current.getLayer(`${id}-fill`)) map.current.removeLayer(`${id}-fill`);
            if (map.current.getLayer(`${id}-outline`)) map.current.removeLayer(`${id}-outline`);
            if (map.current.getSource(id)) map.current.removeSource(id);
        }

        setZones(prev => prev.filter(z => z.id !== zoneId));
    }, []);

    const handleEditZone = useCallback((zone: GeographicZone) => {
        setEditingZone(zone);
        setPendingName(zone.name);
        setPendingType(zone.type as "TRANSPORTE" | "DEPOSITO");
        // No hay geometría pendiente porque solo editamos metadatos
        setPendingZone(null); 
    }, []);

    const confirmSave = useCallback(async () => {
        if (!tenantId || !projectId || !pendingName.trim()) return;
        setIsSaving(true);

        if (editingZone) {
            // Caso edición de metadatos
            await updateGeographicZoneMetadata(editingZone.id, { name: pendingName.trim(), type: pendingType });
        } else if (pendingZone) {
            // Caso creación nueva
            await saveGeographicZone({ tenantId, projectId, zoneCode: `Z-${Date.now()}`, name: pendingName.trim(), type: pendingType, geojson: pendingZone.geojson });
        }

        await loadZones();
        clearHighlights();
        clearSelectionLayer();
        setSelectedBoundaries([]);
        setPendingZone(null);
        setEditingZone(null);
        setPendingName('');
        setIsSaving(false);
        setActiveTab('zones');
    }, [pendingZone, editingZone, tenantId, projectId, pendingName, pendingType, loadZones, clearHighlights, clearSelectionLayer]);

    // ── Isócrona ──────────────────────────────────────────────────────────────

    const clearIsochroneLayer = useCallback(() => {
        if (!map.current) return;
        if (map.current.getLayer(ISOCHRONE_FILL)) map.current.removeLayer(ISOCHRONE_FILL);
        if (map.current.getLayer(ISOCHRONE_OUTLINE)) map.current.removeLayer(ISOCHRONE_OUTLINE);
        if (map.current.getSource(ISOCHRONE_SOURCE)) map.current.removeSource(ISOCHRONE_SOURCE);
        setIsochroneActive(false);
    }, []);

    const toggleIsochroneMode = useCallback(() => setIsochroneMode(prev => { if (prev) clearIsochroneLayer(); return !prev; }), [clearIsochroneLayer]);

    useEffect(() => {
        if (!map.current || !isLoaded) return;
        const onClick = async (e: maplibregl.MapMouseEvent) => {
            if (!isochroneMode) return;
            const { lng, lat } = e.lngLat;
            setIsochroneLoading(true);
            clearIsochroneLayer();
            const result = await fetchIsochrone({ lng, lat, minutes: isochroneMinutes, profile: isochroneProfile });
            if (result?.features.length) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                map.current?.addSource(ISOCHRONE_SOURCE, { type: 'geojson', data: result as any });
                map.current?.addLayer({ id: ISOCHRONE_FILL, type: 'fill', source: ISOCHRONE_SOURCE, paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.25 } });
                map.current?.addLayer({ id: ISOCHRONE_OUTLINE, type: 'line', source: ISOCHRONE_SOURCE, paint: { 'line-color': '#d97706', 'line-width': 2, 'line-dasharray': [4, 2] } });
                setIsochroneActive(true);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const coords = (result.features[0].geometry as any).coordinates[0] as [number, number][];
                const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
                map.current?.fitBounds(bounds, { padding: 40, duration: 800 });
            }
            setIsochroneLoading(false);
        };
        map.current.on('click', onClick);
        return () => { map.current?.off('click', onClick); };
    }, [isLoaded, isochroneMode, isochroneMinutes, isochroneProfile, clearIsochroneLayer]);

    // ── Inicialización mapa ───────────────────────────────────────────────────

    useEffect(() => {
        if (!mapContainer.current) return;
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: isLight
                ? 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json'
                : 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [-3.703790, 40.416775], // Madrid
            zoom: 6,
        });
        map.current.on('load', async () => {
            if (!map.current) return;
            await createGeomanInstance(map.current, {
                settings: { useControlsUi: true, controlsPosition: 'top-left' as 'top-left' },
                controls: {
                    draw: { polygon: { uiEnabled: true }, rectangle: { uiEnabled: true }, circle: { uiEnabled: true }, marker: { uiEnabled: false }, line: { uiEnabled: false }, freehand: { uiEnabled: false } },
                    edit: { drag: { uiEnabled: false }, rotate: { uiEnabled: false }, scale: { uiEnabled: false } },
                },
            });
            map.current.on('gm:drawstart', (e: { shape?: string }) => setActiveTool(e.shape ?? 'Polígono'));
            map.current.on('gm:drawend', () => setActiveTool(null));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            map.current.on('gm:create', async (e: any) => {
                const feature = e.feature as Feature<Polygon | MultiPolygon>;
                if (!feature) return;
                const overlaps = await runOverlapCheck(feature);
                setPendingZone({ geojson: feature, overlaps });
                setPendingName('');
            });
            setIsLoaded(true);
        });
        return () => { map.current?.remove(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLight]);

    // ── Exportaciones ─────────────────────────────────────────────────────────

    const handleExportExcel = useCallback(async () => {
        if (!tenantId) return;
        const base64 = await exportZonesToExcelBase64(tenantId, projectId);
        if (!base64) return;
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `zonas-${projectId}.xlsx`; a.click();
        URL.revokeObjectURL(url);
    }, [tenantId, projectId]);

    const handleExportGeoJSON = useCallback(async () => {
        if (!tenantId) return;
        const fc = await exportZonesToGeoJSON(tenantId, projectId);
        const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `zonas-${projectId}.geojson`; a.click();
        URL.revokeObjectURL(url);
    }, [tenantId, projectId]);

    const handleExportKML = useCallback(async () => {
        if (!tenantId) return;
        const kml = await exportZonesToKML(tenantId, projectId);
        const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `zonas-${projectId}.kml`; a.click();
        URL.revokeObjectURL(url);
    }, [tenantId, projectId]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    const activeProject = projects.find(p => p.id === projectId);

    const TAB = (tab: typeof activeTab, icon: React.ReactNode, label: string, badge?: number) => (
        <button onClick={() => setActiveTab(tab)} className={cn(
            "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors relative",
            activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
        )}>
            {icon}
            {label}
            {badge !== undefined && badge > 0 && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>
            )}
        </button>
    );

    return (
        <div className="flex h-full w-full bg-background relative overflow-hidden font-sans">

            {/* ── Sidebar ───────────────────────────────────────────────────── */}
            <aside className={cn(
                "h-full bg-card/80 backdrop-blur-xl border-r border-border transition-all duration-300 z-20 flex flex-col",
                sidebarOpen ? "w-88 min-w-[22rem]" : "w-0 overflow-hidden"
            )}>

                {/* ── Selector de proyecto ─────────────────────────────────── */}
                <div className="p-3 border-b border-border shrink-0 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <MapIcon className="w-4 h-4 text-primary" />
                            <span className="font-bold text-xs uppercase tracking-wider">UniGeo</span>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="p-1 hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1 flex items-center gap-1">
                            <Folder className="w-3 h-3" /> Proyecto
                        </label>
                        {loadingProjects ? (
                            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg text-xs text-muted-foreground">
                                <Loader2 className="w-3 h-3 animate-spin" /> Cargando proyectos...
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="p-2 bg-muted rounded-lg text-xs text-muted-foreground">Sin proyectos disponibles</div>
                        ) : (
                            <select
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="" disabled>Selecciona un proyecto...</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Indicador de estado */}
                    {projectId && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <FolderOpen className="w-3 h-3 text-primary" />
                            <span className="truncate">{activeProject?.name ?? projectId.substring(0, 12) + '...'}</span>
                            <span className="ml-auto font-bold text-primary">{zones.length} zona{zones.length !== 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>

                {/* Bloqueo si no hay proyecto */}
                {!projectId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-50 gap-3">
                        <Folder className="w-12 h-12" />
                        <p className="text-sm font-medium">Selecciona un proyecto<br/>para comenzar</p>
                    </div>
                ) : (
                    <>
                        {/* ── Tabs ────────────────────────────────────────── */}
                        <div className="flex border-b border-border shrink-0">
                            {TAB('search',    <Search className="w-3.5 h-3.5" />,   'Buscar')}
                            {TAB('zones',     <Layers className="w-3.5 h-3.5" />,   'Zonas', zones.length)}
                            {TAB('draw',      <PenTool className="w-3.5 h-3.5" />,  'Dibujar')}
                            {TAB('isochrone', <Timer className="w-3.5 h-3.5" />,    'Isócrona')}
                            {TAB('export',    <Download className="w-3.5 h-3.5" />, 'Exportar')}
                        </div>

                        {/* ── Tab: Búsqueda de territorio ─────────────────── */}
                        {activeTab === 'search' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-3 space-y-2 border-b border-border shrink-0">
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Busca por provincia, municipio, código postal, localidad o comunidad autónoma de España.
                                    </p>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => handleSearch(e.target.value)}
                                            placeholder="Ej: Valencia, 28001, Cataluña..."
                                            className="w-full bg-muted border border-border rounded-lg pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        {isSearching && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="border border-border rounded-lg overflow-hidden shadow-lg bg-card max-h-60 overflow-y-auto">
                                            {searchResults.map(r => (
                                                <button key={r.osmId} onClick={() => addBoundary(r)}
                                                    className="w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors border-b border-border/50 last:border-0 flex items-start gap-2">
                                                    <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold truncate">{r.shortName}</div>
                                                        <div className="text-[10px] text-muted-foreground truncate">{r.displayName}</div>
                                                    </div>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 rounded font-medium shrink-0">{r.addressType}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                                        <p className="text-[11px] text-muted-foreground text-center py-1">Sin resultados para "{searchQuery}"</p>
                                    )}
                                </div>

                                {/* Selección activa */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {selectedBoundaries.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-40 text-center gap-2">
                                            <Globe className="w-8 h-8" />
                                            <p className="text-xs">Busca y añade territorios.<br/>Puedes combinar varios.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3 h-3 text-sky-500" /> Seleccionados ({selectedBoundaries.length})
                                            </label>
                                            {selectedBoundaries.map(b => (
                                                <div key={b.osmId} className="flex items-center gap-2 p-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold truncate">{b.shortName}</div>
                                                        <div className="text-[10px] text-muted-foreground">{b.addressType}</div>
                                                    </div>
                                                    <button onClick={() => removeBoundary(b.osmId)} className="p-1 hover:text-destructive text-muted-foreground transition-colors shrink-0">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>

                                <div className="p-3 border-t border-border shrink-0">
                                    <button onClick={createZoneFromSelection} disabled={selectedBoundaries.length === 0}
                                        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                        <Plus className="w-4 h-4" />
                                        Crear Zona desde Selección
                                        {selectedBoundaries.length > 0 && <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{selectedBoundaries.length}</span>}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Zonas guardadas ─────────────────────────── */}
                        {activeTab === 'zones' && (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="p-3 border-b border-border shrink-0 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        {zones.length} zona{zones.length !== 1 ? 's' : ''} en este proyecto
                                    </span>
                                    <button onClick={loadZones} className="text-[10px] text-primary hover:underline">Actualizar</button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {zones.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-40 text-center gap-2">
                                            <Layers className="w-8 h-8" />
                                            <p className="text-xs">No hay zonas en este proyecto.<br/>Usa "Buscar" para crear la primera.</p>
                                        </div>
                                    ) : (
                                        zones.map(z => (
                                            <div key={z.id}
                                                className={cn(
                                                    "p-3 bg-muted/50 border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer group",
                                                    hiddenZones.has(z.id) && "opacity-60"
                                                )}
                                                onClick={() => flyToZone(z)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold truncate flex-1 mr-2">{z.name}</span>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className={cn(
                                                            "text-[10px] px-1.5 py-0.5 rounded uppercase font-medium",
                                                            z.type === 'TRANSPORTE' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                        )}>{z.type}</span>
                                                        
                                                        {/* Acciones Rápidas */}
                                                        <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); toggleZoneVisibility(z.id); }}
                                                                className="p-1 hover:bg-background rounded transition-colors text-muted-foreground hover:text-primary"
                                                                title={hiddenZones.has(z.id) ? "Mostrar" : "Ocultar"}
                                                            >
                                                                {hiddenZones.has(z.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleEditZone(z); }}
                                                                className="p-1 hover:bg-background rounded transition-colors text-muted-foreground hover:text-primary"
                                                                title="Editar Nombre/Tipo"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteZone(z.id); }}
                                                                className="p-1 hover:bg-background rounded transition-colors text-muted-foreground hover:text-destructive"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                                    <Hash className="w-3 h-3" /> {z.zoneCode}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Dibujo manual ───────────────────────────── */}
                        {activeTab === 'draw' && (
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                <div className="p-3 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground leading-relaxed">
                                    Usa las herramientas de la esquina superior izquierda del mapa para trazar polígonos libres. Al terminar de dibujar se abrirá el formulario de guardado.
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[10px] text-amber-700 dark:text-amber-300">
                                    <strong>Regla de Oro:</strong> Las zonas guardadas son inmutables. Para modificar una zona, bórrala y vuelve a dibujarla.
                                </div>
                            </div>
                        )}

                        {/* ── Tab: Isócrona ────────────────────────────────── */}
                        {activeTab === 'isochrone' && (
                            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                                <p className="text-[10px] text-muted-foreground">Calcula el área alcanzable desde un punto en el tiempo indicado.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-muted-foreground block mb-1">Minutos</label>
                                        <select value={isochroneMinutes} onChange={e => setIsochroneMinutes(Number(e.target.value))}
                                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                                            {[5, 10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-muted-foreground block mb-1">Modo</label>
                                        <select value={isochroneProfile} onChange={e => setIsochroneProfile(e.target.value as IsochroneProfile)}
                                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50">
                                            <option value="driving">Vehículo</option>
                                            <option value="walking">A pie</option>
                                            <option value="cycling">Bicicleta</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={toggleIsochroneMode} className={cn(
                                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                                    isochroneMode ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-muted border border-border hover:border-amber-400 hover:text-amber-500"
                                )}>
                                    {isochroneLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Calculando...</>
                                        : isochroneMode ? <><Timer className="w-4 h-4" />Haz clic en el mapa</>
                                        : <><Timer className="w-4 h-4" />Activar Isócrona</>}
                                </button>
                                {isochroneActive && (
                                    <button onClick={clearIsochroneLayer}
                                        className="w-full py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-destructive border border-border hover:border-destructive/50 transition-all">
                                        Limpiar isócrona
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Tab: Exportar ────────────────────────────────── */}
                        {activeTab === 'export' && (
                            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                                <p className="text-[10px] text-muted-foreground mb-3">
                                    Exporta las {zones.length} zona{zones.length !== 1 ? 's' : ''} del proyecto "{activeProject?.name}".
                                </p>
                                <button onClick={handleExportExcel} disabled={zones.length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-bold hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-40">
                                    <FileDown className="w-4 h-4" /> Excel (.xlsx)
                                </button>
                                <button onClick={handleExportGeoJSON} disabled={zones.length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-muted border border-border py-2.5 rounded-lg text-sm font-bold hover:border-primary/50 transition-all disabled:opacity-40">
                                    <Download className="w-4 h-4" /> GeoJSON
                                </button>
                                <button onClick={handleExportKML} disabled={zones.length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-muted border border-border py-2.5 rounded-lg text-sm font-bold hover:border-primary/50 transition-all disabled:opacity-40">
                                    <Download className="w-4 h-4" /> KML (GPS / Google Earth)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </aside>

            {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 bg-card border border-border rounded-full shadow-xl hover:text-primary transition-all">
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}

            {/* ── Mapa ──────────────────────────────────────────────────────── */}
            <main className="flex-1 relative">
                <div ref={mapContainer} className="h-full w-full" />

                {isochroneMode && !isochroneLoading && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
                        <Timer className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Clic en el mapa · {isochroneMinutes} min · {isochroneProfile === 'driving' ? 'vehículo' : isochroneProfile === 'walking' ? 'a pie' : 'bicicleta'}</span>
                        <button onClick={toggleIsochroneMode}><X className="w-3.5 h-3.5" /></button>
                    </div>
                )}
                {isochroneLoading && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs font-bold uppercase">Calculando isócrona...</span>
                    </div>
                )}
                {activeTool && !isochroneMode && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl shadow-2xl flex items-center gap-3">
                        <PenTool className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-xs font-medium">Dibujando {activeTool}...</span>
                    </div>
                )}

                {/* Info panel */}
                <div className="absolute top-4 right-4 z-10">
                    <div className="bg-card/80 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl space-y-1.5 min-w-[140px]">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 mb-1">
                            <Info className="w-3 h-3" /> Estado
                        </div>
                        <div className="text-xs flex justify-between gap-3">
                            <span className="text-muted-foreground">Proyecto</span>
                            <span className="font-semibold text-primary truncate max-w-[80px]">{activeProject?.name ?? '—'}</span>
                        </div>
                        <div className="text-xs flex justify-between gap-3">
                            <span className="text-muted-foreground">Zonas</span>
                            <span className="font-bold text-primary">{zones.length}</span>
                        </div>
                        {selectedBoundaries.length > 0 && (
                            <div className="text-xs flex justify-between gap-3">
                                <span className="text-muted-foreground">Selección</span>
                                <span className="font-bold text-sky-500">{selectedBoundaries.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ── Modal bloqueante ──────────────────────────────────────────── */}
            {(pendingZone || editingZone) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in zoom-in-95">
                        <div className="flex items-center gap-3">
                            {editingZone ? <Pencil className="w-6 h-6 text-primary shrink-0" />
                                : pendingZone?.overlaps.length && pendingZone.overlaps.length > 0
                                ? <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
                                : <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />}
                            <div>
                                <h3 className="font-bold text-sm">
                                    {editingZone ? 'Editar Zona Geográfica' : pendingZone?.overlaps.length && pendingZone.overlaps.length > 0 ? 'Solapamiento Detectado' : 'Guardar Zona'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {editingZone ? `Modificando metadatos de "${editingZone.name}"`
                                        : pendingZone?.overlaps.length && pendingZone.overlaps.length > 0 ? 'La zona se superpone con zonas existentes.' 
                                        : `Se guardará en el proyecto "${activeProject?.name}".`}
                                </p>
                            </div>
                        </div>

                        {pendingZone && pendingZone.overlaps.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
                                {pendingZone.overlaps.map(o => (
                                    <div key={o.zoneCode} className="flex items-center justify-between text-xs">
                                        <span className="font-medium text-destructive">{o.name}</span>
                                        <span className="font-mono font-bold text-destructive">{o.overlapPercentage}%</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Nombre *</label>
                                <input type="text" value={pendingName} onChange={e => setPendingName(e.target.value)} autoFocus
                                    placeholder="Ej: Zona Norte Valencia"
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tipo</label>
                                <select value={pendingType} onChange={e => setPendingType(e.target.value as 'TRANSPORTE' | 'DEPOSITO')}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                                    <option value="TRANSPORTE">TRANSPORTE</option>
                                    <option value="DEPOSITO">DEPÓSITO</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={cancelPending} className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">Cancelar</button>
                            <button onClick={confirmSave} disabled={!pendingName.trim() || isSaving}
                                className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                    !editingZone && pendingZone?.overlaps && pendingZone.overlaps.length > 0 ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:opacity-90")}>
                                {isSaving ? 'Guardando...' : editingZone ? 'Actualizar Zona' : pendingZone?.overlaps && pendingZone.overlaps.length > 0 ? 'Confirmar y Guardar' : 'Guardar Zona'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
