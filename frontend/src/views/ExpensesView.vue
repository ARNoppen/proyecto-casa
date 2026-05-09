<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import { formatCurrency, normalizeMoney } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal.vue';

const authStore = useAuthStore();
const router = useRouter();
const expensesData = ref([]);
const usersList = ref([]);
const loading = ref(true);
const error = ref(null);
const conceptsList = ref([]);
const isEditingConcept = ref(false);
const editConceptName = ref('');
const showConfirmModal = ref(false);
const conceptToDeactivate = ref(null);
const creatingConcept = ref(false);

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

// Modals de Confirmación
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: null,
  type: 'primary',
  isAlert: false
});

// Variables Modal de Edición
const showEditModal = ref(false);
const submitting = ref(false);
const editForm = ref({ id: null, amount: '', description: '', date: '', assigned_to_user_id: null, concept_id: null });

const loadExpenses = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get(`/expenses?month=${selectedMonth.value}&year=${selectedYear.value}`);
    expensesData.value = data;
    
    if (usersList.value.length === 0) {
      const [uRes, cRes] = await Promise.all([
        api.get('/users'),
        api.get('/concepts')
      ]);
      usersList.value = uRes.data;
      conceptsList.value = cRes.data;
    }
  } catch (err) {
    error.value = 'Error al cargar el historial del período.';
    expensesData.value = [];
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadExpenses();
});

const jumpToPrevious = () => {
  if (selectedMonth.value === 1) { selectedMonth.value = 12; selectedYear.value--; } else { selectedMonth.value--; }
  loadExpenses();
};

const jumpToNext = () => {
  if (selectedMonth.value === 12) { selectedMonth.value = 1; selectedYear.value++; } else { selectedMonth.value++; }
  loadExpenses();
};

// Acciones ABM Gasto Visual
const canEditExpense = (expense) => {
  return authStore.isAdmin || expense.created_by_user_id === authStore.currentUser.id;
};

const openEditModal = (expense) => {
  const localDate = expense.date.replace(' ', 'T').slice(0, 16);

  editForm.value = {
    id: expense.id,
    amount: Math.abs(expense.amount), // El backend devuelve negativo, lo pasamos a positivo para el input
    description: expense.description,
    date: localDate,
    assigned_to_user_id: expense.assigned_to_user_id,
    concept_id: expense.concept_id
  };
  showEditModal.value = true;
};

const confirmDeleteExpense = (expense) => {
  showConfirm(
    'Eliminar Ticket',
    `¿Estás seguro de que quieres eliminar el gasto "${expense.description}" por $${formatCurrency(expense.amount)}?`,
    async () => {
      try {
        await api.delete(`/expenses/${expense.id}`);
        loadExpenses();
      } catch (err) {
        showAlert('Error', err.response?.data?.error || 'No se pudo eliminar el gasto.');
      }
    },
    'danger'
  );
};

const saveExpenseEdit = async () => {
  submitting.value = true;
  try {
    await api.put(`/expenses/${editForm.value.id}`, {
      amount: normalizeMoney(editForm.value.amount),
      description: editForm.value.description,
      date: editForm.value.date.replace('T', ' '),
      assigned_to_user_id: editForm.value.assigned_to_user_id,
      concept_id: editForm.value.concept_id
    });
    showEditModal.value = false;
    loadExpenses();
  } catch (err) {
    showAlert('Error', err.response?.data?.error || 'No se pudo guardar la edición.');
  } finally {
    submitting.value = false;
  }
};

const handleUpdateConcept = async () => {
  if (!editConceptName.value.trim() || !editForm.value.concept_id) return;
  creatingConcept.value = true;
  try {
    const { data } = await api.put(`/concepts/${editForm.value.concept_id}`, { name: editConceptName.value });
    const idx = conceptsList.value.findIndex(c => c.id === data.id);
    if (idx !== -1) conceptsList.value[idx] = data;
    conceptsList.value.sort((a, b) => a.name.localeCompare(b.name));
    isEditingConcept.value = false;
    loadExpenses(); // Para que se vea el cambio de nombre en la tabla si ya estaba
  } catch (err) {
    showAlert('Error', err.response?.data?.error || 'No se pudo actualizar.');
  } finally {
    creatingConcept.value = false;
  }
};

const handleDeleteConcept = async (id) => {
  try {
    await api.delete(`/concepts/${id}`);
    conceptsList.value = conceptsList.value.filter(c => c.id !== id);
    if (editForm.value.concept_id === id) editForm.value.concept_id = null;
    showConfirmModal.value = false;
  } catch (err) {
    showAlert('Error', 'No se pudo eliminar de la base de datos.');
  }
};

