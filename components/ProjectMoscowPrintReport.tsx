"use client";

import { useMemo } from "react";
import { MoscowRequirement, MoscowPriority, MoscowStatus } from "@/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMoscowPrintReportProps {
    requirements: MoscowRequirement[];
    isLight: boolean;
    tenantId: string;
    projectId: string;
}

const PRIORITY_CONFIG: Record<MoscowPriority, { label: string; color: string; bg: string }> = {
    must: { label: "Must", color: "#f87171", bg: "#fef2f2" },
    should: { label: "Should", color: "#fbbf24", bg: "#fffbeb" },
    could: { label: "Could", color: "#60a5fa", bg: "#eff6ff" },
    wont: { label: "Won't", color: "#a1a1aa", bg: "#fafafa" },
};

const STATUS_CONFIG: Record<MoscowStatus, { label: string; color: string; bg: string }> = {
    open: { label: "Abierto", color: "#38bdf8", bg: "#f0f9ff" },
    in_progress: { label: "En Progreso", color: "#fbbf24", bg: "#fffbeb" },
    implemented: { label: "Implementado", color: "#34d399", bg: "#ecfdf5" },
    discarded: { label: "Descartado", color: "#a1a1aa", bg: "#fafafa" },
};

export default function ProjectMoscowPrintReport({ requirements, isLight, tenantId, projectId }: ProjectMoscowPrintReportProps) {
    const stats = useMemo(() => {
        return {
            must: requirements.filter(r => r.priority === 'must').length,
            should: requirements.filter(r => r.priority === 'should').length,
            could: requirements.filter(r => r.priority === 'could').length,
            wont: requirements.filter(r => r.priority === 'wont').length,
            total: requirements.length,
            implemented: requirements.filter(r => r.status === 'implemented').length,
        };
    }, [requirements]);

    const buildFullHTML = (): string => {
        const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

        // Calculate progress percentage safely
        const progressPercentage = stats.total > 0 ? Math.round((stats.implemented / stats.total) * 100) : 0;

        const summaryHtml = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;border-bottom:2px solid #333;padding-bottom:12px;">
                <div>
                    <h1 style="font-size:20px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px;color:#111;">Requisitos del Proyecto</h1>
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">Proyecto: <span style="font-weight:bold;color:#333;">${projectId}</span> &nbsp;&mdash;&nbsp; Generado el ${dateStr}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:14px;font-weight:bold;margin-bottom:2px;color:#333;">${stats.total} Requisitos</div>
                    <div style="font-size:10px;color:#666;">
                        <span style="color:#f87171;font-weight:bold;">${stats.must}M</span> &nbsp;&middot;&nbsp; 
                        <span style="color:#fbbf24;font-weight:bold;">${stats.should}S</span> &nbsp;&middot;&nbsp; 
                        <span style="color:#60a5fa;font-weight:bold;">${stats.could}C</span> &nbsp;&middot;&nbsp; 
                        <span style="color:#a1a1aa;font-weight:bold;">${stats.wont}W</span>
                    </div>
                     <div style="margin-top:6px;font-size:11px;font-weight:bold;color:#10b981;">
                        ${progressPercentage}% Implementado (${stats.implemented}/${stats.total})
                    </div>
                </div>
            </div>
        `;

        const priorityOrder: Record<MoscowPriority, number> = {
            must: 1,
            should: 2,
            could: 3,
            wont: 4
        };

        const sortedRequirements = [...requirements].sort((a, b) => {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

        const tableRows = sortedRequirements.map(req => {
            const pConfig = PRIORITY_CONFIG[req.priority];
            const sConfig = STATUS_CONFIG[req.status];

            const formatDate = (timestamp: any) => {
                if (!timestamp) return "—";
                try {
                    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.toMillis());
                    return format(date, "dd MMM yy", { locale: es });
                } catch {
                    return "—";
                }
            };

            const isTreated = req.treated ? '<span style="color:#10b981;font-weight:bold;font-size:14px;">✓</span>' : '';

            return `
                <tr style="${req.treated ? "background-color:#f0fdf4 !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;" : ""}">
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;text-align:center;">${isTreated}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;font-family:monospace;font-weight:bold;color:#333;">${req.moscowId}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:10px;font-weight:600;color:#222;max-width:200px;line-height:1.2;">${req.title}</td>
                    
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;">
                         <span style="display:inline-block;padding:2px 6px;border-radius:12px;background-color:${pConfig.bg} !important;color:${pConfig.color};font-weight:bold;text-transform:uppercase;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:1px solid ${pConfig.color}40;">${pConfig.label}</span>
                    </td>
                    
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;">
                        <span style="display:inline-block;padding:2px 6px;border-radius:12px;background-color:${sConfig.bg} !important;color:${sConfig.color};font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:1px solid ${sConfig.color}40;">${sConfig.label}</span>
                    </td>

                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:8px;color:#555;">${formatDate(req.createdAt)}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;color:#444;">${req.requesterName || "—"}</td>
                    <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:9px;color:#666;line-height:1.2;">${req.observations || "—"}</td>
                </tr>
            `;
        }).join("");

        const tableHtml = `
            <table style="width:100%;border-collapse:collapse;margin-top:10px;page-break-inside:auto;">
                <thead>
                    <tr>
                        <th style="background-color:#111 !important;color:#fff;text-align:center;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:30px;">T.</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:50px;">ID</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Requisito</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:70px;">Prioridad</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:80px;">Estado</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:60px;">Fecha</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:80px;">Solicitante</th>
                        <th style="background-color:#111 !important;color:#fff;text-align:left;padding:6px 8px;font-size:8px;text-transform:uppercase;letter-spacing:1px;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact;width:150px;">Observaciones</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        `;

        return `<!DOCTYPE html>
<html>
<head>
    <title>Informe de Requisitos MoSCoW</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 11px; color: #111; padding: 24px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
        }
        @media print {
            body { padding: 12px; }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
        }
    </style>
</head>
<body>
    ${summaryHtml}
    ${tableHtml}
</body>
</html>`;
    };

    const handlePrint = () => {
        const html = buildFullHTML();
        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) return;

        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 400); // Give the browser time to render styles before opening print dialog
    };

    return (
        <button
            onClick={handlePrint}
            disabled={requirements.length === 0}
            title="Exportar a PDF"
            className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
                isLight ? "bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 shadow-sm" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
            )}
        >
            <Printer className="w-4 h-4" /> PDF
        </button>
    );
}
