"use client";

import { useMemo } from "react";
import { UserAvailability, AVAILABILITY_TYPES, AvailabilityType } from "@/types/availability";
import { UserProfile } from "@/types";
import { format, startOfMonth, getDay, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import { safeParseDate } from "@/lib/date-utils";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityPrintReportProps {
    availabilities: UserAvailability[];
    users: UserProfile[];
    currentUserId: string;
    isAdmin: boolean;
    isLight: boolean;
}

interface UserBlock {
    userId: string;
    userName: string;
    entries: UserAvailability[];
    monthsWithData: { year: number; month: number; entries: UserAvailability[] }[];
}

const DAY_NAMES = ["L", "M", "X", "J", "V", "S", "D"];

export default function AvailabilityPrintReport({ availabilities, users, currentUserId, isAdmin, isLight }: AvailabilityPrintReportProps) {

    const getUserName = (userId: string) => {
        const u = users.find(u => u.uid === userId);
        return u?.displayName || u?.email || "Usuario";
    };

    // Build user blocks
    const userBlocks = useMemo<UserBlock[]>(() => {
        const userEntries = new Map<string, UserAvailability[]>();
        const relevantEntries = isAdmin
            ? availabilities
            : availabilities.filter(a => a.userId === currentUserId);

        relevantEntries.forEach(a => {
            if (!userEntries.has(a.userId)) userEntries.set(a.userId, []);
            userEntries.get(a.userId)!.push(a);
        });

        const blocks: UserBlock[] = [];
        userEntries.forEach((entries, userId) => {
            entries.sort((a, b) => {
                const da = safeParseDate(a.startDate);
                const db2 = safeParseDate(b.startDate);
                return (da?.getTime() || 0) - (db2?.getTime() || 0);
            });

            const monthSet = new Map<string, UserAvailability[]>();
            entries.forEach(e => {
                const start = safeParseDate(e.startDate);
                const end = safeParseDate(e.endDate);
                if (!start || !end) return;
                let cur = new Date(start);
                while (cur <= end) {
                    const key = `${cur.getFullYear()}-${cur.getMonth()}`;
                    if (!monthSet.has(key)) monthSet.set(key, []);
                    if (!monthSet.get(key)!.includes(e)) monthSet.get(key)!.push(e);
                    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
                }
            });

            const monthsWithData = Array.from(monthSet.entries())
                .map(([key, mEntries]) => {
                    const [y, m] = key.split("-").map(Number);
                    return { year: y, month: m, entries: mEntries };
                })
                .sort((a, b) => a.year - b.year || a.month - b.month);

            blocks.push({ userId, userName: getUserName(userId), entries, monthsWithData });
        });

        blocks.sort((a, b) => a.userName.localeCompare(b.userName));
        return blocks;
    }, [availabilities, currentUserId, isAdmin, users]);

    const getDayColor = (date: Date, entries: UserAvailability[]): string | null => {
        for (const entry of entries) {
            const start = safeParseDate(entry.startDate);
            const end = safeParseDate(entry.endDate);
            if (!start || !end) continue;
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (date >= start && date <= end) {
                return AVAILABILITY_TYPES[entry.type]?.color || "#71717a";
            }
        }
        return null;
    };

    const usedTypes = useMemo(() => {
        const types = new Set<AvailabilityType>();
        availabilities.forEach(a => types.add(a.type));
        return Array.from(types);
    }, [availabilities]);

    // --- PURE HTML STRING GENERATION ---

    const renderMonthCalendar = (year: number, month: number, entries: UserAvailability[]) => {
        const firstDay = startOfMonth(new Date(year, month));
        const totalDays = getDaysInMonth(firstDay);
        let startDow = getDay(firstDay);
        startDow = startDow === 0 ? 6 : startDow - 1;

        const cells: string[] = [];
        for (let i = 0; i < startDow; i++) {
            cells.push(`<td style="border:none;"></td>`);
        }
        for (let d = 1; d <= totalDays; d++) {
            const date = new Date(year, month, d);
            const color = getDayColor(date, entries);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            if (color) {
                cells.push(`<td style="background-color:${color} !important;color:#fff;font-weight:bold;text-align:center;padding:4px 2px;border-radius:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${d}</td>`);
            } else {
                cells.push(`<td style="background-color:${isWeekend ? '#f0f0f0' : '#fafafa'} !important;color:${isWeekend ? '#bbb' : '#666'};text-align:center;padding:4px 2px;border-radius:3px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">${d}</td>`);
            }
        }

        // Group cells into weeks (rows of 7)
        const rows: string[] = [];
        for (let i = 0; i < cells.length; i += 7) {
            rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
        }

        const monthName = format(firstDay, "MMMM yyyy", { locale: es });
        return `
            <div style="display:inline-block;vertical-align:top;margin:0 20px 16px 0;page-break-inside:avoid;">
                <div style="font-size:12px;font-weight:bold;text-transform:capitalize;margin-bottom:4px;color:#333;">${monthName}</div>
                <table style="border-collapse:separate;border-spacing:2px;">
                    <thead>
                        <tr>${DAY_NAMES.map(d => `<th style="font-size:8px;font-weight:bold;text-align:center;padding:2px 4px;color:#888;border:none;">${d}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${rows.join("")}
                    </tbody>
                </table>
            </div>
        `;
    };

    const buildFullHTML = (): string => {
        const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es });

        // Legend
        const legendHtml = usedTypes.map(t => {
            const cfg = AVAILABILITY_TYPES[t];
            return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px;font-size:10px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${cfg.color} !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
                ${cfg.label}
            </span>`;
        }).join("");

        // User blocks
        const blocksHtml = userBlocks.map((block, idx) => {
            const headerHtml = isAdmin
                ? `<h2 style="font-size:14px;margin:20px 0 8px 0;padding-bottom:4px;border-bottom:2px solid #222;">${block.userName}</h2>`
                : "";

            // Table rows
            const tableRows = block.entries.map(e => {
                const start = safeParseDate(e.startDate);
                const end = safeParseDate(e.endDate);
                const cfg = AVAILABILITY_TYPES[e.type];
                const startStr = start ? format(start, "dd MMM yyyy", { locale: es }) : "—";
                const endStr = end ? format(end, "dd MMM yyyy", { locale: es }) : "—";

                return `<tr>
                    ${isAdmin ? `<td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">${getUserName(e.userId)}</td>` : ""}
                    <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${cfg.color} !important;margin-right:6px;vertical-align:middle;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></span>
                        ${cfg.label}
                    </td>
                    <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">${startStr}</td>
                    <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">${endStr}</td>
                    <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;font-weight:bold;">${e.consumedDays || 0}</td>
                    <td style="padding:4px 8px;border:1px solid #ddd;font-size:10px;">${e.notes || "—"}</td>
                </tr>`;
            }).join("");

            const tableHtml = `
                <h3 style="font-size:11px;margin:12px 0 4px 0;text-transform:uppercase;color:#555;letter-spacing:1px;">Registros de Indisponibilidad</h3>
                <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                    <thead>
                        <tr>
                            ${isAdmin ? '<th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Usuario</th>' : ""}
                            <th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Tipo</th>
                            <th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Desde</th>
                            <th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Hasta</th>
                            <th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Días</th>
                            <th style="background-color:#f0f0f0 !important;text-align:left;padding:5px 8px;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #ddd;-webkit-print-color-adjust:exact;print-color-adjust:exact;">Notas</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            `;

            // Calendars
            const calendarsHtml = block.monthsWithData
                .map(m => renderMonthCalendar(m.year, m.month, m.entries))
                .join("");

            const pageBreak = idx > 0 ? 'style="page-break-before:always;margin-bottom:24px;"' : 'style="margin-bottom:24px;"';

            return `
                <div ${pageBreak}>
                    ${headerHtml}
                    ${tableHtml}
                    <h3 style="font-size:11px;margin:12px 0 4px 0;text-transform:uppercase;color:#555;letter-spacing:1px;">Mapa de Calendario</h3>
                    <div style="display:flex;flex-wrap:wrap;gap:0;">${calendarsHtml}</div>
                </div>
            `;
        }).join("");

        return `<!DOCTYPE html>
<html>
<head>
    <title>Informe de Disponibilidad</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
        }
    </style>
</head>
<body>
    <h1 style="font-size:18px;margin-bottom:4px;">Informe de Disponibilidad</h1>
    <div style="font-size:10px;color:#888;margin-bottom:12px;">
        Generado el ${dateStr}${!isAdmin ? ` · ${getUserName(currentUserId)}` : ""}
    </div>
    <div style="margin-bottom:16px;">${legendHtml}</div>
    ${blocksHtml}
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
        setTimeout(() => printWindow.print(), 400);
    };

    return (
        <button
            onClick={handlePrint}
            className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                isLight ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-200 text-black hover:bg-zinc-300"
            )}
        >
            <Printer className="w-4 h-4" /> Imprimir PDF
        </button>
    );
}
