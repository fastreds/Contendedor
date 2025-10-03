// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    onSnapshot,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    where,
    serverTimestamp,
    arrayRemove,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDOnIBajCqzxOASHoorvGHMjrKAYmv4AtA",
    authDomain: "studio-4583592848-e1404.firebaseapp.com",
    projectId: "studio-4583592848-e1404",
    storageBucket: "studio-4583592848-e1404.appspot.com",
    messagingSenderId: "73546578465",
    appId: "1:73546578465:web:e1edbfd83febc70acb8160"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Estado Global
let currentUser = null;

// Elementos del DOM
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailLoginForm = document.getElementById('email-login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userPhoto = document.getElementById('user-photo');
const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const viewTitle = document.getElementById('view-title');
const userManagementLink = document.getElementById('user-management-link');
const modal = document.getElementById('study-modal');
const modalTitle = document.getElementById('modal-title');
const studyForm = document.getElementById('study-form');

// --- SISTEMA DE NOTIFICACIONES ---
/**
 * Muestra una notificación no bloqueante en la parte superior de la pantalla.
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - 'success' (verde) o 'error' (rojo).
 */
function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `fixed top-5 right-5 p-4 rounded-lg text-white shadow-lg z-50 fade-in ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s ease';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}


// --- MANEJO DE AUTENTICACIÓN ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await handleUserLogin(user);
    } else {
        currentUser = null;
        showLoginView();
    }
});

async function handleUserLogin(user) {
    const userDocRef = doc(db, 'users', user.uid);
    let userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        const newUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.email.split('@')[0]}&background=random`,
            role: 'MÉDICO'
        };
        await setDoc(userDocRef, newUser);
        userDocSnap = await getDoc(userDocRef);
    }
    
    currentUser = userDocSnap.data();
    updateUIForUser(currentUser);
    showAppView();
    setupNavigation(currentUser.role);
    showView('dashboard');
}

// ... (resto de funciones de autenticación sin cambios)
function updateUIForUser(userData) {
    userName.textContent = userData.displayName;
    userPhoto.src = userData.photoURL;
    userRole.textContent = userData.role;
    if (userData.role === 'ADMINISTRADOR') {
        userManagementLink.classList.remove('hidden');
    } else {
        userManagementLink.classList.add('hidden');
    }
}

function showLoginView() {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
}

function showAppView() {
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

googleLoginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .catch((error) => console.error("Error en login con Google:", error));
});

emailLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    loginError.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (signUpError) {
                if (signUpError.code === 'auth/email-already-in-use') {
                    loginError.textContent = 'La contraseña es incorrecta.';
                } else {
                    loginError.textContent = getFirebaseAuthErrorMessage(signUpError);
                }
                console.error("Error al registrar:", signUpError);
            }
        } else {
            loginError.textContent = getFirebaseAuthErrorMessage(error);
            console.error("Error al iniciar sesión:", error);
        }
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));


// --- NAVEGACIÓN Y VISTAS ---
function setupNavigation(role) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            showView(viewId, role);
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('bg-gray-700'));
            link.classList.add('bg-gray-700');
        });
    });
}

function showView(viewId, role) {
    document.querySelectorAll('.view-content').forEach(view => view.classList.add('hidden'));
    const activeView = document.getElementById(`${viewId}-view`);
    if (activeView) {
        activeView.classList.remove('hidden');
        viewTitle.textContent = getTitleForView(viewId);
        
        switch(viewId) {
            case 'angiotac':
                renderModuleUI('angiotac', 'AngioTAC', 'angiotac-view');
                break;
            case 'ultrasonido':
                renderModuleUI('ultrasonido', 'Ultrasonido Carótidas', 'ultrasonido-view');
                break;
            case 'user-management':
                if (role === 'ADMINISTRADOR') listenForUsers();
                break;
        }
    }
}

function getTitleForView(viewId) {
    const titles = {
        dashboard: 'Dashboard',
        angiotac: 'Estudios AngioTAC',
        ultrasonido: 'Estudios Ultrasonido Carótidas',
        'user-management': 'Gestión de Usuarios'
    };
    return titles[viewId] || 'Dashboard';
}

