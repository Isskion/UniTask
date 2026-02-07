# Logos Finales (UniTask)

Estos son los archivos de imagen base utilizados en la aplicación.

- **brand-red.png**: Logo con fondo rojo/oscuro.
- **brand-white.png**: Logo con fondo blanco/claro.

## Nota sobre efectos visuales

Los efectos de **esquinas redondeadas** y **desvanecimiento (fade-out)** que ves en la pantalla de Login **NO están en la imagen**. Son efectos aplicados dinámicamente mediante código CSS en la aplicación web.

El código CSS aplicado es:

```css
/* Redondeado */
border-radius: 1.5rem; /* rounded-3xl */

/* Desvanecimiento */
mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
-webkit-mask-image: radial-gradient(ellipse at center, black 50%, transparent 95%);
```

Si necesitas usar estos logos en otro lugar con el mismo efecto, deberás aplicar estos estilos o editar la imagen en Photoshop para incluir la transparencia.
