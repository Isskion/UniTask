/**
 * Data Template for UNIGIS TMS Discovery & Relevamiento System
 * Contiene la estructura completa de las 22 Secciones, 67 Tablas y Plantillas de Industria
 */

const SECTIONS_DATA = [
  {
    id: "sec-1",
    code: "1",
    title: "Resumen Ejecutivo",
    icon: "fa-chart-pie",
    desc: "Objetivos, alcance por módulo, beneficios esperados y matriz inicial de riesgos del proyecto.",
    questions: [
      { id: "p1_1", label: "Nombre del Proyecto", type: "text", placeholder: "Ej. Implantación UNIGIS TMS Europastry 2026" },
      { id: "p1_2", label: "Cliente", type: "text", placeholder: "Nombre legal o comercial del cliente" },
      { id: "p1_3", label: "Fecha Inicio Prevista", type: "date" },
      { id: "p1_4", label: "Fecha Go-Live Prevista", type: "date" },
      { id: "p1_5", label: "Responsable UNIGIS", type: "text", placeholder: "Consultor Líder UNIGIS" },
      { id: "p1_6", label: "Responsable Cliente", type: "text", placeholder: "Project Manager Cliente" },
      { id: "p1_7", label: "Países / Delegaciones en Alcance", type: "text", placeholder: "Ej. España, Portugal, México" },
      { id: "p1_8", label: "Empresas Legales en Alcance", type: "text", placeholder: "Razón social / NIFs" }
    ],
    tables: [
      {
        id: "t4",
        title: "Módulos UNIGIS en Alcance (Tabla 4)",
        columns: [
          { key: "modulo", label: "Módulo UNIGIS", type: "readonly" },
          { key: "alcance", label: "En Alcance", type: "chip", options: ["Sí", "No", "Fase 2"] },
          { key: "obs", label: "Observaciones", type: "text" }
        ],
        rows: [
          { modulo: "Gestión de Pedidos (Orders)", alcance: "Sí", obs: "Integración ERP en tiempo real" },
          { modulo: "Planificación y Optimización de Rutas", alcance: "Sí", obs: "Algoritmos VRP con ventanas horarias" },
          { modulo: "Gestión de Expediciones y Manifiestos", alcance: "Sí", obs: "Consolidación y agrupar envíos" },
          { modulo: "Gestión de Flotas, Vehículos y Conductores", alcance: "Sí", obs: "Catálogo de capacidades y turnos" },
          { modulo: "Carrier Management y Portal de Transportistas", alcance: "Sí", obs: "Oferta de cargas a terceros" },
          { modulo: "Gestión de Tarifas y Liquidación (Settlement)", alcance: "Sí", obs: "Pre-facturación y costes" },
          { modulo: "Tracking & Tracing / Torre de Control", alcance: "Sí", obs: "Visibilidad GPS y alertas" },
          { modulo: "Portal de Clientes", alcance: "Sí", obs: "Seguimiento de pedidos por cliente" },
          { modulo: "Aplicación de Conductores (Mobility)", alcance: "Sí", obs: "Proof of Delivery (POD) digital" },
          { modulo: "Motor de Reglas de Negocio", alcance: "Sí", obs: "Validaciones automáticas" },
          { modulo: "Reporting y Business Intelligence", alcance: "Sí", obs: "KPIs operativos y financieros" }
        ]
      },
      {
        id: "t5",
        title: "Beneficios Esperados (Tabla 5)",
        columns: [
          { key: "area", label: "Área", type: "text" },
          { key: "asis", label: "Situación Actual (AS-IS)", type: "text" },
          { key: "tobe", label: "Objetivo con UNIGIS (TO-BE)", type: "text" },
          { key: "kpi", label: "KPI de Medición", type: "text" }
        ],
        rows: [
          { area: "Planificación", asis: "Manual en Excel (3-4 horas/día)", tobe: "Automatizada (< 45 min/día)", kpi: "Tiempo de planificación" },
          { area: "Ocupación Vehículos", asis: "65% capacidad ponderada", tobe: "85% optimizando llenado", kpi: "% Utilización capacidad" },
          { area: "Nivel de Servicio", asis: "88% entregas a tiempo", tobe: "> 96% OTD", kpi: "% OTD (On Time Delivery)" },
          { area: "Visibilidad", asis: "Llamadas telefónicas periódicas", tobe: "Torre de Control GPS 100%", kpi: "% Tracking en tiempo real" }
        ]
      },
      {
        id: "t6",
        title: "Matriz de Riesgos Principales (Tabla 6)",
        columns: [
          { key: "riesgo", label: "Riesgo Identificado", type: "text" },
          { key: "prob", label: "Probabilidad", type: "chip", options: ["Alta", "Media", "Baja"] },
          { key: "imp", label: "Impacto", type: "chip", options: ["Alto", "Medio", "Bajo"] },
          { key: "mitigacion", label: "Plan de Mitigación", type: "text" }
        ],
        rows: [
          { riesgo: "Datos maestros incompletos o de baja calidad", prob: "Alta", imp: "Alto", mitigacion: "Plan de limpieza previo a la ingesta" },
          { riesgo: "Resistencia al cambio en choferes", prob: "Media", imp: "Alto", mitigacion: "Plan de formación presencial y vídeos intuitivos" },
          { riesgo: "Integración ERP con personalizaciones complejas", prob: "Media", imp: "Alto", mitigacion: "Especificación técnica temprana de conectores API" }
        ]
      }
    ]
  },
  {
    id: "sec-2",
    code: "2",
    title: "Información General de la Compañía",
    icon: "fa-building",
    desc: "Perfil de la empresa, estructura corporativa, sedes y modelos de negocio.",
    questions: [
      { id: "p2_1", label: "Sector de Industria", type: "chip", options: ["Alimentación / Congelado", "Retail / Distribución", "Operador Logístico 3PL/4PL", "Químico / Industrial", "Automoción", "Otro"] },
      { id: "p2_2", label: "Facturación Anual Estimada (€)", type: "text", placeholder: "Ej. 150 M€" },
      { id: "p2_3", label: "Volumen Anual de Expediciones", type: "text", placeholder: "Ej. 500,000 expediciones/año" },
      { id: "p2_4", label: "Nº de Centros de Distribución / Almacenes", type: "text", placeholder: "Ej. 12 centros" }
    ],
    tables: [
      {
        id: "t7",
        title: "Perfil General y Alcance Corporativo (Tabla 7)",
        columns: [
          { key: "campo", label: "Campo a Capturar", type: "readonly" },
          { key: "valor", label: "Valor / Respuesta del Cliente", type: "text" }
        ],
        rows: [
          { campo: "Razón Social Principal", valor: "" },
          { campo: "Sede Central", valor: "" },
          { campo: "Estructura de Grupos de Empresas", valor: "" },
          { campo: "Idiomas Requeridos en Plataforma", valor: "Español, Inglés" },
          { campo: "Horarios Operativos de Atención", valor: "24/7" }
        ]
      }
    ]
  },
  {
    id: "sec-3",
    code: "3",
    title: "Tipología de Operaciones de Transporte",
    icon: "fa-truck-moving",
    desc: "Clasificación de los tipos de servicio (Última milla, FTL, LTL, Capilar), modos y tipos de carga.",
    tables: [
      {
        id: "t9",
        title: "Tipos de Servicio Operativo (Tabla 9)",
        columns: [
          { key: "tipo", label: "Tipo de Operativa", type: "readonly" },
          { key: "aplica", label: "Aplica (Sí/No)", type: "chip", options: ["Sí", "No"] },
          { key: "volumen", label: "Volumen Aprox. (Envíos/Día)", type: "text" },
          { key: "obs", label: "Observaciones / Particularidades", type: "text" }
        ],
        rows: [
          { tipo: "Última Milla / Entregas Capilares (HORECA/Retail)", aplica: "Sí", volumen: "2,500", obs: "Restricciones de horario matutino en centro urbano" },
          { tipo: "Distribución Primaria / Larga Distancia (FTL)", aplica: "Sí", volumen: "120", obs: "Tráileres completos a plataformas regionales" },
          { tipo: "Carga Parcial / Grupalia (LTL)", aplica: "Sí", volumen: "300", obs: "Remontado y consolidación en transit hubs" },
          { tipo: "Transporte Internacional / Transfronterizo", aplica: "No", volumen: "0", obs: "N/A" },
          { tipo: "Inverso / Devoluciones (Reverse Logistics)", aplica: "Sí", volumen: "150", obs: "Recogida de envases y devoluciones de producto" }
        ]
      },
      {
        id: "t10",
        title: "Modos de Transporte (Tabla 10)",
        columns: [
          { key: "modo", label: "Modo", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "sistemas", label: "Sistemas Externos Involucrados", type: "text" }
        ],
        rows: [
          { modo: "Carretera (Vehículos Propios)", aplica: "Sí", sistema: "UNIGIS Mobility" },
          { modo: "Carretera (Transportista Subcontratado)", aplica: "Sí", sistema: "Portal Carrier API" },
          { modo: "Intermodal / Ferroviario", aplica: "No", sistema: "-" },
          { modo: "Marítimo / Aéreo", aplica: "No", sistema: "-" }
        ]
      },
      {
        id: "t11",
        title: "Tipologías de Carga (Tabla 11)",
        columns: [
          { key: "tipo", label: "Tipología de Carga", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "unidad", label: "Unidad de Medida Principal", type: "chip", options: ["Palets", "Kilos (Kg)", "Volumen (m3)", "Bultos", "Cajas"] },
          { key: "restricciones", label: "Restricciones de Temperatura / Manipulación", type: "text" }
        ],
        rows: [
          { tipo: "Congelado (-18°C a -22°C)", aplica: "Sí", unidad: "Palets", restricciones: "Cadena de frío continua, registro termógrafo" },
          { tipo: "Refrigerado (2°C a 8°C)", aplica: "Sí", unidad: "Cajas", restricciones: "Incompatibilidad con producto seco" },
          { tipo: "Seco / Ambiente", aplica: "Sí", unidad: "Bultos", restricciones: "Sin restricción de frío" },
          { tipo: "Mercancía Peligrosa (ADR)", aplica: "No", unidad: "Kilos (Kg)", restricciones: "N/A" }
        ]
      }
    ]
  },
  {
    id: "sec-4",
    code: "4",
    title: "Red Logística y Geografía",
    icon: "fa-map-marked-alt",
    desc: "Nodos de la red (Almacenes, Hubs, Depots), zonas geográficas y parámetros de geocodificación.",
    questions: [
      { id: "p4_1", label: "¿Cuentan con cartografía o mapas propios?", type: "chip", options: ["Sí (GIS interno)", "No (Usar OpenStreetMap / Google Maps)"] },
      { id: "p4_2", label: "Calidad de direcciones de clientes actuales", type: "chip", options: ["Alta (Lat/Long exactos)", "Media (Direcciones estructuradas)", "Baja (Texto libre sin validar)"] }
    ],
    tables: [
      {
        id: "t13",
        title: "Nodos de la Red Logística (Tabla 13)",
        columns: [
          { key: "tipo", label: "Tipo de Nodo", type: "chip", options: ["Centro Distribución (CD)", "Hub de Trasbordo", "Almacén Central", "Planta Fabricación", "Cross-docking"] },
          { key: "nombre", label: "Nombre / Ubicación", type: "text" },
          { key: "codigo", label: "Código ERP", type: "text" },
          { key: "horario", label: "Horario Operativo", type: "text" },
          { key: "restricciones", label: "Restricciones de Acceso (Camiones)", type: "text" }
        ],
        rows: [
          { tipo: "Centro Distribución (CD)", nombre: "CD Madrid Central (Getafe)", codigo: "HUB-MAD-01", horario: "05:00 - 22:00", restricciones: "Acceso tráiler 40t permitido" },
          { tipo: "Cross-docking", nombre: "Hub Barcelona Norte", codigo: "HUB-BCN-02", horario: "04:00 - 14:00", restricciones: "Máximo rígidos 12t" }
        ]
      }
    ]
  },
  {
    id: "sec-5",
    code: "5",
    title: "Gestión de Pedidos",
    icon: "fa-box",
    desc: "Canales de entrada de órdenes (API/EDI/ERP), tipología de pedidos, estados y reglas de consolidación.",
    tables: [
      {
        id: "t16",
        title: "Canales de Entrada e Integración de Pedidos (Tabla 16)",
        columns: [
          { key: "canal", label: "Canal de Entrada", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "sistema", label: "Sistema Origen", type: "text" },
          { key: "datos", label: "Datos que Aporta", type: "text" },
          { key: "frecuencia", label: "Frecuencia / Timing", type: "chip", options: ["Real-Time (Webservices API)", "Batch nocturno", "Horario Fijo", "Manual"] }
        ],
        rows: [
          { canal: "Integración ERP Principal", aplica: "Sí", sistema: "SAP S/4HANA / Oracle", datos: "Cabecera, cliente, líneas, pesos, ventanas horarias", frecuencia: "Real-Time (Webservices API)" },
          { canal: "Portal B2B Clientes Directos", aplica: "Sí", sistema: "UNIGIS Customer Portal", datos: "Pedidos de emergencia", frecuencia: "Real-Time (Webservices API)" },
          { canal: "Carga de Ficheros Excel / CSV", aplica: "Sí", sistema: "Importer UNIGIS", datos: "Pedidos contingencia", frecuencia: "Manual" }
        ]
      },
      {
        id: "t17",
        title: "Tipología de Pedidos y Reglas (Tabla 17)",
        columns: [
          { key: "tipo", label: "Tipo de Pedido", type: "text" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "reglas", label: "Particularidades / Reglas de Consolidación", type: "text" }
        ],
        rows: [
          { tipo: "Pedido Estándar de Entrega", aplica: "Sí", reglas: "Permite consolidar con otros pedidos del mismo cliente en el mismo día" },
          { tipo: "Pedido Urgente / Exprès", aplica: "Sí", reglas: "Prioridad máxima en optimizador, ventana restringida" },
          { tipo: "Recogida de Devolución / Reciclaje", aplica: "Sí", reglas: "Asignar al mismo camión de entrega si hay espacio disponible" }
        ]
      }
    ]
  },
  {
    id: "sec-6",
    code: "6",
    title: "Planificación del Transporte",
    icon: "fa-route",
    desc: "Criterios de optimización de rutas (Coste/Tiempo/Capacidad), rutas maestras fijas vs optimización dinámica y restricciones.",
    questions: [
      { id: "p6_1", label: "Modelo de Planificación Deseado", type: "chip", options: ["Optimizador Dinámico VRP", "Rutas Maestras Fijas (Master Routes)", "Mixto (Rutas Fijas + Ajuste Dinámico)"] },
      { id: "p6_2", label: "Hora Límite de Corte de Planificación (Cut-off)", type: "text", placeholder: "Ej. 20:00 h del día anterior" },
      { id: "p6_3", label: "¿Quién aprueba la ruta definitiva?", type: "chip", options: ["Planificador de Tráfico", "Supervisor de Torre", "Automatizado por UNIGIS"] }
    ],
    tables: [
      {
        id: "t20",
        title: "Criterios del Motor de Optimización UNIGIS (Tabla 20)",
        columns: [
          { key: "criterio", label: "Criterio de Asignación", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "peso", label: "Detalle / Prioridad en Optimización", type: "chip", options: ["Alta", "Media", "Baja", "Crítica"] }
        ],
        rows: [
          { criterio: "Minimización de Coste Total de Transporte", aplica: "Sí", peso: "Alta" },
          { criterio: "Respeto Estricto de Ventanas Horarias del Cliente", aplica: "Sí", peso: "Crítica" },
          { criterio: "Maximización de Ocupación de Vehículos (Llenado)", aplica: "Sí", peso: "Alta" },
          { criterio: "Equilibrio de Horas de Trabajo entre Conductores", aplica: "Sí", peso: "Media" },
          { criterio: "Compatibilidad de Tipo de Carga y Vehículo", aplica: "Sí", peso: "Crítica" }
        ]
      },
      {
        id: "t21",
        title: "Restricciones de Planificación (Tabla 21)",
        columns: [
          { key: "restriccion", label: "Restricción Operativa", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "valor", label: "Valor / Límite Permitido", type: "text" }
        ],
        rows: [
          { restriccion: "Tiempo Máximo de Conducción Continuada", aplica: "Sí", valor: "4.5 horas (Normativa CE 561)" },
          { restriccion: "Tiempo Máximo de Jornada Diaria Conductor", aplica: "Sí", valor: "9 a 10 horas máximo" },
          { restriccion: "Tiempo Promedio de Carga / Descarga por Parada", aplica: "Sí", valor: "15 - 25 min según bultos" },
          { restriccion: "Restricciones Urbanas (Bajas Emisiones / ZBE)", aplica: "Sí", valor: "Vehículos ECO en centro de ciudad" }
        ]
      }
    ]
  },
  {
    id: "sec-7",
    code: "7",
    title: "Gestión de Flotas, Vehículos y Conductores",
    icon: "fa-bus",
    desc: "Flota propia y subcontratada, catálogo de tipos de vehículos, equipamiento y configuración de la App Conductor (Mobility).",
    tables: [
      {
        id: "t25",
        title: "Catálogo de Tipos de Vehículo (Tabla 25)",
        columns: [
          { key: "codigo", label: "Código", type: "text" },
          { key: "desc", label: "Descripción Vehículo", type: "text" },
          { key: "peso", label: "Peso Máx (Kg)", type: "text" },
          { key: "vol", label: "Volumen Máx (m3)", type: "text" },
          { key: "bultos", label: "Bultos Máx", type: "text" },
          { key: "temp", label: "Temperatura (°C)", type: "chip", options: ["Multifrío (-20°C a +4°C)", "Seco / Ambiente", "Congelado"] },
          { key: "cantidad", label: "Nº Vehículos", type: "text" }
        ],
        rows: [
          { codigo: "RIG-18T", desc: "Camión Rígido 18 Tols Multifrío", peso: "9,500", vol: "42", bultos: "18 Palets", temp: "Multifrío (-20°C a +4°C)", cantidad: "45" },
          { codigo: "FURG-3.5T", desc: "Furgón Capilar 3.5 Tons", peso: "1,200", vol: "14", bultos: "4 Palets", temp: "Multifrío (-20°C a +4°C)", cantidad: "80" },
          { codigo: "TRAILER-40T", desc: "Tráiler Frigorífico Articulado", peso: "24,000", vol: "85", bultos: "33 Palets", temp: "Congelado", cantidad: "25" }
        ]
      },
      {
        id: "t26",
        title: "Flujo y Eventos de la App de Conductores Mobility (Tabla 26)",
        columns: [
          { key: "evento", label: "Evento del Conductor", type: "readonly" },
          { key: "aplica", label: "Aplica en App", type: "chip", options: ["Sí", "No"] },
          { key: "accion", label: "Acción Automática en UNIGIS", type: "text" },
          { key: "datos", label: "Datos Obligatorios a Capturar", type: "text" }
        ],
        rows: [
          { evento: "Inicio de Jornada / Check-in Vehículo", aplica: "Sí", accion: "Actualiza estado de conductor a Activo", datos: "Kilometraje inicial, foto vehículo" },
          { evento: "Llegada a Cliente / Geofence", aplica: "Sí", accion: "Calcula tiempo de espera", datos: "Posición GPS confirmada" },
          { evento: "Entrega Conforme (POD)", aplica: "Sí", accion: "Cierra pedido como Entregado", datos: "Firma digital en pantalla + Foto albarán" },
          { evento: "Entrega Con Incidencia / Parcial", aplica: "Sí", accion: "Genera alerta inmediata a Torre de Control", datos: "Motivo de incidencia (selector) + Foto" },
          { evento: "Cobro en Ruta (COD)", aplica: "Sí", accion: "Registra cobro en liquidación del chofer", datos: "Importe cobrado + Medio (Efectivo/Talón)" }
        ]
      }
    ]
  },
  {
    id: "sec-8",
    code: "8",
    title: "Gestión de Transportistas Externos (Carrier Management)",
    icon: "fa-handshake",
    desc: "Subcontratación de transporte, portal de ofertas de cargas, contratos, asignación por algoritmo y SLAs.",
    tables: [
      {
        id: "t28",
        title: "Evaluación y Subcontratación de Carriers (Tabla 28)",
        columns: [
          { key: "pregunta", label: "Pregunta de Diseño Carrier Management", type: "readonly" },
          { key: "respuesta", label: "Respuesta del Cliente", type: "text" }
        ],
        rows: [
          { pregunta: "¿Cuántos transportistas externos operan habitualmente con el cliente?", respuesta: "15 a 20 agencias de transporte" },
          { pregunta: "¿Cómo se adjudican las cargas no cubiertas por flota propia?", respuesta: "Algoritmo en Cascada (Ranking de tarifas) y Spot Tender" },
          { pregunta: "¿Los transportistas deben confirmar aceptación en tiempo límite?", respuesta: "Sí, tiempo límite de respuesta: 30 minutos" }
        ]
      }
    ]
  },
  {
    id: "sec-9",
    code: "9",
    title: "Gestión de Tarifas y Liquidación (Settlement)",
    icon: "fa-calculator",
    desc: "Cuadro de tarifas de compra (coste chofer/carrier) y venta, recargos por combustible/esperas y premolde de liquidación.",
    tables: [
      {
        id: "t31",
        title: "Modelos Tarifarios de Coste y Venta (Tabla 31)",
        columns: [
          { key: "modelo", label: "Modelo Tarifario", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "detalle", label: "Detalle de Cálculo en UNIGIS", type: "text" }
        ],
        rows: [
          { modelo: "Tarifa por Kilómetro Recorrido", aplica: "Sí", detalle: "Precio/km fijado por tipo de vehículo" },
          { modelo: "Tarifa Fija por Ruta / Zona", aplica: "Sí", detalle: "Matriz origen-destino de tarifas acordadas" },
          { modelo: "Tarifa por Kilo / Palet Transportado", aplica: "Sí", detalle: "Escalón por tramos de peso o número de palets" },
          { modelo: "Recargo por Combustible (Gasóleo / Floater)", aplica: "Sí", detalle: "Indexación mensual según precio del diésel" }
        ]
      }
    ]
  },
  {
    id: "sec-10",
    code: "10",
    title: "Ejecución, Tracking y Torre de Control",
    icon: "fa-satellite-dish",
    desc: "Monitoreo de rutas en tiempo real, alertas de desvío/retraso, notificaciones SMS/WhatsApp a clientes e incidencias.",
    tables: [
      {
        id: "t36",
        title: "Canales de Notificación al Cliente Final (Tabla 36)",
        columns: [
          { key: "canal", label: "Canal de Notificación", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "evento", label: "Evento Disparador", type: "text" },
          { key: "mensaje", label: "Contenido del Mensaje", type: "text" }
        ],
        rows: [
          { canal: "SMS / WhatsApp Bot", aplica: "Sí", evento: "Salida de camión a ruta", mensaje: "Su pedido está en camino. ETA estimado: 10:30h. Siga su entrega aquí [Link]" },
          { canal: "Email de Confirmación", aplica: "Sí", evento: "Entrega completada (POD)", mensaje: "Adjunto albarán firmado digitalmente" }
        ]
      },
      {
        id: "t37",
        title: "Catálogo de Incidencias Operativas (Tabla 37)",
        columns: [
          { key: "tipo", label: "Tipo de Incidencia", type: "text" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "proceso", label: "Proceso de Resolución", type: "text" },
          { key: "impacto", label: "Impacto en Facturación / Stock", type: "chip", options: ["Alto", "Medio", "Bajo", "Ninguno"] }
        ],
        rows: [
          { tipo: "Cliente Cerrado / Ausente", aplica: "Sí", reintento: "Reprogramar para siguiente día", impacto: "Medio" },
          { tipo: "Rechazo de Producto por Temperatura / Rotura", aplica: "Sí", reingreso: "Retorno a almacén y abono", impacto: "Alto" },
          { tipo: "Retraso por Tráfico / Avería", aplica: "Sí", aviso: "Recálculo automático de ETAs", impacto: "Bajo" }
        ]
      }
    ]
  },
  {
    id: "sec-11",
    code: "11",
    title: "Portal de Clientes y Portal de Transportistas",
    icon: "fa-desktop",
    desc: "Plataformas web para clientes (autoseguimiento y creación de pedidos) y transportistas (oferta y asignación de viajes).",
    tables: [
      {
        id: "t40",
        title: "Funcionalidades del Portal de Transportistas (Tabla 40)",
        columns: [
          { key: "func", label: "Función del Portal", type: "readonly" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "prioridad", label: "Prioridad", type: "chip", options: ["Alta", "Media", "Baja"] }
        ],
        rows: [
          { func: "Aceptación / Rechazo de Cargas Asignadas", aplica: "Sí", prioridad: "Alta" },
          { func: "Carga de Matrículas y Datos de Conductor", aplica: "Sí", prioridad: "Alta" },
          { func: "Subida de Facturas y Pre-facturación", aplica: "Sí", prioridad: "Media" },
          { func: "Visualización de Indicadores de Cumplimiento (SLA)", aplica: "Sí", prioridad: "Baja" }
        ]
      }
    ]
  },
  {
    id: "sec-12",
    code: "12",
    title: "Integraciones con Sistemas Externos",
    icon: "fa-network-wired",
    desc: "Mapa de arquitectura e interfaces con ERP (SAP, Dynamics, Oracle), WMS, GPS/Telemetría y Portales.",
    tables: [
      {
        id: "t43",
        title: "Mapa de Sistemas Integrados (Tabla 43)",
        columns: [
          { key: "sistema", label: "Sistema Externo", type: "text" },
          { key: "funcion", label: "Función en el Proyecto UNIGIS", type: "text" },
          { key: "tipo", label: "Tipo de Integración", type: "chip", options: ["REST API (Webservices)", "Ficheros FTP/CSV", "Database View (SQL)", "SOAP"] },
          { key: "estado", label: "Estado Conector", type: "chip", options: ["Estándar UNIGIS", "Desarrollo Necesario", "En Evaluación"] }
        ],
        rows: [
          { sistema: "SAP S/4HANA", funcion: "Importación de Pedidos y Exportación de Liquidación", tipo: "REST API (Webservices)", estado: "Estándar UNIGIS" },
          { sistema: "WMS Manhatten / RedPrairie", funcion: "Sincronización de Muelles y Cargas", tipo: "REST API (Webservices)", estado: "Estándar UNIGIS" },
          { sistema: "Telemetría GPS (Webfleet / Transics / Astrata)", funcion: "Posicionamiento en tiempo real de camiones", tipo: "REST API (Webservices)", estado: "Estándar UNIGIS" }
        ]
      }
    ]
  },
  {
    id: "sec-13",
    code: "13",
    title: "Datos Maestros",
    icon: "fa-database",
    desc: "Plan y estrategia de limpieza, migración y carga inicial de entidades (Clientes, Depósitos, Vehículos, Rutas).",
    tables: [
      {
        id: "t45",
        title: "Matriz de Carga Inicial de Datos Maestros (Tabla 45)",
        columns: [
          { key: "entidad", label: "Entidad UNIGIS", type: "readonly" },
          { key: "origen", label: "Origen Actual", type: "text" },
          { key: "registros", label: "Nº Registros Estimados", type: "text" },
          { key: "metodo", label: "Método de Carga", type: "chip", options: ["Plantilla Excel UNIGIS", "API Import", "Migración SQL Directa"] },
          { key: "calidad", label: "Calidad de Datos Estimada", type: "chip", options: ["Alta (Limpia)", "Media (Requiere revisión)", "Baja (Incompleta)"] }
        ],
        rows: [
          { entidad: "Clientes y Puntos de Entrega", origen: "ERP SAP", registros: "14,500", metodo: "API Import", calidad: "Media (Requiere revisión)" },
          { entidad: "Nodos y Depósitos Logísticos", origen: "Excel Manual", registros: "25", metodo: "Plantilla Excel UNIGIS", calidad: "Alta (Limpia)" },
          { entidad: "Catálogo de Vehículos y Flota", origen: "Gestor de Flota", registros: "150", metodo: "Plantilla Excel UNIGIS", calidad: "Alta (Limpia)" },
          { entidad: "Conductores y Dispositivos", origen: "RRHH", registros: "180", metodo: "Plantilla Excel UNIGIS", calidad: "Alta (Limpia)" }
        ]
      }
    ]
  },
  {
    id: "sec-14",
    code: "14",
    title: "Reporting, KPIs y Business Intelligence",
    icon: "fa-chart-bar",
    desc: "Cuadro de mando integral, KPIs operativos y financieros, informes diarios y conexión con PowerBI / Tableau.",
    tables: [
      {
        id: "t47",
        title: "KPIs Operativos y Financieros Principales (Tabla 47)",
        columns: [
          { key: "kpi", label: "KPI a Medir en UNIGIS", type: "text" },
          { key: "medicion", label: "¿Se mide actualmente?", type: "chip", options: ["Sí", "No", "Parcial"] },
          { key: "herramienta", label: "Herramienta Actual", type: "text" },
          { key: "objetivo", label: "Objetivo TO-BE con UNIGIS", type: "text" }
        ],
        rows: [
          { kpi: "% Entregas a Tiempo (OTD)", medicion: "Sí", herramienta: "Excel manual", objetivo: "> 96%" },
          { kpi: "Coste por Kilómetro y por Bulto", medicion: "No", herramienta: "-", objetivo: "Visibilidad 100% automatizada" },
          { kpi: "% Ocupación de Capacidad Vehículo", medicion: "Parcial", herramienta: "Estimación visual", objetivo: "> 85%" }
        ]
      }
    ]
  },
  {
    id: "sec-15",
    code: "15",
    title: "Cumplimiento Normativo y Requisitos Sectoriales",
    icon: "fa-balance-scale",
    desc: "Requisitos de seguridad, trazabilidad de temperatura (HACCP/IFS), tiempos de conducción (Tacógrafo CE 561) y e-Transporte.",
    tables: [
      {
        id: "t51",
        title: "Normativas y Requisitos Legales (Tabla 51)",
        columns: [
          { key: "normativa", label: "Normativa / Requisito Legal", type: "text" },
          { key: "aplica", label: "Aplica", type: "chip", options: ["Sí", "No"] },
          { key: "detalle", label: "Detalle / Impacto en Parametrización UNIGIS", type: "text" }
        ],
        rows: [
          { normativa: "Tiempos Conducción Tacógrafo (CE 561/2006)", aplica: "Sí", detalle: "Parámetros del optimizador deben respetar descansos reglamentarios" },
          { normativa: "Control de Cadena de Frío Alimentaria (IFS/BRC)", aplica: "Sí", detalle: "Registro continuo de termógrafo y trazabilidad lote/temperatura" },
          { normativa: "Factura Electrónica y Documento de Transporte", aplica: "Sí", detalle: "Generación de albarán digital con código QR / e-CMR" }
        ]
      }
    ]
  },
  {
    id: "sec-16",
    code: "16",
    title: "Decisiones de Diseño Específicas de UNIGIS",
    icon: "fa-drafting-compass",
    desc: "Decisiones clave de parametrización tomadas durante los workshops con su justificación técnica.",
    tables: [
      {
        id: "t52",
        title: "Matriz de Decisiones de Diseño de Solución (Tabla 52)",
        columns: [
          { key: "area", label: "Área", type: "text" },
          { key: "pregunta", label: "Pregunta de Diseño", type: "text" },
          { key: "opciones", label: "Opciones Evaluadas", type: "text" },
          { key: "decision", label: "Decisión Adoptada", type: "chip", options: ["Estándar UNIGIS", "Parametrización", "Desarrollo Específico"] },
          { key: "justificacion", label: "Justificación Técnica", type: "text" }
        ],
        rows: [
          { area: "Pedidos", pregunta: "¿Flujo de entrada automático o manual?", opciones: "API / EDI / Manual", decision: "Estándar UNIGIS", justificacion: "Invocación Webservices REST directa desde ERP" },
          { area: "Planificación", pregunta: "¿Rutas fijas o optimización dinámica?", opciones: "Rutas fijas / Dinámica / Mixto", decision: "Parametrización", justificacion: "Se usará modelo mixto con algoritmos de re-optimización" }
        ]
      }
    ]
  },
  {
    id: "sec-17",
    code: "17",
    title: "Gestión del Cambio, Usuarios y Formación",
    icon: "fa-users-cog",
    desc: "Perfiles de usuario en UNIGIS, madurez digital del equipo y plan de capacitación por roles.",
    tables: [
      {
        id: "t53",
        title: "Perfiles de Usuario y Licencias (Tabla 53)",
        columns: [
          { key: "perfil", label: "Perfil de Usuario", type: "readonly" },
          { key: "funcion", label: "Función en UNIGIS", type: "text" },
          { key: "usuarios", label: "Nº Usuarios / Licencias", type: "text" },
          { key: "madurez", label: "Nivel Digital", type: "chip", options: ["Alto", "Medio", "Bajo"] }
        ],
        rows: [
          { perfil: "Administrador UNIGIS", funcion: "Configuración, datos maestros y usuarios", usuarios: "2", madurez: "Alto" },
          { perfil: "Jefe de Tráfico / Planificador", funcion: "Planificación y optimización diaria", usuarios: "6", madurez: "Medio" },
          { perfil: "Operador de Torre de Control", funcion: "Seguimiento y gestión de incidencias", usuarios: "8", madurez: "Medio" },
          { perfil: "Conductores (App Mobility)", funcion: "Ejecución de ruta y POD digital", usuarios: "120", madurez: "Bajo" }
        ]
      }
    ]
  },
  {
    id: "sec-18",
    code: "18",
    title: "Matriz de Requisitos Funcionales",
    icon: "fa-list-check",
    desc: "Catálogo completo de requerimientos del cliente (RF-001..), módulo asignado, prioridad y cobertura estándar vs desarrollo.",
    tables: [
      {
        id: "t56",
        title: "Matriz Consolidada de Requisitos Funcionales RF (Tabla 56)",
        columns: [
          { key: "id", label: "ID Requisito", type: "text" },
          { key: "requisito", label: "Requisito Funcional", type: "text" },
          { key: "desc", label: "Descripción Detallada", type: "text" },
          { key: "modulo", label: "Módulo UNIGIS", type: "chip", options: ["Pedidos", "Planificación", "Mobility", "Tarifas", "Tracking", "Portales", "Integración"] },
          { key: "prioridad", label: "Prioridad", type: "chip", options: ["Alta", "Media", "Baja"] },
          { key: "cobertura", label: "Cobertura Estándar", type: "chip", options: ["Sí (Estándar)", "Parcial", "No (Desarrollo)"] },
          { key: "desarrollo", label: "Desarrollo Necesario", type: "text" }
        ],
        rows: [
          { id: "RF-001", requisito: "Integración automática de pedidos", desc: "Recepción en tiempo real de pedidos desde ERP SAP via API REST", modulo: "Pedidos", prioridad: "Alta", cobertura: "Sí (Estándar)", desarrollo: "Ninguno (Conector estándar)" },
          { id: "RF-002", requisito: "Optimizador de rutas multifrío", desc: "Planificación respetando compartimentos congelado/refrigerado", modulo: "Planificación", prioridad: "Alta", cobertura: "Sí (Estándar)", desarrollo: "Configuración de reglas" },
          { id: "RF-003", requisito: "App chofer con cobro en ruta", desc: "Registro de cobro en efectivo/cheque y cierre de albarán", modulo: "Mobility", prioridad: "Media", cobertura: "Parcial", desarrollo: "Flujo de cobro adaptado" },
          { id: "RF-004", requisito: "Notificaciones WhatsApp a clientes", desc: "Envío de enlace de seguimiento en tiempo real con ETA", modulo: "Tracking", prioridad: "Media", cobertura: "No (Desarrollo)", desarrollo: "Integración con API Twilio/WhatsApp" }
        ]
      }
    ]
  },
  {
    id: "sec-19",
    code: "19",
    title: "Gap Analysis (AS-IS vs TO-BE)",
    icon: "fa-compress-arrows-alt",
    desc: "Análisis de brechas entre el proceso actual y la solución UNIGIS proponiendo plan de resolución e impacto.",
    tables: [
      {
        id: "t57",
        title: "Matriz de Gap Analysis (Tabla 57)",
        columns: [
          { key: "area", label: "Área de Proceso", type: "text" },
          { key: "asis", label: "AS-IS (Situación Actual)", type: "text" },
          { key: "tobe", label: "TO-BE (Solución UNIGIS)", type: "text" },
          { key: "gap", label: "Gap Identificado", type: "text" },
          { key: "resolucion", label: "Resolución Propuesta", type: "text" },
          { key: "impacto", label: "Impacto", type: "chip", options: ["Alto", "Medio", "Bajo"] }
        ],
        rows: [
          { area: "Entrada de Pedidos", asis: "Hojas Excel enviadas por correo electrónico", tobe: "Ingesta vía Webservices REST en UNIGIS Orders", gap: "Los clientes no usan formato estandarizado", resolucion: "Desarrollo de validadores de entrada y portal web", impacto: "Alto" },
          { area: "App Conductores", asis: "Aplicación legacy en terminales antiguas", tobe: "UNIGIS Mobility en smartphones Android", gap: "Cambio de dispositivos y hábitos del chófer", resolucion: "Plan de formación y pilotaje en 5 rutas", impacto: "Alto" }
        ]
      }
    ]
  },
  {
    id: "sec-20",
    code: "20",
    title: "Checklist de Workshops de Descubrimiento",
    icon: "fa-tasks",
    desc: "Verificación de ítems revisados y aprobados durante las reuniones de trabajo con el cliente.",
    tables: [
      {
        id: "t59",
        title: "Checklist de Validación de Relevamiento (Tabla 59)",
        columns: [
          { key: "num", label: "#", type: "readonly" },
          { key: "item", label: "Ítem a Verificar", type: "text" },
          { key: "estado", label: "Estado", type: "chip", options: ["Verificado / OK", "En Revisión", "Pendiente Cliente"] },
          { key: "responsable", label: "Responsable Cliente", type: "text" },
          { key: "fecha", label: "Fecha Compromiso", type: "date" }
        ],
        rows: [
          { num: "1", item: "Validación de diccionario de campos de pedido con IT", estado: "Verificado / OK", responsable: "Jefe de Sistemas", fecha: "2026-08-15" },
          { num: "2", item: "Entrega de fichero de muestra de clientes con coordenadas Lat/Long", estado: "En Revisión", responsable: "Responsable Datos", fecha: "2026-08-18" },
          { num: "3", item: "Aprobación de catálogo de eventos de la App Conductor", estado: "Pendiente Cliente", responsable: "Jefe de Tráfico", fecha: "2026-08-20" }
        ]
      }
    ]
  },
  {
    id: "sec-21",
    code: "21",
    title: "Próximos Pasos y Plan de Proyecto Preliminar (WBS)",
    icon: "fa-project-diagram",
    desc: "Hitos principales, fases de implantación, cronograma (WBS) y dependencias críticas para el Go-Live.",
    questions: [
      { id: "p21_1", label: "Modalidad de Integración de Proyecto", type: "chip", options: ["Solo Excel WBS (Fast-Track / Estándar)", "Excel WBS + Documento DDS Completo"] },
      { id: "p21_2", label: "Requisito de DDS Formal", type: "chip", options: ["No Obligatorio (Solo WBS Excel)", "Obligatorio (Relevamiento Completo)"] }
    ],
    tables: [
      {
        id: "t65",
        title: "Hitos Principales de la Implantación UNIGIS / WBS (Tabla 65)",
        columns: [
          { key: "fase", label: "Fase de Proyecto", type: "readonly" },
          { key: "desc", label: "Descripción", type: "text" },
          { key: "entregables", label: "Entregables Clave", type: "text" },
          { key: "duracion", label: "Duración Estimada", type: "text" },
          { key: "resp", label: "Responsable", type: "text" }
        ],
        rows: [
          { fase: "1. Descubrimiento & Alineación WBS", desc: "Workshops de relevamiento inicial e integración de la WBS (Excel de Proyecto)", entregables: "Excel WBS de Proyecto (DDS Opcional)", duracion: "1-3 Semanas", resp: "Consultor UNIGIS" },
          { fase: "2. Parametrización & Reglas", desc: "Configuración del TMS, optimizador, tarifas y app chofer", entregables: "Entorno UNIGIS Configurado", duracion: "4 Semanas", resp: "Equipo Técnico UNIGIS" },
          { fase: "3. Desarrollo de Integraciones", desc: "Construcción de conectores API REST con SAP y GPS", entregables: "APIs Probadamente Funcionales", duracion: "4 Semanas", resp: "Equipo IT UNIGIS / Cliente" },
          { fase: "4. Pruebas & Formación", desc: "Pruebas UAT integradas y capacitación por roles", entregables: "Acta de Aceptación UAT", duracion: "2 Semanas", resp: "Consultor & Cliente" },
          { fase: "5. Go-Live & Soporte", desc: "Puesta en marcha asistida y monitoreo en operación real", entregables: "Sistema en Producción Real", duracion: "2 Semanas", resp: "Equipo Mixto UNIGIS/Cliente" }
        ]
      }
    ]
  },
  {
    id: "sec-22",
    code: "22",
    title: "Lecciones Aprendidas de Proyectos Anteriores",
    icon: "fa-lightbulb",
    desc: "Recomendaciones y mejores prácticas recopiladas en proyectos similares (Europastry, Transpais).",
    tables: [
      {
        id: "t67",
        title: "Matriz de Lecciones Aprendidas y Buenas Prácticas (Tabla 67)",
        columns: [
          { key: "area", label: "Área de Proyecto", type: "text" },
          { key: "leccion", label: "Lección Aprendida en Proyectos UNIGIS", type: "text" },
          { key: "recomendacion", label: "Recomendación para este Proyecto", type: "text" }
        ],
        rows: [
          { area: "Geocodificación", leccion: "La mala calidad de direcciones de clientes retrasa la optimización en la primera semana de Go-Live", recomendacion: "Ejecutar limpieza de datos de direcciones 1 mes antes del arranque" },
          { area: "Integración GPS", leccion: "Algunos proveedores GPS externos tardan semanas en entregar claves API", recomendacion: "Solicitar acceso a las APIs de telemetría desde el día 1 del proyecto" },
          { area: "App Conductores", leccion: "La falta de soporte en ruta las primeras 48h genera incidencias con choferes", recomendacion: "Disponer de un consultor presencial en las plataformas durante los primeros arranques" }
        ]
      }
    ]
  }
];

