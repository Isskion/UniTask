export const APP_VERSION = '13.1.0';

export interface ChangeLogItem {
    version: string;
    date: string;
    title: string;
    features: string[];
}

export const CHANGELOG: ChangeLogItem[] = [
    {
        version: "13.1.0",
        date: "2026-01-28",
        title: "Visibilidad de Estado y Analítica",
        features: [
            "👁️ **Estatus Visual**: Nuevas etiquetas de estado (PENDIENTE, PROCESO, HECHO) integradas directamente en la lista de tareas para rápida identificación.",
            "📊 **Analítica Enriquecida**: El 'Task Dashboard' ahora muestra el estatus explícito en cada tarjeta, facilitando la lectura de reportes.",
            "🔽 **Filtros Granulares**: Panel de filtrado lateral expandido con opciones directas para cada estado (Pendiente, En Progreso, Revisión, Completado).",
            "⚡ **Backend Unitask**: Estabilización de Cloud Functions y corrección de permisos críticos (CORS / 403)."
        ]
    },
    {
        version: "13.0.0",
        date: "2026-01-24",
        title: "V3: Planificación Jerárquica & Shadow Migration",
        features: [
            "🚀 **Estructura Jerárquica (V3)**: Soporte completo para Epics, Tasks y Subtasks con ordenamiento visual.",
            "🌳 **Nueva Vista de Árbol**: Toggle 'Jerarquía' en el panel de tareas para visualizar la estructura del proyecto.",
            "🛡️ **Shadow Migration**: Estrategia de doble escritura para garantizar compatibilidad total con V12 durante la transición.",
            "🔄 **Gestión de Padres**: Nuevo selector de 'Padre' y 'Tipo' en el formulario de edición de tareas.",
            "✨ **Interfaz Renovada**: Mejoras en la navegación y corrección de etiquetas de versión."
        ]
    },
    {
        version: "12.12.0",
        date: "2026-01-24",
        title: "Experiencia de Usuario y Administración",
        features: [
            "✨ **Botón Copiar**: Nueva funcionalidad en 'Mis Proyectos' para exportar resultados al portapapeles rápidamente.",
            "🛠️ **Gestión de Usuarios Completa**: Edición de perfiles extendida (Empresa, Cargo, Idioma, Contacto).",
            "🎨 **Tema Rojo Corporativo**: Unificación de estilos en formularios ABM de tareas.",
            "📚 **Manual de Usuario**: Contenido actualizado, simplificado y con mejor formato.",
            "⚡ **Correcciones**: Ajustes en el escáner AI y mejoras de estabilidad."
        ]
    },
    {
        version: "12.11.2",
        date: "2026-01-22",
        title: "Estabilidad y Seguridad en Tareas",
        features: [
            "**Seguridad (Tareas)**: Resolución del error de permisos para el rol Consultor mediante la inyección automática de TenantId y mapeo de rol corregido.",
            "**Buscador de Bitácora**: Corrección del error de filtrado histórico que causaba la desaparición de minutas al realizar búsquedas.",
            "**Hotfix i18n**: Corrección de la clave de traducción para el botón de ocultar tareas en el seguimiento diario."
        ]
    },
    {
        version: "12.11.1",
        date: "2026-01-22",
        title: "Gestión de Perfiles y Espacio Dinámico",
        features: [
            "**Espacio Dinámico**: Optimización del área de notas con renderizado fluído y ajuste de altura automático para mejorar la experiencia de lectura.",
            "**Restauración de Perfiles**: Recuperación completa del formulario ABM de usuarios con soporte para Inquilinos, Grupos de Permiso y Proyectos asignados.",
            "**Detalle de Usuario Extendido**: Integración de campos de contacto (Empresa, Cargo, Teléfono, Dirección) vinculados al sistema multi-tenant."
        ]
    },
    {
        version: "12.10.6",
        date: "2026-01-20",
        title: "Estabilidad de Plataforma y Seguridad",
        features: [
            "**Transición Completa a WeeklyEditor**: Activación global del nuevo editor como punto de entrada principal del sistema.",
            "**Seguridad Reforzada (Firestore)**: Implementación de reglas granulares para colecciones maestras y de bitácora (journal/weekly), garantizando aislamiento multi-tenancy.",
            "**Gestión de Errores Silenciosa**: Mejor manejo de IDs de tareas no encontrados para evitar interrupciones al navegar por enlaces antiguos.",
            "**Restauración de Vistas Admin**: Recuperación de las vistas de Inquilinos y Datos Maestros dentro del entorno del nuevo editor."
        ]
    },
    {
        version: "12.10.5",
        date: "2026-01-20",
        title: "Manual de Usuario y Documentación",
        features: [
            "**Manual de Usuario Actualizado**: Integración del manual en formato Markdown accesible directamente desde la interfaz.",
            "Visualización sin imágenes optimizada para carga rápida.",
            "Cobertura completa hasta la versión 12.10.4."
        ]
    },
    {
        version: "12.10.3",
        date: "2026-01-20",
        title: "Estabilidad y Soporte de Vistas",
        features: [
            "Hotfix Build: Resolución de errores de tipos en **VisualTemplateDesigner** (items mapping).",
            "Hotfix WeeklyEditor: Corrección de tipos para soportar la navegación a la vista de Reportes.",
            "Optimización de Diccionarios: Limpieza de claves duplicadas para asegurar el despliegue en Vercel."
        ]
    },
    {
        version: "12.10.0",
        date: "2026-01-20",
        title: "Soporte Multi-idioma Global (i18n)",
        features: [
            "**Internacionalización Completa**: Soporte nativo para 6 idiomas (Español, Inglés, Alemán, Francés, Catalán y Portugués).",
            "**Traducción de Módulos**: Task Management, AI Help, Reports y User Management ahora 100% traducidos.",
            "**Fechas Dinámicas**: Integración de locales de date-fns para visualización de fechas según el idioma seleccionado.",
            "**Diccionarios Expandidos**: Más de 150 nuevas claves añadidas para cubrir toda la interfaz de usuario."
        ]
    },
    {
        version: "12.9.0",
        date: "2026-01-19",
        title: "Mejora de Visualización Mensual",
        features: [
            "Agrupación Semanal: La vista mensual ahora organiza las tareas por semanas (Sem X - Mes) para una mejor planificación.",
            "Contexto Temporal: El encabezado ahora indica explícitamente el mes o periodo seleccionado.",
            "Estabilidad: Corrección en la lógica de cálculo de backlog para vistas agrupadas."
        ]
    },
    {
        version: "12.8.0",
        date: "2026-01-18",
        title: "Task Dashboard 2.0 & Analítica",
        features: [
            "Filtros Avanzados: Panel lateral de filtrado multicriterio (Prioridad, Área, Módulo, Alcance)",
            "Visualización Enriquecida: Badges de metadatos, Deadline con alerta visual de vencimiento y Avatar de responsable en lista.",
            "Gestión Multiproyecto: Nuevo selector para visualizar tareas de múltiples proyectos a la vez (respetando permisos).",
            "Bugfix: Corrección de campo faltante 'ID Entrada Asociada' en el editor de tareas."
        ]
    },
    {
        version: "12.7.0",
        date: "2026-01-18",
        title: "Bitácora de Tareas y Auditoría",
        features: [
            "Nueva Bitácora (Audit Log): Registro detallado de cambios críticos por tarea.",
            "Visualización de Historial: Modal con timeline de quién modificó qué y cuándo.",
            "Control Preventivo de Fechas: Bloqueo de selección de días pasados en el calendario (sin impedir guardar historial existente)."
        ]
    },
    {
        version: "12.6.1",
        date: "2026-01-18",
        title: "Hotfix: Validación de Fechas",
        features: [
            "Corrección: Se eliminó el bloqueo que impedía guardar/actualizar tareas vencidas.",
            "Mejora: Ahora es posible gestionar fechas pasadas sin restricciones."
        ]
    },
    {
        version: "12.6.0",
        date: "2026-01-18",
        title: "Reingeniería de Tareas y Dependencias",
        features: [
            "Nueva UI de Tareas: Diseño de dos columnas (Operativa vs Clasificación) para mayor claridad.",
            "Trazabilidad Simplificada: RTM ID editable integrado directamente en la cabecera.",
            "Gestión Avanzada de Dependencias: Filtrado por proyecto, navegación directa y bloqueo de cierre.",
            "Ocultamiento automático de tareas bloqueantes ya completadas."
        ]
    },
    {
        version: "12.5.0",
        date: "2026-01-18",
        title: "Gestión de Datos Maestros",
        features: [
            "Nueva Administración de Datos Maestros: Prioridad, Área, Alcance y Módulo.",
            "Desplegables Dinámicos: Selección con vista previa de colores y estilos 'chip'.",
            "Dashboard de Configuración: Vista centralizada para gestionar etiquetas del sistema.",
            "Mejoras visuales: Adaptación a temas claro, oscuro y rojo."
        ]
    },
    {
        version: "12.4.4",
        date: "2026-01-17",
        title: "Exportación y Mejoras de UX",
        features: [
            "Nueva función 'Copiar Resultados': Exporta la búsqueda filtrada al portapapeles con un solo clic.",
            "Formato de exportación optimizado para email/chat (incluye nombre de proyecto, fecha y notas).",
            "Mejora en la usabilidad del buscador: Área de clic ampliada para facilitar la apertura."
        ]
    },
    {
        version: "12.4.3",
        date: "2026-01-17",
        title: "Buscador Avanzado de Bitácora",
        features: [
            "Búsqueda Global: Ahora busca en TODOS los registros históricos, no solo en los recientes.",
            "Resaltado de Términos: Las palabras encontradas se marcan en rojo para rápida identificación.",
            "Mejor Ubicación: Buscador integrado en la cabecera del proyecto para fácil acceso.",
            "Corrección de permisos en consultas históricas."
        ]
    },
    {
        version: "12.4.2",
        date: "2026-01-17",
        title: "Mejoras de UI y Estabilidad",
        features: [
            "Refinamiento de botones: Diseño compacto y mejor ubicación en cabecera.",
            "Nueva opción para ocultar/mostrar el panel de tareas lateral.",
            "Corrección CRÍTICA: Solución a caída del servidor por error de sintaxis."
        ]
    },
    {
        version: "12.4.1",
        date: "2026-01-17",
        title: "Refinamiento de UI y Códigos de Proyecto",
        features: [
            "Interfaz Compacta: Botones de escanear y mover optimizados.",
            "Visualización de Código: Se muestra el código del proyecto en la minuta para ahorrar espacio.",
            "Validación Estricta: Límite de 4 caracteres para códigos de proyecto."
        ]
    },
    {
        version: "12.4.0",
        date: "2026-01-17",
        title: "Inteligencia Artificial 2.0 & PDF",
        features: [
            "Actualización a Gemini 2.0 Flash: Más rápido y eficiente.",
            "Lectura de PDF Mejorada: Separación clara entre contenido original y análisis.",
            "Detección de Idioma: La IA respeta el idioma del documento.",
            "Corrección de permisos en la extracción automática de tareas."
        ]
    },
    {
        version: "12.3.0",
        date: "2026-01-16",
        title: "Mejoras en Invitaciones y Seguridad",
        features: [
            "Nuevo sistema de invitaciones simplificado: Rol primero, luego Tenant.",
            "Creación automática de Tenants y Proyectos en un solo paso.",
            "Recuperación de contraseña segura vía email.",
            "Mejoras de privacidad: Los administradores solo ven sus propios datos."
        ]
    },
    {
        version: "12.2.0",
        date: "2026-01-14",
        title: "Botón de Versión y Changelog",
        features: [
            "Agregado botón con la versión actual en el header.",
            "Nuevo modal 'Novedades' para ver el historial de cambios.",
            "Mejoras de rendimiento y corrección de errores menores."
        ]
    },
    {
        version: "12.1.0",
        date: "2026-01-10",
        title: "Gestión de Usuarios",
        features: [
            "Nueva sección para administrar roles y usuarios.",
            "Dashboard actualizado con métricas clave.",
            "Soporte preliminar para múltiples tenants."
        ]
    }
];

export const DOCUMENTATION_LINKS = [
    { label: "Manual de Usuario", url: "/?view=user-manual" },
    { label: "API Reference", url: "#" },
    { label: "Soporte", url: "#" }
];
