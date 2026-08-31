# UNIGIS Database & Business Logic Guidelines

- **Base de Datos UNIGIS**: La estructura de la base de datos es estándar en todos los proyectos UNIGIS TMS (99% común entre clientes).
- **Formatos de Horario**: Los horarios en UNIGIS se almacenan como enteros (`INT`) representando **minutos transcurridos desde medianoche (00:00)**:
  - `09:00` = `540`
  - `18:00` = `1080`
- **Campos Clave de Horarios**:
  - `Orden`: `InicioHorario1` / `FinHorario1` (Horario enviado por cliente/pedido).
  - `Orden`: `InicioHorarioPlanificado` / `FinHorarioPlanificado` (Horario asignado para planeamiento).
  - `DomicilioOrden`: `InicioHorario1` / `FinHorario1` / `InicioHorario2` / `FinHorario2` (Horquillas de entrega).
  - `DomicilioOrden`: `RequiereTurno` (`BIT`) - Indicador de Cita / Turno.
- **Documentación completa**: Consultar el archivo [`UNIGIS_Esquema_BD_y_Reglas_LS.md`](file:///c:/Users/daniel.delamo/OneDrive%20-%20UNISOLUTIONS%20MEX%20SA%20DE%20CV/Documentos/Oficial%20Unigis/Documentaci%C3%B3n%20tecnica/Unigis%20contexto/UNIGIS_Esquema_BD_y_Reglas_LS.md) dentro de esta carpeta.
