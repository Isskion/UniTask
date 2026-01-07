# 📋 Weekly Tracker - Documentación Técnica Completa

## 🎯 Objetivo del Proyecto

**Weekly Tracker** (también conocido como **UniTaskController**) es una aplicación web diseñada para la **gestión inteligente de proyectos y tareas semanales**. Permite a equipos de trabajo:

- Registrar notas de reuniones semanales por proyecto
- Extraer automáticamente tareas y conclusiones mediante procesamiento de lenguaje natural (NLP)
- Gestionar proyectos y clientes con seguimiento de estado
- Administrar usuarios con sistema de roles y permisos
- Generar invitaciones de un solo uso para onboarding seguro

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js 16)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ AppWrapper  │→ │WeeklyEditor │  │ ProjectManagement   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         ↓               ↓                    ↓              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   AuthContext                       │    │
│  │         (Google Auth + Role Management)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                           ↓                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Firebase SDK                       │    │
│  │    ┌─────────┐  ┌─────────┐  ┌─────────────────┐    │    │
│  │    │ storage │  │ invites │  │  smartParser    │    │    │
│  │    └─────────┘  └─────────┘  └─────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Firebase)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Firestore   │  │    Auth     │  │   Security Rules    │  │
│  │ (NoSQL DB)  │  │  (Google)   │  │  (firestore.rules)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Categoría | Tecnología | Versión | Propósito |
|-----------|------------|---------|-----------|
| **Framework** | Next.js | 16.1.1 | App Router, Server Components, Turbopack |
| **Librería UI** | React | 19.2.3 | Componentes reactivos |
| **Estilos** | Tailwind CSS | 4.x | Utility-first CSS |
| **Iconos** | Lucide React | 0.562.0 | Iconografía SVG |
| **Fechas** | date-fns | 4.1.0 | Manipulación de fechas |
| **Backend** | Firebase | 10.12.0 | Auth + Firestore |
| **Lenguaje** | TypeScript | 5.x | Tipado estático |
| **Deploy** | Vercel | - | CI/CD + Hosting |

---

## 📁 Estructura del Proyecto

```
weekly-tracker/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout con AuthProvider
│   ├── page.tsx                 # Punto de entrada (renderiza AppWrapper)
│   ├── globals.css              # Estilos globales + Tailwind
│   ├── actions.ts               # Server Actions (legacy)
│   └── diagnostic-actions.ts    # Server Action para diagnóstico Firebase
│
├── components/                   # Componentes React
│   ├── AppWrapper.tsx           # Wrapper con lógica de autenticación
│   ├── WeeklyEditor.tsx         # Editor principal de entradas semanales
│   ├── ProjectManagement.tsx    # CRUD de proyectos globales
│   ├── UserManagement.tsx       # Gestión de usuarios y roles
│   └── FirebaseDiagnostic.tsx   # Herramienta de diagnóstico de conexión
│
├── context/                      # React Context
│   └── AuthContext.tsx          # Proveedor de autenticación global
│
├── lib/                          # Módulos de utilidad
│   ├── firebase.ts              # Configuración Firebase (singleton)
│   ├── storage.ts               # CRUD para weekly_entries
│   ├── invites.ts               # Sistema de códigos de invitación
│   ├── smartParser.ts           # Extractor NLP de tareas/conclusiones
│   └── utils.ts                 # Helpers (cn, formatDateId, etc.)
│
├── types.ts                      # Definiciones TypeScript globales
├── firestore.rules               # Reglas de seguridad Firestore
├── package.json                  # Dependencias y scripts
└── tsconfig.json                 # Configuración TypeScript
```

---

## 📊 Modelo de Datos

### Colecciones en Firestore

#### 1. `weekly_entries` - Entradas Semanales

