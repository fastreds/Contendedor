import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function setupUserManagement(db, showAlert, showConfirm) {
    const userManagementView = document.getElementById('user-management-view');
    
    // Plantilla HTML para la vista del módulo.
    const viewHTML = `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-semibold mb-4">Administrar Usuarios</h2>
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="py-3 px-4 text-left">Usuario</th>
                            <th class="py-3 px-4 text-left">Correo</th>
                            <th class="py-3 px-4 text-left">Rol Actual</th>
                            <th class="py-3 px-4 text-left">Cambiar Rol</th>
                        </tr>
                    </thead>
                    <tbody id="users-table-body"></tbody>
                </table>
            </div>
        </div>
    `;
    userManagementView.innerHTML = viewHTML;

    const usersTableBody = document.getElementById('users-table-body');
    
    /** Carga y muestra la lista de usuarios para el administrador. */
    const loadUsersForAdmin = () => {
        const usersCollection = collection(db, "users");
        onSnapshot(usersCollection, (snapshot) => {
            if (!usersTableBody) return; // Chequeo de seguridad
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

            // Añadir event listeners después de crear los elementos
            document.querySelectorAll('.role-select').forEach(select => {
                select.addEventListener('change', handleRoleChange);
            });
        });
    };

    /** Maneja el cambio de rol de un usuario. */
    const handleRoleChange = async (e) => {
        const newRole = e.target.value;
        const uid = e.target.dataset.uid;
        if (await showConfirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) {
            const userDocRef = doc(db, "users", uid);
            try {
                await updateDoc(userDocRef, { role: newRole });
                showAlert('Rol actualizado con éxito.');
            } catch (error) {
                console.error("Error al actualizar rol:", error);
                showAlert('No se pudo actualizar el rol.');
            }
        } else {
            // Si el usuario cancela, recargamos la lista para revertir el cambio visual en el <select>
            loadUsersForAdmin(); 
        }
    };

    // Carga inicial
    loadUsersForAdmin();
}