// Industry Templates for 1-Click Smart Pre-fills
const INDUSTRY_TEMPLATES = {
  europastry: {
    name: "Última Milla & Temperatura Controlada (Ej. Europastry)",
    desc: "Optimizado para alimentación congelada/fresca, alta densidad capilar, ventanas horarias estrictas y cobro en ruta.",
    sector: "Alimentación / Congelado",
    scope: {
      "Gestión de Pedidos (Orders)": "Sí",
      "Planificación y Optimización de Rutas": "Sí",
      "Aplicación de Conductores (Mobility)": "Sí",
      "Tracking & Tracing / Torre de Control": "Sí"
    }
  },
  transpais: {
    name: "Transporte LTL / FTL Internacional e Intermodal (Ej. Transpais)",
    desc: "Diseñado para operadores logísticos con rutas largas, aduanas, subcontratación de agencias y liquidación compleja.",
    sector: "Operador Logístico 3PL/4PL",
    scope: {
      "Carrier Management y Portal de Transportistas": "Sí",
      "Gestión de Tarifas y Liquidación (Settlement)": "Sí",
      "Gestión de Expediciones y Manifiestos": "Sí"
    }
  },
  standard: {
    name: "Distribución Industrial Estándar",
    desc: "Configuración equilibrada para distribución de producto seco, flota propia y subcontratada.",
    sector: "Retail / Distribución",
    scope: {}
  }
};