```typescript
interface WeeklyEntry {
    id: string;           // Formato: YYYYMMDD (fecha del lunes de la semana)
    weekNumber: number;   // Número de semana ISO
    year: number;         // Año

    // Notas Globales (no asociadas a ningún proyecto)
    pmNotes: string;           // Notas del PM
    conclusions: string;       // Conclusiones extraídas
    nextWeekTasks: string;     // Tareas para la siguiente semana

    // Proyectos específicos de esta semana
    projects: ProjectEntry[];

    createdAt: string;    // Timestamp de creación
}

interface ProjectEntry {
    projectId?: string;   // ID del proyecto global (opcional, para enlazar)
    name: string;         // Nombre del proyecto (snapshot o fallback)
    pmNotes: string;      // Notas específicas del proyecto
    conclusions: string;  // Conclusiones del proyecto
    nextWeekTasks: string;// Tareas del proyecto
    status?: 'active' | 'trash';  // Estado en esta entrada
}
```

#### 2. `projects` - Proyectos Globales

```typescript
interface Project {
    id: string;           // ID Firestore (autogenerado)
    code: string;         // Código de negocio (ej: "PRJ-001")
    name: string;         // Nombre del cliente/proyecto
    color?: string;       // Color hex para badges (#FF5733)
    email?: string;       // Email de contacto
    phone?: string;       // Teléfono de contacto
    address?: string;     // Dirección
    isActive: boolean;    // Estado activo/inactivo
    createdAt?: Timestamp;// Fecha de creación
}
```

#### 3. `user` - Perfiles de Usuario

```typescript
interface UserProfile {
    uid: string;          // UID de Firebase Auth
    email: string;        // Email del usuario
    displayName: string;  // Nombre para mostrar
    photoURL?: string;    // URL de avatar (de Google)
    
    // Sistema de Roles
    role: 'app_admin' | 'global_pm' | 'consultor' | 'usuario_base' | 'usuario_externo';
    isActive: boolean;    // Si la cuenta está aprobada
    
    // Campos extendidos
    company?: string;     // Empresa
    jobTitle?: string;    // Cargo
    address?: string;     // Dirección
    phone?: string;       // Teléfono
    language?: string;    // Idioma preferido (es/en/fr)
    
    // Asignación de proyectos (solo para roles no-admin)
    assignedProjectIds?: string[];
    
    lastLogin?: Timestamp;
    createdAt?: Timestamp;
}
```

#### 4. `invites` - Códigos de Invitación

```typescript
interface InviteCode {
    code: string;         // Código alfanumérico (8 caracteres)
    createdBy: string;    // UID del admin que lo creó
    createdAt: Timestamp; // Fecha de creación
    isUsed: boolean;      // Si ya fue utilizado
    usedAt?: Timestamp;   // Fecha de uso
    usedBy?: string;      // UID del usuario que lo usó
    expiresAt?: Timestamp;// Expiración (opcional)
}
```

#### 5. `_diagnostic` - Diagnóstico (Desarrollo)

Colección temporal para tests de conectividad. Reglas abiertas (`allow read, write: if true`).

---

## 🔐 Sistema de Autenticación y Roles

### Flujo de Autenticación

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Usuario    │────▶│ Google Auth  │────▶│  AuthContext    │
│  (Browser)  │     │  (Firebase)  │     │  (onAuthChange) │
└─────────────┘     └──────────────┘     └─────────────────┘
                                                  │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    ▼                                                           ▼
           ┌────────────────┐                                         ┌─────────────────┐
           │ Usuario Existe │                                         │ Primer Login    │
           │ en Firestore?  │                                         │ (Crear perfil)  │
           └────────────────┘                                         └─────────────────┘
                    │                                                           │
                    ▼                                                           ▼
           ┌────────────────┐                                         ┌─────────────────┐
           │ Cargar rol y   │                                         │ ¿Tiene código   │
           │ estado activo  │                                         │ de invitación?  │
           └────────────────┘                                         └─────────────────┘
                                                                       │             │
                                                              (Sí)     ▼             ▼  (No)
                                                        ┌─────────────────┐   ┌─────────────┐
                                                        │ isActive=true   │   │isActive=false│
                                                        │ Consumir código │   │(Pendiente)   │
                                                        └─────────────────┘   └─────────────┘
