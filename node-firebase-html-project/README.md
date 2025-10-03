Plataforma de Reportes de Imágenes Médicas
Esta es una aplicación web modular diseñada para servir como un contenedor de herramientas para la gestión y reporte de estudios de imágenes médicas, como AngioTAC y Ultrasonidos. La aplicación utiliza Firebase para la autenticación y base de datos, y está construida con un frontend de HTML, TailwindCSS y JavaScript puro, servido por un servidor Express.js simple.

🚀 Características Principales
Autenticación Segura: Integración con Firebase Authentication (Login con Google).

Gestión de Roles: Sistema de roles (ADMINISTRADOR, MÉDICO, ASISTENTE, SECRETARIO) con permisos definidos a través de Reglas de Seguridad de Firestore.

Dashboard Centralizado: Una interfaz principal con un menú lateral para una navegación fluida entre los diferentes módulos.

Módulos de Estudios: Vistas dedicadas para diferentes tipos de estudios médicos (ej: AngioTAC, Ultrasonido Carótidas).

Gestión de Registros (CRUD): Funcionalidad completa para crear, leer, actualizar y eliminar registros de estudios médicos, que se almacenan en colecciones de Firestore.

Panel de Administración: Una sección exclusiva para administradores donde pueden ver la lista de usuarios y modificar sus roles.

Diseño Moderno: Interfaz limpia, minimalista y responsiva construida con TailwindCSS.

⚙️ Tecnologías Utilizadas
Backend: Node.js, Express.js

Frontend: HTML, CSS (TailwindCSS), JavaScript (ES Modules)

Base de Datos y Autenticación: Firebase (Firestore, Authentication)

Despliegue: Firebase Hosting

🔧 Pasos para la Instalación y Ejecución Local
Prerrequisitos
Tener instalado Node.js (versión 16 o superior).

Tener una cuenta de Firebase y haber creado un nuevo proyecto.

Tener instalado el Firebase CLI: npm install -g firebase-tools.

1. Configuración del Proyecto de Firebase
Ve a la consola de tu proyecto de Firebase.

Habilita Authentication y activa el proveedor de "Google".

Crea una base de datos de Firestore en modo de producción.

Ve a la "Configuración del proyecto" (Project Settings) > "Tus apps" (Your apps).

Crea una nueva "App web" y copia el objeto firebaseConfig.

2. Configuración Local
Clona o descarga este repositorio.

Pega tu firebaseConfig: Abre el archivo public/js/app.js y reemplaza el objeto firebaseConfig de ejemplo con el que copiaste de tu proyecto.

Instala las dependencias: Abre una terminal en la raíz del proyecto y ejecuta:

npm install

3. Ejecución del Servidor Local
Para iniciar el servidor de Express, ejecuta:

npm start

La aplicación estará disponible en http://localhost:3000.

☁️ Despliegue en Firebase Hosting
Inicia sesión en Firebase:

firebase login

Inicializa Firebase en tu proyecto (si no lo has hecho):
Asocia tu directorio local con tu proyecto de Firebase.

firebase init

Selecciona "Hosting: Configure files for Firebase Hosting...".

Elige el proyecto de Firebase que creaste.

Usa public como tu directorio público.

Configúralo como una "single-page app (rewrite all urls to /index.html)".

No sobrescribas los archivos existentes si te lo pregunta.

Despliega las Reglas de Seguridad de Firestore:
Asegúrate de que el archivo firestore.rules esté en tu directorio. Luego, en firebase.json, añade la configuración para firestore:

{
  "firestore": {
    "rules": "firestore.rules"
  },
  "hosting": {
    // ... tu configuración de hosting
  }
}

Luego, despliega las reglas:

firebase deploy --only firestore:rules

Despliega la aplicación:

firebase deploy --only hosting

Una vez completado, el CLI te proporcionará la URL donde tu aplicación está desplegada.