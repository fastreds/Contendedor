// Importaciones de Firebase específicas para este módulo
import { collection, doc, addDoc, onSnapshot, getDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// La función principal que configura todo el módulo.
// Se añade 'export' para que pueda ser importada desde app.js
export function setupAngioTAC(db, storage, showAlert, showConfirm, getCurrentUser) {
    const angioTACView = document.getElementById('angiotac-view');
    
    // Plantilla HTML para la vista del módulo.
    const viewHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Registros de AngioTAC</h2>
                <button id="add-study-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center">
                    <i class="fas fa-plus mr-2"></i>Añadir Estudio
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-3 px-4 text-left">Paciente</th>
                            <th class="py-3 px-4 text-left">Cédula</th>
                            <th class="py-3 px-4 text-left">Fecha Estudio</th>
                            <th class="py-3 px-4 text-left">Estado Reporte</th>
                            <th class="py-3 px-4 text-left">Correo Enviado</th>
                            <th class="py-3 px-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="angiotac-table-body">
                        <!-- Los datos se insertarán aquí -->
                    </tbody>
                </table>
            </div>
        </div>
    `;
    angioTACView.innerHTML = viewHTML;

    // --- ELEMENTOS DEL DOM ESPECÍFICOS DE ANGIOTAC ---
    const addStudyBtn = document.getElementById('add-study-btn');
    const angioTACTableBody = document.getElementById('angiotac-table-body');
    const studyModal = document.getElementById('study-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const studyForm = document.getElementById('study-form');
    const modalTitle = document.getElementById('modal-title');
    const studyIdInput = document.getElementById('study-id');
    const fileUploadInput = document.getElementById('file-upload');
    const fileListContainer = document.getElementById('file-list');
    const saveStudyBtn = document.getElementById('save-study-btn');
    const saveBtnText = document.getElementById('save-btn-text');
    const saveSpinner = document.getElementById('save-spinner');
    const reportStatusSelect = document.getElementById('report-status');
    const auditInfo = document.getElementById('audit-info');
    const emailLogModal = document.getElementById('email-log-modal');
    const closeEmailLogBtn = document.getElementById('close-email-log-btn');
    const emailLogContent = document.getElementById('email-log-content');

    const studiesCollection = collection(db, "angioTAC");
    let localFiles = []; // Almacenará los archivos a subir o eliminar

    // --- LÓGICA DEL MÓDULO ---

    /** Carga y muestra los estudios desde Firestore en tiempo real. */
    const loadAngioTACStudies = () => {
        const q = query(studiesCollection, orderBy("studyDate", "desc"));
        onSnapshot(q, (snapshot) => {
            angioTACTableBody.innerHTML = '';
            snapshot.forEach(doc => {
                const study = doc.data();
                const tr = document.createElement('tr');
                tr.className = 'border-b hover:bg-gray-50';
                
                const reportStatusColor = study.reportStatus === 'Completado' ? 'bg-green-100 text-green-800' : 
                                          study.reportStatus === 'En Proceso' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800';

                const emailStatusColor = study.emailSentStatus === 'Enviado' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

                tr.innerHTML = `
                    <td class="py-3 px-4 font-medium">${study.patientName}</td>
                    <td class="py-3 px-4">${study.patientCedula}</td>
                    <td class="py-3 px-4">${study.studyDate}</td>
                    <td class="py-3 px-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${reportStatusColor}">${study.reportStatus || 'N/A'}</span></td>
                    <td class="py-3 px-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${emailStatusColor}">${study.emailSentStatus || 'No Enviado'}</span></td>
                    <td class="py-3 px-4 text-center">
                        <button class="edit-btn text-blue-500 hover:text-blue-700 mr-2" data-id="${doc.id}"><i class="fas fa-pencil-alt"></i></button>
                        <button class="delete-btn text-red-500 hover:text-red-700 mr-2" data-id="${doc.id}"><i class="fas fa-trash-alt"></i></button>
                        <button class="email-btn text-green-500 hover:text-green-700 mr-2" data-id="${doc.id}"><i class="fas fa-envelope"></i></button>
                        <button class="log-btn text-gray-500 hover:text-gray-700" data-id="${doc.id}"><i class="fas fa-history"></i></button>
                    </td>
                `;
                angioTACTableBody.appendChild(tr);
            });
        });
    };
    
    /** Abre el modal para crear o editar un estudio. */
    const openStudyModal = async (studyId = null) => {
        studyForm.reset();
        studyIdInput.value = '';
        fileListContainer.innerHTML = '';
        auditInfo.innerHTML = '';
        localFiles = [];
        const user = getCurrentUser();

        // Habilitar/deshabilitar el selector de estado según el rol
        const isAllowedToChangeStatus = user.role === 'ADMINISTRADOR' || user.role === 'MÉDICO';
        reportStatusSelect.disabled = !isAllowedToChangeStatus;

        if (studyId) {
            modalTitle.textContent = 'Editar Estudio AngioTAC';
            const studyDocRef = doc(db, "angioTAC", studyId);
            const studyDocSnap = await getDoc(studyDocRef);
            if (studyDocSnap.exists()) {
                const data = studyDocSnap.data();
                studyIdInput.value = studyId;
                document.getElementById('patient-name').value = data.patientName;
                document.getElementById('patient-cedula').value = data.patientCedula;
                document.getElementById('patient-phone').value = data.patientPhone || '';
                document.getElementById('patient-email').value = data.patientEmail;
                document.getElementById('study-name').value = data.studyName;
                document.getElementById('study-date').value = data.studyDate;
                document.getElementById('referring-physician').value = data.referringPhysician || '';
                document.getElementById('referring-physician-email').value = data.referringPhysicianEmail || '';
                reportStatusSelect.value = data.reportStatus || 'Pendiente';

                // Mostrar información de auditoría
                if (data.audit?.reportStatusLastModifiedBy) {
                    const date = data.audit.reportStatusLastModifiedAt.toDate().toLocaleString();
                    auditInfo.innerHTML = `<p>Estado modificado por: <b>${data.audit.reportStatusLastModifiedBy}</b> el ${date}</p>`;
                }

                localFiles = data.files || [];
                renderFileList();
            }
        } else {
            modalTitle.textContent = 'Añadir Nuevo Estudio AngioTAC';
        }
        studyModal.classList.remove('hidden');
        studyModal.classList.add('flex');
    };

    /** Cierra el modal de estudio. */
    const closeStudyModal = () => {
        studyModal.classList.add('hidden');
        studyModal.classList.remove('flex');
    };

    /** Guarda un estudio (nuevo o existente) en Firestore. */
    const saveStudy = async (e) => {
        e.preventDefault();
        saveStudyBtn.disabled = true;
        saveBtnText.classList.add('hidden');
        saveSpinner.classList.remove('hidden');

        const user = getCurrentUser();
        const studyId = studyIdInput.value;

        const studyData = {
            patientName: document.getElementById('patient-name').value,
            patientCedula: document.getElementById('patient-cedula').value,
            patientPhone: document.getElementById('patient-phone').value,
            patientEmail: document.getElementById('patient-email').value,
            studyName: document.getElementById('study-name').value,
            studyDate: document.getElementById('study-date').value,
            referringPhysician: document.getElementById('referring-physician').value,
            referringPhysicianEmail: document.getElementById('referring-physician-email').value,
            reportStatus: reportStatusSelect.value,
            files: [], // Se llenará después de subir los archivos
        };

        try {
            // Manejar subida de archivos nuevos
            const uploadPromises = localFiles.filter(f => f.file).map(f => uploadFile(studyId || Date.now().toString(), f.file));
            const uploadedFilesInfo = await Promise.all(uploadPromises);

            // Combinar archivos existentes con los recién subidos
            const existingFiles = localFiles.filter(f => !f.file);
            studyData.files = [...existingFiles, ...uploadedFilesInfo];

            if (studyId) {
                // Actualizando un estudio existente
                const studyDocRef = doc(db, "angioTAC", studyId);
                const originalDoc = await getDoc(studyDocRef);
                const originalData = originalDoc.data();

                // Lógica de auditoría
                if (originalData.reportStatus !== studyData.reportStatus) {
                    studyData.audit = {
                        ...originalData.audit,
                        reportStatusLastModifiedBy: user.displayName,
                        reportStatusLastModifiedAt: serverTimestamp()
                    };
                }
                await updateDoc(studyDocRef, studyData);
                showAlert('Estudio actualizado con éxito.');
            } else {
                // Creando un nuevo estudio
                studyData.emailSentStatus = 'No Enviado';
                const docRef = await addDoc(studiesCollection, studyData);
                showAlert('Estudio creado con éxito.');
            }
            closeStudyModal();
        } catch (error) {
            console.error("Error al guardar el estudio:", error);
            showAlert('Error al guardar el estudio.');
        } finally {
            saveStudyBtn.disabled = false;
            saveBtnText.classList.remove('hidden');
            saveSpinner.classList.add('hidden');
        }
    };
    
    /** Elimina un estudio y sus archivos asociados. */
    const deleteStudy = async (studyId) => {
        if (await showConfirm('¿Estás seguro de que quieres eliminar este estudio y todos sus archivos?')) {
            try {
                const studyDocRef = doc(db, "angioTAC", studyId);
                const studyDocSnap = await getDoc(studyDocRef);
                if (studyDocSnap.exists()) {
                    const filesToDelete = studyDocSnap.data().files || [];
                    const deletePromises = filesToDelete.map(file => deleteObject(ref(storage, file.storagePath)));
                    await Promise.all(deletePromises);
                }
                await deleteDoc(studyDocRef);
                showAlert('Estudio eliminado con éxito.');
            } catch (error) {
                console.error("Error al eliminar el estudio:", error);
                showAlert('Error al eliminar el estudio.');
            }
        }
    };

    /** Renderiza la lista de archivos en el modal. */
    const renderFileList = () => {
        fileListContainer.innerHTML = '';
        localFiles.forEach((fileInfo, index) => {
            const fileName = fileInfo.name || fileInfo.file.name;
            const fileElement = document.createElement('div');
            fileElement.className = 'flex items-center justify-between bg-gray-100 p-2 rounded';
            fileElement.innerHTML = `
                <a href="${fileInfo.url || '#'}" target="_blank" class="text-indigo-600 hover:underline text-sm">${fileName}</a>
                <button type="button" data-index="${index}" class="remove-file-btn text-red-500 hover:text-red-700">&times;</button>
            `;
            fileListContainer.appendChild(fileElement);
        });
    };

    /** Sube un archivo a Firebase Storage. */
    const uploadFile = (folder, file) => {
        return new Promise((resolve, reject) => {
            const storagePath = `studies/${folder}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed', 
                null, 
                (error) => reject(error), 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({
                        name: file.name,
                        url: downloadURL,
                        storagePath: storagePath
                    });
                }
            );
        });
    };
    
    /** Muestra la bitácora de envíos de correo. */
    const showEmailLog = (studyId) => {
        const logCollection = collection(db, "angioTAC", studyId, "emailLog");
        const q = query(logCollection, orderBy("timestamp", "desc"));
        onSnapshot(q, (snapshot) => {
            emailLogContent.innerHTML = '';
            if (snapshot.empty) {
                emailLogContent.innerHTML = '<p class="text-gray-500">No hay registros de envío.</p>';
            } else {
                snapshot.forEach(doc => {
                    const log = doc.data();
                    const logEntry = document.createElement('div');
                    logEntry.className = 'border-b p-2';
                    logEntry.innerHTML = `
                        <p><b>Fecha:</b> ${log.timestamp.toDate().toLocaleString()}</p>
                        <p><b>Destinatario:</b> ${log.recipient}</p>
                        <p><b>Estado:</b> <span class="font-semibold ${log.status === 'Exitoso' ? 'text-green-600' : 'text-red-600'}">${log.status}</span></p>
                    `;
                    emailLogContent.appendChild(logEntry);
                });
            }
            emailLogModal.classList.remove('hidden');
            emailLogModal.classList.add('flex');
        });
    };

    /** Simula el envío de un correo y registra en la bitácora. */
    const sendStudyByEmail = async (studyId) => {
        if (await showConfirm('¿Confirmas que deseas enviar este estudio por correo?')) {
            const user = getCurrentUser();
            const studyDocRef = doc(db, "angioTAC", studyId);
            const studyDoc = await getDoc(studyDocRef);
            const studyData = studyDoc.data();
            
            const logCollection = collection(db, "angioTAC", studyId, "emailLog");
            const logData = {
                timestamp: serverTimestamp(),
                recipient: studyData.patientEmail,
                sentBy: user.displayName,
                status: 'Exitoso' // Simulación
            };

            try {
                await addDoc(logCollection, logData);
                await updateDoc(studyDocRef, { 
                    emailSentStatus: 'Enviado',
                    audit: {
                        ...studyData.audit,
                        emailSentLastModifiedBy: user.displayName,
                        emailSentLastModifiedAt: serverTimestamp()
                    }
                });
                showAlert('Correo "enviado" y registrado en la bitácora.');
            } catch (error) {
                console.error("Error al registrar envío de correo:", error);
                showAlert('Error al registrar el envío.');
            }
        }
    };


    // --- EVENT LISTENERS ---
    addStudyBtn.addEventListener('click', () => openStudyModal());
    closeModalBtn.addEventListener('click', closeStudyModal);
    cancelModalBtn.addEventListener('click', closeStudyModal);
    studyForm.addEventListener('submit', saveStudy);
    closeEmailLogBtn.addEventListener('click', () => {
        emailLogModal.classList.add('hidden');
        emailLogModal.classList.remove('flex');
    });

    angioTACTableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const studyId = target.dataset.id;
        if (target.classList.contains('edit-btn')) openStudyModal(studyId);
        if (target.classList.contains('delete-btn')) deleteStudy(studyId);
        if (target.classList.contains('email-btn')) sendStudyByEmail(studyId);
        if (target.classList.contains('log-btn')) showEmailLog(studyId);
    });

    fileUploadInput.addEventListener('change', (e) => {
        for (const file of e.target.files) {
            localFiles.push({ file: file, name: file.name });
        }
        renderFileList();
    });

    fileListContainer.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-file-btn')) {
            const index = parseInt(e.target.dataset.index);
            const fileToRemove = localFiles[index];

            if (fileToRemove && !fileToRemove.file) { // Es un archivo existente
                if (await showConfirm("¿Eliminar este archivo permanentemente?")) {
                    try {
                        await deleteObject(ref(storage, fileToRemove.storagePath));
                        localFiles.splice(index, 1);
                        renderFileList();
                    } catch (error) {
                        console.error("Error al eliminar archivo de Storage:", error);
                        showAlert("No se pudo eliminar el archivo.");
                    }
                }
            } else { // Es un archivo nuevo, aún no subido
                localFiles.splice(index, 1);
                renderFileList();
            }
        }
    });

    // Carga inicial de datos
    loadAngioTACStudies();
}

