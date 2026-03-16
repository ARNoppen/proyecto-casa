<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api/axios';

const users = ref([]);
const loading = ref(true);
const error = ref(null);

// Modal State
const showModal = ref(false);
const isEditing = ref(false);
const submitting = ref(false);

const form = ref({
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'user',
  is_active: true,
  default_contribution: 0
});

const fetchUsers = async () => {
  try {
    const { data } = await api.get('/users');
    users.value = data;
  } catch (err) {
    error.value = 'No se pudo cargar la lista de usuarios. Asegúrate de ser Administrador.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
});

const openNewUserModal = () => {
  isEditing.value = false;
  form.value = {
    id: null,
    name: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true,
    default_contribution: 0
  };
  showModal.value = true;
};

const openEditUserModal = (user) => {
  isEditing.value = true;
  form.value = {
    id: user.id,
    name: user.name,
    email: user.email,
    password: '', // Ignorado normalmente en edición general en backend, a menos que se arme un endpoint nuevo.
    role: user.role,
    is_active: !!user.is_active,
    default_contribution: user.default_contribution
  };
  showModal.value = true;
};

const closeUserModal = () => {
  showModal.value = false;
  error.value = null;
};

const saveUser = async () => {
  submitting.value = true;
  error.value = null;
  
  try {
    if (isEditing.value) {
      // Backend (Fase 2) provee PUT general. No provee PUT de cambio de clave específico aún. Faltaría iterarlo.
      await api.put(`/users/${form.value.id}`, {
        name: form.value.name,
        email: form.value.email,
        role: form.value.role,
        is_active: form.value.is_active,
        default_contribution: form.value.default_contribution
      });
    } else {
      await api.post('/users', {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        role: form.value.role,
        default_contribution: form.value.default_contribution
      });
    }
    
    await fetchUsers(); // Refrescar tabla
    closeUserModal();
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al guardar el usuario.';
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="users-view">
    <div class="header-actions">
      <h2>Gestión de Usuarios</h2>
      <button @click="openNewUserModal" class="btn-outline">+ Nuevo Usuario</button>
    </div>

    <div v-if="loading" class="loading">Cargando catálogo...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Aporte Base</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>#{{ user.id }}</td>
            <td class="font-bold">{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span :class="['role-badge', user.role]">{{ user.role }}</span>
            </td>
            <td>
              <span :class="['status-dot', user.is_active ? 'active' : 'inactive']"></span>
              {{ user.is_active ? 'Activo' : 'Baja' }}
            </td>
            <td>${{ user.default_contribution }}</td>
            <td>
              <button @click="openEditUserModal(user)" class="btn-text">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL DE ABM USUARIO -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal">
        <h3>{{ isEditing ? 'Editar Usuario' : 'Nuevo Usuario' }}</h3>
        
        <div v-if="error" class="error-banner">{{ error }}</div>

        <form @submit.prevent="saveUser">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre Completo</label>
              <input v-model="form.name" type="text" required />
            </div>

            <div class="form-group">
              <label>Correo Electrónico</label>
              <input v-model="form.email" type="email" required />
            </div>

            <!-- Mostrar Password solo a la creación. (Reset de endpoint backend sigue pendiente) -->
            <div v-if="!isEditing" class="form-group">
              <label>Contraseña Acceso</label>
              <input v-model="form.password" type="password" required />
            </div>
            <div v-if="isEditing" class="form-group empty-state-pw">
              <span class="muted">⚠️ El reseteo de clave no está habilitado en API aún.</span>
            </div>

            <div class="form-group">
              <label>Rol del Sistema</label>
              <select v-model="form.role">
                <option value="user">Familiar Ordinario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div class="form-group">
              <label>Aporte Mensual Base ($)</label>
              <input v-model="form.default_contribution" type="number" step="0.01" required />
            </div>

            <div v-if="isEditing" class="form-group checkbox-group">
              <label>
                <input v-model="form.is_active" type="checkbox" />
                El usuario se encuentra activo
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeUserModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'Guardando...' : 'Guardar Usuario' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-actions h2 {
  margin: 0;
}

.btn-outline {
  background: transparent;
  color: #00FF66;
  border: 1px solid #00FF66;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.2s;
}
.btn-outline:hover { background: rgba(0, 255, 102, 0.1); }

.table-container {
  background-color: #1A1C1D;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #333;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #2A2C2E;
}

.data-table th {
  color: #7E8286;
  font-weight: 500;
  font-size: 0.85rem;
}

.data-table tr:hover { background-color: #24272A; }
.font-bold { font-weight: 600; color: #FFF; }
.btn-text { background: none; border: none; color: #00FF66; font-weight: 500; text-decoration: underline; }

.role-badge { padding: 0.25rem 0.75rem; border-radius: 50px; font-size: 0.75rem; font-weight: bold; text-transform: capitalize; }
.role-badge.admin { background-color: rgba(0, 255, 102, 0.15); color: #00FF66; }
.role-badge.user { background-color: rgba(255, 255, 255, 0.1); color: #CCC; }

.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.status-dot.active { background-color: #00FF66; }
.status-dot.inactive { background-color: #FF4A4A; }

/* MODAL STYLES */
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: rgba(0,0,0,0.8);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: #1A1C1D;
  padding: 2rem;
  border-radius: 12px;
  width: 100%; max-width: 500px;
  border: 1px solid #333;
}

.modal h3 { margin-top: 0; color: #FFF; margin-bottom: 1.5rem; }

.form-grid {
  display: flex; flex-direction: column; gap: 1rem;
}

.form-group label {
  display: block; margin-bottom: 0.4rem; color: #A0A5AA; font-size: 0.85rem;
}

.form-group input, .form-group select {
  width: 100%; padding: 0.7rem; background-color: #111111;
  border: 1px solid #333; border-radius: 6px; color: #FFF; font-size: 1rem;
}

.form-group input:focus, .form-group select:focus {
  border-color: #00FF66; outline: none;
}

.checkbox-group label {
  display: flex; align-items: center; gap: 0.5rem; color: #FFF; cursor: pointer;
}
.checkbox-group input { width: auto; margin: 0; }

.muted { color: #FF4A4A; font-size: 0.8rem; }
.empty-state-pw { padding: 0.5rem 0; }

.modal-actions {
  display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem;
}

.btn-cancel {
  background: transparent; color: #A0A5AA; border: none; font-weight: 500;
}
.btn-primary {
  background-color: #00FF66; color: #000; border: none; font-weight: 700; padding: 0.6rem 1.2rem; border-radius: 8px;
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.error-banner {
  background-color: rgba(255, 74, 74, 0.1); color: #FF4A4A; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.9rem;
}
</style>
