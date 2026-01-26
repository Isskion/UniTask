import Papa from "papaparse";

export interface CsvParseResult<T = any> {
    data: T[];
    errors: Papa.ParseError[];
    meta: Papa.ParseMeta;
}

export const CsvUtils = {
    /**
     * Generates a CSV string with UTF-8 BOM for Excel compatibility.
     * Handles escaping quotes and special characters.
     */
    generateCsv: (data: any[], columns: string[]): string => {
        // 1. Header
        const header = columns.map(c => `"${c.replace(/"/g, '""')}"`).join(",");

        // 2. Rows
        const rows = data.map(row => {
            return columns.map(col => {
                const val = row[col];
                if (val === null || val === undefined) return "";
                const str = String(val);
                // Escape quotes
                return `"${str.replace(/"/g, '""')}"`;
            }).join(",");
        });

        // 3. BOM + Join
        return "\uFEFF" + [header, ...rows].join("\r\n");
    },

    /**
     * Parses a CSV file using PapaParse.
     * Configured for Header detection and stripping empty lines.
     */
    parseCsv: async <T = any>(file: File): Promise<CsvParseResult<T>> => {
        return new Promise((resolve, reject) => {
            // @ts-ignore - PapaParse types sometimes conflict with DOM File type
            Papa.parse(file, {
                header: true,
                skipEmptyLines: 'greedy', // Better than true for whitespace only lines
                encoding: "UTF-8", // Default usually fine, but force explicit to match export
                complete: (results) => {
                    resolve(results as CsvParseResult<T>);
                },
                error: (error: Papa.ParseError) => {
                    reject(error);
                }
            });
        });
    },

    /**
     * Heuristic to normalize headers for auto-mapping.
     * e.g. "Task ID" -> "taskId", "Status" -> "status"
     */
    normalizeHeader: (header: string): string => {
        const lower = header.toLowerCase().trim().replace(/[\s_]+/g, '');
        if (lower === 'id' || lower === 'taskid' || lower === 'friendlyid') return 'taskId';
        if (lower === 'title' || lower === 'name') return 'title';
        if (lower === 'desc' || lower === 'description') return 'description';
        if (lower === 'state' || lower === 'status') return 'status';
        if (lower === 'progress' || lower === 'percent' || lower === '%') return 'progress';
        if (lower === 'parent' || lower === 'parentid' || lower === 'parenttaskid') return 'parentTaskId';
        return header;
    }
};
