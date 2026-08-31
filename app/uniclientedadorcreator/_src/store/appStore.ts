/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { create } from 'zustand';
import { FIELD_GROUPS } from '../data/schema';

export type UserRole = 'admin' | 'basic';
export type RowStatus = 'pending' | 'sending' | 'success' | 'error';

export interface RowData extends Record<string, any> {
  _status?: RowStatus; _error?: string; _errorCode?: string;
  _serverResponse?: string;
}

export interface AppState {
  token: string | null; orderUrl: string; role: UserRole;
  allowedUsers: string[]; currentUser: string;
  rows: RowData[]; headers: string[];
  selectedIndices: Set<number>; selectedRow: number;
  mapping: Record<string, string>; booleanOverrides: Record<string, boolean>;
  currentTab: string; searchQuery: string;
  dynamicFieldCounts: Record<string, number>;
  currentLanguage: string;
  isSending: boolean; sendCancelled: boolean; highlightedField: string; isDryRun: boolean;

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
  setCurrentLanguage: (lang: string) => void;
  setRowStatus: (index: number, status: RowStatus, error?: string, serverResponse?: string) => void;
  setIsSending: (v: boolean) => void;
  setSendCancelled: (v: boolean) => void;
  setIsDryRun: (v: boolean) => void;
  navigateToField: (fieldPath: string) => void;
  updateRowData: (index: number, header: string, value: any) => void;
  resetState: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: null, orderUrl: '', role: 'admin', allowedUsers: [], currentUser: '',
  rows: [], headers: [], selectedIndices: new Set<number>(), selectedRow: -1,
  mapping: {}, booleanOverrides: {},
  currentTab: 'pClienteDador', searchQuery: '',
  dynamicFieldCounts: { ClienteDador: 0 },
  currentLanguage: 'es',
  isSending: false, sendCancelled: false, highlightedField: '', isDryRun: false,

  setToken: (token) => set({ token }),
  setOrderUrl: (orderUrl) => set({ orderUrl }),
  setRole: (role) => set({ role }),
  setCurrentUser: (currentUser) => set({ currentUser }),
  setAllowedUsers: (allowedUsers) => set({ allowedUsers }),
  setRows: (rows) => set({ rows }),
  setHeaders: (headers) => set({ headers }),
  setSelectedRow: (selectedRow) => set({ selectedRow }),
  toggleSelection: (index) => set((state) => {
    const next = new Set(state.selectedIndices);
    if (next.has(index)) next.delete(index); else next.add(index);
    return { selectedIndices: next };
  }),
  toggleSelectAll: (checked) => set((state) => ({
    selectedIndices: checked ? new Set(state.rows.map((_, i) => i)) : new Set<number>(),
  })),
  clearSelection: () => set({ selectedIndices: new Set<number>() }),
  setMapping: (mapping) => set({ mapping }),
  updateMappingField: (field, value) => set((state) => ({ mapping: { ...state.mapping, [field]: value } })),
  setBooleanOverride: (field, value) => set((state) => ({ booleanOverrides: { ...state.booleanOverrides, [field]: value } })),
  setCurrentTab: (currentTab) => set({ currentTab }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDynamicFieldCount: (section, count) => set((state) => ({ dynamicFieldCounts: { ...state.dynamicFieldCounts, [section]: count } })),
  setCurrentLanguage: (currentLanguage) => set({ currentLanguage }),
  setRowStatus: (index, status, error, serverResponse) => set((state) => {
    const rows = [...state.rows];
    if (rows[index]) rows[index] = { ...rows[index], _status: status, _error: error, _serverResponse: serverResponse };
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
  updateRowData: (index, header, value) => set((state) => {
    const rows = [...state.rows];
    if (rows[index]) rows[index] = { ...rows[index], [header]: value };
    return { rows };
  }),
  resetState: () => set({
    token: null, orderUrl: '', role: 'admin',
    rows: [], headers: [], selectedIndices: new Set<number>(), selectedRow: -1,
    mapping: {}, booleanOverrides: {}, currentTab: 'pClienteDador', searchQuery: '',
    isSending: false, sendCancelled: false,
  }),
}));
