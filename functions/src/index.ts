import * as admin from 'firebase-admin';

// Inicializar app si no se ha hecho (aunque processUserClaims lo hace, es buena práctica hacerlo aquí también)
if (admin.apps.length === 0) {
    admin.initializeApp();
}

export * from './processUserClaims';
export * from './syncUserClaims';
export * from './backfill'; // Temporary Migration Tool
// Exportar otras funciones si es necesario
// export * from './tenantPurge';