```

### Jerarquía de Roles

| Rol | Código | Permisos |
|-----|--------|----------|
| **Admin App** | `app_admin` | Acceso total. Gestión de usuarios, proyectos, invitaciones. |
| **Global PM** | `global_pm` | Acceso a todos los proyectos. No puede gestionar usuarios. |
| **Consultor** | `consultor` | Acceso a proyectos asignados. Sin gestión. |
| **Equipo Base** | `usuario_base` | Acceso a proyectos asignados. Rol por defecto. |
| **Cliente** | `usuario_externo` | Acceso de solo lectura a proyectos asignados. |

### Reglas de Seguridad Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Entradas semanales - Solo usuarios autenticados
    match /weekly_entries/{entryId} {
      allow read, write: if request.auth != null;
    }

    // Invitaciones - Solo usuarios autenticados
    match /invites/{code} {
      allow read, write: if request.auth != null;
    }

    // Usuarios - Solo usuarios autenticados
    match /user/{userId} {
      allow read, write: if request.auth != null; 
    }
    
    // Diagnóstico - Abierto para debugging
    match /_diagnostic/{docId} {
      allow read, write: if true;
    }

    // Proyectos - Solo usuarios autenticados
    match /projects/{projectId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

> ⚠️ **Nota de Seguridad**: Las reglas actuales son permisivas para desarrollo. En producción, se recomienda añadir validaciones adicionales basadas en `request.auth.uid` y roles.

---

## 🧩 Componentes Principales

### 1. `AppWrapper.tsx`
**Propósito**: Punto de entrada principal que gestiona el estado de autenticación.

```
Estado: loading → Muestra spinner
Estado: !user   → Muestra pantalla de login con Google
Estado: user    → Renderiza WeeklyEditor + FirebaseDiagnostic
```

### 2. `WeeklyEditor.tsx` (921 líneas)
**Propósito**: Editor principal de entradas semanales.

**Funcionalidades**:
- Navegación por semanas (anterior/siguiente)
- Vista de calendario con fechas existentes
- Editor de notas por proyecto con tabs
- Extracción automática de tareas (NLP)
- Checkbox interactivo para marcar tareas completadas
- Migración de tareas incompletas a la siguiente semana
- Papelera de proyectos (soft delete)
- Persistencia en Firestore

**Funciones Clave**:
- `loadInitData()`: Carga proyectos y entradas existentes
- `handleAutoExtract()`: Invoca smartParser para NLP
- `handleSave()`: Persiste en Firestore
- `addProject()` / `moveProjectToTrash()` / `restoreProject()`
- `toggleTask()` / `migrateUnfinished()`
- `getVisibleProjects()`: Filtra proyectos según rol del usuario

### 3. `ProjectManagement.tsx` (337 líneas)
**Propósito**: CRUD completo de proyectos globales.

**Funcionalidades**:
- Listado con búsqueda
- Modal de creación/edición
- Toggle de estado activo/inactivo
- Campos: código, nombre, color, email, teléfono, dirección

### 4. `UserManagement.tsx` (606+ líneas)
**Propósito**: Panel de administración de usuarios.

**Funcionalidades**:
- Listado de usuarios con avatares
- Aprobación/rechazo de cuentas pendientes
- Cambio de roles
- Modal de edición de perfil completo
- Asignación de proyectos a usuarios
- Generación y gestión de invitaciones
- Eliminación de usuarios (solo super-admin)

### 5. `FirebaseDiagnostic.tsx`
**Propósito**: Herramienta de diagnóstico de conexión.

**Funcionalidades**:
- Test de lectura/escritura en Firestore (cliente)
- Test de conexión servidor (Server Action)
- Toggle de red online/offline
- Limpieza de caché IndexedDB
- **Auto-reparación de permisos** (hacerse admin en desarrollo)

---

## 🧠 Motor de Extracción NLP (`smartParser.ts`)

### Algoritmo de Parsing

El `parseNotes()` analiza texto libre para clasificar líneas en **tareas** o **conclusiones**.

#### Reglas de Detección de Tareas

1. **Keywords Explícitos**: `TODO`, `TAREA`, `HACER`, `PENDIENTE`, `ACTION`
2. **Checkboxes vacíos**: `[ ]`, `[]`
3. **Verbos de Acción al inicio**: `Enviar`, `Revisar`, `Crear`, `Llamar`, `Contactar`...
4. **Triggers Indirectos**: `Hay que`, `Tenemos que`, `Se debe`, `Falta`
5. **Inferencia de Reuniones**: `Hay una reunión`, `Tendremos un meeting`

#### Reglas de Detección de Conclusiones

1. **Keywords Explícitos**: `CONCLUSIÓN`, `DECISIÓN`, `NOTA`, `IMPORTANTE`, `!`
2. **Tareas Completadas**: `[x]` → `Completado: ...`
3. **Fallback**: Líneas con bullet points no clasificadas como tareas

#### Ejemplo

**Input**:
```
- Revisar el contrato con legal
- Se acordó usar React
- TODO: actualizar documentación
- [x] Llamada con cliente completada
- Hay una reunión el viernes
```

**Output**:
```typescript
{
  conclusions: "- Se acordó usar React\n- Completado: Llamada con cliente completada",
  nextWeekTasks: "- Revisar el contrato con legal\n- Actualizar documentación\n- Seguimiento/Asistir: Hay una reunión el viernes"
}
```

---

## 🚀 Scripts de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo local (Turbopack)
npm run dev

# Build de producción
npm run build

# Iniciar servidor de producción
npm start

# Lint
npm run lint
```

