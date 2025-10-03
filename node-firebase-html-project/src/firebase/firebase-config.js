// Importa las funciones que necesitas de los SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

// Tu configuración de la app web de Firebase
// REEMPLAZA ESTO CON LA CONFIGURACIÓN REAL DE TU PROYECTO
const firebaseConfig = {
  apiKey: "AIzaSyDOnIBajCqzxOASHoorvGHMjrKAYmv4AtA",
  authDomain: "studio-4583592848-e1404.firebaseapp.com",
  projectId: "studio-4583592848-e1404",
  storageBucket: "studio-4583592848-e1404.firebasestorage.app",
  messagingSenderId: "73546578465",
  appId: "1:73546578465:web:e1edbfd83febc70acb8160"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);

// Exporta los servicios de Firebase para usarlos en otros módulos
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
