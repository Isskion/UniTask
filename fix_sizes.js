const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const TARGET_DOC_ID = "draft-1777287458622";

async function enhanceSizes() {
    const docRef = db.collection('uniflux_flows').doc(TARGET_DOC_ID);
    const doc = await docRef.get();
    const data = doc.data();
    
    const updatedNodes = data.nodes.map(n => {
        if (n.type === 'TEXT') {
            return {
                ...n,
                // Enforce decent starting sizes for user's text nodes so they don't overlap or shrink
                width: Math.max(n.width || 0, 350),
                height: Math.max(n.height || 0, 80)
            };
        }
        if (n.type === 'OPERATION') {
            return {
                ...n,
                width: Math.max(n.width || 0, 280),
                height: Math.max(n.height || 0, 60)
            }
        }
        return n;
    });

    await docRef.update({ nodes: updatedNodes, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log("Enforced width 350 and height 80 across all text nodes to prevent shrinkage.");
}
enhanceSizes().catch(console.error);