const startEditConcept = () => {
  const concept = conceptsList.value.find(c => c.id === editForm.value.concept_id);
  if (concept) {
    editConceptName.value = concept.name;
    isEditingConcept.value = true;
  }
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
  <div class="expenses-view">
    
    <!-- Filtro Superior / Time Machine -->
    <div class="header-navigator">
      <div class="month-controls">
        <button @click="jumpToPrevious" class="btn-arrow">&larr;</button>
        <h2>Historial {{ selectedMonth }} / {{ selectedYear }}</h2>
        <button @click="jumpToNext" class="btn-arrow">&rarr;</button>
      </div>
      
      <div class="header-actions">
        <button @click="$router.push('/concepts')" class="btn btn-secondary">
          <span>Administrar Conceptos</span>
        </button>
        <button @click="$router.push('/import')" class="btn btn-secondary">
          <span>Importar Excel</span>
        </button>
        <p class="subtitle hide-mobile">Desglose estricto de auditoría familiar.</p>
      </div>
    </div>

    <!-- Contenido Grilla -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando tickets...</p>
    </div>
    <div v-else-if="error" class="error-banner">{{ error }}</div>
    
    <div v-else-if="expensesData.length === 0" class="empty-state">
      <h3>No hay Tickets de Gasto registrados</h3>
      <p>Nadie de la familia ha introducido gastos para el período seleccionado.</p>
    </div>

    <div v-else class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fecha Real</th>
            <th>Concepto / Item</th>
            <th>Atribuído A</th>
            <th>Ingresado Por</th>
            <th>Monto</th>
            <th>Ajustes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="expense in expensesData" :key="expense.id">
            <td>
              <span class="d-text">{{ expense.date.split(' ')[0].split('-').reverse().join('/') }}</span>
              <span class="muted date-time" v-if="expense.date.includes(' ')">
                {{ expense.date.split(' ')[1].slice(0, 5) }}
              </span>
            </td>
            <td class="font-bold">
              <span v-if="expense.concept_name" class="concept-tag">{{ expense.concept_name }}</span>
              {{ expense.description }}
            </td>
            <td>
              <span class="badge badge-assigned">{{ expense.assigned_to_name }}</span>
            </td>
            <td class="muted">{{ expense.created_by_name }}</td>
            <td class="text-emerald font-bold">${{ formatCurrency(expense.amount) }}</td>
            <td>
              <div class="action-buttons" v-if="canEditExpense(expense)">
                <button @click="openEditModal(expense)" class="btn-icon" title="Editar">✏️</button>
                <button @click="confirmDeleteExpense(expense)" class="btn-icon danger" title="Borrar">🗑️</button>
              </div>
              <span v-else class="muted text-small">Bloqueado</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDICIÓN DE GASTO -->
    <div v-if="showEditModal" class="modal-backdrop">
      <div class="modal-content">
        <h3>Editar Ticket de Gasto</h3>
        <p class="modal-sub">Se modificará sobre la base de datos central inmediatamente.</p>
        
        <form @submit.prevent="saveExpenseEdit">
          <div class="form-grid">
            <div class="form-group big-input">
              <label>Monto Corregido</label>
              <div class="input-money-wrapper">
                <span class="currency-symbol">$</span>
                <input v-model="editForm.amount" type="text" required />
              </div>
            </div>

            <div class="form-group">
              <label>Concepto (Clasificación)</label>
              <div class="concept-input-group">
                <select v-model="editForm.concept_id">
                  <option :value="null">Sin concepto / Seleccionar...</option>
                  <option v-for="concept in conceptsList" :key="concept.id" :value="concept.id">
                    {{ concept.name }}
                  </option>
                </select>
                <button v-if="editForm.concept_id" type="button" class="btn-plus btn-edit" @click="startEditConcept" title="Editar seleccionado">
                  ✏️
                </button>
                <button v-if="editForm.concept_id" type="button" class="btn-plus btn-danger-soft" @click="conceptToDeactivate = editForm.concept_id; showConfirmModal = true" title="Eliminar seleccionado">
                  🗑️
                </button>
              </div>

              <!-- Mini Form para editar concepto -->
              <div v-if="isEditingConcept" class="new-concept-mini-form animate-in editing">
                <input v-model="editConceptName" type="text" placeholder="Renombrar concepto..." @keyup.enter="handleUpdateConcept" />
                <div class="mini-actions">
                  <button type="button" class="btn btn-primary btn-sm" @click="handleUpdateConcept" :disabled="creatingConcept || !editConceptName.trim()">
                    Guardar
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" @click="isEditingConcept = false">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Descripción / Detalle corregido</label>
              <input v-model="editForm.description" type="text" required />
            </div>

            <div class="form-group">
              <label>Fecha del Documento (Ticket Comercial)</label>
              <input v-model="editForm.date" type="datetime-local" required />
            </div>

            <div class="form-group">
              <label>Cambiar de Integrante Responsable</label>
              <select v-model="editForm.assigned_to_user_id" required>
                <option v-for="user in usersList" :key="user.id" :value="user.id">
                  {{ user.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showEditModal = false" class="btn btn-secondary">Descartar</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">Aplicar Cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de Confirmación Reutilizable -->
    <ConfirmModal 
      :show="confirmModal.show"
      :title="confirmModal.title"
      :message="confirmModal.message"
      :type="confirmModal.type"
      :isAlert="confirmModal.isAlert"
      @confirm="handleConfirm"
      @cancel="confirmModal.show = false"
    />

    <!-- Confirmación de Eliminación -->
    <ConfirmModal 
      :show="showConfirmModal"
      title="Eliminar Concepto"
      message="¿Estás seguro de que quieres eliminar este concepto de la lista de selección?"
      type="danger"
      @confirm="handleDeleteConcept(conceptToDeactivate)"
      @cancel="showConfirmModal = false"
    />

  </div>
</template>

<style scoped>
.expenses-view { color: #FFF; }

/* NAVIGATOR HEAD REUSED */
.header-navigator { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: #1A1C1D; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #333; flex-wrap: wrap; gap: 1rem; }
.month-controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.month-controls h2 { margin: 0; font-size: 1.3rem; color: #FFF; font-weight: 800; min-width: 190px; text-align: center; }
.btn-arrow { background: #111; color: #A0A5AA; border: 1px solid #333; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: 0.2s; }
.btn-arrow:hover { color: #FFF; border-color: #555; }
.header-actions { display: flex; align-items: center; gap: 1.5rem; }
.subtitle { margin: 0; color: #7E8286; font-size: 0.9rem; }
@media (max-width: 768px) { .hide-mobile { display: none; } }

/* TABLE COMPLEXITY */
.table-container { background-color: #1A1C1D; border-radius: 12px; overflow-x: auto; border: 1px solid #333; margin-bottom: 2rem; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 1.2rem 1.5rem; border-bottom: 1px solid #2A2C2E; white-space: nowrap; }
.data-table th { color: #7E8286; font-weight: 500; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;}
.data-table tr:hover { background-color: #24272A; }
.font-bold { font-weight: 600; color: #FFF; }
.text-emerald { color: #00FF66; font-size: 1.1rem; }
.muted { color: #7E8286; }
.date-time { display: block; font-size: 0.75rem; margin-top: 0.2rem; }
.d-text { color: #ccc; }
.concept-tag { background: rgba(255, 255, 255, 0.1); color: #A0A5AA; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; text-transform: uppercase; margin-right: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); font-weight: normal; }

.badge { padding: 0.3rem 0.8rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600; }
.badge-assigned { background: rgba(0, 229, 255, 0.1); color: #00E5FF; border: 1px solid rgba(0, 229, 255, 0.3); }

/* ACTIONS */
.action-buttons { display: flex; gap: 0.5rem; }
.text-small { font-size: 0.8rem; }

/* Modal Content Adjustments */
.form-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.4rem; color: #A0A5AA; font-size: 0.85rem; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 0.8rem 1rem; background: #111; border: 1px solid #333; border-radius: 8px; color: #FFF; font-size: 1rem; }
.form-group input:focus, .form-group select:focus { border-color: #00FF66; outline: none; }
.input-money-wrapper { display: flex; align-items: center; background: #111; border: 1px solid #333; border-radius: 8px; padding-left: 1rem;}
.input-money-wrapper:focus-within { border-color: #00FF66; }
.currency-symbol { color: #00FF66; font-size: 1.4rem; font-weight: 800; }
.big-input input { border: none !important; font-size: 1.4rem; font-weight: 700; padding-left: 0.5rem; outline: none !important;}

.concept-input-group { display: flex; gap: 0.5rem; }
.btn-plus { width: 44px; background: #2A2C2E; border: 1px solid #333; color: #00FF66; border-radius: 8px; font-size: 1.2rem; cursor: pointer; transition: 0.2s; }
.btn-plus:hover { background: #333; border-color: #00FF66; }
.btn-edit { color: #FFB020; font-size: 1rem; }
.btn-danger-soft { color: #FF4A4A; font-size: 1rem; }

.new-concept-mini-form { margin-top: 0.75rem; display: flex; gap: 0.5rem; background: rgba(0, 255, 102, 0.05); padding: 0.75rem; border-radius: 8px; border: 1px dashed rgba(0, 255, 102, 0.3); }
.new-concept-mini-form.editing { background: rgba(255, 176, 32, 0.05); border-color: rgba(255, 176, 32, 0.3); }
.new-concept-mini-form input { flex: 1; padding: 0.5rem !important; font-size: 0.9rem !important; }
.btn-sm { padding: 0.5rem 1rem !important; font-size: 0.85rem !important; }
.mini-actions { display: flex; gap: 0.25rem; }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2.5rem; }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 5rem; gap: 1rem; color: #7E8286; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(0,255,102,0.1); border-top: 4px solid #00FF66; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .header-navigator { flex-direction: column; align-items: stretch; text-align: center; }
  .month-controls { justify-content: center; }
  .month-controls h2 { min-width: auto; font-size: 1.1rem; }
}
</style>
