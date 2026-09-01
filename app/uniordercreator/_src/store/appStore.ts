"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import * as XLSX from 'xlsx';
import { FIELD_GROUPS } from '../data/schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UserRole = 'admin' | 'basic';
export type RowStatus = 'pending' | 'sending' | 'success' | 'error';

export interface RowData extends Record<string, any> {
    _status?: RowStatus;
    _error?: string;
    _errorCode?: string;
    _serverResponse?: string;
    _items?: Record<string, any>[];
    _grouped?: boolean;
    _itemCount?: number;
}

export interface MultiSheetConfig {
    mainSheet: string;
    mainKey: string;
    relations: Array<{
        sheet: string;
        key: string;
        targetPath: string;
        itemTag: string;
    }>;
}

export interface MultiSheetState {
    enabled: boolean;
    workbook: XLSX.WorkBook | null;
    sheets: Record<string, any[]>;
    sheetHeaders: Record<string, string[]>;
    config: MultiSheetConfig;
}

export interface AppState {
    // Auth
    token: string | null;
    orderUrl: string;
    role: UserRole;
    allowedUsers: string[];
    currentUser: string;

    // Data
    rows: RowData[];
    headers: string[];
    selectedIndices: Set<number>;
    selectedRow: number;

    // Mapping
    mapping: Record<string, string>;
    booleanOverrides: Record<string, boolean>;
    currentTab: string;
    searchQuery: string;
    dynamicFieldCounts: Record<string, number>;

    // Multi-Sheet
    multiSheet: MultiSheetState;

    // i18n
    currentLanguage: string;

    // UI
    isSending: boolean;
    sendCancelled: boolean;
    highlightedField: string;
    isDryRun: boolean; // #72: Modo Simulación
    /** Se incrementa solo cuando cambian los DATOS reales (carga de Excel, edición de celda),
     * nunca en actualizaciones de _status/_error durante un envío masivo. Permite a componentes
     * costosos (p.ej. detección de columnas vacías en MapperPanel) recalcular solo cuando hace
     * falta, en vez de en cada una de las miles de actualizaciones de estado que dispara un
     * envío grande — ver la misma corrección aplicada primero en uniclientedadorcreator. */
    dataVersion: number;

    // --- Actions ---
    setToken: (token: string | null) => void;
    setOrderUrl: (url: string) => void;
    setRole: (role: UserRole) => void;
    setCurrentUser: (user: string) => void;
    setAllowedUsers: (users: string[]) => void;

    setRows: (rows: RowData[]) => void;
    setHeaders: (headers: string[]) => void;
    setSelectedRow: (index: number) => void;
    toggleSelection: (index: number) => void;
    toggleSelectAll: (checked: boolean) => void;
    clearSelection: () => void;

    setMapping: (mapping: Record<string, string>) => void;
    updateMappingField: (field: string, value: string) => void;
    setBooleanOverride: (field: string, value: boolean) => void;
    setCurrentTab: (tab: string) => void;
    setSearchQuery: (query: string) => void;
    setDynamicFieldCount: (section: string, count: number) => void;

    setMultiSheet: (ms: Partial<MultiSheetState>) => void;

    setCurrentLanguage: (lang: string) => void;

    setRowStatus: (index: number, status: RowStatus, error?: string, serverResponse?: string) => void;
    setIsSending: (v: boolean) => void;
    setSendCancelled: (v: boolean) => void;
    setIsDryRun: (v: boolean) => void;
    navigateToField: (fieldPath: string) => void;

