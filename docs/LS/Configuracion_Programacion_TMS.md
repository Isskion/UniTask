# 🗺️ Luis Simoes (LS) - Diseño de ABM y Relaciones de Programación TMS

Este documento detalla el diseño relacional y los flujos de decisión lógica basados en el archivo **`Programacion TMS.xlsx`** para el entorno de **LUIS SIMOES (LS)**. Su objetivo es servir como especificación técnica y visual para el desarrollo de un módulo de administración (ABM/CRUD) en UNIGIS que permita configurar estas asociaciones de manera dinámica.

---

## 1. Modelo de Datos del ABM (Diagrama Entidad-Relación)

Para poder configurar las reglas de negocio del Excel mediante una interfaz de ABM, se propone el siguiente modelo relacional de base de datos. Este modelo permite desligar las reglas de jornada, operación y tramo del código fuente, haciéndolas 100% configurables por el equipo de SAC y Administración.

```mermaid
erDiagram
    DEPOSITO ||--o{ REGLA_JORNADA_OPERACION : "aplica en"
    TIPO_TRAMO ||--o{ REGLA_JORNADA_OPERACION : "clasifica"
    
    REGLA_JORNADA_OPERACION {
        int id PK
        int id_deposito FK
        varchar tipo_tramo FK "Local | Larga Distancia"
        varchar tipo_jornada "PT Porto Local, ES Madrid Larga, etc."
        varchar operacion "PT Noroeste, Centro Norte Madrid, etc."
        boolean es_ajena
        boolean es_paqueteria
    }

    MATRIZ_REGLAS_PROGRAMACION {
        int id PK
        varchar tipo_domicilio_origen "Remitente | Depósito"
        varchar tipo_domicilio_destino "Destinatario | Depósito"
        varchar relacion_deposito "Mismo Deposito | Diferente Deposito | N/A"
        varchar relacion_zona "Misma Zona | Diferente Zona | N/A"
        varchar estado_programacion_sugerido "Punto a Punto | Entrega Directa | Recogida | Arrastre"
        varchar tipo_orden_pickup "Recolección en Remitente | Recolección en Depósito"
        varchar tipo_orden_delivery "Entrega en Destinatario | Entrega en Depósito Crossdock"
    }

    TRANSICION_ESTADOS_RESTRICCION {
        int id PK
        int estado_origen "Código (e.g. 4, 38, 70)"
        int estado_destino "Código (e.g. 1035, 1315)"
        varchar rol_permitido "SAC | Distribuidor | Automático"
        varchar restriccion_formula "e.g. Tipo Domicilio Orden 2 != Deposito"
        boolean editable
    }
```

---

## 2. Árbol de Decisión: Determinación del Flujo de Programación

Cuando un pedido es integrado en UNIGIS en estado **`4 (REGISTRADO-OK)`**, el motor de reglas debe evaluar las propiedades de los domicilios de origen y destino para auto-asignar el **Estado de Programación** correspondiente.

El siguiente diagrama ilustra el flujo de decisión que debe implementar el desarrollo en UNIGIS:

```mermaid
graph TD
    A[Inicio: Pedido en REGISTRADO-OK] --> B{¿Tipo Domicilio Origen?}
    
    B -- Remitente --> C{¿Tipo Domicilio Destino?}
    B -- Depósito --> D{¿Tipo Domicilio Destino?}
    
    C -- Destinatario --> E[Programar Punto a Punto]
    C -- Depósito --> F[Programar Recogida]
    
    D -- Destinatario --> G[Programar Entrega Directa]
    D -- Depósito --> H{¿Mismo Depósito?}
    
    H -- Sí --> I[Flujo Inválido / Operación Interna]
    H -- No --> J[Programar Arrastre]
    
    E --> K[Asignar Tramo: Local o Larga Distancia]
    F --> K
    G --> K
    J --> K
    
    K --> L{¿Zona Dep. Carga/Salida == Zona Dep. Descarga/Llegada?}
    L -- Sí --> M[Tramo: LOCAL]
    L -- No --> N[Tramo: LARGA DISTANCIA]
    
    M --> O[Consultar ABM: Asignar Jornada y Operación según Depósito + Tramo]
    N --> O
```

---

## 3. Flujos de Trabajo Paso a Paso por Estado

Basado en la pestaña **`Flujos estados`**, aquí se detallan visualmente las secuencias de acciones que el sistema debe ejecutar al cambiar a cada estado operativo:

### 3.1 Programar Recogida

Este flujo representa la recolección desde un cliente remitente hacia un hub o depósito propio (COL) para su posterior consolidación.

