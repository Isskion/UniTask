# Reglas de Desarrollo para el Espacio de Trabajo UniTask

## Repositorio Oficial y Despliegue en Vercel
- **Repositorio GitHub:** `https://github.com/Isskion/UniTask`
- **Despliegue a Vercel:** Vercel despliega automáticamente mediante `git push origin main` a este repositorio.
- **Antes de realizar despliegues:** Consultar y confirmar siempre con el usuario antes de empujar cambios.

## Configuración de Firebase / Firestore
- **Persistencia Multi-Pestaña:** Inicializar Firestore siempre con soporte multi-pestaña (`enableMultiTabIndexedDbPersistence()` o `persistentMultipleTabManager()`) y captura de errores `failed-precondition`. Esto previene cuelgues al cargar datos masivos de Excel en `UniOrderManager` / `UniTaskController`.

## Menú de Navegación (`components/AppLayout.tsx`) — Entradas Canónicas

⚠️ **REGLA:** Todas las entradas listadas abajo deben mantenerse SIEMPRE (existen dos copias, sidebar expandido y colapsado). **Nunca eliminar, comentar ni excluir una entrada al editar o sobrescribir este archivo, salvo pedido explícito del usuario en esa misma conversación.** Si vas a reemplazar bloques grandes del archivo (p. ej. al integrar una feature nueva), diffea antes contra esta lista y confirma que ninguna entrada existente desapareció.

> **Precedente:** el commit `6816ce7f` ("implement univehiclecreator...") sobrescribió `AppLayout.tsx` con una versión más vieja y borró sin querer el link a `UniClientCreator` (y varias otras cosas: TaskControllerWidget, control de tareas admin, UniVisio, UniGeo, Swagger/SOAP integrators, recortes en locales). Se restauró en agosto 2026. No repetir ese patrón.

### Herramientas Unitask (sección `nav.unitask_tools`)
| Módulo | Ruta | Permiso (`can(...)`) |
|---|---|---|
| DispoPlan | `mode="dispoplan"` | `dispoPlan` |
| Registro Indisponibilidades | `mode="availability-registry"` | `unavailabilityRegistry` |
| UniLeaks | `/unileaks` | (sin gate) |
| UniOrderManager | `/uniordercreator` | `uniordercreator` |
| **UniClientCreator** | `/uniclientcreator` | `uniordercreator` (comparte permiso) |
| UniVehicleCreator | `/univehiclecreator` | `univehiclecreator` |
| UNIGIS Swagger | `/integrators/uni-swagger/index.html` | `swagger` |
| UNIGIS SOAP | `/integrators/uni-soap/index.html` | `soap` |
| UniVisio | `/univisio` | (sin gate) |
| UniGeo | `/uniflux/geo` | (sin gate) |
| UniDocs | `mode="unidocs"` | (sin gate) |
| Uniflux Engine | `/uniflux` | (sin gate) |
| UniTrace | `/UniTrace` | (sin gate) |
| UniHumanize | `/ai-detector` | `RoleLevel.ADMIN` |

Si el usuario pide agregar un módulo nuevo: añadirlo a AMBAS copias del menú (expandido + colapsado) y sumarlo a esta tabla en el mismo cambio.

## Proyecto Transpais (TSP) - Datos Reales Confirmados en BD

### Operaciones Confirmadas (`dbo.Operacion`)
- `IdOperacion = 1`: **Intermodal**
- `IdOperacion = 2`: **Internacional**
- `IdOperacion = 3`: **Distribución**

### Regla Fundamental de Confirmación con Base de Datos
Antes de generar cualquier script SQL definitivo o realizar modificaciones sobre datos de operaciones, estados o transiciones:
1. **NUNCA ASUMIR O ADIVINAR IDs:** Usar exclusivamente los IDs verificados en las consultas SELECT de la BD del cliente.
2. **OPERACIÓN DISTRIBUCIÓN:** Toda transición para Distribución debe usar obligatoriamente `IdOperacion = 3`.
3. **MÁXIMOS DE TRANSICIÓN:** Usar rangos de ID a partir de `2001` (los máximos actuales en la BD son ~1504).