// --- LÓGICA DE MÓDULOS DE ESTUDIOS ---
function renderModuleUI(studyType, title, containerId) {
    const container = document.getElementById(containerId);
    const isAngioTac = studyType === 'angiotac';
    const tableHeaders = isAngioTac 
        ? ['Paciente', 'Fecha Estudio', 'Estudio', 'Estado Reporte', 'Acciones']
        : ['Paciente', 'Cédula', 'Estudio', 'Acciones'];
    
    container.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">${title}</h2>
                <button id="add-${studyType}-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    <i class="fas fa-plus mr-2"></i>Añadir Estudio
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-200">
                        <tr>
                            ${tableHeaders.map(h => `<th class="py-3 px-4 text-left">${h}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="${studyType}-table-body"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById(`add-${studyType}-btn`).addEventListener('click', () => openStudyModal(studyType, null, currentUser.role));
    listenForStudies(studyType, `${studyType}-table-body`);
}

function listenForStudies(studyType, tableBodyId) {
    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';
    const studiesCollection = collection(db, collectionName);
    onSnapshot(studiesCollection, (snapshot) => {
        const tableBody = document.getElementById(tableBodyId);
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            const colspan = studyType === 'angiotac' ? 5 : 4;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center py-4">No hay estudios registrados.</td></tr>`;
            return;
        }
        snapshot.forEach(doc => {
            renderStudyRow({ id: doc.id, ...doc.data() }, tableBodyId, studyType, currentUser.role);
        });
    });
}

function renderStudyRow(studyData, tableBodyId, studyType, userRole) {
    const tableBody = document.getElementById(tableBodyId);
    const row = document.createElement('tr');
    row.className = 'border-b';
    const isAngioTac = studyType === 'angiotac';
    const studyDate = studyData.studyDate ? new Date(studyData.studyDate.seconds * 1000).toLocaleDateString() : 'N/A';

    row.innerHTML = isAngioTac ? `
        <td class="py-3 px-4">${studyData.patientName}</td>
        <td class="py-3 px-4">${studyDate}</td>
        <td class="py-3 px-4">${studyData.studyName}</td>
        <td class="py-3 px-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${studyData.reportStatus === 'Completado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${studyData.reportStatus || 'N/A'}</span></td>
    ` : `
        <td class="py-3 px-4">${studyData.patientName}</td>
        <td class="py-3 px-4">${studyData.patientCedula}</td>
        <td class="py-3 px-4">${studyData.studyName}</td>
    `;
    
    const actionsCell = document.createElement('td');
    actionsCell.className = 'py-3 px-4';
    actionsCell.innerHTML = `
        <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="delete-btn text-red-500 hover:text-red-700 mr-2" title="Eliminar"><i class="fas fa-trash"></i></button>
        <button class="email-btn text-green-500 hover:text-green-700" title="Enviar por Correo"><i class="fas fa-envelope"></i></button>
        ${isAngioTac ? `<button class="log-btn text-gray-500 hover:text-gray-700 ml-1" title="Ver Bitácora de Envíos"><i class="fas fa-history"></i></button>` : ''}
    `;
    row.appendChild(actionsCell);
    tableBody.appendChild(row);

    // Event Listeners
    actionsCell.querySelector('.edit-btn').addEventListener('click', () => openStudyModal(studyType, studyData, userRole));
    actionsCell.querySelector('.delete-btn').addEventListener('click', () => deleteStudy(studyData.id, studyType));
    actionsCell.querySelector('.email-btn').addEventListener('click', () => sendStudyByEmail(studyData.id, studyType));
    if (isAngioTac) {
        actionsCell.querySelector('.log-btn').addEventListener('click', () => showEmailLog(studyData.id, studyType));
    }
}


// --- LÓGICA DEL MODAL DE ESTUDIOS (EXPANDIDO) ---
let currentFiles = [];

