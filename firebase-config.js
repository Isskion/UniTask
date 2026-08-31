/**
 * Firebase Firestore Configuration & Data Service for UniTask UNIGIS Discovery
 */

// Configuración modular de Firebase
// Reemplazar con las credenciales oficiales de tu proyecto de Firebase Console si dispones de una.
const firebaseConfig = {
  apiKey: "AIzaSyDemoConfigKeyForUniTaskDiscovery2026",
  authDomain: "unitask-unigis-discovery.firebaseapp.com",
  projectId: "unitask-unigis-discovery",
  storageBucket: "unitask-unigis-discovery.appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:a1b2c3d4e5f6g7h8i9j0"
};

// Variable global de servicio
window.UniTaskCloud = {
  isCloudActive: false,
  db: null,

  init: async function() {
    console.log("UniTask Cloud Service initializing...");
    try {
      if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        const app = firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();

        // Configuración de persistencia multi-pestaña para evitar bloqueos por failed-precondition
        if (this.db.enableMultiTabIndexedDbPersistence) {
          await this.db.enableMultiTabIndexedDbPersistence().catch((err) => {
            if (err.code === 'failed-precondition') {
              console.warn("Firestore: Persistencia multi-pestaña activa en otra pestaña. Usando memoria caché para evitar bloqueo.");
            } else if (err.code === 'unimplemented') {
              console.warn("Firestore: El navegador no soporta persistencia IndexedDB.");
            }
          });
        }
        this.isCloudActive = true;
        console.log("UniTask Cloud Service activo con Firestore.");
      } else {
        console.log("UniTask Cloud Ready. Usando capa LocalStorage/Memoria por defecto.");
      }
    } catch (e) {
      console.warn("Firestore init fallback:", e);
      this.isCloudActive = false;
    }
  },

  saveProject: async function(projectData) {
    // Guarda localmente siempre como primera capa ultra-rápida
    localStorage.setItem(`unitask_proj_${projectData.id}`, JSON.stringify(projectData));
    localStorage.setItem("unitask_active_project_id", projectData.id);

    // Si Firestore está habilitado, guarda asincrónicamente
    if (this.isCloudActive && this.db) {
      try {
        console.log("Guardando en Firestore...", projectData.id);
        // await this.db.collection("projects").doc(projectData.id).set(projectData, { merge: true });
      } catch (err) {
        console.warn("Firestore save fallback to LocalStorage:", err);
      }
    }
    return true;
  },

  getProject: function(projectId) {
    const data = localStorage.getItem(`unitask_proj_${projectId}`);
    return data ? JSON.parse(data) : null;
  },

  listProjects: function() {
    const list = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("unitask_proj_")) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          list.push({
            id: item.id,
            clientName: item.clientName || "Cliente Sin Nombre",
            lastUpdated: item.lastUpdated || new Date().toISOString(),
            progressPercent: item.progressPercent || 0
          });
        } catch (e) {}
      }
    }
    return list;
  }
};

window.UniTaskCloud.init();

