'use client';
import React from 'react';
import { FlowNode, FlowEdge } from '@/app/uniflux/core/types';

export interface C4Template {
    id: string;
    label: string;
    icon: string;
    description: string;
    c4Level: 1 | 2 | 3;
    nodes: Omit<FlowNode, 'id'>[];
    edges: Omit<FlowEdge, 'id'>[];
}

export const C4_TEMPLATES: C4Template[] = [
    {
        id: 'web-app-l1',
        label: 'Web App',
        icon: '🌐',
        description: 'SPA + API + DB + usuario',
        c4Level: 1,
        nodes: [
            { type: 'C4_PERSON',         label: 'Usuario Web',        position: { x: 50, y: 200 }, external: false, description: 'Usuario que accede via navegador' },
            { type: 'C4_SYSTEM',         label: 'Aplicación Web',     position: { x: 350, y: 200 }, technology: 'Next.js, Node.js', description: 'Sistema principal de la plataforma' },
            { type: 'C4_SYSTEM_EXT',     label: 'Sistema de Email',   position: { x: 650, y: 100 }, external: true, technology: 'SendGrid', description: 'Envío de notificaciones por email' },
            { type: 'C4_SYSTEM_EXT',     label: 'Pasarela de Pagos',  position: { x: 650, y: 300 }, external: true, technology: 'Stripe', description: 'Procesamiento de pagos' },
        ],
        edges: [
            { source: '1', target: '2', label: 'Usa', c4RelType: 'sync', protocol: 'HTTPS' },
            { source: '2', target: '3', label: 'Envía emails', c4RelType: 'async', protocol: 'API REST' },
            { source: '2', target: '4', label: 'Cobra', c4RelType: 'sync', protocol: 'HTTPS/JSON' },
        ],
    },
    {
        id: 'web-app-l2',
        label: 'Web App L2',
        icon: '📦',
        description: 'Containers: SPA, API, DB, Cache',
        c4Level: 2,
        nodes: [
            { type: 'C4_PERSON',          label: 'Usuario',         position: { x: 30,  y: 250 }, description: 'Usuario final' },
            { type: 'C4_CONTAINER_WEB',   label: 'SPA Frontend',    position: { x: 280, y: 150 }, technology: 'React / Next.js', description: 'Interfaz de usuario' },
            { type: 'C4_CONTAINER_API',   label: 'API Backend',     position: { x: 280, y: 350 }, technology: 'Node.js / Express', description: 'Lógica de negocio y API REST' },
            { type: 'C4_CONTAINER_DB',    label: 'Base de Datos',   position: { x: 550, y: 300 }, technology: 'PostgreSQL 16', description: 'Persistencia principal' },
            { type: 'C4_CONTAINER_QUEUE', label: 'Cola de Eventos', position: { x: 550, y: 150 }, technology: 'Redis / BullMQ', description: 'Jobs asíncronos y notificaciones' },
            { type: 'C4_SYSTEM_EXT',      label: 'Email Service',   position: { x: 820, y: 150 }, external: true, technology: 'SendGrid', description: 'Entrega de emails' },
        ],
        edges: [
            { source: '1', target: '2', label: 'HTTPS', c4RelType: 'sync', protocol: 'HTTPS/JSON' },
            { source: '2', target: '3', label: 'API calls', c4RelType: 'sync', protocol: 'HTTPS/JSON' },
            { source: '3', target: '4', label: 'Queries', c4RelType: 'database', protocol: 'SQL/TCP' },
            { source: '3', target: '5', label: 'Encola', c4RelType: 'async', protocol: 'Redis protocol' },
            { source: '5', target: '6', label: 'Envía', c4RelType: 'async', protocol: 'SMTP/API' },
        ],
    },
    {
        id: 'microservices-l2',
        label: 'Microservicios',
        icon: '⚙️',
        description: 'API Gateway + servicios + bus',
        c4Level: 2,
        nodes: [
            { type: 'C4_PERSON',          label: 'Cliente',         position: { x: 30,  y: 300 }, description: 'App móvil o SPA' },
            { type: 'C4_CONTAINER_API',   label: 'API Gateway',     position: { x: 250, y: 300 }, technology: 'Kong / Nginx', description: 'Enrutamiento y autenticación centralizada' },
            { type: 'C4_CONTAINER_API',   label: 'Servicio Pedidos',position: { x: 500, y: 150 }, technology: 'Node.js', description: 'Gestión del ciclo de vida de pedidos' },
            { type: 'C4_CONTAINER_API',   label: 'Servicio Usuarios',position:{ x: 500, y: 300 }, technology: 'Python / FastAPI', description: 'Autenticación y perfiles' },
            { type: 'C4_CONTAINER_API',   label: 'Servicio Pagos',  position: { x: 500, y: 450 }, technology: 'Java / Spring Boot', description: 'Procesamiento de transacciones' },
            { type: 'C4_CONTAINER_QUEUE', label: 'Event Bus',       position: { x: 750, y: 300 }, technology: 'Kafka', description: 'Comunicación asíncrona entre servicios' },
            { type: 'C4_CONTAINER_DB',    label: 'DB Pedidos',      position: { x: 750, y: 150 }, technology: 'PostgreSQL', description: 'Datos de pedidos' },
        ],
        edges: [
            { source: '1', target: '2', label: 'HTTPS', c4RelType: 'sync', protocol: 'HTTPS/REST' },
            { source: '2', target: '3', c4RelType: 'sync', protocol: 'gRPC' },
            { source: '2', target: '4', c4RelType: 'sync', protocol: 'gRPC' },
            { source: '2', target: '5', c4RelType: 'sync', protocol: 'gRPC' },
            { source: '3', target: '6', label: 'pedido.creado', c4RelType: 'event', protocol: 'Kafka topic' },
            { source: '5', target: '6', label: 'pago.procesado', c4RelType: 'event', protocol: 'Kafka topic' },
            { source: '3', target: '7', c4RelType: 'database', protocol: 'SQL' },
        ],
    },
    {
        id: 'event-driven-l2',
        label: 'Event-Driven',
        icon: '⚡',
        description: 'Productores → Bus → Consumidores',
        c4Level: 2,
        nodes: [
            { type: 'C4_CONTAINER_API',   label: 'Productor A',  position: { x: 50,  y: 150 }, technology: 'Node.js', description: 'Publica eventos de dominio' },
            { type: 'C4_CONTAINER_API',   label: 'Productor B',  position: { x: 50,  y: 350 }, technology: 'Python', description: 'Publica eventos de usuario' },
            { type: 'C4_CONTAINER_QUEUE', label: 'Event Bus',    position: { x: 350, y: 250 }, technology: 'Kafka / Pub-Sub', description: 'Bus de eventos central' },
            { type: 'C4_CONTAINER_API',   label: 'Consumidor X', position: { x: 650, y: 150 }, technology: 'Go', description: 'Procesa y transforma eventos' },
            { type: 'C4_CONTAINER_API',   label: 'Consumidor Y', position: { x: 650, y: 350 }, technology: 'Node.js', description: 'Envía notificaciones reactivas' },
            { type: 'C4_CONTAINER_DB',    label: 'Event Store',  position: { x: 350, y: 450 }, technology: 'Firestore', description: 'Persistencia de eventos para replay' },
        ],
        edges: [
            { source: '1', target: '3', label: 'publica', c4RelType: 'event', protocol: 'topic: dominio.eventos' },
            { source: '2', target: '3', label: 'publica', c4RelType: 'event', protocol: 'topic: usuario.eventos' },
            { source: '3', target: '4', label: 'consume', c4RelType: 'event', protocol: 'consumer group' },
            { source: '3', target: '5', label: 'consume', c4RelType: 'event', protocol: 'consumer group' },
            { source: '3', target: '6', label: 'persiste', c4RelType: 'database', protocol: 'Firestore SDK' },
        ],
    },
    {
        id: 'monolith-l2',
        label: 'Monolito',
        icon: '🧱',
        description: 'Frontend + Monolito + DB + Cache',
        c4Level: 2,
        nodes: [
            { type: 'C4_PERSON',          label: 'Usuario',       position: { x: 30,  y: 250 }, description: 'Usuario final' },
            { type: 'C4_CONTAINER_WEB',   label: 'Frontend',      position: { x: 250, y: 150 }, technology: 'React', description: 'Interfaz de usuario SSR/CSR' },
            { type: 'C4_CONTAINER_API',   label: 'Monolito',      position: { x: 250, y: 350 }, technology: 'Rails / Django', description: 'Toda la lógica de negocio en un proceso' },
            { type: 'C4_CONTAINER_DB',    label: 'Base de Datos', position: { x: 520, y: 300 }, technology: 'PostgreSQL', description: 'Persistencia transaccional' },
            { type: 'C4_CONTAINER_DB',    label: 'Cache',         position: { x: 520, y: 150 }, technology: 'Redis', description: 'Cache de sesión y datos calientes' },
        ],
        edges: [
            { source: '1', target: '2', label: 'HTTPS', c4RelType: 'sync', protocol: 'HTTPS' },
            { source: '2', target: '3', label: 'API calls', c4RelType: 'sync', protocol: 'HTTPS/JSON' },
            { source: '3', target: '4', label: 'Queries', c4RelType: 'database', protocol: 'SQL' },
            { source: '3', target: '5', label: 'Cache', c4RelType: 'sync', protocol: 'Redis protocol' },
        ],
    },
];

