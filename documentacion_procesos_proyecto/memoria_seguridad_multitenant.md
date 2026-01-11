# 🔐 Memoria Técnica: Implementación de Seguridad Multi-Tenant

**Proyecto:** Weekly Tracker
**Fecha:** 9 de Enero de 2026
**Autor:** Antigravity (IA Assistant) & Daniel Delamo
**Estado:** ✅ Completado y Verificado

---

## 1. Contexto y Objetivo 🎯
El objetivo era transformar una aplicación "mono-usuario" (o con seguridad laxa) en una plataforma **Multi-Tenant Estricta**, donde múltiples empresas (Tenants) coexisten sin riesgo de fuga de datos.
El desafío principal fue **"Missing or insufficient permissions"**: Errores persistentes al intentar leer o escribir datos bajo las nuevas reglas estrictas.

---

## 2. El "Viaje" y los Problemas Encontrados 🛑

### A. El Problema del "Orphan User"
*   **Síntoma:** Al recargar la página, el usuario veía una alerta de seguridad ("Orphan User Detected") y no cargaban datos.
*   **Causa:** La aplicación intentaba cargar datos *antes* de que el contexto de autenticación (`AuthContext`) tuviera listo el `tenantId`.
*   **Intento Fallido:** Confiar solo en la lectura de base de datos (`getDoc(user)`), que fallaba porque las reglas exigían tener el `tenantId` (¡el huevo o la gallina!).

### B. El Bloqueo de "Create Task" (Regla de Oro Rota)
*   **Síntoma:** Error de permisos al crear tareas en proyectos globales.
*   **Causa:** La aplicación asignaba el `tenantId` del Proyecto (ej: Tenant 1) a la Tarea. Como el usuario era Tenant 3, Firestore bloqueaba la escritura.
*   **Realidad:** Un usuario del Tenant 3 **NUNCA** debe crear datos propiedad del Tenant 1, incluso si colabora en ellos.

### C. Conflicto GET vs LIST en Firestore
*   **Síntoma:** `getRecentJournalEntries` fallaba.
*   **Causa:** Las reglas de seguridad usaban validación por ID (`matchesTenantIdInPath`). Esto funciona para leer UN documento (`get`), pero falla en búsquedas (`list`) porque Firestore no puede probar a priori que *todos* los resultados cumplirán la regla.

---

## 3. Arquitectura Final Implementada (La Solución) 🏗️

### 🔑 1. Custom Claims (La Llave Maestra)
En lugar de buscar el tenant en la base de datos en cada petición, lo inyectamos en el **Token de Autenticación**.
*   **Script:** `scripts/set-tenant-claims.js`
*   **Resultado:** `request.auth.token.tenantId` está disponible instantáneamente en las reglas de seguridad. Rapidez extrema y coste cero.

### 🛡️ 2. AuthContext "A Prueba de Balas"
Rediseñamos el contexto de autenticación para que sea infalible:
1.  **Prioridad 1:** Lee el Token (Custom Claims).
2.  **Prioridad 2:** Si falla (red/refresco), lee Firestore.
3.  **Guardia:** La UI no carga hasta que hay un `tenantId` confirmado.

### 🔒 3. Reglas de Firestore Quirúrgicas
Separamos las reglas para diferentes tipos de acceso:
*   **`allow get` (Lectura Única):** Verifica si el ID del documento empieza con tu Tenant (Flexible, permite verificar "no existencia").
*   **`allow list` (Búsqueda):** Exige estrictamente `where('tenantId', '==', 'TU_TENANT')`.

---

## 4. La Regla de Oro (Lessons Learned) 💡

> **"Un usuario solo puede crear y poseer datos de SU PROPIO Tenant."**

Incluso si un Consultor (Tenant 3) trabaja en un Proyecto del Cliente (Tenant 1):
1.  El **Proyecto** pertenece al Tenant 1.
2.  La **Tarea** que crea el Consultor pertenece al **Tenant 3**.
3.  La **Relación** se hace a través del `projectId`.

**Lección:** Nunca confíes en el objeto padre para asignar propiedad. La propiedad la define **quién crea el dato**.

---

## 5. Pasos de Éxito (Resumen Técnico) ✅

1.  **Ejecución de Script Claims:** Se actualizó a todos los usuarios con `tenantId` en sus tokens.
2.  **Despliegue de Reglas:** Se subió el `firestore.rules` optimizado (split get/list).
3.  **Refactor Frontend:**
    *   `DailyFollowUp.tsx`: Forzar `taskTenantId = user.tenantId`.
    *   `lib/tasks.ts`: Añadir filtro `where('tenantId', ...)` en queries de generación de ID.
    *   `AuthContext.tsx`: Implementar fallback robusto de claims.

---

**Conclusión:**
El sistema ahora es seguro, escalable y cumple estrictamente con el aislamiento de datos requerido para un entorno empresarial multi-cliente.
