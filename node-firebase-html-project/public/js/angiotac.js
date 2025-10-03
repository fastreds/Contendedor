// public/js/angiotac.js

// Importaciones de Firebase necesarias para este módulo
import { 
    doc,
    getDoc,
    collection,
    onSnapshot,
    addDoc,
    deleteDoc,
    updateDoc,
    query,
    serverTimestamp,
    arrayRemove,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Estado local del módulo
let db, storage, currentUser;
let currentFiles = [];

// --- RENDERIZADO DE LA UI DEL MÓDULO ---

function renderUI(containerId) {
    const container = document.getElementById(containerId);
    const tableHeaders = ['Paciente', 'Fecha Estudio', 'Estudio', 'Estado Reporte', 'Acciones'];
    
    container.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Estudios AngioTAC</h2>
                <button id="add-angiotac-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
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
                    <tbody id="angiotac-table-body"></tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('add-angiotac-btn').addEventListener('click', () => openStudyModal(null));
    listenForStudies();
}

// --- LÓGICA DE FIRESTORE ---

function listenForStudies() {
    const studiesCollection = collection(db, 'angioTAC');
    onSnapshot(studiesCollection, (snapshot) => {
        const tableBody = document.getElementById('angiotac-table-body');
        tableBody.innerHTML = '';
        if (snapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No hay estudios registrados.</td></tr>`;
            return;
        }
        snapshot.forEach(doc => {
            renderStudyRow({ id: doc.id, ...doc.data() });
        });
    });
}

function renderStudyRow(studyData) {
    const tableBody = document.getElementById('angiotac-table-body');
    const row = document.createElement('tr');
    row.className = 'border-b';
    const studyDate = studyData.studyDate ? new Date(studyData.studyDate.seconds * 1000).toLocaleDateString() : 'N/A';

    row.innerHTML = `
        <td class="py-3 px-4">${studyData.patientName}</td>
        <td class="py-3 px-4">${studyDate}</td>
        <td class="py-3 px-4">${studyData.studyName}</td>
        <td class="py-3 px-4"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${studyData.reportStatus === 'Completado' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${studyData.reportStatus || 'N/A'}</span></td>
    `;
    
    const actionsCell = document.createElement('td');
    actionsCell.className = 'py-3 px-4';
    actionsCell.innerHTML = `
        <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="delete-btn text-red-500 hover:text-red-700 mr-2" title="Eliminar"><i class="fas fa-trash"></i></button>
        <button class="email-btn text-green-500 hover:text-green-700" title="Enviar por Correo"><i class="fas fa-envelope"></i></button>
        <button class="log-btn text-gray-500 hover:text-gray-700 ml-1" title="Ver Bitácora de Envíos"><i class="fas fa-history"></i></button>
    `;
    row.appendChild(actionsCell);
    tableBody.appendChild(row);

    // Event Listeners
    actionsCell.querySelector('.edit-btn').addEventListener('click', () => openStudyModal(studyData));
    actionsCell.querySelector('.delete-btn').addEventListener('click', () => deleteStudy(studyData));
    actionsCell.querySelector('.email-btn').addEventListener('click', () => sendStudyByEmail(studyData.id));
    actionsCell.querySelector('.log-btn').addEventListener('click', () => showEmailLog(studyData.id));
}

// --- LÓGICA DEL MODAL ---

async function openStudyModal(studyData = null) {
    const studyForm = document.getElementById('study-form');
    const modal = document.getElementById('study-modal');
    studyForm.reset();
    document.getElementById('study-id').value = '';
    document.getElementById('study-type').value = 'angiotac';
    currentFiles = studyData?.files || [];
    
    // Mostrar campos específicos de AngioTAC
     ['study-date', 'referring-physician', 'referring-physician-email', 'report-status', 'audit-info', 'file-upload'].forEach(id => {
        const el = document.getElementById(id)?.closest('.pt-4, div');
        if (el) el.style.display = 'block';
    });
    
    if (studyData) {
        document.getElementById('modal-title').textContent = 'Editar Estudio AngioTAC';
        document.getElementById('study-id').value = studyData.id;
        document.getElementById('patient-name').value = studyData.patientName || '';
        document.getElementById('patient-cedula').value = studyData.patientCedula || '';
        document.getElementById('patient-phone').value = studyData.patientPhone || '';
        document.getElementById('patient-email').value = studyData.patientEmail || '';
        document.getElementById('study-name').value = studyData.studyName || '';
        document.getElementById('study-date').value = studyData.studyDate ? new Date(studyData.studyDate.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('referring-physician').value = studyData.referringPhysician || '';
        document.getElementById('referring-physician-email').value = studyData.referringPhysicianEmail || '';
        document.getElementById('report-status').value = studyData.reportStatus || 'Pendiente';
        renderAuditInfo(studyData.audit);
    } else {
        document.getElementById('modal-title').textContent = 'Añadir Nuevo Estudio AngioTAC';
        document.getElementById('report-status').value = 'Pendiente';
        document.getElementById('audit-info').innerHTML = '';
    }

    const reportStatusEl = document.getElementById('report-status');
    reportStatusEl.disabled = !['ADMINISTRADOR', 'MÉDICO'].includes(currentUser.role);
    
    renderAttachedFiles();

    modal.classList.add('flex');
    modal.classList.remove('hidden');
}

function renderAuditInfo(audit) {
    const auditInfoEl = document.getElementById('audit-info');
    auditInfoEl.innerHTML = '';
    if (!audit) return;
    if (audit.reportStatusLastModifiedBy) {
        auditInfoEl.innerHTML += `<p class="text-xs text-gray-500">Estado modificado por: ${audit.reportStatusLastModifiedBy} el ${new Date(audit.reportStatusLastModifiedAt.seconds * 1000).toLocaleString()}</p>`;
    }
     if (audit.emailSentLastModifiedBy) {
        auditInfoEl.innerHTML += `<p class="text-xs text-gray-500">Envío modificado por: ${audit.emailSentLastModifiedBy} el ${new Date(audit.emailSentLastModifiedAt.seconds * 1000).toLocaleString()}</p>`;
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
            <button type="button" class="delete-file-btn text-red-500 hover:text-red-700 ml-2" data-storage-path="${file.storagePath}">&times;</button>
        `;
        fileListEl.appendChild(fileEl);
    });
}

// Delegación de eventos para los botones de eliminar archivo
document.getElementById('file-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-file-btn')) {
        const storagePath = e.target.dataset.storagePath;
        const fileToDelete = currentFiles.find(f => f.storagePath === storagePath);
        if (fileToDelete) {
            deleteFile(fileToDelete);
        }
    }
});