    // Bulk updates
    updateRowData: (index: number, header: string, value: any) => void;
    /** Edición masiva en UNA sola pasada/notificación — usar en vez de llamar a updateRowData
     * en bucle por cada índice (eso clona el array `rows` completo por cada fila afectada). */
    applyBulkEdit: (indices: number[], header: string, value: any) => void;
    /** Vacía datos/mapeo para empezar de cero (nuevo Excel, nuevo mapeo) SIN cerrar la sesión
     * UNIGIS (token/orderUrl/role/currentUser quedan intactos) — a diferencia de `resetState`,
     * que resetea también la conexión y por eso no es lo que hace falta para este caso. Quien
     * la llama debe además limpiar la sesión guardada en localStorage (SESSION_KEY en
     * page.tsx), si no la próxima carga de página la restaura igual. */
    clearAllData: () => void;
    resetState: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
const initialMultiSheet: MultiSheetState = {
    enabled: false,
    workbook: null,
    sheets: {},
    sheetHeaders: {},
    config: { mainSheet: '', mainKey: '', relations: [] },
};

const initialDynamicFieldCounts: Record<string, number> = {
    Orden: 0,
    Cliente: 0,
    ClienteDomicilio: 0,
    Items: 0,
    ItemsDomicilio: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useAppStore = create<AppState>((set) => ({
    // Auth
    token: null,
    orderUrl: '',
    role: 'admin',
    allowedUsers: [],
    currentUser: '',

    // Data
    rows: [],
    headers: [],
    selectedIndices: new Set<number>(),
    selectedRow: -1,

    // Mapping
    mapping: {},
    booleanOverrides: {},
    currentTab: 'pOrdenPedido',
    searchQuery: '',
    dynamicFieldCounts: { ...initialDynamicFieldCounts },

    // Multi-Sheet
    multiSheet: { ...initialMultiSheet },

    // i18n
    currentLanguage: 'es',

    // UI
    isSending: false,
    sendCancelled: false,
    highlightedField: '',
    isDryRun: false,
    dataVersion: 0,

    // --- Actions ---
    setToken: (token) => set({ token }),
    setOrderUrl: (orderUrl) => set({ orderUrl }),
    setRole: (role) => set({ role }),
    setCurrentUser: (currentUser) => set({ currentUser }),
    setAllowedUsers: (allowedUsers) => set({ allowedUsers }),

    setRows: (rows) => set((state) => ({ rows, dataVersion: state.dataVersion + 1 })),
    setHeaders: (headers) => set({ headers }),
    setSelectedRow: (selectedRow) => set({ selectedRow }),
    toggleSelection: (index) =>
        set((state) => {
            const next = new Set(state.selectedIndices);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return { selectedIndices: next };
        }),
    toggleSelectAll: (checked) =>
        set((state) => ({
            selectedIndices: checked
                ? new Set(state.rows.map((_, i) => i))
                : new Set<number>(),
        })),
    clearSelection: () => set({ selectedIndices: new Set<number>() }),

    setMapping: (mapping) => set({ mapping }),
    updateMappingField: (field, value) =>
        set((state) => ({
            mapping: { ...state.mapping, [field]: value },
        })),
    setBooleanOverride: (field, value) =>
        set((state) => ({
            booleanOverrides: { ...state.booleanOverrides, [field]: value },
        })),
    setCurrentTab: (currentTab) => set({ currentTab }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setDynamicFieldCount: (section, count) =>
        set((state) => ({
            dynamicFieldCounts: { ...state.dynamicFieldCounts, [section]: count },
        })),

    setMultiSheet: (ms) =>
        set((state) => ({
            multiSheet: { ...state.multiSheet, ...ms },
        })),

    setCurrentLanguage: (currentLanguage) => set({ currentLanguage }),

    setRowStatus: (index, status, error, serverResponse) =>
        set((state) => {
            const rows = [...state.rows];
            if (rows[index]) {
                rows[index] = { ...rows[index], _status: status, _error: error, _serverResponse: serverResponse };
            }
            return { rows };
        }),
    setIsSending: (isSending) => set({ isSending }),
    setSendCancelled: (sendCancelled) => set({ sendCancelled }),
    setIsDryRun: (isDryRun) => set({ isDryRun }),
    navigateToField: (fieldPath) => {
        for (const [tabId, fields] of Object.entries(FIELD_GROUPS) as [string, string[]][]) {
            if (fields.includes(fieldPath)) {
                set({ currentTab: tabId, searchQuery: '', highlightedField: fieldPath });
                setTimeout(() => set({ highlightedField: '' }), 2000);
                return;
            }
        }
    },

    updateRowData: (index, header, value) =>
        set((state) => {
            const rows = [...state.rows];
            if (rows[index]) {
                rows[index] = { ...rows[index], [header]: value };
            }
            // Los campos internos (prefijo "_") los escribe el envío por cada fila enviada — no
            // son edición real de datos, así que no deben contar como cambio de dataVersion.
            const isRealEdit = !header.startsWith('_');
            return { rows, dataVersion: isRealEdit ? state.dataVersion + 1 : state.dataVersion };
        }),

    applyBulkEdit: (indices, header, value) =>
        set((state) => {
            const idxSet = new Set(indices);
            const rows = state.rows.map((r, i) => (idxSet.has(i) ? { ...r, [header]: value } : r));
            return { rows, dataVersion: state.dataVersion + 1 };
        }),

    clearAllData: () =>
        set((state) => ({
            rows: [],
            headers: [],
            selectedIndices: new Set<number>(),
            selectedRow: -1,
            mapping: {},
            booleanOverrides: {},
            currentTab: 'pOrdenPedido',
            searchQuery: '',
            dynamicFieldCounts: { ...initialDynamicFieldCounts },
            multiSheet: { ...initialMultiSheet },
            dataVersion: state.dataVersion + 1,
            // token/orderUrl/role/currentUser NO se tocan — sigue conectado a UNIGIS.
        })),

    resetState: () =>
        set((state) => ({
            token: null,
            orderUrl: '',
            role: 'admin',
            rows: [],
            headers: [],
            selectedIndices: new Set<number>(),
            selectedRow: -1,
            mapping: {},
            booleanOverrides: {},
            currentTab: 'pOrdenPedido',
            searchQuery: '',
            multiSheet: { ...initialMultiSheet },
            isSending: false,
            sendCancelled: false,
            dataVersion: state.dataVersion + 1,
        })),
}));
