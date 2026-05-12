const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const TARGET_DOC_ID = "draft-1777287458622";

async function runSmartRecovery() {
    console.log("🚑 Starting SMART RECOVERY for " + TARGET_DOC_ID);
    
    const docRef = db.collection('uniflux_flows').doc(TARGET_DOC_ID);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new Error("Flow document not found!");
    }
    
    const originalData = docSnap.data();
    
    // 1. Safety Backup
    const backupPath = path.join(__dirname, '..', `pre_recovery_disaster_backup_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(originalData, null, 2));
    console.log(`🔒 Safety backup created at ${backupPath}`);
    
    let nodes = [...(originalData.nodes || [])];
    const edges = [...(originalData.edges || [])];
    
    console.log(`📊 Found ${nodes.length} current nodes and ${edges.length} current edges.`);
    
    // Identify key orchestrator node IDs (Cluster roots)
    const CLUSTER_ROOTS = {
        "Maersk": "501",
        "Portic": "502",
        "Webfleet": "503"
    };
    
    // Map which node belongs to which cluster by tracing edges
    const clusterMap = new Map(); // nodeId -> ClusterName
    
    edges.forEach(edge => {
        if (edge.source === CLUSTER_ROOTS["Maersk"] || edge.target === CLUSTER_ROOTS["Maersk"]) {
            const other = edge.source === CLUSTER_ROOTS["Maersk"] ? edge.target : edge.source;
            clusterMap.set(other, "Maersk");
        } else if (edge.source === CLUSTER_ROOTS["Portic"] || edge.target === CLUSTER_ROOTS["Portic"]) {
            const other = edge.source === CLUSTER_ROOTS["Portic"] ? edge.target : edge.source;
            clusterMap.set(other, "Portic");
        } else if (edge.source === CLUSTER_ROOTS["Webfleet"] || edge.target === CLUSTER_ROOTS["Webfleet"]) {
            const other = edge.source === CLUSTER_ROOTS["Webfleet"] ? edge.target : edge.source;
            clusterMap.set(other, "Webfleet");
        }
    });

    // Also include the cluster root itself in its cluster!
    clusterMap.set(CLUSTER_ROOTS["Maersk"], "Maersk");
    clusterMap.set(CLUSTER_ROOTS["Portic"], "Portic");
    clusterMap.set(CLUSTER_ROOTS["Webfleet"], "Webfleet");
    
    console.log(`🔗 Mapped ${clusterMap.size} nodes into 3 clusters.`);
    
    // For nodes not directly attached, see if they're attached to cluster members (2nd hop)
    // e.g. Text nodes describing logic.
    nodes.forEach(node => {
        if (!clusterMap.has(node.id)) {
            // Use vertical heuristic: if node is at Y=500, it likely fits cluster 1 (y=300-1500).
            // Looking at data, Maersk is around Y=0 to Y=1900, Portic Y=1900 to Y=3200, Webfleet Y=3200+
            const y = node.position?.y || 0;
            if (y < 1800) clusterMap.set(node.id, "Maersk");
            else if (y >= 1800 && y < 3200) clusterMap.set(node.id, "Portic");
            else clusterMap.set(node.id, "Webfleet");
        }
    });
    
    // Keep special orchestrator nodes OUT of the containers if they sit on top?
    // No, looking at diagnostic, node 504 is way right (x=4215), that should likely be naked.
    const exclusions = new Set(["500", "504", "505", "506"]); 
    
    // Define container node IDs
    const envNodes = [
        { id: "env-maersk", name: "Entorno de Integración Maersk", cluster: "Maersk", color: "#f8fafc" },
        { id: "env-portic", name: "Comunidad Portuaria Portic", cluster: "Portic", color: "#f8fafc" },
        { id: "env-webfleet", name: "Telemática Webfleet", cluster: "Webfleet", color: "#f8fafc" }
    ];
    
    const newEnvironmentNodes = [];
    
    envNodes.forEach(env => {
        // Get all nodes in this cluster
        const clusterNodes = nodes.filter(n => clusterMap.get(n.id) === env.cluster && !exclusions.has(n.id));
        
        if (clusterNodes.length === 0) return;
        
        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        clusterNodes.forEach(n => {
            const nx = n.position?.x || 0;
            const ny = n.position?.y || 0;
            const nw = n.width || 150;
            const nh = n.height || 60;
            
            minX = Math.min(minX, nx);
            minY = Math.min(minY, ny);
            maxX = Math.max(maxX, nx + nw);
            maxY = Math.max(maxY, ny + nh);
        });
        
        // Add nice padding
        const padding = 60;
        const envX = minX - padding;
        const envY = minY - padding - 20; // Extra padding top for title
        const envW = (maxX - minX) + (padding * 2);
        const envH = (maxY - minY) + (padding * 2) + 20;
        
        console.log(`🏗️ Created Container ${env.id} at [${envX}, ${envY}] sized ${envW}x${envH}`);
        
        // Create the actual node
        newEnvironmentNodes.push({
            id: env.id,
            type: "ENVIRONMENT",
            label: env.name,
            position: { x: envX, y: envY },
            width: envW,
            height: envH,
            additionalData: {
                bgColor: "#ffffff",
                strokeColor: "#cbd5e1"
            }
        });
        
        // CRITICAL: Update children to have relative coordinates AND parentId!!!
        nodes = nodes.map(n => {
            if (clusterMap.get(n.id) === env.cluster && !exclusions.has(n.id)) {
                return {
                    ...n,
                    parentId: env.id,
                    position: {
                        x: (n.position?.x || 0) - envX,
                        y: (n.position?.y || 0) - envY
                    }
                };
            }
            return n;
        });
    });
    
    // Insert environment nodes at the START of the array (bottom of rendering z-index)
    const finalNodes = [...newEnvironmentNodes, ...nodes];
    
    console.log(`🎉 Final assembly constructed: ${finalNodes.length} total nodes!`);
    
    // Push back to Firestore!
    await docRef.update({
        nodes: finalNodes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lockedBy: admin.firestore.FieldValue.delete() // clear lock just in case
    });
    
    console.log("✅ SUCCESS!! Flow restored perfectly in Firestore. User should refresh!");
    process.exit(0);
}

runSmartRecovery().catch(err => {
    console.error("CRITICAL ERROR DURING RECOVERY:", err);
    process.exit(1);
});
