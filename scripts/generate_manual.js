const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Output file
const OUTPUT_PATH = path.join(__dirname, '../UniTask_Manual_Usuario.pdf');

// Create document
const doc = new PDFDocument({ margin: 50 });

// Pipe to file
const stream = fs.createWriteStream(OUTPUT_PATH);
doc.pipe(stream);

// Styles
const COLORS = {
    primary: '#D32F2F',
    secondary: '#333333',
    text: '#555555'
};

function addHeader(title) {
    doc.addPage();
    doc.fontSize(20).fillColor(COLORS.primary).text(title, { align: 'center' });
    doc.moveDown(1);
}

function addSection(title, content) {
    doc.fontSize(16).fillColor(COLORS.secondary).text(title);
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(COLORS.text).text(content, { align: 'justify', lineGap: 4 });
    doc.moveDown(1.5);
}

// --- CONTENT ---

// 1. COVER PAGE
doc.fontSize(30).fillColor(COLORS.primary).text('UniTask Controller', { align: 'center' });
doc.fontSize(16).fillColor(COLORS.secondary).text('Manual de Usuario', { align: 'center' });
doc.moveDown(4);
doc.fontSize(12).text(`Generado el: ${new Date().toLocaleDateString()}`, { align: 'center' });

// 2. INTRODUCTION
doc.addPage();
doc.fontSize(20).fillColor(COLORS.primary).text('1. Introducción', { align: 'left' });
doc.moveDown();
doc.fontSize(12).fillColor(COLORS.text).text(
    'UniTask Controller es una plataforma integral para la gestión de proyectos, tareas y seguimiento diario de consultores. ' +
    'Diseñada para optimizar el flujo de trabajo, permite registrar bitácoras diarias, gestionar tareas con plazos críticos y administrar múltiples proyectos y inquilinos (Tenants) de forma centralizada.'
);
doc.moveDown();

// 3. DAILY FOLLOW UP
addSection('3. Seguimiento Diario (Daily Follow-Up)',
    'El núcleo de la aplicación. Esta pantalla permite registrar el trabajo del día a día.\n\n' +
    '- Bitácora Diaria: Notas organizadas por bloques para cada proyecto activo.\n' +
    '- Selección de Fecha: Navega al pasado para revisar o completar días anteriores.\n' +
    '- Integración AI: Analiza tus notas para extraer tareas automáticamente o generar resúmenes ejecutivos.\n' +
    '- Escaneo PDF: Sube documentos PDF para que la IA extraiga puntos clave y los añada a tus notas.'
);

addSection('4. Gestión de Tareas',
    'Organiza tu trabajo pendiente y colabora con el equipo.\n\n' +
    '- Dashboard: Vista general del estado de tus tareas, vencimientos y métricas.\n' +
    '- Kanban / Lista: Visualiza tareas por estado (Pendiente, En Progreso, Completado).\n' +
    '- Bloqueantes: Marca tareas críticas que impiden el avance.\n' +
    '- Plazos: Asigna fechas límite y recibe notificaciones antes del vencimiento.'
);

addSection('5. Proyectos y Clientes',
    'Administra la cartera de proyectos activos.\n\n' +
    '- Listado de Proyectos: Vista centralizada de todos los proyectos asignados.\n' +
    '- Estado de Salud: Indicadores visuales (Semáforo) del estado del proyecto.\n' +
    '- Próximos Pasos: Define acciones claras para mantener el proyecto en movimiento.\n' +
    '- Mover Entradas: Traslada notas o tareas incompletas al día siguiente automáticamente.'
);

addSection('6. Administración y Seguridad',
    'Herramientas para administradores y Project Managers.\n\n' +
    '- Gestión de Usuarios: Invita miembros, asigna roles y visualiza su actividad.\n' +
    '- Roles y Permisos: Define quién puede ver o editar qué (Superadmin, PM, Consultor, etc.).\n' +
    '- Multi-Tenant: Aislamiento total de datos entre diferentes organizaciones o clientes.\n' +
    '- Auditoría: Registro de cambios críticos y accesos.'
);

addSection('7. Atajos y Utilidades',
    '- Menú de Comandos (Alt+K): Navegación rápida entre módulos.\n' +
    '- Temas: Cambia entre modo Claro, Oscuro o el tema corporativo Rojo.\n' +
    '- Notificaciones: Alertas en tiempo real sobre tareas y vencimientos.'
);

// End Document
doc.end();

stream.on('finish', () => {
    console.log(`✅ PDF Created successfully at: ${OUTPUT_PATH}`);
});
