# 🛡️ Protocolo de Desarrollo Mandatario - UniTask

**ESTADO: OBLIGATORIO**

1. **No Emulator usage**: Solo entorno **local** y despliegue vía **Git**.
2. **Production Safety**: PROHIBIDO tocar datos de producción sin petición explícita.
3. **No Massive Updates**: Evitar actualizaciones masivas en producción.
4. **Daily Backups (Activación de Sesión)**: Ejecutar `node scripts/run-dated-backup.js` al iniciar la sesión.
5. **Next.js Standards (v16+)**: Utilizar estándares v16+ y verificar documentación oficial.
6. **Token Efficiency (Surgical Ops)**: Intervenciones limitadas estrictamente a los métodos u objetos solicitados.
