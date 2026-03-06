// UniDocs V2 — Block-based template types

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
    createdAt: any;
    updatedAt: any;
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