```mermaid
sequenceDiagram
    participant S as Sistema (UNIGIS)
    participant ABM as Tabla Configuración ABM
    
    S->>S: 1. Seleccionar Motivo de Recogida
    S->>ABM: 2. Buscar Depósito Descarga asociado al Motivo
    ABM-->>S: Retorna Depósito Descarga
    S->>S: 3. Definir Zona del Depósito de Descarga
    S->>S: 4. Evaluar Tramo: ¿Zona Salida == Zona Descarga? (Local / Larga Distancia)
    S->>ABM: 5. Buscar Jornada y Operación según (Depósito Descarga + Tipo Tramo)
    ABM-->>S: Retorna Jornada y Operación
    S->>S: 6. Evaluar Tramo Siguiente: <br>Si Domicilio Destino == Depósito Descarga -> Finaliza. <br>Si Domicilio Destino != Depósito Descarga -> Generar Arrastre.
```

### 3.2 Programar Arrastre (Troncal / Crossdock)

Representa el movimiento troncal de mercancías entre dos depósitos o delegaciones de Luis Simoes.

```mermaid
sequenceDiagram
    participant S as Sistema (UNIGIS)
    participant ABM as Tabla Configuración ABM
    
    S->>S: 1. Validar que Domicilio Origen y Domicilio Destino son Depósitos
    S->>S: 2. Asignar Depósito Carga (Origen) y Depósito Descarga (Destino)
    S->>S: 3. Evaluar Tramo: ¿Zona Dep. Carga == Zona Dep. Descarga? (Larga Distancia por defecto)
    S->>ABM: 4. Buscar Jornada y Operación según (Depósito Carga + Larga Distancia)
    ABM-->>S: Retorna Jornada y Operación
    S->>S: 5. Crear Orden de Pickup (Tipo: Recolección en Depósito)
    S->>S: 6. Crear Orden de Delivery (Tipo: Entrega en Depósito Crossdock)
    S->>S: 7. Encadenar Automáticamente: Programar Entrega Directa (en destino final)
```

### 3.3 Programar Entrega Directa

Representa el tramo final de reparto desde el depósito de descarga (GE) hacia el cliente destinatario final.

```mermaid
sequenceDiagram
    participant S as Sistema (UNIGIS)
    participant ABM as Tabla Configuración ABM
    
    S->>S: 1. Limpiar/Borrar órdenes anteriores de Paquetería (si existen)
    S->>S: 2. Asignar Depósito de Carga (GE de última milla) y Zona del Depósito
    S->>S: 3. Limpiar valores de Depósito y Zona de Descarga (ya no hay otro hub intermedio)
    S->>S: 4. Clasificar Tramo (Generalmente Local por ser reparto de última milla)
    S->>ABM: 5. Buscar Jornada y Operación según (Depósito de Carga + Tipo Tramo)
    ABM-->>S: Retorna Jornada y Operación de Última Milla
    S->>S: 6. Crear Orden de Pickup (Tipo: Recolección en Depósito)
    S->>S: 7. Crear Orden de Delivery (Tipo: Entrega en Destinatario)
```

---

## 4. Prompts Preparados para Generación Adicional con Claude

Si necesitas trasladar esta especificación a Claude para generar el código SQL de creación de las tablas, la API en C#/.NET para el ABM en UNIGIS, o el esquema JSON de configuración, puedes utilizar el siguiente prompt:

### 📋 Prompt para Generación de Código SQL / API (Copiar y Pegar en Claude)
```text
Actúa como un Arquitecto de Software y Desarrollador Senior de UNIGIS TMS. 
Necesito crear un desarrollo a medida (ABM) para gestionar la lógica de asignación de jornadas, operaciones y transiciones en la operación de Luis Simoes (LS). 

Basándote en la siguiente especificación relacional:
1. Tabla REGLA_JORNADA_OPERACION: Asocia Depósito + Tipo Tramo (Local/Larga Distancia) a un Tipo de Jornada y Operación.
2. Tabla MATRIZ_REGLAS_PROGRAMACION: Mapea (Tipo Domicilio Origen, Tipo Domicilio Destino, Relación de Depósitos y Zonas) a un Estado de Programación sugerido y tipos de órdenes Pickup/Delivery.
3. Tabla TRANSICION_ESTADOS_RESTRICCION: Define qué roles pueden cambiar estados de pedidos y bajo qué fórmulas restrictivas.

Por favor, genera:
- Los scripts de creación de tablas en SQL Server, incluyendo índices de búsqueda para optimizar las consultas por Deposito y Tipo Tramo.
- Los modelos de entidad correspondientes en C# (.NET Core / Entity Framework) para mapear estas tablas.
- Un controlador Web API en C# que exponga los endpoints CRUD de estos ABM con validaciones básicas.
- El procedimiento almacenado (SP) 'Z_ResolverProgramacionPedido' que reciba un IdPedido, evalúe la matriz de decisión y actualice el EstadoPedido, el Tipo Jornada y la Operación del tramo correspondiente utilizando las tablas del ABM.
```