interface UnifluxC4TemplatesProps {
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onClose: () => void;
}

export default function UnifluxC4Templates({ onApply, onClose }: UnifluxC4TemplatesProps) {
    const applyTemplate = (template: C4Template) => {
        // Assign sequential IDs
        const nodes: FlowNode[] = template.nodes.map((n, i) => ({
            ...n,
            id: String(i + 1),
        }));
        const edges: FlowEdge[] = template.edges.map((e, i) => ({
            ...e,
            id: `e${i + 1}`,
        }));
        onApply(nodes, edges);
        onClose();
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">Plantillas C4</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Selecciona una plantilla para partir con una estructura base</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                        ✕
                    </button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
                    {C4_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => applyTemplate(template)}
                            className="text-left p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all group bg-white"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{template.icon}</span>
                                <div>
                                    <div className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">{template.label}</div>
                                    <span style={{ fontSize: 9, background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                        L{template.c4Level}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">{template.description}</p>
                            <div className="mt-2 text-[10px] text-gray-400">
                                {template.nodes.length} nodos · {template.edges.length} relaciones
                            </div>
                        </button>
                    ))}
                </div>

                <div className="px-6 py-3 border-t bg-gray-50 text-xs text-gray-400">
                    Las plantillas se pueden personalizar una vez aplicadas. Los cambios de la IA también partirán desde aquí.
                </div>
            </div>
        </div>
    );
}
