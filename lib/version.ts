export const APP_VERSION = '12.3.0';

export interface ChangeLogItem {
    version: string;
    date: string;
    title: string;
    features: string[];
}

export const CHANGELOG: ChangeLogItem[] = [
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
    { label: "Manual de Usuario", url: "#" },
    { label: "API Reference", url: "#" },
    { label: "Soporte", url: "#" }
];