// --- LÓGICA DE STORAGE Y ARCHIVOS ---

async function uploadFile(file, studyId) {
    const filePath = `studies/${studyId}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            () => {}, 
            (error) => reject(error), 
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve({ name: file.name, url: downloadURL, storagePath: filePath });
            }
        );
    });
}

async function deleteFile(fileToDelete) {
    if (!confirm(`¿Seguro que quieres eliminar el archivo ${fileToDelete.name}?`)) return;
    const studyId = document.getElementById('study-id').value;
    if (!studyId) {
        alert("No se puede eliminar un archivo de un estudio no guardado.");
        return;
    }
    
    // Borrar de Storage
    await deleteObject(ref(storage, fileToDelete.storagePath));
    // Borrar de Firestore
    await updateDoc(doc(db, 'angioTAC', studyId), { files: arrayRemove(fileToDelete) });
    
    // La UI se actualizará automáticamente por el listener de onSnapshot
}


// --- LÓGICA DE CORREO Y BITÁCORA ---

async function sendStudyByEmail(studyId) {
    if (!confirm("Esto simulará un envío de correo y registrará el evento. ¿Continuar?")) return;
    const studyDocRef = doc(db, 'angioTAC', studyId);
    
    try {
        const studyDoc = await getDoc(studyDocRef);
        if(!studyDoc.exists()) throw new Error("Estudio no encontrado");
        const studyData = studyDoc.data();
        
        await addDoc(collection(db, 'angioTAC', studyId, 'emailLog'), {
            sentAt: serverTimestamp(),
            sentBy: currentUser.displayName,
            sentTo: studyData.patientEmail,
            status: "Exitoso (Simulado)"
        });

        const audit = studyData.audit || {};
        audit.emailSentLastModifiedBy = currentUser.displayName;
        audit.emailSentLastModifiedAt = serverTimestamp();
        
        await updateDoc(studyDocRef, { emailSentStatus: "Enviado", audit: audit });
        alert("Envío de correo simulado y registrado.");
    } catch (error) {
        console.error("Error al enviar correo:", error);
        alert("Error al simular el envío.");
    }
}

async function showEmailLog(studyId) {
    const logCollectionRef = collection(db, 'angioTAC', studyId, 'emailLog');
    const emailLogModal = document.getElementById('email-log-modal');
    const emailLogContent = document.getElementById('email-log-content');
    
    onSnapshot(query(logCollectionRef), (snapshot) => {
        emailLogContent.innerHTML = snapshot.empty ? '<p class="text-gray-500">No hay registros de envío.</p>' : '';
        const logs = [];
        snapshot.forEach(doc => logs.push(doc.data()));
        logs.sort((a, b) => b.sentAt.seconds - a.sentAt.seconds);
        logs.forEach(log => {
            const logEl = document.createElement('div');
            logEl.className = 'border-b p-2';
            logEl.innerHTML = `<p><strong>Fecha:</strong> ${new Date(log.sentAt.seconds * 1000).toLocaleString()}</p><p><strong>Enviado por:</strong> ${log.sentBy}</p><p><strong>Destinatario:</strong> ${log.sentTo}</p><p><strong>Estado:</strong> ${log.status}</p>`;
            emailLogContent.appendChild(logEl);
        });
    });

    emailLogModal.classList.remove('hidden');
    emailLogModal.classList.add('flex');
}

// --- ACCIONES CRUD ---

async function handleFormSubmit(e) {
    e.preventDefault();
    if (document.getElementById('study-type').value !== 'angiotac') return;

    const saveBtn = document.getElementById('save-study-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    const saveSpinner = document.getElementById('save-spinner');

    saveBtn.disabled = true;
    saveBtnText.textContent = 'Guardando...';
    saveSpinner.classList.remove('hidden');

    const studyId = document.getElementById('study-id').value;
    const fileInput = document.getElementById('file-upload');
    const newFiles = Array.from(fileInput.files);
    
    try {
        // Si es un nuevo estudio, primero lo creamos para tener un ID
        let docRef;
        let finalStudyId = studyId;
        if (!studyId) {
            const tempDoc = await addDoc(collection(db, 'angioTAC'), { patientName: 'Cargando...' });
            finalStudyId = tempDoc.id;
            docRef = tempDoc;
        } else {
            docRef = doc(db, 'angioTAC', studyId);
        }

        const uploadedFiles = await Promise.all(newFiles.map(file => uploadFile(file, finalStudyId)));
        const allFiles = [...currentFiles, ...uploadedFiles];

        const originalDoc = studyId ? (await getDoc(docRef)).data() : {};
        const newStatus = document.getElementById('report-status').value;
        const audit = originalDoc.audit || {};
        if (originalDoc.reportStatus !== newStatus) {
            audit.reportStatusLastModifiedBy = currentUser.displayName;
            audit.reportStatusLastModifiedAt = serverTimestamp();
        }

        const studyData = {
            patientName: document.getElementById('patient-name').value,
            patientCedula: document.getElementById('patient-cedula').value,
            patientPhone: document.getElementById('patient-phone').value,
            patientEmail: document.getElementById('patient-email').value,
            studyName: document.getElementById('study-name').value,
            studyDate: new Date(document.getElementById('study-date').value),
            referringPhysician: document.getElementById('referring-physician').value,
            referringPhysicianEmail: document.getElementById('referring-physician-email').value,
            reportStatus: newStatus,
            files: allFiles,
            audit: audit
        };

        await updateDoc(docRef, studyData);
        document.getElementById('study-modal').classList.add('hidden');
    } catch (error) {
        console.error("Error guardando el estudio:", error);
        alert("Error al guardar el estudio.");
    } finally {
        saveBtn.disabled = false;
        saveBtnText.textContent = 'Guardar';
        saveSpinner.classList.add('hidden');
    }
}


async function deleteStudy(studyData) {
    if(!confirm('¿Estás seguro de que quieres eliminar este estudio? Se borrarán también los archivos adjuntos.')) return;
    
    // Borrar archivos de Storage primero
    const files = studyData.files || [];
    for (const file of files) {
        await deleteObject(ref(storage, file.storagePath));
    }

    await deleteDoc(doc(db, 'angioTAC', studyData.id));
}

// --- FUNCIÓN DE INICIALIZACIÓN DEL MÓDULO ---

export function initializeAngioTAC(firestoreDb, firebaseStorage, user) {
    db = firestoreDb;
    storage = firebaseStorage;
    currentUser = user;
    renderUI('angiotac-view');

    // Nos aseguramos de que el listener del formulario solo se añada una vez
    const studyForm = document.getElementById('study-form');
    // Clonamos y reemplazamos para remover listeners viejos
    const newForm = studyForm.cloneNode(true);
    studyForm.parentNode.replaceChild(newForm, studyForm);
    newForm.addEventListener('submit', handleFormSubmit);
}
