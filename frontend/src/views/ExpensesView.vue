<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatters';

const authStore = useAuthStore();
const router = useRouter();
const expensesData = ref([]);
const usersList = ref([]);
const loading = ref(true);
const error = ref(null);

const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

// Variables Modal de Edición
const showEditModal = ref(false);
const submitting = ref(false);
const editForm = ref({ id: null, amount: '', description: '', date: '', assigned_to_user_id: null });

const loadExpenses = async () => {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await api.get(`/expenses?month=${selectedMonth.value}&year=${selectedYear.value}`);
    expensesData.value = data;
    
    // Solo cargo catálogo base de usuarios para el selector del Modal si aún no lo traje
    if (usersList.value.length === 0) {
      const uRes = await api.get('/users');
      usersList.value = uRes.data;
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
  // El backend devuelve YYYY-MM-DD HH:mm:ss o similar.
  // Reemplazamos espacio por T y cortamos para el input datetime-local.
  const localDate = expense.date.replace(' ', 'T').slice(0, 16);

  editForm.value = {
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    date: localDate,
    assigned_to_user_id: expense.assigned_to_user_id
  };
  showEditModal.value = true;
};

const deleteExpense = async (expense) => {
  if (!confirm(`¿Estás seguro de que quieres eliminar el gasto "${expense.description}" por $${expense.amount}?`)) return;
  try {
    await api.delete(`/expenses/${expense.id}`);
    loadExpenses(); // Refrescar grilla
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo eliminar el gasto (Revisar que el mes siga abierto).');
  }
};

const saveExpenseEdit = async () => {
  submitting.value = true;
  try {
    await api.put(`/expenses/${editForm.value.id}`, {
      amount: editForm.value.amount,
      description: editForm.value.description,
      date: editForm.value.date.replace('T', ' '),
      assigned_to_user_id: editForm.value.assigned_to_user_id
    });
    showEditModal.value = false;
    loadExpenses();
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo guardar la edición (Revisa permisos o apertura de mes).');
  } finally {
    submitting.value = false;
  }
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
        <button @click="$router.push('/import')" class="btn-secondary">
          <span>Importar Excel</span>
        </button>
        <p class="subtitle hide-mobile">Desglose estricto de auditoría familiar.</p>
      </div>
    </div>

    <!-- Contenido Grilla -->
    <div v-if="loading" class="loading">Cargando tickets...</div>
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
            <td class="font-bold">{{ expense.description }}</td>
            <td>
              <span class="badge badge-assigned">{{ expense.assigned_to_name }}</span>
            </td>
            <td class="muted">{{ expense.created_by_name }}</td>
            <td class="text-emerald font-bold">${{ formatCurrency(expense.amount) }}</td>
            <td>
              <div class="action-buttons" v-if="canEditExpense(expense)">
                <button @click="openEditModal(expense)" class="btn-icon text-info" title="Editar">✏️</button>
                <button @click="deleteExpense(expense)" class="btn-icon text-danger" title="Borrar">🗑️</button>
              </div>
              <span v-else class="muted text-small">Bloqueado</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDICIÓN DE GASTO -->
    <div v-if="showEditModal" class="modal-backdrop">
      <div class="modal">
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
              <label>Concepto Corregido</label>
              <input v-model="editForm.description" type="text" required />
            </div>

            <div class="form-group">
              <label>Fecha del Documento (Ticket Comercial)</label>
              <input v-model="editForm.date" type="datetime-local" required />
            </div>

            <div class="form-group">
              <label>Cambiar de Integrante Responsable</label>
              <select v-model="editForm.assigned_to_user_id" required>
                <!-- Renderiza el catálogo crudo -->
                <option v-for="user in usersList" :key="user.id" :value="user.id">
                  {{ user.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showEditModal = false" class="btn-cancel">Descartar</button>
            <button type="submit" class="btn-primary" :disabled="submitting">Aplicar Cambios</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* NAVIGATOR HEAD REUSED */
.header-navigator { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: #1A1C1D; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #333; flex-wrap: wrap; gap: 1rem; }
.month-controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.month-controls h2 { margin: 0; font-size: 1.3rem; color: #FFF; font-weight: 800; min-width: 190px; text-align: center; }
.btn-arrow { background: #111; color: #A0A5AA; border: 1px solid #333; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: 0.2s; }
.btn-arrow:hover { color: #FFF; border-color: #555; }
.header-actions { display: flex; align-items: center; gap: 1.5rem; }
.btn-secondary { background: transparent; color: #00FF66; border: 1px solid #00FF66; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; font-size: 0.85rem; }
.btn-secondary:hover { background: rgba(0, 255, 102, 0.1); }
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

.badge { padding: 0.3rem 0.8rem; border-radius: 50px; font-size: 0.8rem; font-weight: 600; }
.badge-assigned { background: rgba(0, 229, 255, 0.1); color: #00E5FF; border: 1px solid rgba(0, 229, 255, 0.3); }

/* ACTIONS */
.action-buttons { display: flex; gap: 0.5rem; }
.btn-icon { background: #2A2C2E; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.btn-icon:hover { transform: translateY(-2px); }
.text-small { font-size: 0.8rem; }

/* MODALS (Globalized snippet) */
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #1A1C1D; padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 450px; border: 1px solid #333; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-top: 4px solid #00E5FF;}
.modal h3 { margin: 0 0 0.25rem 0; color: #FFF; font-size: 1.4rem; }
.modal-sub { margin: 0 0 1.5rem 0; color: #7E8286; font-size: 0.9rem; line-height: 1.4; }
.form-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.form-group label { display: block; margin-bottom: 0.4rem; color: #A0A5AA; font-size: 0.85rem; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 0.8rem 1rem; background: #111; border: 1px solid #333; border-radius: 8px; color: #FFF; font-size: 1rem; }
.form-group input:focus, .form-group select:focus { border-color: #00FF66; outline: none; }
.input-money-wrapper { display: flex; align-items: center; background: #111; border: 1px solid #333; border-radius: 8px; padding-left: 1rem;}
.input-money-wrapper:focus-within { border-color: #00FF66; }
.currency-symbol { color: #00FF66; font-size: 1.4rem; font-weight: 800; }
.big-input input { border: none !important; font-size: 1.4rem; font-weight: 700; padding-left: 0.5rem; outline: none !important;}
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2.5rem; }
.btn-cancel { background: transparent; color: #A0A5AA; border: none; font-weight: 600; cursor: pointer; padding: 0.6rem 1rem; }
.btn-cancel:hover { color: #FFF; }
.btn-primary { background: #00FF66; color: #000; border: none; font-weight: 700; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { background: #24272A; color: #555; cursor: not-allowed; }
</style>
