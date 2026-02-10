# UniTask - Stack Tecnológico

## 🎯 Resumen Ejecutivo

| Capa | Tecnología Principal |
|------|---------------------|
| **Frontend** | Next.js 16 + React 19 + TailwindCSS 4 |
| **Backend** | Firebase Cloud Functions (Node.js 20) |
| **Base de Datos** | Firestore |
| **Autenticación** | Firebase Authentication |
| **Hosting** | Vercel (Frontend) + Firebase (Functions) |
| **IA** | Google Gemini API |

---

## 📦 Frontend (Cliente)

### Core Framework
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | 16.1.4 | Framework React con SSR/Static Export |
| **React** | 19.2.3 | UI Library |
| **TypeScript** | 5.x | Tipado estático |

### Estilos y UI
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **TailwindCSS** | 4.x | Framework CSS utility-first |
| **tailwind-merge** | 3.4.0 | Merge de clases Tailwind |
| **clsx** | 2.1.1 | Utilidad para classNames condicionales |
| **lucide-react** | 0.562.0 | Iconos SVG |

### Componentes UI Avanzados
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **@radix-ui/react-popover** | 1.1.15 | Popovers accesibles |
| **cmdk** | 1.1.1 | Command palette (búsqueda) |
| **@tiptap/react** | 3.14.0 | Editor de texto enriquecido (Knowledge Base) |
| **recharts** | 3.6.0 | Gráficos y visualizaciones |
| **react-markdown** | 9.0.3 | Renderizado de Markdown |

### Drag & Drop
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **@dnd-kit/core** | 6.3.1 | Sistema de drag & drop |
| **@dnd-kit/sortable** | 10.0.0 | Ordenación por arrastre (Kanban) |

### Procesamiento de Documentos
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **pdfjs-dist** | 5.4.530 | Extracción de texto de PDFs (cliente) |
| **react-pdf** | 10.3.0 | Visualización de PDFs |
| **papaparse** | 5.5.3 | Parsing de CSV |
| **mammoth** | 1.11.0 | Conversión Word → HTML |

### Fechas
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **date-fns** | 4.1.0 | Manipulación y formato de fechas |

---

## 🔥 Firebase (Backend as a Service)

### Servicios Firebase
| Servicio | Uso |
|----------|-----|
| **Firestore** | Base de datos NoSQL (usuarios, tareas, proyectos, tenants) |
| **Authentication** | Google OAuth + Email/Password |
| **Cloud Functions** | Lógica de servidor (IA, emails, procesamiento) |
| **Hosting** | Hosting estático (alternativo a Vercel) |
| **Storage** | Almacenamiento de archivos |

### SDKs Firebase
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **firebase** | 12.8.0 | SDK cliente web |
| **firebase-admin** | 12.7.0 (client) / 11.8.0 (functions) | SDK servidor |
| **firebase-functions** | 7.0.5 (client) / 4.3.0 (functions) | Cloud Functions |

---

## 🤖 Inteligencia Artificial

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **@google/generative-ai** | 0.24.1 | Google Gemini API |
| **@ai-sdk/google** | 3.0.2 | Vercel AI SDK para Google |
| **ai** | 6.0.6 | Vercel AI SDK genérico |

### Funciones IA (Cloud Functions - europe-west1)
| Función | Propósito |
|---------|-----------|
| `summarizeNotes` | Extrae tareas de notas diarias |
| `analyzeDocumentStructure` | Analiza estructura de plantillas |
| `analyzePdf` | Extrae texto de PDFs |
| `chat` | Asistente de IA conversacional |

---

## 📧 Comunicaciones

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **nodemailer** | 7.0.12 | Envío de emails (invitaciones, notificaciones) |

---

## 🧪 Testing y Desarrollo

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Jest** | 30.2.0 | Framework de testing |
| **ESLint** | 9.x | Linting de código |
| **@firebase/rules-unit-testing** | 5.0.0 | Testing de reglas Firestore |
| **firebase-tools** | 15.2.1 | CLI de Firebase |

---

## 🚀 Despliegue

### Producción
| Plataforma | Uso |
|------------|-----|
| **Vercel** | Frontend (weekly-tracker-seven.vercel.app) |
| **Firebase** | Cloud Functions (europe-west1) |
| **Firebase** | Firestore, Auth, Storage |

### Configuración
| Archivo | Propósito |
|---------|-----------|
| `vercel.json` | Configuración Vercel |
| `firebase.json` | Configuración Firebase (hosting, functions, firestore) |
| `firestore.rules` | Reglas de seguridad Firestore |
| `storage.rules` | Reglas de seguridad Storage |

---

## 📁 Estructura de Directorios

```
UniTask/
├── app/                    # Next.js App Router (páginas y server actions)
│   └── actions/            # Server Actions (chat-assistant.ts, analyze-document.ts)
├── components/             # Componentes React
├── context/                # Contextos React (AuthContext)
├── hooks/                  # Custom hooks (useTheme, useFileUploader)
├── lib/                    # Utilidades y servicios
│   ├── firebase.ts         # Inicialización Firebase
│   ├── security/           # Prompt Guards, validación
│   └── *.ts                # Helpers (tasks, projects, invites)
├── functions/              # Firebase Cloud Functions
│   └── src/                # Código TypeScript de funciones
├── types/                  # Definiciones TypeScript
└── public/                 # Assets estáticos
```

---

## 🔐 Seguridad

| Capa | Implementación |
|------|----------------|
| **Autenticación** | Firebase Auth (Google OAuth + Email) |
| **Autorización** | Custom Claims + Firestore Rules |
| **Roles** | Usuario Externo → Team Member → Consultant → PM → Admin → SuperAdmin |
| **Multi-tenancy** | Aislamiento por `tenantId` en todas las colecciones |
| **Invitaciones** | Códigos de invitación con expiración (10 días) |
| **Registro** | Bloqueado sin invitación válida |
