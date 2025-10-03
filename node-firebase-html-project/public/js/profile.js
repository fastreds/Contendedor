import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export function setupProfile(db, storage, showAlert, getCurrentUser) {
    // Elementos del DOM para la barra lateral
    const userProfileContainer = document.getElementById('user-profile-container');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    
    // Elementos del DOM para el modal de perfil
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModalBtn = document.getElementById('close-profile-modal-btn');
    const cancelProfileModalBtn = document.getElementById('cancel-profile-modal-btn');
    const profileForm = document.getElementById('profile-form');
    const profileEmailInput = document.getElementById('profile-email');
    const profileNameInput = document.getElementById('profile-name');
    const profilePhotoPreview = document.getElementById('profile-photo-preview');
    const profilePhotoUpload = document.getElementById('profile-photo-upload');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const saveProfileBtnText = document.getElementById('save-profile-btn-text');
    const saveProfileSpinner = document.getElementById('save-profile-spinner');

    let newProfilePhotoFile = null;

    /** Actualiza la UI del perfil en la barra lateral. */
    const updateSidebarProfile = (userData) => {
        if (!userData) return;
        userPhoto.src = userData.photoURL || 'https://placehold.co/40x40';
        userName.textContent = userData.displayName || 'Usuario';
        userRole.textContent = userData.role || 'Rol';
    };
    
    /** Abre el modal para editar el perfil del usuario. */
    const openProfileModal = () => {
        const user = getCurrentUser();
        if (!user) return;

        profileEmailInput.value = user.email;
        profileNameInput.value = user.displayName;
        profilePhotoPreview.src = user.photoURL;
        newProfilePhotoFile = null;
        profileForm.reset(); // Resetea el input de archivo

        profileModal.classList.remove('hidden');
        profileModal.classList.add('flex');
    };

    /** Cierra el modal de edición de perfil. */
    const closeProfileModal = () => {
        profileModal.classList.add('hidden');
        profileModal.classList.remove('flex');
    };

    /** Maneja el guardado de los cambios del perfil. */
    const handleProfileSave = async (e) => {
        e.preventDefault();
        saveProfileBtn.disabled = true;
        saveProfileBtnText.classList.add('hidden');
        saveProfileSpinner.classList.remove('hidden');

        const user = getCurrentUser();
        let photoURL = user.photoURL;

        try {
            // Si hay una nueva foto, subirla a Storage
            if (newProfilePhotoFile) {
                const storagePath = `profile_photos/${user.uid}/${newProfilePhotoFile.name}`;
                const storageRef = ref(storage, storagePath);
                const uploadTask = await uploadBytesResumable(storageRef, newProfilePhotoFile);
                photoURL = await getDownloadURL(uploadTask.ref);
            }

            // Actualizar el documento del usuario en Firestore
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                displayName: profileNameInput.value,
                photoURL: photoURL
            });
            
            // Actualizar localmente para reflejar en la UI inmediatamente
            user.displayName = profileNameInput.value;
            user.photoURL = photoURL;
            updateSidebarProfile(user);

            showAlert('Perfil actualizado con éxito.');
            closeProfileModal();

        } catch (error) {
            console.error("Error al actualizar el perfil:", error);
            showAlert('Hubo un error al guardar tu perfil.');
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtnText.classList.remove('hidden');
            saveProfileSpinner.classList.add('hidden');
        }
    };

    // --- EVENT LISTENERS ---
    userProfileContainer.addEventListener('click', openProfileModal);
    closeProfileModalBtn.addEventListener('click', closeProfileModal);
    cancelProfileModalBtn.addEventListener('click', closeProfileModal);
    profileForm.addEventListener('submit', handleProfileSave);

    profilePhotoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newProfilePhotoFile = file;
            // Mostrar previsualización de la imagen seleccionada
            const reader = new FileReader();
            reader.onload = (event) => {
                profilePhotoPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Actualización inicial al cargar
    updateSidebarProfile(getCurrentUser());
}
