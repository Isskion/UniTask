# Proyecto UNIGIS: LUIS SIMOES (LS) - Base de Conocimiento de la Base de Datos

Este directorio sirve como repositorio de conocimiento y diagnóstico para el entorno de **LUIS SIMOES (LS)** en UNIGIS.

---

## 💡 Modelo de Negocio: Carrier vs. Shipper (Cargador)

Es crucial destacar la diferencia fundamental de modelo de negocio entre otros proyectos del repositorio y LUIS SIMOES:
*   **Europastry (EUP)**: Es un *Cargador (Shipper)*. Planifica y distribuye su propia carga.
*   **LUIS SIMOES (LS)**: Es un *Carrier (Transportista / Operador Logístico)*. Distribuye carga consolidada de múltiples clientes externos. 

Esta distinción implica que las reglas de enrutamiento, asignación de depósitos y la lógica de crossdock en LS estarán guiadas por la consolidación de clientes externos y sus propios estados de tránsito, en lugar de por un flujo cautivo mono-cliente.

---

## 🔍 Scripts de Descubrimiento Ejecutados

Para conocer la base de datos sin alterar ninguna tabla ni configuración, disponemos de los siguientes scripts de consulta de diagnóstico:

1.  **[queries.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/LS/queries.sql)**:
    *   Consulta la máquina de estados completa de pedidos, viajes, paradas y transiciones permitidas.
2.  **[schema_check.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/LS/schema_check.sql)**:
    *   Obtiene columnas específicas de depósitos en `Pedido` y verifica la existencia de tablas nativas de crossdock.
3.  **[custom_objects_check.sql](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/LS/custom_objects_check.sql)**:
    *   Inspecciona las tablas físicas y procedimientos almacenados (SPs) con el prefijo `Z_` en el catálogo de LS para mapear desarrollos a medida existentes.

---

## 📋 Diagnóstico y Estado de la Base de Datos

Los resultados consolidados de la base de datos se encuentran en el siguiente documento:
*   **[DB_Discovery_Results.md](file:///C:/Users/daniel.delamo/.gemini/antigravity/scratch/UniTask/docs/LS/DB_Discovery_Results.md)**: Mapeo completo de `EstadoPedido`, `EstadoViaje`, `EstadoParada`, transiciones clave y conclusiones sobre la estructura física.

### Resumen de Objetos Personalizados Existentes (`Z_`)
En el diagnóstico de objetos a medida, se identificó que en LS existen tablas relacionadas con activación policial y monitoreo de seguridad (`Z_ActivacionPolicial`, `Z_VehiculoCustodia`, `Z_Suceso`), así como procedimientos de re-procesamiento de paradas (`Z_ReprocesarTipoParada`). **No existe ninguna infraestructura de crossdock previa en este entorno**, por lo que la base de datos se encuentra limpia en este aspecto.
