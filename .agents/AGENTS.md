# Reglas de Desarrollo para el Espacio de Trabajo UniTask

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
