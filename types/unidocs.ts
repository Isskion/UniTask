export type UniDocsType = 'daily_minute' | 'project_status' | 'custom';

export interface TextOverlay {
    id: string;
    text: string;
    fontFamily: string;       // 'Inter', 'Arial', 'Times New Roman', 'Courier New'
    fontSize: number;         // in pt
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    color: string;            // hex color
    position: { x: number; y: number };  // percentage from left/top
    pageScope: 'all' | 'first' | 'last';
}

export interface UniDocsLayout {
    // Global header / footer
    headerHtml?: string;
    footerHtml?: string;
    showPageNumbers?: boolean;

    // Margins (mm) to prevent overlap with fixed elements
    headerMarginMm?: number;  // Default: 25
    footerMarginMm?: number;  // Default: 20

    // Text overlays (custom texts with formatting)
    textOverlays?: TextOverlay[];

    // First-page override
    firstPageEnabled: boolean;
    firstPageHeaderHtml?: string;
    firstPageAssistants?: string[];   // one name per entry
    firstPageExtraHtml?: string;

    // Last-page override
    lastPageEnabled: boolean;
    lastPageFooterHtml?: string;
}

export interface UniDocsTemplate {
    id: string;
    tenantId: string;
    name: string;
    type: UniDocsType;
    description?: string;
    sourceFileUrl?: string;    // Base64 or Storage URL of the original document
    layout?: UniDocsLayout;   // document structure / page config
    config: any;              // widgets and visual zone config (visualZones moved here)
    createdAt: any;
    updatedAt: any;
}

// Specific config for Daily Minutes (if we want to make it configurable later)
export interface UniDocsDailyConfig {
    showNotes: boolean;
    showTasks: boolean;
    showBlockers: boolean;
    showNextSteps: boolean;
    includeCharts: boolean;
}
