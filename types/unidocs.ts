// UniDocs V2.4.0 — Block-based template types
// Changelog:
//   V2.4 (2026-03-09): Wizard de Minutas — portadas, selección múltiple de notas, revisión Gemini, editor y exportación
//   V2.3 (2026-03-08): Motor de impresión migrado a tabla thead/tbody/tfoot — pie no solapa cuerpo en ninguna página
//   V2.2: Preview-first con iframe blob URL + botones Imprimir/PDF y Word (.doc)
//   V2.1: Firestore rules fix — App Admins pueden subir logos de tenant
//   V2.0: Block-based con coordenadas x/y/width/height en mm (reemplaza V1 rich text)

export type BlockType =
    | 'logo_empresa'
    | 'logo_cliente'
    | 'titulo'
    | 'fecha'
    | 'cuerpo'
    | 'pie'
    | 'texto_libre'
    | 'separador';

export interface BlockConfig {
    fontFamily?: string;        // 'Inter', 'Garamond', 'Arial', etc.
    fontSize?: number;          // in pt
    fontWeight?: 'normal' | 'bold';
    fontStyle?: 'normal' | 'italic';
    color?: string;             // hex color
    textAlign?: 'left' | 'center' | 'right';
    staticText?: string;        // For texto_libre and pie blocks
    backgroundColor?: string;   // Optional background color
    borderColor?: string;       // Optional border
    padding?: number;           // in mm
}

export interface TemplateBlock {
    id: string;
    type: BlockType;
    label: string;              // Display name, e.g. "Logo Empresa", "Cuerpo"
    x: number;                  // Position from left in mm
    y: number;                  // Position from top in mm
    width: number;              // Width in mm
    height: number;             // Height in mm
    config: BlockConfig;
}

export interface PageMargins {
    top: number;    // mm
    right: number;  // mm
    bottom: number; // mm
    left: number;   // mm
}

export interface UniDocsTemplate {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    blocks: TemplateBlock[];
    pageMargins: PageMargins;
    templateType?: 'body' | 'cover'; // V2.4: 'body' = plantilla con cabecera/pie (default), 'cover' = portada página única
    createdAt: any;
    updatedAt: any;
}

// V2.4 — Estado interno del wizard de minutas (no se persiste en Firestore)
export interface UniDocsMinuta {
    title: string;                  // título de la minuta
    meetingDate: string;            // fecha de la reunión (ISO o texto legible)
    notes: UniLeakNote[];           // notas seleccionadas
    orderedNoteIds: string[];       // orden drag & drop
    coverTemplateId: string | null; // null = sin portada
    bodyTemplateId: string;
    pageBreakBetweenNotes: boolean;
    rawHtml: string;                // notas combinadas sin IA
    aiHtml: string | null;          // output de Gemini (null si se saltó)
    editedHtml: string;             // contenido final del editor TipTap
}

// V2.4 — Contexto de variables para sustitución en portadas
export interface MinutaContext {
    minutaTitle: string;        // @titulo
    meetingDate: string;        // @fecha
    projectName: string;        // @proyecto
    clientName: string;         // @cliente
    projectCode: string;        // @codigo
    projectEmail?: string;      // @email
    projectPhone?: string;      // @telefono
}

// V2.4 — Tipo auxiliar para notas (referencia local, no importa de types.ts)
export interface UniLeakNote {
    id: string;
    title: string;
    content: string;            // HTML de TipTap
    projectId: string;
    folderId?: string | null;
    tenantId: string;
    userId: string;
    createdAt?: any;
    updatedAt?: any;
}

// V2.4 — Tipos para integración con IA
export interface NoteInput {
    title: string;
    content: string;     // HTML de TipTap
    date?: string;       // ISO o texto legible (para prioridad temporal)
    author?: string;     // Autor (para detectar conflictos)
}

export interface GeminiMinutaResult {
    html: string;
    error?: string;
}

// Default page margins (A4 standard)
export const DEFAULT_PAGE_MARGINS: PageMargins = {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
};

// Block catalog — definitions for the palette
export const BLOCK_CATALOG: { type: BlockType; label: string; icon: string; defaultWidth: number; defaultHeight: number; defaultConfig: BlockConfig }[] = [
    {
        type: 'logo_empresa',
        label: 'Logo Empresa',
        icon: '🏢',
        defaultWidth: 40,
        defaultHeight: 15,
        defaultConfig: {},
    },
    {
        type: 'logo_cliente',
        label: 'Logo Cliente',
        icon: '🤝',
        defaultWidth: 40,
        defaultHeight: 15,
        defaultConfig: {},
    },
    {
        type: 'titulo',
        label: 'Título',
        icon: '📝',
        defaultWidth: 180,
        defaultHeight: 12,
        defaultConfig: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter' },
    },
    {
        type: 'fecha',
        label: 'Fecha',
        icon: '📅',
        defaultWidth: 60,
        defaultHeight: 8,
        defaultConfig: { fontSize: 10, color: '#666666', fontStyle: 'italic' },
    },
    {
        type: 'cuerpo',
        label: 'Cuerpo',
        icon: '📄',
        defaultWidth: 180,
        defaultHeight: 200,
        defaultConfig: { fontSize: 11, fontFamily: 'Garamond' },
    },
    {
        type: 'pie',
        label: 'Pie de Página',
        icon: '📎',
        defaultWidth: 180,
        defaultHeight: 10,
        defaultConfig: { fontSize: 8, color: '#999999', textAlign: 'center', staticText: 'Generado con UniTask' },
    },
    {
        type: 'texto_libre',
        label: 'Texto Libre',
        icon: '✏️',
        defaultWidth: 100,
        defaultHeight: 12,
        defaultConfig: { fontSize: 11, staticText: 'Escribe aquí...' },
    },
    {
        type: 'separador',
        label: 'Separador',
        icon: '➖',
        defaultWidth: 180,
        defaultHeight: 2,
        defaultConfig: { borderColor: '#dddddd' },
    },
];
