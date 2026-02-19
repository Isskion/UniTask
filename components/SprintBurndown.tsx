"use client";

import { safeParseDate } from '@/lib/date-utils';
import { useMemo } from 'react';
import { Task, Sprint, UserProfile } from '@/types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { eachDayOfInterval, format, isSameDay, startOfDay, endOfDay, isAfter, isBefore, addDays } from 'date-fns';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/hooks/useTheme';

interface SprintBurndownProps {
    sprint: Sprint;
    tasks: Task[];
    usersMap: Record<string, UserProfile>;
    selectedUserIds: string[];
}

export function SprintBurndown({ sprint, tasks, usersMap, selectedUserIds }: SprintBurndownProps) {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const isLight = theme === 'light';

    // 1. Filter Tasks (by Resource)
    const effectiveTasks = useMemo(() => {
        if (selectedUserIds.length === 0) return tasks;
        return tasks.filter(t => t.assignedTo && selectedUserIds.includes(t.assignedTo));
    }, [tasks, selectedUserIds]);

    // 2. Generate Data Points
    const data = useMemo(() => {
        if (!sprint.startDate || !sprint.endDate) return [];

        const start = safeParseDate(sprint.startDate);
        const end = safeParseDate(sprint.endDate);

        // Safety: Ensure valid dates
        if (!start || !end) return [];

        const days = eachDayOfInterval({ start, end });
        const totalEffort = effectiveTasks.reduce((sum, t) => sum + (t.estimatedEffort || 0), 0);

        return days.map((day, index) => {
            // Ideal Line: Linear drop from Total to 0
            const ideal = totalEffort - ((totalEffort / (days.length - 1)) * index);

            // Actual Line:
            // Remaining = Total - (Sum of closed tasks BEFORE or ON this day)
            // Note: If task has no closedAt, we assume it's still open (unless completed without timestamp??)
            // If completed but no timestamp, we can't plot it historically, so it stays as "remaining" until verified?
            // Or we treat "status=completed" as "burned" immediately if no date? That would likely be wrong history.
            // Better: If completed && closedAt, burn on closedAt. If completed && !closedAt, maybe burn at end? Or start? start is safer.

            // Actually, let's look at closedAt.
            const closedEffort = effectiveTasks.reduce((sum, t) => {
                if (t.status !== 'completed') return sum;

                // If no closedAt, maybe use updatedAt? Or assume it was closed today?
                // For simplicity/robustness: If completed but no closedAt, we assume it's burned. 
                // But WHEN? If we don't know, maybe we just count it as burned for ALL days (pessimistic) or NONE (optimistic)?
                // Let's assume if closedAt is missing, it was effectively closed "at the end" or "now".
                // Actually, if we want a nice chart, we should rely on closedAt.

                // [FIX] Fallback to 'updatedAt' if 'closedAt' is missing
                const dateRef = t.closedAt || t.updatedAt;
                if (!dateRef) return sum; // If absolutely no date, we can't plot it

                const closedDate = safeParseDate(dateRef);

                if (closedDate && isBefore(closedDate, endOfDay(day))) { // If closed before end of this day
                    return sum + (t.estimatedEffort || 0);
                }
                return sum;
            }, 0);

            // Special case: If we are in the future relative to "today", we shouldn't show "Actual" line dropping to 0 or flatlining?
            // Usually Burndown stops at "Today".
            const isFuture = isAfter(startOfDay(day), startOfDay(new Date()));

            return {
                name: format(day, 'dd MMM'),
                ideal: Math.max(0, ideal),
                remaining: isFuture ? null : Math.max(0, totalEffort - closedEffort), // Don't plot future actuals
                originalDate: day
            };
        });
    }, [sprint, effectiveTasks]);

    if (!data.length) return null;

    return (
        <div className="w-full h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorRemaining" x1="0" y1="0" x2="0" y2="1">
                            {/* Dashboard Violet #6366f1 */}
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: isLight ? '#71717a' : '#a1a1aa' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: isLight ? '#71717a' : '#a1a1aa' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: isLight ? '#ffffff' : '#18181b',
                            borderColor: isLight ? '#e4e4e7' : '#27272a',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }}
                    />
                    {/* Ideal Line (Gray Dashed) */}
                    <Area
                        type="monotone"
                        dataKey="ideal"
                        stroke="#71717a"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        fill="none"
                        name="Ideal"
                        dot={false}
                    />
                    {/* Remaining Line (Dashboard Violet) */}
                    <Area
                        type="monotone"
                        dataKey="remaining"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fill="url(#colorRemaining)"
                        name="Remaining Effort"
                        connectNulls={false} // Don't connect future nulls
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
