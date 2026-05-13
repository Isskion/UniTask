const fs = require('fs');
const path = require('path');

// Uso: node scripts/format-backup-for-git.js [ruta-al-backup.json]
// Si no se pasa ruta, coge el latest_backup.json

async function formatBackupForGit() {
    console.log("🚀 Iniciando formateo de backup para Git...");
    
    let sourceFile = process.argv[2];
    const rootBackupFolder = path.join(__dirname, '..', 'backups');
    
    if (!sourceFile) {
        sourceFile = path.join(rootBackupFolder, 'latest_backup.json');
        console.log(`No se especificó archivo. Usando por defecto: latest_backup.json`);
    }

    if (!fs.existsSync(sourceFile)) {
        console.error(`❌ Archivo no encontrado: ${sourceFile}`);
        process.exit(1);
    }

    const destFolder = path.join(__dirname, '..', 'git_backup_data');
    if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
    }

    console.log(`📄 Leyendo backup gigante (esto puede tardar si es muy grande)...`);
    const rawData = fs.readFileSync(sourceFile, 'utf8');
    
    let backupData;
    try {
        backupData = JSON.parse(rawData);
    } catch (e) {
        console.error("❌ Error parseando JSON:", e.message);
        process.exit(1);
    }

    // El backup tiene una estructura: { "collectionName": [ {doc1}, {doc2} ] }
    const collections = Object.keys(backupData);
    
    console.log(`📦 Encontradas ${collections.length} colecciones. Dividiendo...`);

    for (const colName of collections) {
        const colData = backupData[colName];
        if (!Array.isArray(colData)) {
            continue; // Evita metadatos o estructuras raras
        }

        // Ordenamos los documentos por ID para que Git Diff sea consistente y no cambie si el orden de Firestore varía
        colData.sort((a, b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0));

        const colFile = path.join(destFolder, `${colName}.json`);
        
        // Pretty print con 2 espacios de indentación para diffs legibles
        fs.writeFileSync(colFile, JSON.stringify(colData, null, 2));
        console.log(`   ✅ Guardado: ${colName}.json (${colData.length} documentos)`);
    }

    console.log(`\n✨ ¡Formateo completado!`);
    console.log(`Ahora puedes hacer commit de la carpeta 'git_backup_data'. Git procesará los archivos línea por línea de forma súper rápida.`);
}

formatBackupForGit().catch(err => {
    console.error('❌ Fallo al formatear:', err);
    process.exit(1);
});