### Script de Instalación Rápida (Windows)

El archivo `instalar_y_arrancar.bat` automatiza:
1. `npm install`
2. `npm run dev`

---

## 🌐 Despliegue en Vercel

### Variables de Entorno Requeridas

Archivo `.env.local` (no incluir en Git):

```env
# Firebase Config (ya incluida en código, pero puede externalizarse)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=minuta-f75a4.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=minuta-f75a4
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=minuta-f75a4.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=643064542850
NEXT_PUBLIC_FIREBASE_APP_ID=1:643064542850:web:e629b56f030f98d885e69b
```

### Configuración de Firebase Console

1. **Authentication** > Settings > Authorized Domains:
   - Añadir `localhost`
   - Añadir dominio de Vercel (`weekly-tracker-xxx.vercel.app`)

2. **Firestore** > Rules:
   - Copiar contenido de `firestore.rules`

3. **Firestore** > Indexes (si hay consultas complejas):
   - Crear índices según errores en consola

---

## 🔧 Resolución de Problemas Comunes

### "Error al iniciar sesión"

**Causa**: Dominio no autorizado en Firebase.

**Solución**:
1. Firebase Console > Authentication > Settings
2. Añadir dominio a "Authorized domains"

### "Acceso Restringido" tras login

**Causa**: Usuario no tiene rol `app_admin` o cuenta inactiva.

**Solución**:
1. Usar botón "Diagnóstico ⚡" (esquina inferior derecha)
2. Click en "Reparar Permisos (Hacerme Admin)"
3. Refrescar página

### Servidor local no responde

**Causa**: `npm run dev` no está ejecutándose.

**Solución**:
```bash
cd weekly-tracker
npm run dev
```

---

## 📝 Licencia y Autoría

Desarrollado por el equipo de [tu organización].

**Versión**: 0.1.0  
**Última actualización**: Enero 2026

---

## 📚 Referencias

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS 4](https://tailwindcss.com/docs)
- [date-fns](https://date-fns.org/docs)
