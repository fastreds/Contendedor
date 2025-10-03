// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { setupAngioTAC } from './angiotac.js';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDOnIBajCqzxOASHoorvGHMjrKAYmv4AtA",
    authDomain: "studio-4583592848-e1404.firebaseapp.com",
    projectId: "studio-4583592848-e1404",
    storageBucket: "studio-4583592848-e1404.firebasestorage.app",
    messagingSenderId: "73546578465",
    appId: "1:73546578465:web:e1edbfd83febc70acb8160"
};


// --- INICIALIZACIÓN DE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Se ejecuta cuando el DOM está completamente cargado para evitar errores de elementos nulos.
document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES Y ELEMENTOS DEL DOM ---
    let currentUserData = null; 

    const loginContainer = document.getElementById('login-container');
    const appContainer = document.getElementById('app-container');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const emailLoginForm = document.getElementById('email-login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    const viewTitle = document.getElementById('view-title');
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view-content');
    const userManagementLink = document.getElementById('user-management-link');
    const usersTableBody = document.getElementById('users-table-body');

    // Modales (referenciados desde index.html)
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const alertOkBtn = document.getElementById('alert-ok-btn');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmYesBtn = document.getElementById('confirm-yes-btn');
    const confirmNoBtn = document.getElementById('confirm-no-btn');

    let confirmResolve = null;

    // --- SISTEMA DE MODALES REUTILIZABLE ---

    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('flex');
    }

    alertOkBtn.addEventListener('click', () => {
        alertModal.classList.add('hidden');
        alertModal.classList.remove('flex');
    });

    function showConfirm(message) {
        confirmMessage.textContent = message;
        confirmModal.classList.remove('hidden');
        confirmModal.classList.add('flex');
        return new Promise(resolve => {
            confirmResolve = resolve;
        });
    }

    confirmYesBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
        if (confirmResolve) confirmResolve(true);
    });

    confirmNoBtn.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
        confirmModal.classList.remove('flex');
        if (confirmResolve) confirmResolve(false);
    });


    // --- MANEJO DE AUTENTICACIÓN ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                const newUserProfile = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.split('@')[0]}&background=random`,
                    role: "ASISTENTE"
                };
                await setDoc(userDocRef, newUserProfile);
                currentUserData = newUserProfile;
            } else {
                currentUserData = userDocSnap.data();
            }
            
            updateUIForUser(currentUserData);
            loginContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            setupNavigation();
            // Pasa las dependencias necesarias al módulo AngioTAC
            setupAngioTAC(db, storage, showAlert, showConfirm, () => currentUserData);

        } else {
            currentUserData = null;
            loginContainer.classList.remove('hidden');
            appContainer.classList.add('hidden');
        }
    });

    googleLoginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(error => {
            console.error("Error al iniciar sesión con Google:", error);
            showAlert("Hubo un problema al iniciar sesión con Google.");
        });
    });

    emailLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                } catch (createError) {
                    showAlert("No se pudo crear la cuenta. Inténtalo de nuevo.");
                }
            } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showAlert("La contraseña es incorrecta.");
            } else {
                showAlert("Ocurrió un error inesperado al iniciar sesión.");
            }
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });

    // --- UI Y NAVEGACIÓN ---
    function updateUIForUser(userData) {
        if (!userData) return;
        
        userPhoto.src = userData.photoURL;
        userName.textContent = userData.displayName;
        userRole.textContent = userData.role;

        if (userData.role === 'ADMINISTRADOR') {
            userManagementLink.classList.remove('hidden');
            loadUsersForAdmin();
        } else {
            userManagementLink.classList.add('hidden');
        }
    }

    function setupNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const viewId = link.dataset.view;
                showView(viewId);
            });
        });
        showView('dashboard');
    }

    function showView(viewId) {
        views.forEach(view => view.classList.add('hidden'));
        const activeView = document.getElementById(`${viewId}-view`);
        if (activeView) {
            activeView.classList.remove('hidden');
        }
        
        const viewTitles = {
            'dashboard': 'Dashboard',
            'angiotac': 'Módulo AngioTAC',
            'ultrasonido': 'Módulo Ultrasonido Carótidas',
            'user-management': 'Gestión de Usuarios'
        };
        viewTitle.textContent = viewTitles[viewId] || 'Dashboard';

        navLinks.forEach(link => {
            link.classList.toggle('bg-gray-700', link.dataset.view === viewId);
        });
    }

    // --- GESTIÓN DE USUARIOS (ADMIN) ---
    function loadUsersForAdmin() {
        const usersCollection = collection(db, "users");
        onSnapshot(usersCollection, (snapshot) => {
            usersTableBody.innerHTML = '';
            snapshot.forEach(doc => {
                const user = doc.data();
                const tr = document.createElement('tr');
                tr.className = 'border-b hover:bg-gray-50';
                tr.innerHTML = `
                    <td class="py-3 px-4 flex items-center">
                        <img src="${user.photoURL}" class="w-8 h-8 rounded-full mr-3">
                        <span>${user.displayName}</span>
                    </td>
                    <td class="py-3 px-4">${user.email}</td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${user.role}</span>
                    </td>
                    <td class="py-3 px-4">
                        <select data-uid="${user.uid}" class="role-select p-2 border rounded bg-white">
                            <option value="ADMINISTRADOR" ${user.role === 'ADMINISTRADOR' ? 'selected' : ''}>Administrador</option>
                            <option value="MÉDICO" ${user.role === 'MÉDICO' ? 'selected' : ''}>Médico</option>
                            <option value="ASISTENTE" ${user.role === 'ASISTENTE' ? 'selected' : ''}>Asistente</option>
                            <option value="SECRETARIO" ${user.role === 'SECRETARIO' ? 'selected' : ''}>Secretario</option>
                        </select>
                    </td>
                `;
                usersTableBody.appendChild(tr);
            });

            document.querySelectorAll('.role-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const newRole = e.target.value;
                    const uid = e.target.dataset.uid;
                    if (await showConfirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) {
                        const userDocRef = doc(db, "users", uid);
                        try {
                            await updateDoc(userDocRef, { role: newRole });
                            showAlert('Rol actualizado con éxito.');
                        } catch (error) {
                            showAlert('No se pudo actualizar el rol.');
                        }
                    } else {
                        loadUsersForAdmin(); // Revertir visualmente
                    }
                });
            });
        });
    }
});

// Fin de app.js