const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function archiveAllTasks() {
    console.log('Iniciando proceso de archivado de todas las tareas...');
    
    // Obtener todas las tareas de la colección 'tasks'
    const snapshot = await db.collection('tasks').get();
    
    if (snapshot.empty) {
        console.log('No se encontraron tareas para archivar.');
        return;
    }
    
    console.log(`Se encontraron ${snapshot.size} tareas en total. Archivando...`);
    
    let batch = db.batch();
    let count = 0;
    let batchCount = 0;
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Solo actualizar si no está archivada ya o no tiene isActive = false
        if (data.isActive !== false) {
            batch.update(doc.ref, {
                isActive: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            count++;
            
            // Firestore tiene un límite de 500 operaciones por lote (batch)
            if (count % 500 === 0) {
                await batch.commit();
                batchCount++;
                console.log(`Lote ${batchCount} completado. (${count} tareas procesadas)`);
                batch = db.batch(); // Iniciar nuevo lote
            }
        }
    }
    
    // Comprometer cualquier operación restante en el último lote
    if (count % 500 !== 0) {
        await batch.commit();
        batchCount++;
        console.log(`Último lote ${batchCount} completado. (${count} tareas procesadas en total)`);
    } else {
        console.log(`Proceso terminado. Se actualizaron ${count} tareas.`);
    }
    
    console.log('Archivado masivo completado con éxito.');
}

archiveAllTasks().catch(error => {
    console.error('Error durante el archivado masivo:', error);
    process.exit(1);
});
