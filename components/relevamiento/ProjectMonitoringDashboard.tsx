'use client';

import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Search, 
  MoreVertical,
  Clock,
  CheckCircle2,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { Project } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface ProjectMonitoringDashboardProps {
  globalProjects: Project[];
  onSelectProject: (projectId: string, projectName: string) => void;
  title?: string;
  subtitle?: string;
}

export default function ProjectMonitoringDashboard({ globalProjects, onSelectProject, title, subtitle }: ProjectMonitoringDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  const filteredProjects = useMemo(() => {
    return globalProjects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [globalProjects, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: globalProjects.length,
      active: globalProjects.filter(p => p.status === 'active').length,
      completed: globalProjects.filter(p => p.status === 'completed' || p.status === 'archived').length,
      onHold: globalProjects.filter(p => p.status === 'on_hold').length
    };
  }, [globalProjects]);

  return (
    <div className="flex flex-col h-full w-full bg-background text-foreground overflow-hidden">
      {/* Header - Simple and Clean */}
      <div className="p-6 md:p-8 border-b border-border bg-card/30 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tighter uppercase">{title || t('nav.relevamiento') || 'Relevamientos'}</h1>
            </div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] ml-1 opacity-50">{subtitle || 'Seleccione un proyecto para comenzar'}</p>
          </div>
          
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder={t('common.search') + "..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-xl pl-9 pr-4 py-2 text-xs outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/30"
            />
          </div>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-8 min-h-0">
        {/* Stats Bar - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Totales', value: stats.total, color: 'text-blue-500', icon: Briefcase },
            { label: 'Activos', value: stats.active, color: 'text-cyan-500', icon: TrendingUp },
            { label: 'Pausa', value: stats.onHold, color: 'text-amber-500', icon: Clock },
            { label: 'Listo', value: stats.completed, color: 'text-emerald-500', icon: CheckCircle2 },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border p-4 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all shadow-sm">
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.15em] mb-1">{stat.label}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black tracking-tighter">{stat.value}</span>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
            </div>
          ))}
        </div>

        {/* Table List */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-muted/50 text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em] border-b border-border">
                  <th className="px-6 py-4">Proyecto</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-center">Avance</th>
                  <th className="px-6 py-4">Última Actividad</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    onClick={() => onSelectProject(project.id, project.name)}
                    className="hover:bg-accent/50 transition-all group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm relative overflow-hidden flex-shrink-0" style={{ backgroundColor: project.color || 'var(--primary)' }}>
                          <Briefcase className="w-4 h-4 relative z-10" />
                          <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs truncate block tracking-tight group-hover:text-primary transition-colors">{project.name}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{project.code || 'NO-CODE'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] border",
                        (project.status === 'active' || project.status === 'completed') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        project.status === 'on_hold' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                        project.status === 'archived' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' :
                        'bg-muted text-muted-foreground border-border'
                      )}>
                        {project.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-primary">--%</span>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 opacity-50" />
                        Actualizado hoy
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
