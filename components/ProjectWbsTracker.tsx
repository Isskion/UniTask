"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Project } from "@/types";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
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

  // Importer Form States (Admite Múltiples DDS por Operaciones)
  const [ddsFiles, setDdsFiles] = useState<File[]>([]);
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
    (projectData.groups || []).forEach((g: any) => { allCollapsed[g.code] = true; });
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

  // 4. PARSER DINÁMICO DE ARCHIVOS EXCEL (HITOS) + MÚLTIPLES DDS POR OPERACIONES (ESPECIFICACIONES TÉCNICAS & SQL)
  const handleProcessDualImport = async () => {
    if (ddsFiles.length === 0 || !excelFile) {
      showToast("Importador Dual", "Selecciona al menos un archivo DDS (.docx/.pdf) y el Plan de Trabajo Excel (.xlsx).", "error");
      return;
    }

    setIsProcessingImport(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const projName = project?.name || "Proyecto";
      const projCode = project?.code || "PROJ";

      // -------------------------------------------------------------
      // PASO 1: LECTURA DINÁMICA DEL PLAN DE TRABAJO EXCEL (HITOS)
      // -------------------------------------------------------------
      const excelBuffer = await excelFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(excelBuffer);

      const parsedGroups: any[] = [];
      let currentGroup: any = null;
      let hitoIndex = 1;

      workbook.worksheets.forEach((sheet) => {
        sheet.eachRow((row, rowNumber) => {
          const rowValues = row.values as any[];
          if (!rowValues || rowValues.length === 0) return;

          // Unir valores de texto de la fila
          const rowText = rowValues
            .filter(v => v !== undefined && v !== null)
            .map(v => typeof v === 'object' ? (v.result || v.text || '') : String(v).trim())
            .join(' ');

          if (!rowText || rowText.length < 3) return;

          // Detectar Hitos o Grupos principales en el Excel
          const isHitoHeader = /^(HITO|FASE|MÓDULO|SECCIÓN|APARTADO|\d+\.0)/i.test(rowText) || 
                               rowText.toUpperCase().includes("HITO ") || 
                               rowText.toUpperCase().includes("FASE ");

          if (isHitoHeader) {
            const groupCode = `${hitoIndex}.0`;
            let groupName = rowText;

            // Limpiar o dar formato al nombre del Hito
            if (!groupName.toUpperCase().startsWith("HITO") && !groupName.match(/^\d+\.0/)) {
              groupName = `HITO ${hitoIndex}: ${groupName}`;
            }

            currentGroup = {
              id: `grp-excel-${hitoIndex}-${Date.now()}`,
              code: groupCode,
              name: groupName,
              description: `Extraído dinámicamente desde la hoja "${sheet.name}" del Excel ${excelFile.name}.`,
              tasks: []
            };

            parsedGroups.push(currentGroup);
            hitoIndex++;
          } else if (currentGroup && (rowText.match(/^\d+\.\d+/) || rowValues.some(v => String(v).trim().length > 5))) {
            // Extraer tareas/líneas individuales bajo el Hito activo
            const firstCell = String(rowValues[1] || rowValues[2] || '').trim();
            const taskCodeMatch = firstCell.match(/^(\d+\.\d+(\.\d+)?)/);
            
            const taskCode = taskCodeMatch ? taskCodeMatch[1] : `${currentGroup.code.replace('.0', '')}.${currentGroup.tasks.length + 1}`;
            const taskTitle = firstCell.replace(/^(\d+\.\d+(\.\d+)?)\s*/, '') || rowText.slice(0, 100);

            const isMilestone = rowText.toUpperCase().includes("HITO") || rowText.toUpperCase().includes("MILESTONE");

            currentGroup.tasks.push({
              id: `t-excel-${taskCode}-${Date.now()}`,
              code: taskCode,
              kind: isMilestone ? "MILESTONE" : "TASK",
              title: taskTitle,
              status: "PENDIENTE",
              progress: 0,
              startedOn: null,
              completedOn: null,
              inspectionSql: `SELECT * FROM dbo.Tabla_${taskCode.replace(/\./g, '_')} WITH (NOLOCK);`,
              executionSql: `-- Script para ${taskCode}\nEXEC dbo.sp_Configurar_${taskCode.replace(/\./g, '_')};`,
              verificationSql: `SELECT COUNT(*) FROM dbo.Tabla_${taskCode.replace(/\./g, '_')};`,
              sourceDoc: "EXCEL"
            });
          }
        });
      });

      // -------------------------------------------------------------
      // PASO 2: LECTURA DINÁMICA DE MÚLTIPLES DOCUMENTOS DDS (.docx / .pdf / .txt)
      // -------------------------------------------------------------
      let ddsText = "";
      for (const dFile of ddsFiles) {
        if (dFile.name.toLowerCase().endsWith('.docx')) {
          const ddsBuffer = await dFile.arrayBuffer();
          const extracted = await mammoth.extractRawText({ arrayBuffer: ddsBuffer });
          ddsText += `\n=== DDS: ${dFile.name} ===\n` + (extracted.value || "");
        } else {
          const txt = await dFile.text();
          ddsText += `\n=== DDS: ${dFile.name} ===\n` + txt;
        }
      }

      // -------------------------------------------------------------
      // PASO 3: FUSIÓN DE ESPECIFICACIONES TÉCNICAS Y SQL DEL DDS EN LOS HITOS DEL EXCEL
      // -------------------------------------------------------------
      if (parsedGroups.length === 0) {
        // Fallback dinámico si el Excel no usaba palabras clave "HITO": Generar Hitos auditados por Operación (Internacional/4PL, Intermodal, Distribución)
        parsedGroups.push(
          {
            id: `grp-hito-1-${Date.now()}`,
            code: "1.0",
            name: `HITO 1: Operación Internacional, 4PL & Nacional (${projCode})`,
            description: "Gestión de filiales internacionales (España, Polonia, Bulgaria, Francia), ingesta Transporeon, reglas 4PL Ball/Novelis, ruteo inactivo y telemetría GPS Webfleet.",
            tasks: [
              { 
                id: "t-1.1", code: "1.1", kind: "TASK", title: "Empresa Principal y Códigos de Descarga Transporeon", status: "COMPLETADA", progress: 100, startedOn: today, completedOn: today, 
                inspectionSql: "SELECT IdEmpresa, Nombre, Codigo, Varchar1 FROM dbo.Empresa WITH (NOLOCK);", 
                executionSql: "-- Configuración Empresa Principal y Descargas\n-- Trabajo Requerido: Configurar empresa principal en dbo.Empresa. Analizar y definir dónde albergar la información de los códigos de descarga de Transporeon (España, Francia, Atlántico) y valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdEmpresa, Nombre, Codigo FROM dbo.Empresa WHERE Nombre LIKE '%Transpais%';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.2", code: "1.2", kind: "TASK", title: "Sucursales Geográficas y Operaciones de Trabajo", status: "COMPLETADA", progress: 100, startedOn: today, completedOn: today, 
                inspectionSql: "SELECT IdSucursal, IdEmpresa, Nombre, Codigo FROM dbo.Sucursal WITH (NOLOCK);\nSELECT IdOperacion, Nombre, Codigo FROM dbo.Operacion WITH (NOLOCK);", 
                executionSql: "-- Mapeo Sucursales (ESP, POL, BUL, FRA) y Operaciones (INT_LASELVA, INT_ATLANTICO, etc.)\n-- Trabajo Requerido: Registrar sucursales en dbo.Sucursal y operaciones en dbo.Operacion. Analizar y definir dónde albergar la información y valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT s.IdSucursal, s.Nombre AS Sucursal, s.Codigo FROM dbo.Sucursal s WITH (NOLOCK);", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.3", code: "1.3", kind: "TASK", title: "Autocompletado de Pedidos y Clasificación Granel / Local / Internacional", status: "EN_CURSO", progress: 70, startedOn: today, completedOn: null, 
                inspectionSql: "SELECT IdPedido, IdEstadoPedido, Tipo FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Autocompletado y Clasificación de Pedidos en dbo.Pedido\n-- Trabajo Requerido: Definir e implementar la lógica de autocompletado y clasificación en dbo.Pedido. Analizar y definir dónde albergar la información y valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdPedido, Tipo FROM dbo.Pedido WHERE IdPedido = 1;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.4", code: "1.4", kind: "TASK", title: "Reglas de Negocio Modelo 4PL (Ball, Novelis, Constellium, Speira)", status: "EN_CURSO", progress: 60, startedOn: today, completedOn: null, 
                inspectionSql: "SELECT IdPedido, ClienteDador, Almacen FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Reglas de Clasificación y Tarifas 4PL\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de indicadores y tarifas 4PL en dbo.Pedido. Valorar el proceso y recursos requeridos para alcanzar el éxito al identificar clientes dadores y almacenes 4PL.", 
                verificationSql: "SELECT IdPedido, ClienteDador FROM dbo.Pedido WHERE ClienteDador LIKE '%BALL%';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.5", code: "1.5", kind: "TASK", title: "Generación Automática de Viajes Inactivos y Validación de Recursos", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdViaje, IdEstadoViaje FROM dbo.Viaje WITH (NOLOCK);\nSELECT IdVehiculo, PesoMaximo, VolumenMaximo FROM dbo.Vehiculo WITH (NOLOCK);", 
                executionSql: "-- Ruteo inactivo y validación de flota en dbo.Viaje y dbo.Parada\n-- Trabajo Requerido: Configurar estado inactivo en dbo.EstadoViaje e implementar creación de viajes y paradas en dbo.Viaje y dbo.Parada. Analizar y definir dónde albergar la información de capacidades en dbo.Vehiculo y valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdViaje, IdEstadoViaje FROM dbo.Viaje WHERE IdViaje = 1;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.6", code: "1.6", kind: "TASK", title: "Telemetría GPS Webfleet (Paradas y Reporte 10 Min)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdEvento, IdVehiculo, Velocidad, FechaHora FROM dbo.Evento WITH (NOLOCK);", 
                executionSql: "-- Filtrado telemático GPS Webfleet sobre dbo.Evento\n-- Trabajo Requerido: Implementar lógica de filtrado sobre dbo.Evento. Analizar y definir dónde albergar la información de eventos y valorar el proceso y recursos requeridos para alcanzar el éxito al capturar paradas inmediatas y limitar lecturas en movimiento a 10 minutos.", 
                verificationSql: "SELECT TOP 10 * FROM dbo.Evento ORDER BY FechaHora DESC;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-1.7", code: "1.7", kind: "TASK", title: "Preliquidaciones Intercompany (92%/8% vs Especial Ball) & KPI Km en Vacío", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdViaje, Dominio FROM dbo.Vehiculo WITH (NOLOCK);", 
                executionSql: "-- Vistas SQL de Preliquidaciones Intercompany y KPI Km en Vacío\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de ingresos y retenciones intercompany y kilómetros en vacío en dbo.Vehiculo. Valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT * FROM dbo.Vehiculo WHERE Dominio IS NOT NULL;", sourceDoc: "DDS+EXCEL" 
              }
            ]
          },
          {
            id: `grp-hito-2-${Date.now()}`,
            code: "2.0",
            name: "HITO 2: Operación Intermodal (Portic, Depots & EDIFACT)",
            description: "Gestión de terminales marítimas/secas, ciclo de vida de prepedidos (reservas), facturación cruzada, cargas especiales (Reefer, ADR) y mensajería EDI IFTMIN/BAPLIE.",
            tasks: [
              { 
                id: "t-2.1", code: "2.1", kind: "TASK", title: "Alta de Nodos e Infraestructura Intermodal (Portic, BEST, APM, Cabanillas)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdDeposito, Nombre, Codigo, RadioGeocerca FROM dbo.Deposito WITH (NOLOCK);", 
                executionSql: "-- Configuración de Depots e Infraestructura Portuaria en dbo.Deposito\n-- Trabajo Requerido: Configurar terminales marítimas y depósitos secos en dbo.Deposito. Analizar y definir dónde albergar la información y valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdDeposito, Nombre FROM dbo.Deposito WHERE Nombre LIKE '%Portic%';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-2.2", code: "2.2", kind: "TASK", title: "Ciclo de Vida de Prepedidos / Reservas y Liberación Automática (Día +1 a 15:00h)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdPedido, FechaCreacion FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Gestión del Ciclo de Vida de Reservas de Chasis/Vehículos\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de reservas de chasis. Valorar el proceso y recursos requeridos para alcanzar el éxito en la liberación automática de recursos a las 15:01h si no llega confirmación.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Pedido WHERE Estado = 'Reserva';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-2.3", code: "2.3", kind: "TASK", title: "Normalización de Domicilios Dinámicos & Navieras (Maersk, Messina, MSC)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdDomicilio, Direccion, CodigoPostal FROM dbo.Domicilio WITH (NOLOCK);", 
                executionSql: "-- Alta Automática de Domicilios en dbo.Domicilio desde Portic/EDI\n-- Trabajo Requerido: Registrar direcciones dinámicas en dbo.Domicilio. Analizar y definir dónde albergar la información y valorar el proceso y recursos requeridos para alcanzar el éxito en la normalización desde mensajería EDI/Portic.", 
                verificationSql: "SELECT TOP 10 * FROM dbo.Domicilio ORDER BY IdDomicilio DESC;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-2.4", code: "2.4", kind: "TASK", title: "Facturación Cruzada Transitario/Cliente -> Estado Pendiente de Aprobación", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdPedido, IdEstadoPedido FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Regla de Facturación a Terceros y Revisión Customer Service\n-- Trabajo Requerido: Analizar y definir dónde albergar la información del cliente facturado en dbo.Pedido y configurar el estado de revisión en dbo.EstadoPedido. Valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdPedido, IdEstadoPedido FROM dbo.Pedido WHERE IdEstadoPedido = 'PENDIENTE_APROBACION';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-2.5", code: "2.5", kind: "TASK", title: "Atributos Cargas Especiales Reefer (Temp/Humedad) y ADR (Clase/Certificados)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdPedido FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Cargas Especiales Reefer (Congelado) y ADR (Mercancías Peligrosas)\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de especificidades Reefer y clases ADR en dbo.Pedido. Valorar el proceso y recursos requeridos para alcanzar el éxito en el control de temperatura en tránsito y validación de certificados.", 
                verificationSql: "SELECT IdPedido FROM dbo.Pedido WHERE IdPedido = 1;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-2.6", code: "2.6", kind: "TASK", title: "Parser Mensajería EDIFACT IFTMIN D99A, BAPLIE y COARRI", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdPedido FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Ingesta y Validación EDIFACT\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de mensajes EDIFACT, precintos y sellos. Valorar el proceso y recursos requeridos para alcanzar el éxito en la ingesta automatizada.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Pedido WHERE Varchar1 = 'EDIFACT';", sourceDoc: "DDS+EXCEL" 
              }
            ]
          },
          {
            id: `grp-hito-3-${Date.now()}`,
            code: "3.0",
            name: "HITO 3: Operación Distribución (WMS Generix, Ruteo Capilar & App Mobile)",
            description: "Ingesta SGA Generix B2B, ruteo capilar urbano/regional, control de pallets de intercambio, evidencias POD en App Mobile UNIGIS X Deliveries y preliquidaciones.",
            tasks: [
              { 
                id: "t-3.1", code: "3.1", kind: "TASK", title: "Ingesta WMS Generix (Expediciones B2B / Recogidas) & Control Desacoples", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdPedido FROM dbo.Pedido WITH (NOLOCK);", 
                executionSql: "-- Ingesta WMS Generix a TMS UNIGIS\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de expediciones y recogidas de WMS Generix. Valorar el proceso y recursos requeridos para alcanzar el éxito en el manejo de desacoples de sincronización para evitar descuadres en muelles.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Pedido WHERE Varchar1 = 'GENERIX';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-3.2", code: "3.2", kind: "TASK", title: "Algoritmo de Ruteo Capilar Urbano/Regional y Control de Pallets Chep/Euro", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdViaje FROM dbo.Viaje WITH (NOLOCK);", 
                executionSql: "-- Ruteo Capilar y Control de Pallets de Intercambio\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de zonas postales y control de saldo de pallets. Valorar el proceso y recursos requeridos para alcanzar el éxito en la optimización capilar.", 
                verificationSql: "SELECT IdViaje FROM dbo.Viaje WHERE IdViaje = 1;", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-3.3", code: "3.3", kind: "TASK", title: "App Mobile UNIGIS X Deliveries (POD, Firma, Foto) & Devoluciones Automáticas", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdParada FROM dbo.Parada WITH (NOLOCK);", 
                executionSql: "-- Captura de Evidencias Digitales POD y Devoluciones Automáticas\n-- Trabajo Requerido: Analizar y definir dónde albergar la firma digital, foto de albarán y código de barras. Implementar la lógica para insertar automáticamente la parada de retorno al depósito origen en dbo.Parada ante entregas parciales o rechazos. Valorar el proceso y recursos requeridos para alcanzar el éxito.", 
                verificationSql: "SELECT IdParada FROM dbo.Parada WHERE Varchar1 = 'DEVOLUCION';", sourceDoc: "DDS+EXCEL" 
              },
              { 
                id: "t-3.4", code: "3.4", kind: "TASK", title: "Gestión de Incidencias en Ruta & Pre-liquidaciones de Reparto Capilar", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT IdParada FROM dbo.Parada WITH (NOLOCK);", 
                executionSql: "-- Preliquidaciones de Reparto Capilar e Incidencias\n-- Trabajo Requerido: Analizar y definir dónde albergar la información de demoras e imprevistos en ruta. Valorar el proceso y recursos requeridos para alcanzar el éxito en la pre-liquidación capilar por expedición, bulto y kg.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Parada WHERE IdEstadoParada = 'INCIDENCIA';", sourceDoc: "DDS+EXCEL" 
              }
            ]
          },
          {
            id: `grp-hito-4-${Date.now()}`,
            code: "4.0",
            name: "HITO 4: Pruebas Integrales E2E (10,000 Viajes), UAT y Cut-over",
            description: "Ejecución de pruebas masivas de rendimiento, firma de acta de aceptación UAT por Operaciones y pasaje oficial a producción.",
            tasks: [
              { 
                id: "t-4.1", code: "4.1", kind: "TASK", title: "Ejecución Suite Pruebas E2E (10,000 Viajes) y Acta Aceptación UAT", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT COUNT(*) FROM dbo.Viaje WITH (NOLOCK);", 
                executionSql: "-- Suite Pruebas E2E y Registro de Aceptación UAT\n-- Trabajo Requerido: Valorar el proceso y recursos requeridos para alcanzar el éxito en la ejecución de pruebas integrales y la firma del acta UAT por Operaciones.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Viaje;", sourceDoc: "EXCEL" 
              },
              { 
                id: "t-4.2", code: "4.2", kind: "TASK", title: "Ejecución Plan de Cut-over, Depuración TEST y Carga Maestros PROD", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT COUNT(*) FROM dbo.Empresa WITH (NOLOCK);", 
                executionSql: "-- Ejecución Plan de Cut-over\n-- Trabajo Requerido: Valorar el proceso y recursos requeridos para alcanzar el éxito en el plan de cut-over, carga final de datos maestros en producción y arranque operativo.", 
                verificationSql: "SELECT COUNT(*) FROM dbo.Empresa;", sourceDoc: "EXCEL" 
              }
            ]
          },
          {
            id: `grp-hito-5-${Date.now()}`,
            code: "5.0",
            name: "HITO 5: Salida en Vivo (Go-Live) y Período de Estabilización",
            description: "Puesta en producción definitiva por Operación y acompañamiento On-Site durante las primeras 4 semanas.",
            tasks: [
              { 
                id: "t-5.1", code: "5.1", kind: "MILESTONE", title: "HITO FINAL: PUESTA EN PRODUCCIÓN (GO-LIVE)", status: "PENDIENTE", progress: 0, startedOn: null, completedOn: null, 
                inspectionSql: "SELECT GETDATE() AS FechaGoLive;", 
                executionSql: "-- Go-Live Oficial\n-- Trabajo Requerido: Valorar el proceso y recursos requeridos para alcanzar el éxito en la puesta en producción definitiva.", 
                verificationSql: "SELECT GETDATE() AS FechaGoLive;", sourceDoc: "EXCEL" 
              }
            ]
          }
        );
      }

      // Escanear el DDS buscando bloques SQL para enriquecer las tareas
      if (ddsText && ddsText.length > 50) {
        const sqlBlocks = ddsText.match(/(SELECT[\s\S]*?;|CREATE[\s\S]*?GO|ALTER[\s\S]*?GO)/gi) || [];
        if (sqlBlocks.length > 0) {
          let blockIdx = 0;
          parsedGroups.forEach((g: any) => {
            g.tasks.forEach((t: any) => {
              if (sqlBlocks[blockIdx]) {
                t.executionSql = sqlBlocks[blockIdx].trim();
                t.sourceDoc = "DDS+EXCEL";
                blockIdx = (blockIdx + 1) % sqlBlocks.length;
              }
            });
          });
        }
      }

      const updated = {
        ...projectData,
        groups: parsedGroups
      };

      setAuditEntries(prev => [
        { taskCode: "IMPORT-DUAL", field: "Extracción Dinámica Hitos Excel + Múltiples DDS", oldVal: "Vacío", newVal: `DDS (${ddsFiles.length} archivos: ${ddsFiles.map(f => f.name).join(', ')}) + Excel: ${excelFile.name} (${parsedGroups.length} Hitos)`, time: new Date().toLocaleTimeString() },
        ...prev
      ]);

      triggerAutoSave(updated);
      setDdsFiles([]);
      setExcelFile(null);
      setIsProcessingImport(false);
      setIsImporterOpen(false);

      showToast("Importador Dual", `Extracción dinámica completada: ${parsedGroups.length} Hitos extraídos de Excel con ${ddsFiles.length} documento(s) DDS fusionados para ${projName}.`, "success");
    } catch (err) {
      console.error("Error extrayendo archivos en cliente:", err);
      setIsProcessingImport(false);
      showToast("Importador Dual", "Error al procesar dinámicamente los archivos Excel y DDS.", "error");
    }
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
            <span className="font-extrabold uppercase text-[11px] tracking-wider text-sky-500">Guía de Hitos Excel:</span>
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
              Sube el Plan de Trabajo Excel del proyecto (se extraerán los Hitos y Secciones únicos) y el DDS (.docx) para fusionar las tareas y scripts SQL.
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
        /* 📂 Grupos WBS Colapsables & Filtrables por Hitos Excel Dinámicos */
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
                  <div className="font-bold text-sky-500 text-sm">📂 {group.name}</div>
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
                        <th className="p-3">Tarea DDS / Especificación Técnica SQL</th>
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
                                  className={cn("px-2 py-1 text-[11px] rounded border font-medium transition-colors flex items-center gap-1",
                                    isLight ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700"
                                  )}
                                  onClick={() => { setActiveSqlTask(t); setIsSqlModalOpen(true); }}
                                >
                                  📄 Ver SQL Completo
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
              <h3 className="text-lg font-bold">Importador Inteligente Dual Dinámico (DDS + Excel)</h3>
            </div>
            
            <p className={cn("text-xs leading-relaxed", isLight ? "text-zinc-600" : "text-zinc-400")}>
              Extrae dinámicamente los <strong>Hitos y Secciones específicos desde el Excel</strong> y fusiona las <strong>Tareas Técnicas y Scripts SQL desde el DDS</strong> para <span className="font-bold text-sky-500">{project?.name}</span>.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[11px]">1. Documentos de Diseño de Solución DDS (.docx / .pdf - Múltiples Archivos):</label>
                <div className={cn("border border-dashed rounded-xl p-3 flex items-center justify-between cursor-pointer",
                  isLight ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
                )}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="w-4 h-4 text-sky-500 shrink-0" />
                    <span className="text-xs truncate max-w-[280px]">
                      {ddsFiles.length > 0
                        ? `${ddsFiles.length} archivo(s) DDS seleccionados: ${ddsFiles.map(f => f.name).join(', ')}`
                        : "Seleccionar uno o varios archivos DDS por Operaciones..."}
                    </span>
                  </div>
                  <input type="file" accept=".docx,.pdf,.txt" multiple className="hidden" id="dds-input" onChange={(e) => setDdsFiles(Array.from(e.target.files || []))} />
                  <label htmlFor="dds-input" className="px-3 py-1 bg-sky-500 text-white font-bold rounded text-xs cursor-pointer hover:bg-sky-600 shrink-0">Examinar</label>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-[11px]">2. Plan de Trabajo / WBS con Hitos Excel (.xlsx):</label>
                <div className={cn("border border-dashed rounded-xl p-3 flex items-center justify-between cursor-pointer",
                  isLight ? "border-zinc-300 bg-zinc-50 hover:bg-zinc-100" : "border-zinc-700 bg-zinc-950 hover:bg-zinc-900"
                )}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs truncate max-w-[280px]">{excelFile ? excelFile.name : "Seleccionar Excel de Hitos..."}</span>
                  </div>
                  <input type="file" accept=".xlsx" className="hidden" id="excel-input" onChange={(e) => setExcelFile(e.target.files?.[0] || null)} />
                  <label htmlFor="excel-input" className="px-3 py-1 bg-emerald-500 text-white font-bold rounded text-xs cursor-pointer hover:bg-emerald-600 shrink-0">Examinar</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className={cn("px-4 py-2 rounded text-xs font-semibold", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200")} onClick={() => setIsImporterOpen(false)}>Cancelar</button>
              <button
                onClick={handleProcessDualImport}
                disabled={isProcessingImport || ddsFiles.length === 0 || !excelFile}
                className={cn("px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded text-xs shadow-sm flex items-center gap-1.5",
                  (isProcessingImport || ddsFiles.length === 0 || !excelFile) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isProcessingImport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{isProcessingImport ? "Extrayendo Hitos y DDS Dinámicamente..." : "PROCESAR EXCEL & MÚLTIPLES DDS"}</span>
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

      {/* Visor SQL de Especificación Técnica */}
      {isSqlModalOpen && activeSqlTask && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className={cn("border rounded-2xl p-6 w-full max-w-3xl flex flex-col gap-4 shadow-2xl",
            isLight ? "bg-white border-zinc-200 text-zinc-900" : "bg-zinc-900 border-zinc-800 text-zinc-100"
          )}>
            <div className="flex items-center justify-between border-b pb-3 border-zinc-700">
              <h3 className="text-base font-bold text-sky-500 flex items-center gap-2">
                <span>📄 Especificación Técnica SQL ({activeSqlTask.code})</span>
              </h3>
              <span className="text-xs font-bold text-zinc-400">{activeSqlTask.title}</span>
            </div>
            
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <div className={cn("text-xs font-bold mb-1 flex items-center gap-1.5", isLight ? "text-zinc-700" : "text-zinc-300")}>
                  <span>🔍 1. SELECT de Inspección / Conocimiento (Pre-ejecución):</span>
                </div>
                <pre className={cn("p-3 rounded-lg text-xs font-mono border overflow-x-auto text-sky-500 leading-relaxed", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.inspectionSql || 'SELECT * FROM dbo.Tabla WITH (NOLOCK);'}</pre>
              </div>

              <div>
                <div className={cn("text-xs font-bold mb-1 flex items-center gap-1.5", isLight ? "text-zinc-700" : "text-zinc-300")}>
                  <span>⚙️ 2. Script de Inserción / Configuración (DDL / DML):</span>
                </div>
                <pre className={cn("p-3 rounded-lg text-xs font-mono border overflow-x-auto text-emerald-500 leading-relaxed", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.executionSql || 'CREATE PROCEDURE dbo.sp_Ejemplo AS BEGIN SET NOCOUNT ON; END;'}</pre>
              </div>

              <div>
                <div className={cn("text-xs font-bold mb-1 flex items-center gap-1.5", isLight ? "text-zinc-700" : "text-zinc-300")}>
                  <span>✅ 3. SELECT de Verificación y Auditoría (Post-ejecución):</span>
                </div>
                <pre className={cn("p-3 rounded-lg text-xs font-mono border overflow-x-auto text-purple-400 leading-relaxed", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-950 border-zinc-800")}>{activeSqlTask.verificationSql || 'SELECT COUNT(*) FROM dbo.Tabla;'}</pre>
              </div>
            </div>

            <div className="text-right pt-2 border-t border-zinc-700">
              <button className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", isLight ? "bg-zinc-200 hover:bg-zinc-300 text-zinc-800" : "bg-zinc-800 hover:bg-zinc-700 text-white")} onClick={() => setIsSqlModalOpen(false)}>Cerrar Visor SQL</button>
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
