---
description: Rutina de Auditoría de Seguridad periódica (Agente de Seguridad)
---

# 🕵️‍♂️ Protocolo de Auditoría de Seguridad (Security Agent)

Ejecuta este workflow cada pocos días para garantizar que no se han introducido regresiones de seguridad.

## 1. Escaneo de Secretos
Busca credenciales expuestas en el código fuente.

```bash
grep -r "AIza" .
grep -r "sk-" .
grep -r "NEXT_PUBLIC_" .
```
> **Verificación**: Asegúrate de que `NEXT_PUBLIC_` solo exponga IDs de proyecto o keys públicas de Firebase (no Service Accounts ni Secret Keys).

## 2. Auditoría de APIs (Resource Exhaustion)
Verifica que todos los endpoints en `app/api` tengan protección de autenticación.

1. Lista todos los endpoints:
   ```bash
   fd . app/api
   ```
2. Para cada archivo `route.ts` encontrado, verifica que incluya validación de token:
   - Debe importar `adminAuth` (o similar).
   - Debe verificar el header `Authorization`.
   - **Alerta**: Si ves `request.json()` o lógica de negocio sin un bloque `verifyIdToken` previo, es una VULNERABILIDAD.

## 3. Blindaje F12 (Firestore Rules)
Asegura que las colecciones sensibles estén bloqueadas contra escritura desde el cliente.

1. Lee `firestore.rules`.
2. Verifica la colección `invites`:
   - `allow create: if false;` (OBLIGATORIO).
   - `allow list: if false;` (OBLIGATORIO).
3. Verifica la colección `task_activities` (Audit Logs):
   - `allow update, delete: if false;` (Inmutabilidad).
4. Verifica reglas de borrado (`delete`):
   - Nadie debería poder borrar `projects` o `tasks` excepto Admins o Creadores. Si ves `allow delete: if isAuthenticated()`, es una vulnerabilidad.

## 4. Aislamiento de Storage
Verifica `storage.rules`.

- **Regla de Oro**: No debe existir `match /{allPaths=**} { allow write: if isAuthenticated(); }`.
- Debe haber reglas específicas por tenant: `match /tenants/{tenantId}/{allPaths=**}`.

## 5. Reporte
Actualiza `SECURITY_AUDIT_REPORT.md` con los hallazgos. Si todo está limpio, marca el chequeo con la fecha actual.
