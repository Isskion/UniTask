# 📱 Unitask Mobile - Guía de Desarrollo y Compilación de APKs

Este documento sirve como referencia técnica para el desarrollo, configuración de variables de entorno y compilación de la aplicación móvil de **Unitask** (UniTask Mobile). Aquí se detalla cómo configurar el entorno local, gestionar las credenciales de Firebase de forma segura y compilar nuevos paquetes de distribución (APKs).

---

## 🏗️ Arquitectura y Estructura

La aplicación móvil está construida sobre **React Native** utilizando **Expo** (v56) y **Expo Router** para la navegación basada en archivos. Comparte la misma base de datos Firebase (`minuta-f75a4`) que la aplicación web.

La estructura del código móvil se encuentra en la carpeta `/mobile`:
```text
mobile/
├── app/                  # Sistema de rutas (Expo Router)
│   ├── (auth)/           # Rutas de autenticación (Login, Registro)
│   ├── (tabs)/           # Rutas principales (proyectos, tareas, etc.)
│   └── _layout.tsx       # Layout raíz con AuthProvider
├── components/           # Componentes visuales reutilizables
├── constants/            # Colores, fuentes y constantes globales
├── lib/                  # Inicialización de servicios (Firebase, Notifications)
│   └── firebase.ts       # Inicialización de Firebase Client
├── app.json              # Configuración del proyecto Expo
├── eas.json              # Perfiles de compilación (EAS Build)
└── .env                  # Variables de entorno locales (IGNORADO en Git)
```

---

## 🔑 Configuración de Variables de Entorno (.env)

La aplicación utiliza Firebase para la autenticación y base de datos Firestore. Para conectarse, requiere que las credenciales estén definidas en un archivo `.env` en la raíz de la carpeta `/mobile`.

### 🚨 Regla de Seguridad Crítica
El archivo `mobile/.env` **NUNCA** debe subirse al repositorio de Git para evitar alertas de seguridad y el uso no autorizado de la API Key. El archivo está explícitamente añadido a `mobile/.gitignore`.

### Estructura del archivo `mobile/.env`
Crea este archivo localmente con los siguientes valores de Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBcFFyUlpsAmX2pmIThxpQHpRzQrDxJ75k
EXPO_PUBLIC_FIREBASE_APP_ID=1:643064542850:web:e629b56f030f98d885e69b
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=minuta-f75a4.firebaseapp.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=643064542850
EXPO_PUBLIC_FIREBASE_PROJECT_ID=minuta-f75a4
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=minuta-f75a4.firebasestorage.app
```

---

## 💻 Desarrollo Local

Para correr el servidor de desarrollo local de Expo (Metro Bundler):

1. Accede al directorio `mobile`:
   ```bash
   cd mobile
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npx expo start
   ```

### ⚡ Limpieza de Caché de Metro
Cuando cambies, agregues o edites cualquier variable en el archivo `.env`, **Expo Metro no las detectará automáticamente** debido a su sistema de caché. Si la app lanza un error de inicialización como `MISSING EXPO_PUBLIC_FIREBASE_API_KEY` después de actualizar el `.env`, inicia el servidor limpiando la caché:

```bash
npx expo start -c
```
*(El parámetro `-c` o `--clear` fuerza a Metro a limpiar la caché y leer el nuevo `.env`)*.

---

## 🛠️ Compilación de APK (EAS Build)

Para empaquetar la aplicación móvil en un archivo `.apk` instalable en dispositivos Android, se utiliza **EAS (Expo Application Services)**.

### El Problema de las Variables de Entorno en EAS Cloud Build
Dado que `eas build` compila la aplicación en los servidores en la nube de Expo clonando el repositorio Git, **el archivo `.env` local no se sube a la nube**. Sin configuración adicional, la compilación se iniciará correctamente, pero la aplicación fallará inmediatamente al abrirse con el error:
> *Missing EXPO_PUBLIC_FIREBASE_API_KEY environment variable. Check your .env file.*

Para solucionar esto, disponemos de dos métodos de compilación:

---

### Método A: Usando EAS Secrets en la Nube (Recomendado)

Podemos definir las variables de entorno en el panel de control de Expo. De esta forma, el compilador en la nube las inyectará automáticamente en la compilación sin necesidad de subirlas a Git.

#### Opción 1: Crear secretos usando la CLI de EAS
Ejecuta los siguientes comandos desde la carpeta `mobile` para crear los secretos a nivel de proyecto en la nube:

```bash
# Inicia sesión en tu cuenta de Expo si no lo has hecho
npx eas login

# Configura las variables como EAS Secrets
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyBcFFyUlpsAmX2pmIThxpQHpRzQrDxJ75k"
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:643064542850:web:e629b56f030f98d885e69b"
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "minuta-f75a4.firebaseapp.com"
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "643064542850"
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "minuta-f75a4"
npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "minuta-f75a4.firebasestorage.app"
```

#### Opción 2: Crear secretos desde el Expo Dashboard (Web)
1. Ve a [expo.dev](https://expo.dev) e inicia sesión.
2. Selecciona el proyecto **mobile** (o **UniTask** con ID `25c81124-25af-486b-b1ce-2389369baaac`).
3. En el menú lateral, dirígete a **Project Settings** > **Secrets**.
4. Añade cada una de las variables con sus respectivos valores utilizando el prefijo `EXPO_PUBLIC_`.

#### Comando de compilación en la Nube:
Una vez configurados los secretos en Expo, ejecuta el comando para compilar el APK de prueba:

```bash
npx eas build --profile preview --platform android
```
* **`--profile preview`**: Utiliza la configuración de preview definida en `eas.json` (que compila en formato `.apk` en lugar de `.aab`).
* **`--platform android`**: Compila específicamente para dispositivos Android.

Al finalizar, EAS generará un código QR en la consola y un enlace de descarga en la web de Expo para descargar el APK directamente en tu teléfono.

---

### Método B: Compilación Local (`--local`)

Si deseas compilar el APK utilizando los recursos de tu propia máquina (requiere tener instalado **Android Studio**, **Android SDK** y **Java JDK** configurados en las variables de entorno de Windows), la CLI de EAS leerá directamente tu archivo `.env` local.

#### Comando de compilación local:
Desde la carpeta `mobile`, ejecuta:

```bash
npx eas build --profile preview --platform android --local
```

Este método no requiere subir credenciales a EAS Secrets ni realizar tareas en la nube de Expo. El archivo APK se generará directamente en la carpeta local del proyecto al finalizar el proceso.

---

## 📲 Instalación y Pruebas en el Dispositivo

1. **EAS Cloud**: Escanea el código QR que se muestra en la terminal al terminar el build, o accede al enlace proporcionado para descargar el APK.
2. **Instalación**: Habilita la instalación de aplicaciones de fuentes desconocidas en los ajustes de seguridad de tu teléfono Android si el instalador lo solicita.
3. **Actualización**: Puedes instalar la nueva versión encima de la anterior sin necesidad de desinstalarla, manteniendo los datos locales de la sesión del usuario.
