export interface DiscoveryTemplate {
  id: string;
  name: string;
  version: string;
  sections: DiscoverySection[];
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface DiscoverySection {
  id: string; // e.g., 's_01'
  title: string;
  order: number;
  fields: DiscoveryField[];
}

export interface DiscoveryFieldColumn {
  id: string; // key dentro de cada fila
  label: string; // cabecera esperada en el Excel de import
  type?: 'text' | 'number' | 'boolean';
}

export interface DiscoveryField {
  id: string; // e.g., 'f_01_01'
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'table';
  label: string;
  helpText?: string;
  options?: string[]; // For select/multiselect
  columns?: DiscoveryFieldColumn[]; // Requerido cuando type === 'table'; define el esquema de cada fila
  required?: boolean;
}

// Una fila de un campo tipo 'table'. _rowId es obligatorio para que el arrayUnion de Firestore
// no colisione/deduplique dos filas con los mismos valores (ver lib/discovery.ts::appendTableRow).
export interface DiscoveryTableRow {
  _rowId: string;
  [columnId: string]: any;
}

export interface ProjectDiscoveryInstance {
  id: string;
  projectId: string;
  tenantId: string;
  templateVersion: string;
  sections: DiscoverySection[]; // Snapshot of template structure
  status: 'draft' | 'in_progress' | 'completed';
  progress: number;
  createdAt: any;
  updatedAt: any;
}

export interface DiscoveryResponseValue {
  value: any;
  status: 'empty' | 'filled' | 'conflict' | 'verified' | 'not_applicable';
  updatedBy: string; // uid
  updatedAt: any;
}

// Metadata a nivel de sección completa (no de un campo individual), guardada bajo la key
// reservada SECTION_META_KEY dentro del mismo doc de respuestas de la sección.
export interface DiscoverySectionMeta {
  notApplicable: boolean;
  updatedBy?: string;
  updatedAt?: any;
}

export const SECTION_META_KEY = '_meta';

export interface DiscoveryResponses {
  id: string; // Matches sectionId
  projectId: string;
  tenantId: string;
  [SECTION_META_KEY]?: DiscoverySectionMeta;
  // A map de fieldId a DiscoveryResponseValue (más la key reservada de arriba)
  [fieldId: string]: any;
}

export interface NoteLinkEntity {
  type: 'project_discovery';
  id: string; // projectId
  sectionId: string;
  fieldId: string;
}

export interface NoteLink {
  id: string;
  tenantId: string;
  noteId: string;
  entity: NoteLinkEntity;
  linkedAt: any;
  linkedBy: string; // uid
}
