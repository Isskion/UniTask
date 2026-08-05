const admin = require('firebase-admin');
const { resolve } = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!admin.apps.length) {
    try {
        const serviceAccountPath = resolve(__dirname, '../serviceAccountKey.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            admin.initializeApp({ projectId: "minuta-f75a4" });
        }
    } catch (e) {
        admin.initializeApp({ projectId: "minuta-f75a4" });
    }
}

const db = admin.firestore();

async function listUniTraceSlugs() {
    console.log("Listing uni_trace docs...");
    const snapshot = await db.collection('uni_trace').get();
    if (snapshot.empty) {
        console.log("No hay documentos en uni_trace.");
        return;
    }
    for (const doc of snapshot.docs) {
        const trace = doc.data();
        const inner = trace.data || {}; // OJO: el catálogo real vive anidado bajo el campo "data", no en la raíz del doc
        console.log(`\n[slug: ${doc.id}]`);
        console.log(`  projectId: ${trace.projectId || '(ninguno)'}`);
        console.log(`  accessEnabled: ${trace.accessEnabled}`);
        console.log(`  updatedAt: ${trace.updatedAt ? trace.updatedAt.toDate() : '(nunca guardado)'}`);
        const estadosCount = Array.isArray(inner.estados) ? inner.estados.length : 0;
        const transicionesCount = Array.isArray(inner.transiciones) ? inner.transiciones.length : 0;
        const depositosCount = Array.isArray(inner.depositos) ? inner.depositos.length : 0;
        console.log(`  estados: ${estadosCount}, transiciones: ${transicionesCount}, depositos: ${depositosCount}`);
        if (estadosCount > 0) {
            const entidades = [...new Set(inner.estados.map(e => e.entidad))];
            console.log(`  entidades en estados: ${entidades.join(', ')}`);
        }
    }
}

listUniTraceSlugs().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
