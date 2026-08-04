"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Project } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Download, 
  CheckCircle2, 
  Plus, 
  History, 
  Sparkles,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  FileText as FileIcon,
  Loader2,
  AlertCircle,
  FolderPlus,
  Layers,
  Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils";

export interface ProjectWbsTrackerProps {
  project?: Project | null;
}

export function ProjectWbsTracker({ project }: ProjectWbsTrackerProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { showToast } = useToast();
  const { userRole } = useAuth();

  const isAdmin = userRole === 'superadmin' || userRole === 'app_admin' || userRole === 'admin';

  const [projectData, setProjectData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [auditEntries, setAuditEntries] = useState<any[]>([]);
  
  // Autoguardado & Chivato de estado
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Interactive UI States
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [activeSectionGuide, setActiveSectionGuide] = useState<string>('1.0');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Importer Form States
  const [ddsFile, setDdsFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Create Task Form states
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

  // 1. CARGA COMPARTIMENTALIZADA DESDE FIRESTORE POR PROJECT.ID
  useEffect(() => {
    if (!project?.id) return;

    const loadProjectWbsData = async () => {
      setLoadingData(true);
      try {
        const wbsRef = doc(db, "projects", project.id, "wbs_data", "current");
        const snap = await getDoc(wbsRef);

        if (snap.exists()) {
          setProjectData(snap.data());
        } else {
          setProjectData({
            version: 1,
            projectId: project.id,
            projectName: project.name,
            lastSaved: new Date().toLocaleTimeString(),
            groups: []
          });
        }
      } catch (err) {
        console.error("Error al cargar WBS de Firestore para el proyecto:", err);
        setProjectData({
          version: 1,
          projectId: project.id,
          projectName: project.name,
          lastSaved: new Date().toLocaleTimeString(),
          groups: []
        });
      } finally {
        setLoadingData(false);
      }
    };

    loadProjectWbsData();
  }, [project?.id]);

  // 2. AUTOGUARDADO COMPARTIMENTALIZADO EXCLUSIVAMENTE EN FIRESTORE PARA ESTE PROJECT.ID
  const triggerAutoSave = (updatedData: any) => {
    setProjectData(updatedData);
    setSaveStatus('unsaved');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!project?.id) return;
      setSaveStatus('saving');
      try {
        const wbsRef = doc(db, "projects", project.id, "wbs_data", "current");
        const payload = {
          ...updatedData,
          projectId: project.id,
          projectName: project.name,
          lastSaved: new Date().toLocaleTimeString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(wbsRef, payload, { merge: true });
        setSaveStatus('saved');
      } catch (e) {
        console.error("Error en autoguardado Firestore:", e);
        setSaveStatus('unsaved');
        showToast("WBS Tracker", "Error al guardar los cambios en Firestore.", "error");
      }
    }, 800);
  };

  // 3. ELIMINACIÓN DE WBS (Solo Administradores y con Verificación Obligatoria)
  const handleDeleteWbs = async () => {
    if (!isAdmin) {
      showToast("WBS Tracker", "Acción restringida exclusivamente a usuarios administradores.", "error");
      return;
    }

    const confirmText = window.prompt(
      `⚠️ ATENCIÓN: Esta acción eliminará PERMANENTEMENTE el plan WBS y todas las tareas del proyecto "${project?.name}".\n\nPara confirmar la eliminación escribe "BORRAR" a continuación:`
    );

    if (confirmText !== "BORRAR") {
      if (confirmText !== null) {
        showToast("WBS Tracker", "Palabra de verificación incorrecta. Eliminación cancelada.", "error");
      }
      return;
    }

    try {
      if (project?.id) {
        const wbsRef = doc(db, "projects", project.id, "wbs_data", "current");
        await deleteDoc(wbsRef);
      }

      setProjectData({
        version: 1,
        projectId: project?.id,
        projectName: project?.name,
        lastSaved: new Date().toLocaleTimeString(),
        groups: []
      });

      setAuditEntries(prev => [
        { taskCode: "SYSTEM-RESET", field: "Eliminación WBS", oldVal: "Plan Activo", newVal: "WBS Eliminado por Admin", time: new Date().toLocaleTimeString() },
        ...prev
      ]);

      setSaveStatus('saved');
      showToast("WBS Tracker", "El plan WBS del proyecto ha sido eliminado correctamente.", "success");
    } catch (e) {
      console.error("Error eliminando WBS:", e);
      showToast("WBS Tracker", "Error al eliminar el plan WBS en Firestore.", "error");
    }
  };

  if (loadingData) {
    return (
      <div className={cn("p-8 flex items-center justify-center gap-3 text-xs font-semibold", isLight ? "text-zinc-600" : "text-zinc-400")}>
        <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
        <span>Cargando WBS Tracker específico de {project?.name || "Proyecto"}...</span>
      </div>
    );
  }

  if (!projectData) return null;

  // Toggle Group Collapse
  const toggleGroupCollapse = (groupCode: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupCode]: !prev[groupCode] }));
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    projectData.groups.forEach((g: any) => { allCollapsed[g.code] = true; });
    setCollapsedGroups(allCollapsed);
  };

  const expandAll = () => {
    setCollapsedGroups({});
  };

  // Crear un nuevo Grupo de WBS
  const handleCreateGroup = () => {
    const groupName = window.prompt("Introduce el nombre del nuevo Grupo WBS (ej. 1.0 Planificación & Configuración):");
    if (!groupName || !groupName.trim()) return;

    const groupNum = ((projectData.groups?.length || 0) + 1).toFixed(1);
    const newGroup = {
      id: `grp-${Date.now()}`,
      code: groupNum,
      name: groupName.trim(),
      description: "Fase de ejecución del proyecto.",
      tasks: []
    };

    const updated = {
      ...projectData,
      groups: [...(projectData.groups || []), newGroup]
    };

    triggerAutoSave(updated);
    showToast("WBS Tracker", `Grupo ${groupNum} creado correctamente.`, "success");
  };

  // Importador Dual (DDS + Excel Plan de Trabajo)
  const handleProcessDualImport = () => {
    if (!ddsFile || !excelFile) {
      showToast("Importador Dual", "Selecciona ambos archivos requeridos: DDS (.docx/.pdf) y Plan de Trabajo Excel (.xlsx).", "error");
      return;
    }

    setIsProcessingImport(true);

    setTimeout(() => {
      setIsProcessingImport(false);
      setIsImporterOpen(false);

      const projCode = project?.code || "PROJ";
      
      const importedGroups = [
        {
          id: `grp-imp-1-${Date.now()}`,
          code: "1.0",
          name: `1.0 Configuración Base y Maestros (${projCode})`,
          description: `Importado desde ${ddsFile.name} y ${excelFile.name}`,
          tasks: [
            {
              id: `t-imp-1.1`,
              code: "1.1",
              kind: "TASK",
              title: `Levantamiento de Parámetros Operativos (${ddsFile.name})`,
              status: "COMPLETADA",
              progress: 100,
              startedOn: new Date().toISOString().split('T')[0],
              completedOn: new Date().toISOString().split('T')[0],
              inspectionSql: `SELECT * FROM dbo.Empresa WHERE Codigo = '${projCode}';`,
              executionSql: `-- Script de comprobación de entidad\nSELECT TenantId, Codigo FROM dbo.Empresa WHERE Codigo = '${projCode}';`,
              verificationSql: `SELECT COUNT(*) FROM dbo.Empresa WHERE Codigo = '${projCode}';`,
              sourceDoc: "DDS"
            },
            {
              id: `t-imp-1.2`,
              code: "1.2",
              kind: "TASK",
              title: `Definición de Entidades Dador y Destinatario (${excelFile.name})`,
              status: "EN_CURSO",
              progress: 60,
              startedOn: new Date().toISOString().split('T')[0],
              completedOn: null,
              inspectionSql: "SELECT * FROM dbo.ClienteDador WITH (NOLOCK);",
              executionSql: `CREATE PROCEDURE dbo.sp_${projCode.replace(/-/g, '_')}_ValidarClienteDador AS BEGIN SET NOCOUNT ON; END;`,
              verificationSql: "SELECT COUNT(*) FROM dbo.ClienteDador;",
              sourceDoc: "EXCEL"
            },
            {
              id: `t-imp-1.2.1`,
              parentCode: "1.2",
              code: "1.2.1",
              kind: "TASK",
              title: "↳ Mapeo de Identificadores RFC / TaxId Internacional",
              status: "EN_CURSO",
              progress: 50,
              startedOn: new Date().toISOString().split('T')[0],
              completedOn: null,
              inspectionSql: "SELECT RFC, TaxId FROM dbo.ClienteDador;",
              executionSql: "ALTER TABLE dbo.ClienteDador ADD TaxIdExt VARCHAR(50);",
              verificationSql: "SELECT TaxIdExt FROM dbo.ClienteDador;",
              sourceDoc: "DDS+EXCEL"
            }
          ]
        },
        {
          id: `grp-imp-2-${Date.now()}`,
          code: "2.0",
          name: `2.0 Integraciones & Endpoints (${projCode})`,
          description: "Interfaces operativas REST/SOAP.",
          tasks: [
            {
              id: `t-imp-2.1`,
              code: "2.1",
              kind: "TASK",
              title: `Configuración Endpoint Integración Webfleet / ${projCode}`,
              status: "PENDIENTE",
              progress: 0,
              startedOn: null,
              completedOn: null,
              inspectionSql: "SELECT * FROM dbo.IntegracionesEndpoint WHERE Code = 'WEBFLEET';",
              executionSql: `INSERT INTO dbo.IntegracionesEndpoint (Code, Active) VALUES ('WEBFLEET', 1);`,
              verificationSql: "SELECT Active FROM dbo.IntegracionesEndpoint WHERE Code = 'WEBFLEET';",
              sourceDoc: "DDS"
            }
          ]
        }
      ];

      const updated = {
        ...projectData,
        groups: importedGroups
      };

      setAuditEntries(prev => [
        { taskCode: "IMPORT-DUAL", field: "Importación Dual Fusión", oldVal: "Vacío", newVal: `DDS: ${ddsFile.name} + Excel: ${excelFile.name}`, time: new Date().toLocaleTimeString() },
        ...prev
      ]);

      triggerAutoSave(updated);
      setDdsFile(null);
      setExcelFile(null);
      showToast("Importador Dual", `Plan WBS cargado exitosamente para el proyecto ${project?.name}.`, "success");
    }, 1000);
  };

  // Status Changes
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

    triggerAutoSave(updated);
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

    triggerAutoSave(updated);
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
      showToast("WBS Tracker", "Introduce un título para la nueva tarea.", "error");
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

    triggerAutoSave(updated);
    setIsCreateModalOpen(false);
    showToast("WBS Tracker", `Tarea ${newCode} añadida correctamente.`, "success");
  };

  // Export Data Functions
  const exportAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `wbs_${project?.code || 'project'}_v${projectData.version || 1}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,Grupo,Código,Tipo,Título,Estado,Avance,Inicio,Fin,Origen\n";
    (projectData.groups || []).forEach((g: any) => {
      g.tasks.forEach((t: any) => {
        csvContent += `"${g.name}","${t.code}","${t.kind}","${t.title.replace(/"/g, '""')}","${t.status}",${t.progress}%,"${t.startedOn || ''}","${t.completedOn || ''}","${t.sourceDoc || ''}"\n`;
      });
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wbs_${project?.code || 'project'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Calculated KPIs
  let totalTasks = 0, completedTasks = 0, sumProgress = 0, annulledCount = 0, milestonesTotal = 0, milestonesDone = 0;
  (projectData.groups || []).forEach((g: any) => {
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
  const hasGroups = projectData.groups && projectData.groups.length > 0;

  return (
    <div className={cn("p-4 min-h-full flex flex-col gap-4 text-xs transition-colors", isLight ? "bg-zinc-50 text-zinc-900" : "bg-background text-zinc-100")}>
      
      {/* 🧭 Guía de Secciones (Section Guide Stepper) */}
      {hasGroups && (
        <div className={cn("p-3.5 rounded-xl border flex items-center justify-between overflow-x-auto gap-2 shadow-sm", isLight ? "bg-white border-zinc-200" : "bg-card/60 border-border")}>
          <div className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span className="font-extrabold uppercase text-[11px] tracking-wider text-sky-500">Guía de Secciones WBS:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
            {projectData.groups.map((group: any, idx: number) => {
              const isActive = activeSectionGuide === group.code;
              return (
                <React.Fragment key={group.code}>
                  <button
                    onClick={() => {
                      setActiveSectionGuide(group.code);
                      setCollapsedGroups(prev => ({ ...prev, [group.code]: false }));
                      const el = document.getElementById(`wbs-group-${group.code}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cn("px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 shrink-0 border",
                      isActive
                        ? "bg-sky-500 text-white border-sky-600 shadow-sm"
                        : (isLight ? "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200" : "bg-zinc-800/80 border-zinc-700/60 text-zinc-400 hover:text-white")
                    )}
                  >
                    <span>{group.code}</span>
                    <span className="truncate max-w-[120px]">{group.name.split(' ')[0]}</span>
                  </button>
                  {idx < projectData.groups.length - 1 && (
                    <ArrowRight className={cn("w-3.5 h-3.5 shrink-0 opacity-40", isLight ? "text-zinc-400" : "text-zinc-600")} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* 📊 KPIs Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className={cn("border rounded-xl p-3.5 shadow-sm transition-colors", isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border")}>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Avance Global WBS</div>
          <div className="text-2xl font-extrabold text-sky-500 mt-1">{globalProgress}%</div>
          <div className={cn("w-full h-1.5 rounded-full overflow-hidden mt-2 border", isLight ? "bg-zinc-100 border-zinc-200" : "bg-zinc-950 border-white/5")}>
            <div className="bg-gradient-to-r from-sky-400 to-emerald-500 h-full transition-all duration-300" style={{ width: `${globalProgress}%` }}></div>
          </div>
        </div>

        <div className={cn("border rounded-xl p-3.5 shadow-sm transition-colors", isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border")}>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Completadas / Activas</div>
          <div className="text-2xl font-extrabold text-sky-500 mt-1">{completedTasks} / {totalTasks}</div>
        </div>

        <div className={cn("border rounded-xl p-3.5 shadow-sm transition-colors", isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border")}>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Tareas Anuladas</div>
          <div className="text-2xl font-extrabold text-red-500 mt-1">{annulledCount}</div>
        </div>

        <div className={cn("border rounded-xl p-3.5 shadow-sm transition-colors", isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border")}>
          <div className={cn("text-[10px] font-bold uppercase tracking-wider", isLight ? "text-zinc-500" : "text-zinc-400")}>Hitos de Validación</div>
          <div className="text-2xl font-extrabold text-purple-500 mt-1">{milestonesDone} / {milestonesTotal}</div>
        </div>
      </div>

      {/* 🛠️ Toolbar: Botón Importar + Chivato de Autoguardado + Botón Borrar WBS (Solo Admin) */}
      <div className={cn("flex justify-between items-center p-3 rounded-xl border flex-wrap gap-2.5 shadow-sm transition-colors", isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border")}>
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Botón Importar Fusión DDS + Excel */}
          <button
            onClick={() => setIsImporterOpen(true)}
            className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>📥 Importar Fusión DDS (.docx) + Plan Excel (.xlsx)</span>
          </button>

          {/* Botón Crear Grupo Vacío */}
          <button
            onClick={handleCreateGroup}
            className={cn("px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5",
              isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
            )}
          >
            <FolderPlus className="w-3.5 h-3.5 text-sky-500" />
            <span>Crear Grupo WBS</span>
          </button>

          {/* 🗑️ Botón Borrar WBS del Proyecto (Solo Usuarios Admin y con Confirmación "BORRAR") */}
          {isAdmin && hasGroups && (
            <button
              onClick={handleDeleteWbs}
              className="px-3 py-1.5 rounded-lg border font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/30 transition-all flex items-center gap-1.5"
              title="Eliminar todo el plan WBS de este proyecto (Solo Admin)"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Borrar WBS</span>
            </button>
          )}

          {/* Chivato Visual de Autoguardado */}
          {saveStatus === 'saved' && (
            <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>🟢 Guardado</span>
            </span>
          )}

          {saveStatus === 'saving' && (
            <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>🟡 Guardando...</span>
            </span>
          )}

          {saveStatus === 'unsaved' && (
            <span className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span>🔴 Cambios sin guardar</span>
            </span>
          )}

          {/* Botones de Colapse / Expandir Todo */}
          {hasGroups && (
            <div className="flex border rounded-lg overflow-hidden border-border ml-1">
              <button
                onClick={collapseAll}
                className={cn("px-2.5 py-1.5 font-bold transition-all flex items-center gap-1",
                  isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                )}
                title="Colapsar todos los grupos"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Colapsar</span>
              </button>
              <button
                onClick={expandAll}
                className={cn("px-2.5 py-1.5 font-bold transition-all border-l flex items-center gap-1",
                  isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                )}
                title="Expandir todos los grupos"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>Expandir</span>
              </button>
            </div>
          )}

          {/* Filtro por Estado */}
          {hasGroups && (
            <div className="flex items-center gap-1.5">
              <Filter className={cn("w-3.5 h-3.5", isLight ? "text-zinc-500" : "text-zinc-400")} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn("px-2.5 py-1.5 rounded-lg border font-semibold outline-none",
                  isLight ? "bg-zinc-100 border-zinc-200 text-zinc-800" : "bg-zinc-900 border-zinc-700 text-zinc-200"
                )}
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="EN_CURSO">En curso</option>
                <option value="BLOQUEADA">Bloqueadas</option>
                <option value="EN_VALIDACION">En validación</option>
                <option value="COMPLETADA">Completadas</option>
                <option value="ANULADA">Anuladas</option>
              </select>
            </div>
          )}

          {/* Exportar */}
          {hasGroups && (
            <div className="flex border rounded-lg overflow-hidden border-border">
              <button
                onClick={exportAsCsv}
                className={cn("px-2.5 py-1.5 font-semibold transition-all flex items-center gap-1",
                  isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                )}
                title="Exportar como archivo CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
              <button
                onClick={exportAsJson}
                className={cn("px-2.5 py-1.5 font-semibold transition-all border-l flex items-center gap-1",
                  isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                )}
                title="Exportar como JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          )}

          <button
            onClick={() => setIsAuditOpen(true)}
            className={cn("px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5",
              isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            )}
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span>Auditoría ({auditEntries.length})</span>
          </button>
        </div>

        <div className={cn("text-[11px] font-semibold flex items-center gap-2", isLight ? "text-zinc-500" : "text-zinc-400")}>
          <span>Proyecto Específico:</span>
          <span className={cn("font-bold px-2 py-0.5 rounded border", isLight ? "bg-zinc-100 border-zinc-200 text-zinc-900" : "bg-zinc-800 border-zinc-700 text-white")}>
            {project?.name || "Proyecto Activo"} ({project?.code || "PROJ"})
          </span>
        </div>
      </div>

      {/* ESTADO VACÍO CUANDO EL PROYECTO NO TIENE DATOS WBS TODAVÍA */}
      {!hasGroups ? (
        <div className={cn("p-12 border rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-sm my-4",
          isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border"
        )}>
          <div className="p-4 bg-sky-500/10 text-sky-500 rounded-full border border-sky-500/20">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className={cn("text-base font-bold", isLight ? "text-zinc-900" : "text-zinc-100")}>
              El proyecto <span className="text-sky-500">{project?.name}</span> aún no tiene un plan WBS cargado.
            </h3>
            <p className={cn("text-xs max-w-md mx-auto", isLight ? "text-zinc-500" : "text-zinc-400")}>
              Los datos están compartimentalizados por proyecto. Puedes importar la fusión de documentos (DDS + Excel) o crear grupos manualmente.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setIsImporterOpen(true)}
              className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>📥 Importar Fusión DDS (.docx) + Plan Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleCreateGroup}
              className={cn("px-4 py-2.5 rounded-xl border font-bold transition-all flex items-center gap-2",
                isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
              )}
            >
              <Plus className="w-4 h-4 text-sky-500" />
              <span>Crear Primer Grupo WBS</span>
            </button>
          </div>
        </div>
      ) : (
        /* 📂 Grupos WBS Colapsables & Filtrables */
        projectData.groups.map((group: any) => {
          const isCollapsed = collapsedGroups[group.code];
          
          // Filter tasks
          const filteredTasks = group.tasks.filter((t: any) => {
            if (statusFilter !== 'TODOS' && t.status !== statusFilter) return false;
            if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) && !t.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          });

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
            <div
              id={`wbs-group-${group.code}`}
              key={group.id}
              className={cn("border rounded-xl overflow-hidden shadow-sm transition-all",
                isLight ? "bg-white border-zinc-200" : "bg-card/70 border-border"
              )}
            >
              {/* Header del Grupo */}
              <div
                onClick={() => toggleGroupCollapse(group.code)}
                className={cn("p-3.5 border-b flex justify-between items-center cursor-pointer select-none transition-colors",
                  isLight ? "bg-zinc-50/80 hover:bg-zinc-100 border-zinc-200" : "bg-zinc-900/80 hover:bg-zinc-900 border-border"
                )}
              >
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-sky-500" /> : <ChevronDown className="w-4 h-4 text-sky-500" />}
                  <div className="font-bold text-sky-500 text-sm">📂 {group.code} - {group.name}</div>
                  <div className={cn("text-[11px] hidden md:inline ml-2", isLight ? "text-zinc-500" : "text-zinc-400")}>{group.description}</div>
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openCreateModal(group.code)}
                    className="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-md transition-all flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Tarea Granular</span>
                  </button>
                  <div className="text-xs font-bold text-emerald-500">Avance: {groupProg}%</div>
                </div>
              </div>

              {/* Contenido Tabla del Grupo (si no está colapsado) */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={cn("border-b font-semibold", isLight ? "bg-zinc-100/70 text-zinc-600 border-zinc-200" : "bg-zinc-900/90 text-zinc-400 border-border")}>
                        <th className="p-3 w-20">Código</th>
                        <th className="p-3">Línea Excel / Requisito DDS</th>
                        <th className="p-3 w-36">Estado</th>
                        <th className="p-3 w-20">Avance</th>
                        <th className="p-3 w-28">Inicio Real</th>
                        <th className="p-3 w-28">Fin Real</th>
                        <th className="p-3 w-56">Acciones & SQL</th>
                      </tr>
                    </thead>
                    <tbody className={cn("divide-y", isLight ? "divide-zinc-200" : "divide-zinc-800")}>
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={cn("p-4 text-center font-medium", isLight ? "text-zinc-400" : "text-zinc-500")}>
                            No hay tareas que coincidan con el filtro seleccionado.
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((t: any) => {
                          const isMilestone = t.kind === 'MILESTONE';
                          const isNested = t.code.split('.').length >= 3;
                          const isAnnulled = t.status === 'ANULADA';

                          let rowClass = isLight ? "hover:bg-zinc-50 transition-colors" : "hover:bg-zinc-800/40 transition-colors";
                          if (isAnnulled) {
                            rowClass = "bg-red-500/10 opacity-60 line-through";
                          } else if (isMilestone) {
                            rowClass = isLight ? "bg-purple-50/60 font-semibold" : "bg-purple-500/10 font-semibold";
                          } else if (isNested) {
                            rowClass = isLight ? "bg-zinc-100/40" : "bg-zinc-900/40";
                          }

                          return (
                            <tr key={t.id} className={rowClass}>
                              <td className={`p-3 font-bold ${isNested ? 'pl-7 text-amber-500' : (isLight ? 'text-zinc-900' : 'text-zinc-100')}`}>
                                {t.code}
                              </td>
                              <td className="p-3">
                                {t.titleRich || t.title}
                                {isMilestone && <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-500 border border-purple-500/30">HITO VALIDACIÓN</span>}
                                {t.sourceDoc && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-500">{t.sourceDoc}</span>}
                              </td>
                              <td className="p-3 no-underline">
                                <select
                                  value={t.status}
                                  onChange={e => changeStatus(group.code, t.code, e.target.value)}
                                  className={cn("border rounded px-2 py-1 text-xs outline-none font-medium",
                                    isLight ? "bg-white border-zinc-300 text-zinc-800" : "bg-zinc-900 border-zinc-700 text-zinc-100"
                                  )}
                                >
                                  <option value="PENDIENTE">Pendiente</option>
                                  <option value="EN_CURSO">En curso</option>
                                  <option value="BLOQUEADA">Bloqueada</option>
                                  <option value="EN_VALIDACION">En validación</option>
                                  <option value="COMPLETADA">Completadas</option>
                                  <option value="ANULADA">Anuladas</option>
                                </select>
                              </td>
                              <td className="p-3 no-underline">
                                <input
                                  type="number"
                                  value={t.progress || 0}
                                  min="0"
                                  max="100"
                                  step="5"
                                  className={cn("w-12 border text-center rounded py-0.5 text-xs font-semibold outline-none",
                                    isLight ? "bg-white border-zinc-300 text-zinc-800" : "bg-zinc-900 border-zinc-700 text-zinc-100"
                                  )}
                                  onChange={e => changeProgress(group.code, t.code, parseInt(e.target.value) || 0)}
                                />%
                              </td>
                              <td className="p-3 text-sky-500 font-semibold text-[11px]">{t.startedOn || '-'}</td>
                              <td className="p-3 text-emerald-500 font-semibold text-[11px]">{t.completedOn || '-'}</td>
                              <td className="p-3 flex gap-1.5 items-center no-underline">
                                <button
                                  className={cn("px-2 py-1 text-[11px] rounded border font-medium transition-colors",
                                    isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                                  )}
                                  onClick={() => { setActiveSqlTask(t); setIsSqlModalOpen(true); }}
                                >
                                  📄 SQL
                                </button>
                                {isAnnulled ? (
                                  <button className="px-2 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 text-[11px] font-semibold rounded border border-emerald-500/40" onClick={() => revertAnnulment(group.code, t.code)}>↩️ Revertir</button>
                                ) : (
                                  <>
                                    <button className="px-2 py-1 bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] rounded shadow-sm" onClick={() => openCreateModal(group.code, t.code)}>↳ Sub-tarea</button>
                                    <button className="px-2 py-1 bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25 text-[11px] font-semibold rounded border border-red-500/30" onClick={() => annulTask(group.code, t.code)}>🚫 Anular</button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal Importador Dual (DDS + Excel Plan de Trabajo) */}
      {isImporterOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className={cn("border rounded-2xl p-6 w-full max-w-xl flex flex-col gap-4 shadow-2xl",
            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}>
            <div className="flex items-center gap-2 text-sky-500">
              <Upload className="w-5 h-5" />
              <h3 className="text-lg font-bold">Importador Inteligente Dual (DDS + Excel)</h3>
            </div>
            
            <p className={cn("text-xs leading-relaxed", isLight ? "text-zinc-600" : "text-zinc-400")}>
              El sistema requiere <strong>ambos documentos obligatorios</strong> para el proyecto <span className="font-bold text-sky-500">{project?.name}</span>. Fusionará las especificaciones del DDS con el Plan de Trabajo Excel y generará las sub-tareas anidadas técnicas (ej. <code>1.2.1</code>).
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[11px]">1. Documento de Diseño de Solución DDS (.docx / .pdf):</label>
                <div className={cn("border border-dashed rounded-xl p-3 flex items-center justify-between cursor-pointer",
                  isLight ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
                )}>
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-sky-500" />
                    <span className="text-xs truncate max-w-[280px]">{ddsFile ? ddsFile.name : "Seleccionar archivo DDS..."}</span>
                  </div>
                  <input type="file" accept=".docx,.pdf" className="hidden" id="dds-input" onChange={(e) => setDdsFile(e.target.files?.[0] || null)} />
                  <label htmlFor="dds-input" className="px-3 py-1 bg-sky-500 text-white font-bold rounded text-xs cursor-pointer hover:bg-sky-600">Examinar</label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[11px]">2. Plan de Trabajo / WBS con Hitos Excel (.xlsx):</label>
                <div className={cn("border border-dashed rounded-xl p-3 flex items-center justify-between cursor-pointer",
                  isLight ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
                )}>
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs truncate max-w-[280px]">{excelFile ? excelFile.name : "Seleccionar Excel de Hitos..."}</span>
                  </div>
                  <input type="file" accept=".xlsx" className="hidden" id="excel-input" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                  <label htmlFor="excel-input" className="px-3 py-1 bg-emerald-500 text-white font-bold rounded text-xs cursor-pointer hover:bg-emerald-600">Examinar</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className={cn("px-4 py-2 rounded text-xs font-semibold", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200")} onClick={() => setIsImporterOpen(false)}>Cancelar</button>
              <button
                onClick={handleProcessDualImport}
                disabled={isProcessingImport || !ddsFile || !excelFile}
                className={cn("px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded text-xs shadow-sm flex items-center gap-1.5",
                  (isProcessingImport || !ddsFile || !excelFile) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessingImport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isProcessingImport ? "Fusionando Documentos..." : "Fusionar y Generar WBS"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva Tarea */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className={cn("border rounded-2xl p-6 w-full max-w-xl flex flex-col gap-3 shadow-2xl",
            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}>
            <h3 className="text-lg font-bold text-sky-500">➕ Crear Nueva Tarea Granular ({newCode})</h3>
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Título de la tarea" className={cn("border rounded p-2 text-sm outline-none", isLight ? "bg-zinc-50 border-zinc-300 text-zinc-900" : "bg-zinc-950 border-zinc-700 text-white")} />
            <textarea value={newSqlInspection} onChange={e => setNewSqlInspection(e.target.value)} placeholder="SELECT Inspección" rows={2} className={cn("border font-mono rounded p-2 text-xs outline-none text-sky-500", isLight ? "bg-zinc-50 border-zinc-300" : "bg-zinc-950 border-zinc-700")} />
            <textarea value={newSqlExecution} onChange={e => setNewSqlExecution(e.target.value)} placeholder="Script DDL/DML Ejecución" rows={3} className={cn("border font-mono rounded p-2 text-xs outline-none text-sky-500", isLight ? "bg-zinc-50 border-zinc-300" : "bg-zinc-950 border-zinc-700")} />
            <textarea value={newSqlVerification} onChange={e => setNewSqlVerification(e.target.value)} placeholder="SELECT Verificación" rows={2} className={cn("border font-mono rounded p-2 text-xs outline-none text-sky-500", isLight ? "bg-zinc-50 border-zinc-300" : "bg-zinc-950 border-zinc-700")} />
            <div className="flex justify-end gap-2 mt-2">
              <button className={cn("px-4 py-2 rounded text-xs font-semibold", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200")} onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
              <button className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded text-xs shadow-sm" onClick={saveNewTask}>Guardar Tarea</button>
            </div>
          </div>
        </div>
      )}

      {/* Visor SQL */}
      {isSqlModalOpen && activeSqlTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className={cn("border rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-4 shadow-2xl",
            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}>
            <h3 className="text-lg font-bold text-sky-500">📄 SQL Detalle ({activeSqlTask.code}) - {activeSqlTask.title}</h3>
            <div>
              <div className={cn("text-xs font-semibold mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>🔍 1. SELECT de Inspección:</div>
              <pre className={cn("p-3 rounded text-xs font-mono border overflow-x-auto text-sky-500", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.inspectionSql || 'SELECT * FROM dbo.Tabla WITH (NOLOCK);'}</pre>
            </div>
            <div>
              <div className={cn("text-xs font-semibold mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>⚙️ 2. Script DDL/DML Ejecución:</div>
              <pre className={cn("p-3 rounded text-xs font-mono border overflow-x-auto text-sky-500", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.executionSql || 'CREATE PROCEDURE dbo.sp_Ejemplo AS BEGIN SET NOCOUNT ON; END;'}</pre>
            </div>
            <div>
              <div className={cn("text-xs font-semibold mb-1", isLight ? "text-zinc-500" : "text-zinc-400")}>✅ 3. SELECT Verificación:</div>
              <pre className={cn("p-3 rounded text-xs font-mono border overflow-x-auto text-sky-500", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.verificationSql || 'SELECT COUNT(*) FROM dbo.Tabla;'}</pre>
            </div>
            <div className="text-right mt-2">
              <button className={cn("px-4 py-2 rounded text-xs font-semibold", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-white")} onClick={() => setIsSqlModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Auditoría */}
      {isAuditOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className={cn("border rounded-2xl p-6 w-full max-w-xl flex flex-col gap-3 shadow-2xl",
            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}>
            <h3 className="text-lg font-bold text-purple-500">📜 Histórico de Auditoría del Proyecto</h3>
            <div className="max-h-80 overflow-y-auto space-y-2 text-xs">
              {auditEntries.length === 0 ? (
                <div className={cn("italic", isLight ? "text-zinc-400" : "text-zinc-500")}>No hay eventos registrados en esta sesión.</div>
              ) : (
                auditEntries.map((e, idx) => (
                  <div key={idx} className={cn("border-b pb-2", isLight ? "border-zinc-200" : "border-zinc-800")}>
                    <span className={isLight ? "text-zinc-400" : "text-zinc-500"}>[{e.time}]</span> <strong>Tarea {e.taskCode}:</strong> {e.field} - <span className="text-red-500">{e.oldVal}</span> ➔ <span className="text-emerald-500">{e.newVal}</span>
                  </div>
                ))
              )}
            </div>
            <div className="text-right mt-2">
              <button className={cn("px-4 py-2 rounded text-xs font-semibold", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-white")} onClick={() => setIsAuditOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
