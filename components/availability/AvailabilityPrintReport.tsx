"use client";

import { useMemo, useRef } from "react";
import { UserAvailability, AVAILABILITY_TYPES, AvailabilityType } from "@/types/availability";
import { UserProfile } from "@/types";
import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, getDaysInMonth, isValid } from "date-fns";
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
    const printRef = useRef<HTMLDivElement>(null);

    const getUserName = (userId: string) => {
        const u = users.find(u => u.uid === userId);
        return u?.displayName || u?.email || "Usuario";
    };

    // Build user blocks
    const userBlocks = useMemo<UserBlock[]>(() => {
        // Group entries by user
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
            // Sort entries by date
            entries.sort((a, b) => {
                const da = safeParseDate(a.startDate);
                const db2 = safeParseDate(b.startDate);
                return (da?.getTime() || 0) - (db2?.getTime() || 0);
            });

            // Find months with data
            const monthSet = new Map<string, UserAvailability[]>();
            entries.forEach(e => {
                const start = safeParseDate(e.startDate);
                const end = safeParseDate(e.endDate);
                if (!start || !end) return;

                // An entry can span multiple months
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

            blocks.push({
                userId,
                userName: getUserName(userId),
                entries,
                monthsWithData,
            });
        });

        blocks.sort((a, b) => a.userName.localeCompare(b.userName));
        return blocks;
    }, [availabilities, currentUserId, isAdmin, users]);

    // Get color for a specific day based on entries
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

    const getDayType = (date: Date, entries: UserAvailability[]): AvailabilityType | null => {
        for (const entry of entries) {
            const start = safeParseDate(entry.startDate);
            const end = safeParseDate(entry.endDate);
            if (!start || !end) continue;
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            if (date >= start && date <= end) return entry.type;
        }
        return null;
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open("", "_blank", "width=900,height=700");
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Informe de Disponibilidad</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #111; padding: 20px; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    h2 { font-size: 14px; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #222; }
                    h3 { font-size: 11px; margin: 12px 0 4px 0; text-transform: uppercase; color: #555; letter-spacing: 1px; }
                    .subtitle { font-size: 10px; color: #888; margin-bottom: 16px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                    th { background: #f0f0f0; text-align: left; padding: 5px 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #ddd; }
                    td { padding: 4px 8px; border: 1px solid #ddd; font-size: 10px; }
                    .type-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
                    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 12px; max-width: 280px; }
                    .calendar-header { font-size: 8px; font-weight: bold; text-align: center; padding: 2px; color: #888; text-transform: uppercase; }
                    .calendar-day { font-size: 9px; text-align: center; padding: 3px 2px; border-radius: 3px; min-height: 22px; display: flex; align-items: center; justify-content: center; }
                    .calendar-day.marked { color: white; font-weight: bold; }
                    .calendar-day.empty { }
                    .month-title { font-size: 11px; font-weight: bold; text-transform: capitalize; margin-bottom: 4px; color: #333; }
                    .months-wrap { display: flex; flex-wrap: wrap; gap: 20px; }
                    .month-block { break-inside: avoid; }
                    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0 16px 0; }
                    .legend-item { display: flex; align-items: center; gap: 4px; font-size: 9px; }
                    .user-block { page-break-inside: avoid; margin-bottom: 24px; }
                    .page-break { page-break-before: always; }
                    @media print {
                        body { padding: 10px; }
                        .user-block { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${content.innerHTML}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    // Build the printable content
    const renderMonthCalendar = (year: number, month: number, entries: UserAvailability[]) => {
        const firstDay = startOfMonth(new Date(year, month));
        const daysInMonth = getDaysInMonth(firstDay);
        let startDow = getDay(firstDay); // 0=Sun
        startDow = startDow === 0 ? 6 : startDow - 1; // Convert to Mon=0

        const cells: string[] = [];
        // Empty cells before first day
        for (let i = 0; i < startDow; i++) {
            cells.push(`<div class="calendar-day empty"></div>`);
        }
        // Day cells
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const color = getDayColor(date, entries);
            if (color) {
                cells.push(`<div class="calendar-day marked" style="background:${color}">${d}</div>`);
            } else {
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                cells.push(`<div class="calendar-day" style="background:${isWeekend ? '#f5f5f5' : '#fafafa'};color:${isWeekend ? '#bbb' : '#666'}">${d}</div>`);
            }
        }

        const monthName = format(firstDay, "MMMM yyyy", { locale: es });
        return `
            <div class="month-block">
                <div class="month-title">${monthName}</div>
                <div class="calendar-grid">
                    ${DAY_NAMES.map(d => `<div class="calendar-header">${d}</div>`).join("")}
                    ${cells.join("")}
                </div>
            </div>
        `;
    };

    // Types used in the data for legend
    const usedTypes = useMemo(() => {
        const types = new Set<AvailabilityType>();
        availabilities.forEach(a => types.add(a.type));
        return Array.from(types);
    }, [availabilities]);

    return (
        <>
            {/* Print Button */}
            <button
                onClick={handlePrint}
                className={cn(
                    "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2",
                    isLight ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-zinc-200 text-black hover:bg-zinc-300"
                )}
            >
                <Printer className="w-4 h-4" /> Imprimir PDF
            </button>

            {/* Hidden Print Content */}
            <div ref={printRef} style={{ position: "absolute", left: "-9999px", top: 0 }}>
                <h1>Informe de Disponibilidad</h1>
                <div className="subtitle">
                    Generado el {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
                    {!isAdmin && ` · ${getUserName(currentUserId)}`}
                </div>

                {/* Legend */}
                <div
                    className="legend"
                    dangerouslySetInnerHTML={{
                        __html: usedTypes.map(t => {
                            const cfg = AVAILABILITY_TYPES[t];
                            return `<div class="legend-item"><div class="type-dot" style="background:${cfg.color}"></div>${cfg.label}</div>`;
                        }).join("")
                    }}
                />

                {userBlocks.map((block, blockIdx) => (
                    <div key={block.userId} className={blockIdx > 0 ? "page-break user-block" : "user-block"}>
                        {isAdmin && <h2>{block.userName}</h2>}

                        {/* Records Table */}
                        <h3>Registros de Indisponibilidad</h3>
                        <table>
                            <thead>
                                <tr>
                                    {isAdmin && <th>Usuario</th>}
                                    <th>Tipo</th>
                                    <th>Desde</th>
                                    <th>Hasta</th>
                                    <th>Días</th>
                                    <th>Notas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {block.entries.map(e => {
                                    const start = safeParseDate(e.startDate);
                                    const end = safeParseDate(e.endDate);
                                    const cfg = AVAILABILITY_TYPES[e.type];
                                    return (
                                        <tr key={e.id}>
                                            {isAdmin && <td>{getUserName(e.userId)}</td>}
                                            <td>
                                                <span
                                                    className="type-dot"
                                                    style={{ backgroundColor: cfg.color }}
                                                />
                                                {cfg.label}
                                            </td>
                                            <td>{start ? format(start, "dd MMM yyyy", { locale: es }) : "—"}</td>
                                            <td>{end ? format(end, "dd MMM yyyy", { locale: es }) : "—"}</td>
                                            <td style={{ fontWeight: "bold" }}>{e.consumedDays || 0}</td>
                                            <td>{e.notes || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Monthly Calendars */}
                        <h3>Mapa de Calendario</h3>
                        <div
                            className="months-wrap"
                            dangerouslySetInnerHTML={{
                                __html: block.monthsWithData
                                    .map(m => renderMonthCalendar(m.year, m.month, m.entries))
                                    .join("")
                            }}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}
