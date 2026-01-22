import React from 'react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { DailyStatus, Task, Project } from '@/types';
import { CheckCircle2, Circle, AlertTriangle, ListTodo } from 'lucide-react';

interface DailyMinuteReportProps {
    date: Date;
    dailyStatus: DailyStatus;
    tasks: Task[];
    projects: Project[];
    organizationName: string;
}

export function DailyMinuteReport({ date, dailyStatus, tasks, projects, organizationName }: DailyMinuteReportProps) {
    // Process tasks by project
    const tasksByProject: Record<string, Task[]> = {};
    tasks.forEach(t => {
        const pid = t.projectId || 'global';
        if (!tasksByProject[pid]) tasksByProject[pid] = [];
        tasksByProject[pid].push(t);
    });

    const activeProjectIds = new Set(dailyStatus.projects?.map(p => p.projectId || ''));

    // Sort projects: Active in daily status first, then others if they have critical tasks
    const relevantProjects = projects.filter(p => activeProjectIds.has(p.id) || tasksByProject[p.id]?.some(t => t.isBlocking));

    return (
        <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-screen text-slate-900 font-sans">
            {/* Report Header */}
            <div className="border-b-2 border-slate-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-tight text-slate-900 mb-2">Daily Minute</h1>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">{organizationName}</div>
                </div>
                <div className="text-right">
                    <div className="text-4xl font-light text-slate-900">{format(date, 'dd')}</div>
                    <div className="text-sm font-bold uppercase text-slate-500">{format(date, 'MMMM yyyy', { locale: enUS })}</div>
                </div>
            </div>

            {/* Global Context Section */}
            {(dailyStatus.generalNotes) && (
                <div className="mb-8">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 border-b border-slate-100 pb-1">General Context</h2>
                    <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
                        {dailyStatus.generalNotes || "No general notes recorded."}
                    </div>
                </div>
            )}

            {/* Projects Loop */}
            <div className="space-y-8">
                {relevantProjects.map(project => {
                    const entry = dailyStatus.projects?.find(p => p.projectId === project.id);
                    const projectTasks = tasksByProject[project.id] || [];
                    const blockers = projectTasks.filter(t => t.isBlocking && t.status !== 'completed');

                    if (!entry && blockers.length === 0) return null;

                    return (
                        <div key={project.id} className="break-inside-avoid">
                            {/* Project Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: project.color || '#000' }} />
                                <h3 className="text-xl font-bold text-slate-800">{project.name}</h3>
                                {blockers.length > 0 && (
                                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase">
                                        {blockers.length} Blockers
                                    </span>
                                )}
                            </div>

                            {/* Two Column Layout for Content vs Tasks */}
                            <div className="grid grid-cols-3 gap-6">
                                {/* Left: Meeting Notes */}
                                <div className="col-span-2 space-y-4">
                                    {entry?.pmNotes && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Progress / Discussion</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{entry.pmNotes}</p>
                                        </div>
                                    )}
                                    {entry?.conclusions && (
                                        <div>
                                            <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-1">Conclusions</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap italic">{entry.conclusions}</p>
                                        </div>
                                    )}
                                    {entry?.nextSteps && (
                                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                            <h4 className="text-[10px] font-bold text-indigo-800 uppercase mb-1">Next Steps</h4>
                                            <p className="text-xs text-indigo-700 leading-normal">{entry.nextSteps}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Tasks Snapshot */}
                                <div className="col-span-1 bg-slate-50 rounded-lg p-4 border border-slate-100">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                                        <ListTodo className="w-3 h-3" /> Task Status
                                    </h4>

                                    {blockers.length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            {blockers.map(t => (
                                                <div key={t.id} className="flex gap-2 items-start">
                                                    <AlertTriangle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                                                    <span className="text-[10px] font-medium text-red-700 leading-tight">{t.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {projectTasks.slice(0, 5).filter(t => !t.isBlocking && t.status !== 'completed').map(t => (
                                        <div key={t.id} className="flex gap-2 items-start mb-2 last:mb-0">
                                            <Circle className="w-3 h-3 text-slate-300 shrink-0 mt-0.5" />
                                            <span className="text-[10px] text-slate-600 leading-tight">{t.title}</span>
                                        </div>
                                    ))}

                                    {projectTasks.length === 0 && (
                                        <div className="text-[10px] text-slate-400 italic">No active tasks reported.</div>
                                    )}
                                </div>
                            </div>
                            <div className="h-px w-full bg-slate-100 mt-6" />
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Automatically generated by UniTask</p>
                <p className="text-[10px] text-slate-300 mt-1">{format(new Date(), 'MM/dd/yyyy HH:mm')}</p>
            </div>
        </div>
    );
}