async function openStudyModal(studyType, studyData = null, userRole) {
    studyForm.reset();
    document.getElementById('study-id').value = '';
    document.getElementById('study-type').value = studyType;
    const isAngioTac = studyType === 'angiotac';
    currentFiles = studyData?.files || [];
    
    // Visibilidad de campos específicos de AngioTAC
    ['study-date', 'referring-physician', 'referring-physician-email', 'report-status', 'audit-info', 'file-upload'].forEach(id => {
        const el = document.getElementById(id).closest('.pt-4, div');
        if (el) el.style.display = isAngioTac ? 'block' : 'none';
    });
    
    if (studyData) {
        modalTitle.textContent = 'Editar Estudio';
        document.getElementById('study-id').value = studyData.id;
        document.getElementById('patient-name').value = studyData.patientName || '';
        document.getElementById('patient-cedula').value = studyData.patientCedula || '';
        document.getElementById('patient-phone').value = studyData.patientPhone || '';
        document.getElementById('patient-email').value = studyData.patientEmail || '';
        document.getElementById('study-name').value = studyData.studyName || '';

        if(isAngioTac) {
            document.getElementById('study-date').value = studyData.studyDate ? new Date(studyData.studyDate.seconds * 1000).toISOString().split('T')[0] : '';
            document.getElementById('referring-physician').value = studyData.referringPhysician || '';
            document.getElementById('referring-physician-email').value = studyData.referringPhysicianEmail || '';
            document.getElementById('report-status').value = studyData.reportStatus || 'Pendiente';
            renderAuditInfo(studyData.audit);
        }
    } else {
        modalTitle.textContent = 'Añadir Nuevo Estudio';
        if(isAngioTac) document.getElementById('report-status').value = 'Pendiente';
        document.getElementById('audit-info').innerHTML = '';
    }

    // Permisos para cambiar estado
    const reportStatusEl = document.getElementById('report-status');
    reportStatusEl.disabled = !['ADMINISTRADOR', 'MÉDICO'].includes(userRole);
    
    if (isAngioTac) renderAttachedFiles();

    modal.classList.add('flex');
    modal.classList.remove('hidden');
}

function renderAuditInfo(audit) {
    const auditInfoEl = document.getElementById('audit-info');
    auditInfoEl.innerHTML = '';
    if (!audit) return;
    if (audit.reportStatusLastModifiedBy) {
        auditInfoEl.innerHTML += `<p>Estado modificado por: ${audit.reportStatusLastModifiedBy} el ${new Date(audit.reportStatusLastModifiedAt.seconds * 1000).toLocaleString()}</p>`;
    }
}

function renderAttachedFiles() {
    const fileListEl = document.getElementById('file-list');
    fileListEl.innerHTML = '';
    currentFiles.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'flex items-center justify-between bg-gray-100 p-2 rounded';
        fileEl.innerHTML = `
            <a href="${file.url}" target="_blank" class="text-indigo-600 hover:underline text-sm truncate">${file.name}</a>
            <button type="button" class="delete-file-btn text-red-500 hover:text-red-700 ml-2">&times;</button>
        `;
        fileListEl.appendChild(fileEl);
        fileEl.querySelector('.delete-file-btn').addEventListener('click', () => deleteFile(file));
    });
}

function closeStudyModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

document.getElementById('close-modal-btn').addEventListener('click', closeStudyModal);
document.getElementById('cancel-modal-btn').addEventListener('click', closeStudyModal);
document.getElementById('file-upload').addEventListener('change', (e) => {
    // La carga se maneja al guardar
});

studyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-study-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    const saveSpinner = document.getElementById('save-spinner');

    saveBtn.disabled = true;
    saveBtnText.textContent = 'Guardando...';
    saveSpinner.classList.remove('hidden');

    const studyId = document.getElementById('study-id').value;
    const studyType = document.getElementById('study-type').value;
    const isAngioTac = studyType === 'angiotac';

    let studyData = {
        patientName: document.getElementById('patient-name').value,
        patientCedula: document.getElementById('patient-cedula').value,
        patientPhone: document.getElementById('patient-phone').value,
        patientEmail: document.getElementById('patient-email').value,
        studyName: document.getElementById('study-name').value,
    };
    
    if (isAngioTac) {
        const fileInput = document.getElementById('file-upload');
        const newFiles = Array.from(fileInput.files);
        const uploadedFiles = await Promise.all(newFiles.map(file => uploadFile(file, studyId || Date.now().toString())));
        const allFiles = [...currentFiles, ...uploadedFiles];

        const originalDoc = studyId ? (await getDoc(doc(db, 'angioTAC', studyId))).data() : {};
        const newStatus = document.getElementById('report-status').value;
        const audit = originalDoc.audit || {};
        if (originalDoc.reportStatus !== newStatus) {
            audit.reportStatusLastModifiedBy = currentUser.displayName;
            audit.reportStatusLastModifiedAt = serverTimestamp();
        }

        Object.assign(studyData, {
            studyDate: new Date(document.getElementById('study-date').value),
            referringPhysician: document.getElementById('referring-physician').value,
            referringPhysicianEmail: document.getElementById('referring-physician-email').value,
            reportStatus: newStatus,
            files: allFiles,
            audit: audit
        });
    }

    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';
    try {
        if (studyId) {
            await updateDoc(doc(db, collectionName, studyId), studyData);
        } else {
            await addDoc(collection(db, collectionName), studyData);
        }
        showNotification('Estudio guardado con éxito.', 'success');
        closeStudyModal();
    } catch (error) {
        console.error("Error guardando el estudio:", error);
        showNotification("Error al guardar. Revisa los permisos de Firestore y Storage (CORS).");
    } finally {
        saveBtn.disabled = false;
        saveBtnText.textContent = 'Guardar';
        saveSpinner.classList.add('hidden');
    }
});


