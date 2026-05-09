<script setup>
import { ref, onMounted } from 'vue';
import api from '../api/axios';
import ConfirmModal from '../components/ConfirmModal.vue';

const concepts = ref([]);
const loading = ref(true);
const error = ref(null);

const showEditModal = ref(false);
const editingConcept = ref({ id: null, name: '' });
const submitting = ref(false);

const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: null,
  type: 'primary',
  isAlert: false
});

const loadConcepts = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get('/concepts');
    concepts.value = data;
  } catch (err) {
    error.value = 'Error al cargar los conceptos.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadConcepts();
});

const openEditModal = (concept) => {
  editingConcept.value = { ...concept };
  showEditModal.value = true;
};

const saveEdit = async () => {
  if (!editingConcept.value.name.trim()) return;
  submitting.value = true;
  try {
    await api.put(`/concepts/${editingConcept.value.id}`, { name: editingConcept.value.name });
    showEditModal.value = false;
    loadConcepts();
  } catch (err) {
    showAlert('Error', err.response?.data?.error || 'No se pudo actualizar el concepto.');
  } finally {
    submitting.value = false;
  }
};

const deleteConcept = (concept) => {
  showConfirm(
    `Eliminar Concepto`,
    `¿Estás seguro de que quieres eliminar PERMANENTEMENTE el concepto "${concept.name}"? Los gastos asociados quedarán sin concepto.`,
    async () => {
      try {
        await api.delete(`/concepts/${concept.id}`);
        loadConcepts();
      } catch (err) {
        showAlert('Error', err.response?.data?.error || `No se pudo eliminar el concepto.`);
      }
    },
    'danger'
  );
};

// Helpers de Confirmación
const showConfirm = (title, message, onConfirm, type = 'primary') => {
  confirmModal.value = { show: true, title, message, onConfirm, type, isAlert: false };
};

const showAlert = (title, message) => {
  confirmModal.value = { show: true, title, message, onConfirm: () => confirmModal.value.show = false, type: 'primary', isAlert: true };
};

const handleConfirm = () => {
  if (confirmModal.value.onConfirm) confirmModal.value.onConfirm();
  confirmModal.value.show = false;
};
</script>

<template>
  <div class="concepts-view">
    <div class="header-navigator">
      <h2>Administrar Conceptos</h2>
      <p class="subtitle">Gestiona las categorías de clasificación para tus gastos.</p>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando categorías...</p>
    </div>

    <div v-else-if="error" class="error-banner">{{ error }}</div>

    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nombre del Concepto</th>
            <th>Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="concept in concepts" :key="concept.id">
            <td class="font-bold">{{ concept.name }}</td>
            <td>
              <span class="status-chip open">Habilitado</span>
            </td>
            <td class="text-right">
              <div class="action-buttons j-end">
                <button @click="openEditModal(concept)" class="btn-icon" title="Renombrar">✏️</button>
                <button @click="deleteConcept(concept)" class="btn-icon danger" title="Eliminar Permanente">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDICIÓN -->
    <div v-if="showEditModal" class="modal-backdrop">
      <div class="modal-content">
        <h3>Renombrar Concepto</h3>
        <p class="modal-sub">Este cambio se reflejará en todos los gastos asociados.</p>
        
        <form @submit.prevent="saveEdit">
          <div class="form-group">
            <label>Nuevo Nombre</label>
            <input v-model="editingConcept.name" type="text" required autofocus />
          </div>

          <div class="modal-actions">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal 
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :type="confirmModal.type"
      :isAlert="confirmModal.isAlert"
      @confirm="handleConfirm"
      @cancel="confirmModal.show = false"
    />
  </div>
</template>

<style scoped>
.concepts-view { color: #FFF; }
.header-navigator { background: #1A1C1D; padding: 1.5rem; border-radius: 12px; border: 1px solid #333; margin-bottom: 2rem; }
.header-navigator h2 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
.subtitle { margin: 0; color: #7E8286; font-size: 0.9rem; }

.table-container { background: #1A1C1D; border-radius: 12px; border: 1px solid #333; overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 1.2rem 1.5rem; text-align: left; border-bottom: 1px solid #2A2C2E; }
.data-table th { color: #7E8286; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
.data-table tr:hover { background: #24272A; }

.font-bold { font-weight: 600; }
.text-right { text-align: right !important; }
.j-end { justify-content: flex-end; }

.status-chip { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
.status-chip.open { background: rgba(0, 255, 102, 0.15); color: #00FF66; }
.status-chip.closed { background: rgba(255, 74, 74, 0.15); color: #FF4A4A; }

.btn-icon.success { filter: hue-rotate(90deg); }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 5rem; gap: 1rem; color: #7E8286; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(0,255,102,0.1); border-top: 4px solid #00FF66; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.form-group label { display: block; margin-bottom: 0.5rem; color: #A0A5AA; font-size: 0.9rem; }
.form-group input { width: 100%; padding: 0.8rem; background: #111; border: 1px solid #333; border-radius: 8px; color: #FFF; font-size: 1rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }
</style>
