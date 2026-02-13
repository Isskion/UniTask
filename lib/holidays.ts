// Madrid Public Holidays Configuration
// Format: YYYY-MM-DD

export const MADRID_HOLIDAYS = [
    // --- 2025 ---
    "2025-01-01", // Año Nuevo
    "2025-01-06", // Epifanía del Señor
    "2025-04-17", // Jueves Santo
    "2025-04-18", // Viernes Santo
    "2025-05-01", // Fiesta del Trabajo
    "2025-05-02", // Fiesta de la Comunidad de Madrid
    "2025-05-15", // San Isidro
    "2025-07-25", // Santiago Apóstol
    "2025-08-15", // Asunción de la Virgen
    "2025-11-01", // Todos los Santos
    "2025-11-09", // La Almudena (Local Madrid Capital - usually included)
    "2025-12-06", // Día de la Constitución Española
    "2025-12-08", // Inmaculada Concepción
    "2025-12-25", // Natividad del Señor

    // --- 2026 ---
    "2026-01-01", // Año Nuevo
    "2026-01-06", // Epifanía del Señor
    "2026-04-02", // Jueves Santo (Estimated)
    "2026-04-03", // Viernes Santo (Estimated)
    "2026-05-01", // Fiesta del Trabajo
    "2026-05-02", // Fiesta de la Comunidad de Madrid
    "2026-05-15", // San Isidro
    "2026-08-15", // Asunción de la Virgen
    "2026-10-12", // Fiesta Nacional de España
    "2026-11-02", // Traslado de Todos los Santos
    "2026-11-09", // La Almudena
    "2026-12-07", // Traslado del Día de la Constitución
    "2026-12-08", // Inmaculada Concepción
    "2026-12-25", // Natividad del Señor
];

export const isMadridHoliday = (date: Date): boolean => {
    const dateString = date.toISOString().split('T')[0];
    return MADRID_HOLIDAYS.includes(dateString);
};