// --- GESTIÓN DE ARCHIVOS CON STORAGE ---
async function uploadFile(file, studyId) {
    const filePath = `studies/${studyId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => { /* Progreso, se puede implementar una barra si se desea */ },
            (error) => reject(error),
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({
                    name: file.name,
                    url: downloadURL,
                    storagePath: filePath
                });
            }
        );
    });
}

async function deleteFile(fileToDelete) {
    if (!confirm(`¿Seguro que quieres eliminar el archivo ${fileToDelete.name}?`)) return;

    const studyId = document.getElementById('study-id').value;
    const studyType = document.getElementById('study-type').value;
    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';

    // Borrar de Storage
    const fileRef = ref(storage, fileToDelete.storagePath);
    await deleteObject(fileRef);

    // Borrar de Firestore
    const studyDocRef = doc(db, collectionName, studyId);
    await updateDoc(studyDocRef, {
        files: arrayRemove(fileToDelete)
    });
    
    // Actualizar UI
    currentFiles = currentFiles.filter(f => f.storagePath !== fileToDelete.storagePath);
    renderAttachedFiles();
}


// --- LÓGICA DE CORREO Y BITÁCORA ---
async function sendStudyByEmail(studyId, studyType) {
    if (!confirm("Esto simulará un envío de correo y registrará el evento. ¿Continuar?")) return;
    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';
    const studyDocRef = doc(db, collectionName, studyId);
    
    try {
        const studyDoc = await getDoc(studyDocRef);
        if(!studyDoc.exists()) throw new Error("Estudio no encontrado");
        const studyData = studyDoc.data();
        
        // Registrar en la bitácora (subcolección)
        const logCollectionRef = collection(db, collectionName, studyId, 'emailLog');
        await addDoc(logCollectionRef, {
            sentAt: serverTimestamp(),
            sentBy: currentUser.displayName,
            sentTo: studyData.patientEmail,
            status: "Exitoso (Simulado)"
        });

        // Actualizar el estado en el documento principal
        const audit = studyData.audit || {};
        audit.emailSentLastModifiedBy = currentUser.displayName;
        audit.emailSentLastModifiedAt = serverTimestamp();
        
        await updateDoc(studyDocRef, {
            emailSentStatus: "Enviado",
            audit: audit
        });

        showNotification("Envío de correo simulado y registrado.", "success");
    } catch (error) {
        console.error("Error al enviar correo:", error);
        showNotification("Error al simular el envío del correo.");
    }
}

async function showEmailLog(studyId, studyType) {
    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';
    const logCollectionRef = collection(db, collectionName, studyId, 'emailLog');
    const emailLogModal = document.getElementById('email-log-modal');
    const emailLogContent = document.getElementById('email-log-content');
    
    onSnapshot(query(logCollectionRef), (snapshot) => {
        emailLogContent.innerHTML = '';
        if (snapshot.empty) {
            emailLogContent.innerHTML = '<p class="text-gray-500">No hay registros de envío.</p>';
            return;
        }
        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        // Ordenar por fecha descendente
        logs.sort((a, b) => b.sentAt.seconds - a.sentAt.seconds);

        logs.forEach(log => {
            const logEl = document.createElement('div');
            logEl.className = 'border-b p-2';
            logEl.innerHTML = `
                <p><strong>Fecha:</strong> ${new Date(log.sentAt.seconds * 1000).toLocaleString()}</p>
                <p><strong>Enviado por:</strong> ${log.sentBy}</p>
                <p><strong>Destinatario:</strong> ${log.sentTo}</p>
                <p><strong>Estado:</strong> ${log.status}</p>
            `;
            emailLogContent.appendChild(logEl);
        });
    });

    emailLogModal.classList.remove('hidden');
    emailLogModal.classList.add('flex');
}

document.getElementById('close-email-log-btn').addEventListener('click', () => {
    document.getElementById('email-log-modal').classList.add('hidden');
    document.getElementById('email-log-modal').classList.remove('flex');
});


// --- OTRAS FUNCIONES (Eliminar, Gestión de usuarios, etc.) ---
async function deleteStudy(studyId, studyType) {
    if(!confirm('¿Estás seguro de que quieres eliminar este estudio? Se borrarán también los archivos adjuntos.')) return;
    
    const collectionName = studyType === 'angiotac' ? 'angioTAC' : 'ultrasonidoCarotidas';
    const docRef = doc(db, collectionName, studyId);

    // Si es AngioTAC, borrar archivos de Storage primero
    if (studyType === 'angiotac') {
        const studyDoc = await getDoc(docRef);
        const files = studyDoc.data()?.files || [];
        for (const file of files) {
            await deleteObject(ref(storage, file.storagePath));
        }
    }

    await deleteDoc(docRef);
}


function listenForUsers() {
    onSnapshot(collection(db, 'users'), (snapshot) => {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        snapshot.forEach(doc => renderUserRow(doc.data()));
    });
}

function renderUserRow(userData) {
    const tableBody = document.getElementById('users-table-body');
    const row = document.createElement('tr');
    row.className = 'border-b';
    const roles = ['ADMINISTRADOR', 'MÉDICO', 'ASISTENTE', 'SECRETARIO'];
    const selectOptions = roles.map(r => `<option value="${r}" ${userData.role === r ? 'selected' : ''}>${r}</option>`).join('');

    row.innerHTML = `
        <td class="py-3 px-4">${userData.displayName}</td>
        <td class="py-3 px-4">${userData.email}</td>
        <td class="py-3 px-4">${userData.role}</td>
        <td class="py-3 px-4">
            <select class="role-select p-2 border rounded" data-uid="${userData.uid}">
                ${selectOptions}
            </select>
        </td>
    `;
    tableBody.appendChild(row);

    row.querySelector('.role-select').addEventListener('change', async (e) => {
        const newRole = e.target.value;
        const uid = e.target.dataset.uid;
        await updateDoc(doc(db, 'users', uid), { role: newRole });
    });
}

function getFirebaseAuthErrorMessage(error) {
    switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'La contraseña es incorrecta o el usuario no existe.';
        case 'auth/user-not-found':
            return 'No se encontró ningún usuario con este correo.';
        case 'auth/email-already-in-use':
            return 'Este correo electrónico ya está en uso.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        default:
            return 'Ocurrió un error. Por favor, inténtalo de nuevo.';
    }
}


