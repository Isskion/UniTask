
import { useMemo } from "react";
import { UserAvailability, AVAILABILITY_TYPES } from "@/types/availability";
import { UserProfile } from "@/types";
import { format, addDays, getDaysInMonth, startOfMonth, endOfMonth, isSameDay, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ResourceTimelineProps {
    users: UserProfile[];
    availabilities: UserAvailability[];
    month: Date;
    onEntryClick: (entry: UserAvailability) => void;
    onEmptyCellClick: (user: UserProfile, date: Date) => void;
}

export function ResourceTimeline({
    users,
    availabilities,
    month,
    onEntryClick,
    onEmptyCellClick
}: ResourceTimelineProps) {
    const { theme } = useTheme();
    const isLight = theme === 'light';

    const days = useMemo(() => {
        const d = [];
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        let curr = start;
        while (curr <= end) {
            d.push(curr);
            curr = addDays(curr, 1);
        }
        return d;
    }, [month]);

    const getAvailabilityForCell = (userId: string, date: Date) => {
        return availabilities.find(a => {
            if (a.userId !== userId) return false;
            const start = a.startDate instanceof Date ? a.startDate : (a.startDate as any).toDate();
            const end = a.endDate instanceof Date ? a.endDate : (a.endDate as any).toDate();
            const d = new Date(date).setHours(0, 0, 0, 0);
            const s = new Date(start).setHours(0, 0, 0, 0);
            const e = new Date(end).setHours(0, 0, 0, 0);
            return d >= s && d <= e;
        });
    };

    return (
        <div className={cn("border rounded-lg overflow-hidden flex flex-col h-full", isLight ? "bg-white border-zinc-200" : "bg-black/20 border-white/5")}>
            {/* Header Row */}
            <div className={cn("flex border-b divide-x overflow-x-auto custom-scrollbar flex-none", isLight ? "bg-zinc-50 border-zinc-200 divide-zinc-200" : "bg-white/5 border-white/5 divide-white/5")}>
                <div className={cn("flex-none w-48 p-3 font-bold text-xs sticky left-0 z-10 border-r", isLight ? "bg-zinc-50 text-zinc-500" : "bg-[#111] text-zinc-400")}>
                    RECURSOS ({users.length})
                </div>
                {days.map(day => (
                    <div
                        key={day.toISOString()}
                        className={cn(
                            "flex-none w-10 text-center py-2 border-r flex flex-col justify-center",
                            isLight ? "divide-zinc-200" : "divide-white/5",
                            [0, 6].includes(day.getDay()) ? (isLight ? "bg-zinc-100/50" : "bg-white/5") : ""
                        )}
                    >
                        <div className={cn("text-[10px] font-bold uppercase", isLight ? "text-zinc-500" : "text-zinc-400")}>{format(day, 'EEEEE', { locale: es })}</div>
                        <div className={cn("font-black text-sm", isLight ? "text-zinc-900" : "text-white")}>{format(day, 'd')}</div>
                    </div>
                ))}
            </div>

            {/* Body */}
            <div className={cn("divide-y overflow-y-auto custom-scrollbar flex-1", isLight ? "divide-zinc-100" : "divide-white/5")}>
                {users.map(user => (
                    <div key={user.uid} className={cn("flex divide-x hover:bg-white/5 transition-colors", isLight ? "divide-zinc-100 hover:bg-zinc-50" : "divide-white/5")}>
                        {/* User Info Column */}
                        <div className={cn("flex-none w-48 p-2 flex items-center gap-3 sticky left-0 z-10 border-r", isLight ? "bg-white border-zinc-100" : "bg-black border-white/5")}>
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", isLight ? "bg-zinc-100 text-zinc-600" : "bg-white/10 text-white")}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="" />
                                ) : (
                                    (user.displayName?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()
                                )}
                            </div>
                            <div className="overflow-hidden">
                                <p className={cn("text-xs font-bold truncate", isLight ? "text-zinc-900" : "text-white")}>{user.displayName || user.email}</p>
                                <p className="text-[9px] text-zinc-500 truncate uppercase tracking-wider">{user.role}</p>
                            </div>
                        </div>

                        {/* Days Grid */}
                        {days.map(day => {
                            const entry = getAvailabilityForCell(user.uid, day);
                            const isWeekend = [0, 6].includes(day.getDay());
                            const isWorkingWeekend = isWeekend && user.worksOnWeekends;
                            const shouldDim = isWeekend && !isWorkingWeekend;

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={cn(
                                        "flex-none w-10 h-10 relative flex items-center justify-center p-0.5 cursor-pointer transition-colors border-r",
                                        isLight ? "border-zinc-100" : "border-white/5",
                                        shouldDim
                                            ? (isLight ? "bg-zinc-50" : "bg-white/[0.02]") // Non-working day (Gray)
                                            : (isLight ? "bg-emerald-50/50" : "bg-emerald-900/10"), // Working day (Green)
                                        !entry && "hover:bg-blue-500/10"
                                    )}
                                    onClick={() => entry ? onEntryClick(entry) : onEmptyCellClick(user, day)}
                                    title={entry ? `${AVAILABILITY_TYPES[entry.type].label}: ${entry.notes || ""}` : ""}
                                >
                                    {entry && (
                                        <div
                                            className="w-full h-full rounded-sm opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                                            style={{ backgroundColor: AVAILABILITY_TYPES[entry.type].color }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
