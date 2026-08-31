# UniClienteDadorCreator — Revisión de Claude sobre el resultado de Gemini (Fases 1-2)

**Fecha:** 2026-08-31
**Referencia:** `docs/uniclientedadorcreator-plan.md` (spec) y `docs/uniclientedadorcreator-fases-1-2-resultado.md` (informe de Gemini — **leer con reservas, ver §1**).

## 1. El informe de Gemini no era fiable en dos puntos concretos

El informe afirmaba trabajo completo y verificado en `app/uniclientedadorcreator/`. Verificación contra filesystem/git encontró:

- **Ubicación falsa:** el código nunca se escribió en el repo. Se escribió en
  `OneDrive.../Documentos/Oficial Unigis/Documentación tecnica/Unigis contexto/app/uniclientedadorcreator`
  (un `targetDir` hardcodeado en un script de scratch de la propia sesión de Gemini,
  `brain/<sessionId>/scratch/update_files.js`). El código en sí era real (43 archivos,
  no alucinados) — solo estaba en el sitio equivocado.
- **Limpieza UTF-8 no realizada del todo:** 3 archivos (`SavedMappings.tsx`,
  `ProgressModal.tsx`, `MappingWizard.tsx`) traían el mismo mojibake que ya se
  había corregido en `uniclientcreator` (commit `1d08d043`), señal de que se
  copiaron desde una versión vieja en vez del HEAD actual del repo.

**Conclusión operativa:** de aquí en adelante, un informe de "resultado" de
Gemini se trata como borrador a verificar contra el filesystem y `git status`
antes de darlo por bueno — no como hecho consumado.

## 2. Correcciones aplicadas

1. Los 43 archivos se copiaron a la ubicación correcta: `app/uniclientedadorcreator/`
   dentro del repo UniTask.
2. `SavedMappings.tsx` y `MappingWizard.tsx`: sustituidos por las versiones
   limpias actuales de `uniclientcreator` (diff verificado línea a línea —
   sin diferencias de contenido más allá de la codificación).
3. `ProgressModal.tsx`: mismo reemplazo, conservando el único texto legítimo
   que tenía distinto (`REPORTE DE ERRORES — UniClienteDadorCreator`).
4. `HelpModal.tsx` — **bug más serio, no relacionado con encoding**: el archivo
   no contenía el componente React, sino el propio script de Node
   (`clean_help.js`) que Gemini usó para generarlo — el componente real estaba
   anidado como string dentro de ese script, y ese string (sin cerrar
   correctamente al nivel del archivo `.tsx`) es lo que se guardó como
   `HelpModal.tsx`. Provocaba `TS1160: Unterminated template literal`.
   Se extrajo el componente real del interior del script y se reescribió el
   archivo con el JSX correcto.

## 3. Validación

- `grep` de mojibake (`Ã.`, `â€`, `ðŸ`) y de restos de script (`writeFileSync`,
  `targetDir`) sobre todo `app/uniclientedadorcreator/`: limpio.
- `npx tsc --noEmit` sobre el proyecto completo: **0 errores** en
  `app/uniclientedadorcreator/` (antes de corregir `HelpModal.tsx` daba
  `TS1160`; tras corregirlo, limpio).
- Contrastado campo a campo `schema.ts` / `xmlBuilder.ts` / `page.tsx` contra
  el contrato `pClienteDador` de `docs/uniclientedadorcreator-plan.md` §1.2/§4:
  correcto — `ApiKey` en mayúscula, envoltorio `unis:CrearClientesDadores`,
  soporte de `operaciones[]`/`pOperacion` y `CampoDinamico[]`.
- `AppLayout.tsx` y cualquier llamada real a UNIGIS: **no tocadas**, tal como
  pedía la instrucción a Gemini — quedan para la Fase 3/4 del plan.

## 4. Estado

Fases 1-2 dadas por buenas (con las correcciones de arriba). Pendiente Fase 3
(llamada real de prueba contra `CrearClientesDadores`) — requiere confirmación
explícita de Daniel porque escribe en la tabla `Cliente` de producción de
Europastry, y credenciales/URL reales de UNIGIS.
