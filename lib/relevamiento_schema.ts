export interface Question {
  id: string;
  text: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'boolean' | 'number';
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  tabs: Tab[];
}

export interface Tab {
  id: string;
  title: string;
  questions: Question[];
}

export const RELEVAMIENTO_SECTIONS: Section[] = [
  {
    id: 'general',
    title: '1. Información General',
    icon: 'Users',
    tabs: [
      {
        id: 'stakeholders',
        title: 'Interesados',
        questions: [
          { id: 'company_name', text: 'Nombre de la Empresa', type: 'text' },
          { id: 'meeting_date', text: 'Fecha de Reunión', type: 'text', placeholder: 'DD/MM/YYYY' },
          { id: 'client_web', text: 'Web del Cliente', type: 'text' },
          { id: 'sponsor', text: 'Project Sponsor', type: 'text' },
          { id: 'pm_client', text: 'Project Manager (Cliente)', type: 'text' },
          { id: 'functional_lead', text: 'Líder Funcional (Cliente)', type: 'text' },
          { id: 'pm_unigis', text: 'Líder del Proyecto (Unitask)', type: 'text' },
          { id: 'tech_lead_unigis', text: 'Líder Técnico (Unitask)', type: 'text' },
        ]
      },
      {
        id: 'context',
        title: 'Contexto Empresa',
        questions: [
          { 
            id: 'activity', 
            text: 'Actividad Principal', 
            type: 'select', 
            options: ['Operador Logístico', 'Retail / Consumo Masivo', 'Manufactura', 'Distribución / Mayorista', 'E-commerce', 'Otro'] 
          },
          { id: 'other_contacts', text: 'Otros Contactos Stakeholders', type: 'textarea' },
          { id: 'additional_info', text: 'Información Adicional / Notas', type: 'textarea' },
        ]
      }
    ]
  },
  {
    id: 'objectives',
    title: '2. Descripción Operación',
    icon: 'Target',
    tabs: [
      {
        id: 'goals',
        title: 'Objetivos del Cliente',
        questions: [
          { id: 'goal_tracking', text: 'Controlar distribución en tiempo real (GPS + Smart Tracking)', type: 'boolean' },
          { id: 'goal_mobile', text: 'Confirmar estado de entregas (Mobile Work Force)', type: 'boolean' },
          { id: 'goal_customer_service', text: 'Apoyar atención al cliente con información logística', type: 'boolean' },
          { id: 'goal_efficiency', text: 'Mayor eficiencia en distribución de última milla', type: 'boolean' },
          { id: 'goal_service_level', text: 'Mejorar nivel de servicio y cumplimiento', type: 'boolean' },
          { id: 'goal_growth', text: 'Mejor soporte operativo para crecimiento', type: 'boolean' },
        ]
      },
      {
        id: 'current_op',
        title: 'Operación Actual',
        questions: [
          { id: 'detailed_description', text: 'Descripción detallada de la operación actual', type: 'textarea' },
        ]
      }
    ]
  },
  {
    id: 'operational',
    title: '3. Parámetros Operativos',
    icon: 'Truck',
    tabs: [
      {
        id: 'infrastructure',
        title: 'Infraestructura',
        questions: [
          { id: 'cd_count', text: 'Cantidad de Centros de Distribución', type: 'number' },
          { id: 'daily_deliveries', text: 'Cantidad de Entregas Diarias', type: 'number' },
          { id: 'vehicle_count', text: 'Cantidad de Vehículos', type: 'number' },
          { id: 'vehicle_types', text: 'Tipos de Vehículos', type: 'text' },
          { id: 'daily_trips', text: 'Cantidad de Viajes Diarios', type: 'number' },
          { id: 'route_types', text: 'Tipo de Rutas (T1/T2/T3)', type: 'text' },
          { id: 'current_systems', text: 'Sistemas Actuales (ERP/WMS)', type: 'text' },
          { id: 'cd_locations', text: 'Ubicación de los CDs', type: 'textarea' },
          { id: 'op_types', text: 'Tipo de Operaciones', type: 'text' },
        ]
      }
    ]
  },
  {
    id: 'planning',
    title: '4. Smart Planning',
    icon: 'Settings',
    tabs: [
      {
        id: 'logic_left',
        title: 'Planificación A',
        questions: [
          { id: 'vehicle_assoc_cd', text: 'Asociación de Vehículos por CD', type: 'boolean' },
          { id: 'docks_available', text: 'Docks o Muelles disponibles', type: 'number' },
          { id: 'routing_processes', text: 'Procesos de Ruteo diarios (mañana/tarde)', type: 'number' },
          { id: 'exclusive_load', text: 'Clientes con Carga Exclusiva', type: 'boolean' },
          { id: 'optimization_criteria', text: 'Optimización por (V/V/P/D/T/Pallet)', type: 'text' },
          { id: 'time_windows', text: 'Ventanas Horarias del Cliente (doble)', type: 'boolean' },
          { id: 'avg_wait_time', text: 'Tiempo de Espera Promedio', type: 'number' },
          { id: 'restriction_client_veh', text: 'Restricción Cliente/Vehículo', type: 'boolean' },
        ]
      },
      {
        id: 'logic_right',
        title: 'Planificación B',
        questions: [
          { id: 'delivery_assoc_cd', text: 'Asociación de Entregas al CD', type: 'boolean' },
          { id: 'second_trips', text: '¿Vehículos realizan 2das. Vueltas?', type: 'boolean' },
          { id: 'fixed_clients', text: '¿Clientes fijos o varían cada día?', type: 'select', options: ['Fijos', 'Variables', 'Mixtos'] },
          { id: 'client_master', text: '¿Maestro de Clientes disponible?', type: 'boolean' },
          { id: 'measurement_unit', text: 'Unidad de Medida (m3, kg, bultos, etc)', type: 'text' },
          { id: 'auto_partition', text: '¿Partición Automática si Saturó?', type: 'boolean' },
          { id: 'client_priority', text: 'Prioridad en Cliente', type: 'boolean' },
          { id: 'custom_manifest', text: 'Customización Hoja de Ruta (Modelo)', type: 'boolean' },
        ]
      }
    ]
  },
  {
    id: 'tracking',
    title: '5. Smart Tracking',
    icon: 'ClipboardCheck',
    tabs: [
      {
        id: 'tracking_left',
        title: 'Seguimiento A',
        questions: [
          { id: 'trip_types', text: 'Tipo de Viajes (Man/Auto/Ambos)', type: 'select', options: ['Manuales', 'Automáticos de Rutas', 'Ambos'] },
          { id: 'driver_master', text: 'Maestro de Conductores', type: 'boolean' },
          { id: 'vehicle_master', text: 'Maestro de Vehículos', type: 'boolean' },
          { id: 'alarm_master', text: 'Maestro de Alarmas y Criticidad', type: 'boolean' },
          { id: 'provider_count', text: 'Cantidad de Prestadores AVL', type: 'number' },
          { id: 'auto_activation', text: '¿Activación/Finalización Automática?', type: 'boolean' },
          { id: 'danger_zones', text: 'Zonas de Peligro o Permanencia', type: 'boolean' },
        ]
      },
      {
        id: 'tracking_right',
        title: 'Seguimiento B',
        questions: [
          { id: 'delivery_statuses', text: 'Estados en las Entregas', type: 'textarea' },
          { id: 'auto_status_change', text: '¿Cambio Automático de Estado en Paradas?', type: 'boolean' },
          { id: 'trajectories', text: 'Recorridos (Zonas + Trayectos)', type: 'boolean' },
          { id: 'tracking_flow', text: 'Flujo de Seguimiento', type: 'textarea' },
          { id: 'indicators', text: 'Indicadores a Definir', type: 'textarea' },
          { id: 'avl_provider_name', text: 'Prestador AVL Principal', type: 'text' },
        ]
      }
    ]
  },
  {
    id: 'mobile',
    title: '6. Mobile Workforce',
    icon: 'Smartphone',
    tabs: [
      {
        id: 'mobile_features',
        title: 'Funcionalidades APP',
        questions: [
          { id: 'mobile_status_tracking', text: '¿Cambio de Estados según Tracking?', type: 'boolean' },
          { id: 'mobile_signature', text: '¿Requiere Firma?', type: 'boolean' },
          { id: 'mobile_photo', text: '¿Requiere Foto?', type: 'boolean' },
          { id: 'mobile_platform', text: 'Plataforma', type: 'select', options: ['Android', 'WAP', 'Ambos'] },
          { id: 'mobile_device_count', text: 'Cantidad de Dispositivos', type: 'number' },
          { id: 'mobile_survey', text: '¿Requiere Encuesta?', type: 'boolean' },
          { id: 'mobile_scan', text: '¿Requiere Scaneo?', type: 'boolean' },
          { id: 'mobile_incidents', text: '¿Carga de Incidencia?', type: 'boolean' },
          { id: 'mobile_gps_events', text: '¿Envía Eventos de Posición (GPS)?', type: 'boolean' },
        ]
      }
    ]
  },
  {
    id: 'billing',
    title: '7. Tarifas y Liquidación',
    icon: 'BarChart3',
    tabs: [
      {
        id: 'billing_logic',
        title: 'Liquidación',
        questions: [
          { id: 'billing_user_count', text: 'Cantidad de Usuarios', type: 'number' },
          { id: 'billing_table_count', text: 'Cuadros Tarifarios (cantidad/tipos)', type: 'text' },
          { id: 'billing_validity', text: 'Vigencia de Cuadros (meses/años)', type: 'text' },
          { id: 'billing_doc_control', text: 'Control Documental', type: 'boolean' },
          { id: 'billing_fleet_settlement', text: '¿Liquidación a Flota Tercerizada?', type: 'boolean' },
          { id: 'billing_client_invoice', text: '¿Facturación al Cliente (Dador de Carga)?', type: 'boolean' },
          { id: 'billing_order_admin', text: '¿Administración de Pedidos?', type: 'boolean' },
        ]
      }
    ]
  },
  {
    id: 'dashboard',
    title: '8. Dashboard y Reportes',
    icon: 'BarChart3',
    tabs: [
      {
        id: 'reports_config',
        title: 'Reportes',
        questions: [
          { id: 'std_reports_count', text: 'Cantidad de Reportes Estándar (máx 10)', type: 'number' },
          { id: 'custom_reports_count', text: 'Cantidad de Reportes Custom (máx 2)', type: 'number' },
          { id: 'specific_reports', text: 'Definir Reportes Específicos', type: 'textarea' },
        ]
      }
    ]
  },
  {
    id: 'technical',
    title: '9. Infraestructura Técnica',
    icon: 'HardDrive',
    tabs: [
      {
        id: 'infra_config',
        title: 'Infraestructura HW/SW',
        questions: [
          { id: 'infra_type', text: 'Tipo de Despliegue', type: 'select', options: ['On Premise', 'Cloud'] },
          { id: 'db_type', text: 'Base de Datos', type: 'select', options: ['SQLServer', 'Otra BD'] },
          { id: 'sql_ok', text: '¿Pueden Operar con BBDD SQLServer?', type: 'boolean' },
          { id: 'adapter_required', text: '¿Requiere Desarrollo de Adapter o Syncout?', type: 'boolean' },
          { id: 'ws_integration', text: '¿Integración por WS o Desarrollo de Interfaces?', type: 'boolean' },
          { id: 'hw_capacity', text: '¿Capacidad de HW Disponible?', type: 'boolean' },
        ]
      }
    ]
  },
  {
    id: 'licensing',
    title: '10. Producto Adquirido',
    icon: 'ShieldCheck',
    tabs: [
      {
        id: 'licenses',
        title: 'Licencias',
        questions: [
          { id: 'lic_planning', text: 'Smart Planning (Q Licencias)', type: 'number' },
          { id: 'lic_tracking', text: 'Smart Tracking (Q Vehículos)', type: 'number' },
          { id: 'lic_fleet', text: 'Fleet (Q Usuarios)', type: 'number' },
          { id: 'lic_mobile', text: 'Mobile (Q Equipos)', type: 'number' },
        ]
      }
    ]
  },
  {
    id: 'timeline',
    title: '11. Escenario Implementación',
    icon: 'Clock',
    tabs: [
      {
        id: 'roadmap',
        title: 'Hitos y Timeline',
        questions: [
          { id: 'impl_phases', text: 'Fases propuestas', type: 'textarea' },
          { id: 'impl_timeline', text: 'Timeline Estimado', type: 'textarea' },
          { id: 'impl_milestones', text: 'Hitos principales', type: 'textarea' },
        ]
      }
    ]
  }
];
