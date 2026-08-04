"use client";

import React, { useState, useEffect } from 'react';
import { Project } from "@/types";

export interface ProjectWbsTrackerProps {
  project?: Project | null;
}

export function ProjectWbsTracker({ project }: ProjectWbsTrackerProps) {
  const [projectData, setProjectData] = useState<any>(null);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Form states
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  const [selectedParentCode, setSelectedParentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<'TASK' | 'MILESTONE'>('TASK');
  const [newPriority, setNewPriority] = useState<string>('MEDIA');
  const [newSqlInspection, setNewSqlInspection] = useState('');
  const [newSqlExecution, setNewSqlExecution] = useState('');
  const [newSqlVerification, setNewSqlVerification] = useState('');

  // Selected task SQL view
  const [activeSqlTask, setActiveSqlTask] = useState<any>(null);

  useEffect(() => {
    // Initial Transpais Seed WBS structure
    const initialSeed = {
      groups: [
        {
          id: "grp-1",
          code: "1.0",
          name: "Planificación, Maestros y Configuración Base",
          tasks: [
            { id: "t-1.1", code: "1.1", kind: "TASK", title: "Levantamiento de Parámetros Operativos TSP", status: "COMPLETADA", progress: 100, startedOn: "2026-07-01", completedOn: "2026-07-05", inspectionSql: "SELECT * FROM dbo.Empresa WITH (NOLOCK);", executionSql: "-- Script de comprobación de la entidad TSP\nSELECT TenantId, Codigo FROM dbo.Empresa WHERE Codigo = 'TSP';", verificationSql: "SELECT COUNT(*) FROM dbo.Empresa WHERE Codigo = 'TSP';", sourceDoc: "DDS" },
            { id: "t-1.2", code: "1.2", kind: "TASK", title: "Definición de Entidades Dador y Destinatario", status: "EN_CURSO", progress: 60, startedOn: "2026-07-06", completedOn: null, inspectionSql: "SELECT * FROM dbo.ClienteDador WITH (NOLOCK);", executionSql: "CREATE PROCEDURE dbo.sp_TSP_ValidarClienteDador AS BEGIN SET NOCOUNT ON; END;", verificationSql: "SELECT COUNT(*) FROM dbo.ClienteDador;", sourceDoc: "EXCEL" },
            { id: "t-1.2.1", parentCode: "1.2", code: "1.2.1", kind: "TASK", title: "↳ Mapeo de Identificadores RFC / TaxId Internacional", status: "EN_CURSO", progress: 50, startedOn: "2026-07-10", completedOn: null, inspectionSql: "SELECT RFC, TaxId FROM dbo.ClienteDador;", executionSql: "ALTER TABLE dbo.ClienteDador ADD TaxIdExt VARCHAR(50);", verificationSql: "SELECT TaxIdExt FROM dbo.ClienteDador;", sourceDoc: "DDS+EXCEL" },
            { id: "t-1.3", code: "1.3", kind: "MILESTONE", title: "HITO H1: Aprobación de Maestros y Parámetros Iniciales", status: "EN_VALIDACION", progress: 80, startedOn: "2026-07-12", completedOn: null, inspectionSql: "SELECT Status FROM dbo.HitosProyecto WHERE Code = 'H1';", executionSql: "UPDATE dbo.HitosProyecto SET Status = 'EN_VALIDACION' WHERE Code = 'H1';", verificationSql: "SELECT Status FROM dbo.HitosProyecto WHERE Code = 'H1';", sourceDoc: "EXCEL" }
          ]
        },
        {
          id: "grp-2",
          code: "2.0",
          name: "Integración Operativa 4PL & Webfleet / MS365",
          tasks: [
            { id: "t-2.1", code: "2.1", kind: "TASK", title: "Configuración Endpoint IFTMIN Maersk / Webfleet", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, inspectionSql: "SELECT * FROM dbo.IntegracionesEndpoint WHERE Code = 'WEBFLEET';", executionSql: "INSERT INTO dbo.IntegracionesEndpoint (Code, Active) VALUES ('WEBFLEET', 1);", verificationSql: "SELECT Active FROM dbo.IntegracionesEndpoint WHERE Code = 'WEBFLEET';", sourceDoc: "DDS" },
            { id: "t-2.2", code: "2.2", kind: "TASK", title: "Mapeo de Estados de Liquidación y Cobros TSP", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, inspectionSql: "SELECT * FROM dbo.LiquidacionEstado;", executionSql: "CREATE TABLE dbo.TSP_MapeoLiquidacion (Id INT PRIMARY KEY);", verificationSql: "SELECT COUNT(*) FROM dbo.TSP_MapeoLiquidacion;", sourceDoc: "EXCEL" }
          ]
        }
      ]
    };
    setProjectData(initialSeed);
  }, []);

  if (!projectData) return <div className="p-6 text-zinc-400">Cargando WBS Tracker...</div>;

  const changeStatus = (groupCode: string, taskCode: string, newStatus: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = { ...projectData };

    updated.groups.forEach((g: any) => {
      if (g.code === groupCode) {
        g.tasks.forEach((t: any) => {
          if (t.code === taskCode) {
            const oldStatus = t.status;
            t.status = newStatus;

            if (newStatus === 'ANULADA') {
              t.previousStatus = oldStatus;
              t.progress = 0;
              t.completedOn = null;
            } else if (newStatus === 'PENDIENTE') {
              t.progress = 0;
              t.startedOn = null;
              t.completedOn = null;
            } else if (newStatus === 'COMPLETADA') {
              t.progress = 100;
              if (!t.startedOn) t.startedOn = today;
              t.completedOn = today;
            } else {
              if (!t.startedOn) t.startedOn = today;
              t.completedOn = null;
            }

            setAuditEntries(prev => [
              { taskCode: t.code, field: 'Estado', oldVal: oldStatus, newVal: newStatus, time: new Date().toLocaleTimeString() },
              ...prev
            ]);
          }
        });
      }
    });

    setProjectData(updated);
  };

  const changeProgress = (groupCode: string, taskCode: string, newProg: number) => {
    const today = new Date().toISOString().split('T')[0];
    const updated = { ...projectData };

    updated.groups.forEach((g: any) => {
      if (g.code === groupCode) {
        g.tasks.forEach((t: any) => {
          if (t.code === taskCode) {
            t.progress = newProg;
            if (newProg === 100) {
              t.status = 'COMPLETADA';
              if (!t.startedOn) t.startedOn = today;
              t.completedOn = today;
            } else if (newProg > 0 && (t.status === 'PENDIENTE' || t.status === 'ANULADA')) {
              t.status = 'EN_CURSO';
              t.startedOn = today;
            }
          }
        });
      }
    });

    setProjectData(updated);
  };

  const annulTask = (groupCode: string, taskCode: string) => {
    if (window.confirm(`¿Confirmas anular la tarea ${taskCode}? Quedará sombreada y tachada.`)) {
      changeStatus(groupCode, taskCode, 'ANULADA');
    }
  };

  const revertAnnulment = (groupCode: string, taskCode: string) => {
    const group = projectData.groups.find((g: any) => g.code === groupCode);
    const task = group?.tasks.find((t: any) => t.code === taskCode);
    const restored = task?.previousStatus || 'PENDIENTE';
    changeStatus(groupCode, taskCode, restored);
  };

  const openCreateModal = (groupCode: string, parentCode?: string) => {
    setSelectedGroupCode(groupCode);
    setSelectedParentCode(parentCode || '');
    const group = projectData.groups.find((g: any) => g.code === groupCode);

    let nextCode = '';
    if (parentCode) {
      const childTasks = group?.tasks.filter((t: any) => t.code.startsWith(`${parentCode}.`)) || [];
      const childNums = childTasks.map((t: any) => parseInt(t.code.split('.')[2] || '0', 10));
      const nextChild = (childNums.length > 0 ? Math.max(...childNums) : 0) + 1;
      nextCode = `${parentCode}.${nextChild}`;
    } else {
      const gNum = groupCode.replace(/[^0-9]/g, '') || '1';
      const taskNums = (group?.tasks || [])
        .filter((t: any) => t.kind === 'TASK')
        .map((t: any) => parseInt(t.code.split('.')[1] || '0', 10));
      const nextNum = (taskNums.length > 0 ? Math.max(...taskNums) : 0) + 1;
      nextCode = `${gNum}.${nextNum}`;
    }

    setNewCode(nextCode);
    setNewTitle('');
    setNewSqlInspection(`SELECT * FROM dbo.Tabla_${nextCode.replace(/\./g, '_')};`);
    setNewSqlExecution(`-- Script DDL/DML para ${nextCode}\nCREATE PROCEDURE dbo.sp_TSP_${nextCode.replace(/\./g, '_')}\nAS\nBEGIN\n    SET NOCOUNT ON;\nEND;`);
    setNewSqlVerification(`SELECT COUNT(*) FROM dbo.Tabla_${nextCode.replace(/\./g, '_')};`);
    setIsCreateModalOpen(true);
  };

  const saveNewTask = () => {
    if (!newTitle.trim()) {
      alert('Introduce un título para la nueva tarea.');
      return;
    }

    const updated = { ...projectData };
    const group = updated.groups.find((g: any) => g.code === selectedGroupCode);
    if (group) {
      group.tasks.push({
        id: `task-custom-${Date.now()}`,
        parentCode: selectedParentCode || null,
        code: newCode,
        kind: newKind,
        title: newTitle,
        titleRich: selectedParentCode ? `↳ ${newTitle}` : newTitle,
        status: 'PENDIENTE',
        priority: newPriority,
        progress: 0,
        startedOn: null,
        completedOn: null,
        inspectionSql: newSqlInspection,
        executionSql: newSqlExecution,
        verificationSql: newSqlVerification,
        sourceDoc: 'MANUAL'
      });

      setAuditEntries(prev => [
        { taskCode: newCode, field: 'Nueva Tarea Creada', oldVal: '-', newVal: newTitle, time: new Date().toLocaleTimeString() },
        ...prev
      ]);
    }

    setProjectData(updated);
    setIsCreateModalOpen(false);
  };

  // KPIs
  let totalTasks = 0, completedTasks = 0, sumProgress = 0, annulledCount = 0, milestonesTotal = 0, milestonesDone = 0;
  projectData.groups.forEach((g: any) => {
    g.tasks.forEach((t: any) => {
      if (t.status === 'ANULADA') {
        annulledCount++;
        return;
      }
      totalTasks++;
      sumProgress += (t.progress || 0);
      if (t.status === 'COMPLETADA') completedTasks++;
      if (t.kind === 'MILESTONE') {
        milestonesTotal++;
        if (t.status === 'COMPLETADA') milestonesDone++;
      }
    });
  });

  const globalProgress = totalTasks > 0 ? Math.round(sumProgress / totalTasks) : 0;

  return (
    <div className="p-4 bg-zinc-900 text-zinc-100 min-h-full flex flex-col gap-4">
      {/* KPIs Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Avance Global WBS</div>
          <div className="text-2xl font-extrabold text-sky-400 mt-1">{globalProgress}%</div>
          <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div className="bg-gradient-to-r from-sky-400 to-emerald-500 h-full transition-all duration-300" style={{ width: `${globalProgress}%` }}></div>
          </div>
        </div>

        <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Completadas / Activas</div>
          <div className="text-2xl font-extrabold text-sky-400 mt-1">{completedTasks} / {totalTasks}</div>
        </div>

        <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Tareas Anuladas</div>
          <div className="text-2xl font-extrabold text-red-500 mt-1">{annulledCount}</div>
        </div>

        <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Hitos de Validación</div>
          <div className="text-2xl font-extrabold text-purple-400 mt-1">{milestonesDone} / {milestonesTotal}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center bg-zinc-800/80 border border-zinc-700/60 p-3 rounded-lg flex-wrap gap-2">
        <div className="flex gap-2">
          <button className="px-3.5 py-2 bg-sky-400 hover:bg-sky-300 text-zinc-950 font-bold text-xs rounded-md transition-all shadow-sm" onClick={() => alert('Selecciona el Documento DDS (.docx) y el Plan de Trabajo Excel (.xlsx) para fusionar.')}>
            📥 Importar Fusión DDS (.docx) + Plan Excel (.xlsx)
          </button>
          <button className="px-3.5 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-xs rounded-md transition-all border border-zinc-600" onClick={() => setIsAuditOpen(true)}>
            📜 Auditoría ({auditEntries.length})
          </button>
        </div>
        <div className="text-xs text-zinc-400">
          Proyecto: <span className="font-bold text-white">{project?.name || "Operativa Internacional TSP"}</span>
        </div>
      </div>

      {/* WBS Groups */}
      {projectData.groups.map((group: any) => {
        let groupActiveCount = 0;
        let groupSum = 0;
        group.tasks.forEach((t: any) => {
          if (t.status !== 'ANULADA') {
            groupActiveCount++;
            groupSum += (t.progress || 0);
          }
        });
        const groupProg = groupActiveCount > 0 ? Math.round(groupSum / groupActiveCount) : 0;

        return (
          <div key={group.id} className="bg-zinc-800/90 border border-zinc-700/70 rounded-lg overflow-hidden shadow-sm">
            <div className="p-3.5 bg-zinc-900/80 border-b border-zinc-700/60 flex justify-between items-center">
              <div className="font-bold text-sky-400 text-sm flex items-center gap-2">
                📂 {group.code} - {group.name}
              </div>
              <div className="flex items-center gap-3">
                <button className="px-2.5 py-1 bg-sky-400 hover:bg-sky-300 text-zinc-950 font-bold text-xs rounded transition-all" onClick={() => openCreateModal(group.code)}>
                  ➕ Nueva Tarea Granular
                </button>
                <div className="text-xs font-bold text-emerald-400">Avance: {groupProg}%</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-900/90 text-zinc-400 border-b border-zinc-700/50">
                    <th className="p-3 w-20">Código</th>
                    <th className="p-3">Línea Excel / Requisito DDS</th>
                    <th className="p-3 w-36">Estado</th>
                    <th className="p-3 w-20">Avance</th>
                    <th className="p-3 w-28">Inicio Real</th>
                    <th className="p-3 w-28">Fin Real</th>
                    <th className="p-3 w-56">Acciones & SQL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700/40">
                  {group.tasks.map((t: any) => {
                    const isMilestone = t.kind === 'MILESTONE';
                    const isNested = t.code.split('.').length >= 3;
                    const isAnnulled = t.status === 'ANULADA';

                    let rowClass = "hover:bg-zinc-700/30 transition-colors";
                    if (isAnnulled) {
                      rowClass = "bg-red-500/10 opacity-60 line-through";
                    } else if (isMilestone) {
                      rowClass = "bg-purple-500/10 font-semibold";
                    } else if (isNested) {
                      rowClass = "bg-zinc-900/40";
                    }

                    return (
                      <tr key={t.id} className={rowClass}>
                        <td className={`p-3 font-bold ${isNested ? 'pl-7 text-amber-400' : 'text-zinc-100'}`}>
                          {t.code}
                        </td>
                        <td className="p-3">
                          {t.titleRich || t.title}
                          {isMilestone && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">HITO VALIDACIÓN</span>}
                          {t.sourceDoc && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-400">{t.sourceDoc}</span>}
                        </td>
                        <td className="p-3 no-underline">
                          <select value={t.status} onChange={e => changeStatus(group.code, t.code, e.target.value)} className="bg-zinc-900 border border-zinc-700 text-zinc-100 rounded px-2 py-1 text-xs outline-none focus:border-sky-400">
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="EN_CURSO">En curso</option>
                            <option value="BLOQUEADA">Bloqueada</option>
                            <option value="EN_VALIDACION">En validación</option>
                            <option value="COMPLETADA">Completada</option>
                            <option value="ANULADA">Anulada</option>
                          </select>
                        </td>
                        <td className="p-3 no-underline">
                          <input type="number" value={t.progress || 0} min="0" max="100" step="5" className="w-12 bg-zinc-900 border border-zinc-700 text-center rounded py-0.5 text-xs text-zinc-100 outline-none focus:border-sky-400" onChange={e => changeProgress(group.code, t.code, parseInt(e.target.value) || 0)} />%
                        </td>
                        <td className="p-3 text-sky-400 text-[11px]">{t.startedOn || '-'}</td>
                        <td className="p-3 text-emerald-400 text-[11px]">{t.completedOn || '-'}</td>
                        <td className="p-3 flex gap-1.5 items-center no-underline">
                          <button className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-[11px] rounded border border-zinc-600" onClick={() => { setActiveSqlTask(t); setIsSqlModalOpen(true); }}>📄 SQL</button>
                          {isAnnulled ? (
                            <button className="px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[11px] rounded border border-emerald-500/40" onClick={() => revertAnnulment(group.code, t.code)}>↩️ Revertir</button>
                          ) : (
                            <>
                              <button className="px-2 py-1 bg-sky-400 hover:bg-sky-300 text-zinc-950 font-bold text-[11px] rounded" onClick={() => openCreateModal(group.code, t.code)}>↳ Sub-tarea</button>
                              <button className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[11px] rounded border border-red-500/40" onClick={() => annulTask(group.code, t.code)}>🚫 Anular</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Modal Nueva Tarea */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-full max-w-xl flex flex-col gap-3 shadow-2xl">
            <h3 className="text-lg font-bold text-sky-400">➕ Crear Nueva Tarea Granular ({newCode})</h3>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título de la tarea" className="bg-zinc-900 border border-zinc-700 text-white rounded p-2 text-sm outline-none focus:border-sky-400" />
            <textarea value={newSqlInspection} onChange={e => setNewSqlInspection(e.target.value)} placeholder="SELECT Inspección" rows={2} className="bg-zinc-900 border border-zinc-700 text-sky-400 font-mono rounded p-2 text-xs outline-none focus:border-sky-400" />
            <textarea value={newSqlExecution} onChange={e => setNewSqlExecution(e.target.value)} placeholder="Script DDL/DML Ejecución" rows={3} className="bg-zinc-900 border border-zinc-700 text-sky-400 font-mono rounded p-2 text-xs outline-none focus:border-sky-400" />
            <textarea value={newSqlVerification} onChange={e => setNewSqlVerification(e.target.value)} placeholder="SELECT Verificación" rows={2} className="bg-zinc-900 border border-zinc-700 text-sky-400 font-mono rounded p-2 text-xs outline-none focus:border-sky-400" />
            <div className="flex justify-end gap-2 mt-2">
              <button className="px-4 py-2 bg-zinc-700 text-zinc-200 rounded text-xs hover:bg-zinc-600" onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-sky-400 text-zinc-950 font-bold rounded text-xs hover:bg-sky-300" onClick={saveNewTask}>Guardar Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* Visor SQL */}
      {isSqlModalOpen && activeSqlTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-full max-w-2xl flex flex-col gap-4 shadow-2xl">
            <h3 className="text-lg font-bold text-sky-400">📄 SQL Detalle ({activeSqlTask.code}) - {activeSqlTask.title}</h3>
            <div>
              <div className="text-xs text-zinc-400 mb-1">🔍 1. SELECT de Inspección:</div>
              <pre className="bg-zinc-950 text-sky-400 p-3 rounded text-xs font-mono border border-zinc-800 overflow-x-auto">{activeSqlTask.inspectionSql || 'SELECT * FROM dbo.Tabla WITH (NOLOCK);'}</pre>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">⚙️ 2. Script DDL/DML Ejecución:</div>
              <pre className="bg-zinc-950 text-sky-400 p-3 rounded text-xs font-mono border border-zinc-800 overflow-x-auto">{activeSqlTask.executionSql || 'CREATE PROCEDURE dbo.sp_Ejemplo AS BEGIN SET NOCOUNT ON; END;'}</pre>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">✅ 3. SELECT Verificación:</div>
              <pre className="bg-zinc-950 text-sky-400 p-3 rounded text-xs font-mono border border-zinc-800 overflow-x-auto">{activeSqlTask.verificationSql || 'SELECT COUNT(*) FROM dbo.Tabla;'}</pre>
            </div>
            <div className="text-right mt-2">
              <button className="px-4 py-2 bg-zinc-700 text-white rounded text-xs hover:bg-zinc-600" onClick={() => setIsSqlModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Auditoría */}
      {isAuditOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 w-full max-w-xl flex flex-col gap-3 shadow-2xl">
            <h3 className="text-lg font-bold text-purple-400">📜 Histórico de Auditoría del Proyecto</h3>
            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {auditEntries.length === 0 ? (
                <div className="text-zinc-500">No hay eventos registrados en esta sesión.</div>
              ) : (
                auditEntries.map((e, idx) => (
                  <div key={idx} className="border-b border-zinc-700/60 pb-2">
                    <span className="text-zinc-400">[{e.time}]</span> <strong>Tarea {e.taskCode}:</strong> {e.field} - <span className="text-red-400">{e.oldVal}</span> ➔ <span className="text-emerald-400">{e.newVal}</span>
                  </div>
                ))
              )}
            </div>
            <div className="text-right mt-2">
              <button className="px-4 py-2 bg-zinc-700 text-white rounded text-xs hover:bg-zinc-600" onClick={() => setIsAuditOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
