export type ReportType = 'daily_minute' | 'project_status' | 'custom';

export interface ReportTemplate {
    id: string;
    tenantId: string;
    name: string;
    type: ReportType;
    description?: string;
    config: any; // Flexible config for the specific report type
    createdAt: any;
    updatedAt: any;
}

// Specific config for Daily Minutes (if we want to make it configurable later)
export interface DailyMinuteConfig {
    showNotes: boolean;
    showTasks: boolean;
    showBlockers: boolean;
    showNextSteps: boolean;
    includeCharts: boolean;
}
