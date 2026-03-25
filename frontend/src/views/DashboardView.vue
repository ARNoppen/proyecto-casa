<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';

const authStore = useAuthStore();
const router = useRouter();
const dashboardData = ref(null);
const usersData = ref([]);
const loading = ref(true);
const error = ref(null);

// Controles Rango de Fecha por defecto: Mes Actual
const selectedMonth = ref(new Date().getMonth() + 1);
const selectedYear = ref(new Date().getFullYear());

// Helper para obtener fecha local en formato YYYY-MM-DDTHH:mm para inputs
const getLocalISOString = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

// Variables Modal de Gastos
const showExpenseModal = ref(false);
const submittingExpense = ref(false);
const expenseForm = ref({ amount: '-', description: '', date: getLocalISOString(), assigned_to_user_id: authStore.currentUser?.id });

const loadDashboard = async () => {
  loading.value = true;
  error.value = null;
  try {
    const [dashRes, usersRes] = await Promise.all([
      api.get(`/months/dashboard?month=${selectedMonth.value}&year=${selectedYear.value}`),
      api.get('/users')
    ]);
    dashboardData.value = dashRes.data;
    usersData.value = usersRes.data.filter(u => u.is_active);
  } catch (err) {
    if (err.response && err.response.status === 404) {
      error.value = 'El período seleccionado aún no ha sido aperturado en la Base de Datos.';
    } else {
      error.value = 'No se pudo cargar la información del servidor.';
    }
    dashboardData.value = null;
  } finally {
    loading.value = false;
  }
};

const computedMembers = computed(() => {
  if (!dashboardData.value || !usersData.value) return [];
  
  // Mapeamos sobre los usuarios activos para asegurar que todos tengan su card
  return usersData.value.map(user => {
    // Buscamos el progreso devuelto por el backend para este usuario específico
    const progressObj = dashboardData.value.progreso_integrantes.find(p => Number(p.assigned_to_user_id) === Number(user.id));
    
    // Si el backend trae data (acumulado), la usamos; si no, es 0.
    const gastado = progressObj ? Math.abs(parseFloat(progressObj.accumulated)) : 0;
    
    // La meta la tomamos SIEMPRE del perfil del usuario (usersData) para asegurar que no se pierda
    const baseMeta = parseFloat(user.default_contribution);
    
    const leFalta = baseMeta - gastado;
    const percentage = baseMeta > 0 ? (gastado / baseMeta) * 100 : 0;
    
    return {
      assigned_to_user_id: user.id,
      name: user.name,
      expected_contribution: baseMeta,
      accumulated: gastado,
      remaining: leFalta,
      progress_percentage: percentage
    };
  });
});

const computedTotalBudget = computed(() => {
  if (!usersData.value) return 0;
  return usersData.value.reduce((sum, user) => sum + parseFloat(user.default_contribution), 0);
});

const computedTotalExpenses = computed(() => {
  if (!computedMembers.value) return 0;
  return computedMembers.value.reduce((sum, mem) => sum + mem.accumulated, 0);
});

const computedRemainingOverall = computed(() => {
  return computedTotalBudget.value - computedTotalExpenses.value;
});

const jumpToPrevious = () => {
  if (selectedMonth.value === 1) { selectedMonth.value = 12; selectedYear.value--; }
  else { selectedMonth.value--; }
  loadDashboard();
};

const jumpToNext = () => {
  if (selectedMonth.value === 12) { selectedMonth.value = 1; selectedYear.value++; }
  else { selectedMonth.value++; }
  loadDashboard();
};

onMounted(() => {
  loadDashboard();
});

// Gastos Action
const openExpenseModal = () => {
  expenseForm.value = { 
    amount: '-', 
    description: '', 
    date: getLocalISOString(), 
    assigned_to_user_id: authStore.currentUser?.id 
  };
  showExpenseModal.value = true;
};

const saveExpense = async () => {
  submittingExpense.value = true;
  try {
    await api.post('/expenses', {
      amount: expenseForm.value.amount,
      description: expenseForm.value.description,
      date: expenseForm.value.date.replace('T', ' '),
      assigned_to_user_id: expenseForm.value.assigned_to_user_id,
      month: selectedMonth.value,
      year: selectedYear.value
    });
    showExpenseModal.value = false;
    loadDashboard(); // Refrescar métricas automagicamente
  } catch (err) {
    alert(err.response?.data?.error || 'No se pudo registrar.');
  } finally {
    submittingExpense.value = false;
  }
};
</script>

<template>
  <div class="dashboard-view">
    <!-- Header Mes Selector -->
    <div class="header-navigator">
      <div class="month-controls">
        <button @click="jumpToPrevious" class="btn-arrow">&larr;</button>
        <h2>Período {{ selectedMonth }} / {{ selectedYear }}</h2>
        <button @click="jumpToNext" class="btn-arrow">&rarr;</button>
        
        <span v-if="dashboardData?.resumen_general" 
              :class="['status-chip', dashboardData.resumen_general.status]">
          {{ dashboardData.resumen_general.status }}
        </span>
      </div>
      
      <div class="header-actions-group">
        <button @click="$router.push('/import')" class="btn-secondary flex-btn">
          <span class="icon-import">📥</span><span>Importar</span>
        </button>
        <button v-if="dashboardData?.resumen_general?.status === 'open'" 
                @click="openExpenseModal" 
                class="btn-primary flex-btn">
          <span class="icon-plus">+</span><span>Registrar</span>
        </button>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="empty-state">
      <h3>{{ error }}</h3>
      <p>Asegúrate de cambiar a una fecha válida usando las flechas de navegación.</p>
    </div>

    <div v-else-if="loading" class="loading">Sincronizando finanzas familiares...</div>

    <!-- Contenido Dashboard Reanimado -->
    <div v-else-if="dashboardData" class="dashboard-content">
      
      <!-- Resumen General -->
      <section class="summary-cards">
        <div class="card bg-dark">
          <p class="label">Presupuesto Hogar</p>
          <h3>${{ computedTotalBudget.toFixed(2) }}</h3>
        </div>
        <div class="card bg-dark">
          <p class="label">Gastado a la Fecha</p>
          <h3>${{ computedTotalExpenses.toFixed(2) }}</h3>
        </div>
        <div class="card" :class="computedRemainingOverall >= 0 ? 'bg-success' : 'bg-danger'">
          <p class="label">Saldo Restante o Exceso</p>
          <h3>${{ computedRemainingOverall >= 0 ? computedRemainingOverall.toFixed(2) : Math.abs(computedRemainingOverall).toFixed(2) + ' (Excedido)' }}</h3>
        </div>
      </section>

      <!-- Miembros / Tarjetas de Progreso -->
      <section class="members-progress">
        <div class="section-title"><h3>Aporte por Familiar</h3></div>
        
        <div class="member-grid">
          <div v-for="miembro in computedMembers" :key="miembro.assigned_to_user_id" class="member-card">
            
            <div class="member-header">
              <div class="m-avatar">{{ miembro.name.charAt(0).toUpperCase() }}</div>
              <div class="m-info">
                <h4>{{ miembro.name }}</h4>
                <p class="m-target">Base/Meta: <b>${{ miembro.expected_contribution.toFixed(2) }}</b></p>
              </div>
            </div>

            <div class="progress-bar-container">
              <div class="progress-bar-fill" :class="{ 'over-budget': miembro.progress_percentage > 100 }" :style="{ width: Math.min(miembro.progress_percentage, 100) + '%' }"></div>
            </div>
            
            <div class="m-footer">
              <div class="m-stat">
                <span class="muted">Gastó</span>
                <span class="val">$ {{ miembro.accumulated.toFixed(2) }}</span>
              </div>
              <div class="m-stat rt">
                <span class="muted">Le falta</span>
                <span :class="['val', miembro.remaining >= 0 ? 'warn' : 'exito']">$ {{ miembro.remaining.toFixed(2) }}</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <!-- Movimientos Recientes del Mes -->
      <section class="recent-movements">
        <div class="section-title"><h3>Últimos tickets cargados</h3></div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Monto</th>
                <th>Cargado por</th>
                <th>A cuenta de</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="gasto in dashboardData.movimientos_recientes" :key="gasto.id">
                <td>{{ gasto.date.split(' ')[0].split('-').reverse().join('/') }}</td>
                <td class="font-bold">{{ gasto.description }}</td>
                <td class="text-emerald font-bold">${{ parseFloat(gasto.amount).toFixed(2) }}</td>
                <td>{{ gasto.created_by_name }}</td>
                <td>{{ gasto.assigned_to_name }}</td>
              </tr>
              <tr v-if="dashboardData.movimientos_recientes.length === 0">
                <td colspan="5" style="text-align: center; color: #777;">No se registraron gastos en este periodo fiscal.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- MODAL "REGISTRAR GASTO" -->
    <div v-if="showExpenseModal" class="modal-backdrop">
      <div class="modal">
        <h3>Registrar un Nuevo Gasto</h3>
        <p class="modal-sub">El ticket será guardado en el período activo: {{ selectedMonth }} / {{ selectedYear }}</p>
        
        <form @submit.prevent="saveExpense">
          <div class="form-grid">
            <div class="form-group big-input">
              <label>Monto</label>
              <div class="input-money-wrapper">
                <span class="currency-symbol">$</span>
                <input v-model="expenseForm.amount" type="text" placeholder="-0.00" required autofocus />
              </div>
            </div>

            <div class="form-group">
              <label>Puntualmente, ¿Qué se gastó?</label>
              <input v-model="expenseForm.description" type="text" placeholder="Ej: Compra Carnicería, Supermercado..." required />
            </div>

            <div class="form-group">
              <label>Fecha del Ticket</label>
              <input v-model="expenseForm.date" type="datetime-local" required />
            </div>

            <div class="form-group" v-if="dashboardData">
              <label>¿A nombre de quién se contabiliza?</label>
              <select v-model="expenseForm.assigned_to_user_id" required>
                <!-- Renderiza a toda la gente activa del mes basada en las promesas resueltas -->
                <option v-for="member in computedMembers" :key="member.assigned_to_user_id" :value="member.assigned_to_user_id">
                  {{ member.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="showExpenseModal = false" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="submittingExpense">Confirmar Gasto</button>
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* NAVIGATOR */
.header-navigator { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: #1A1C1D; padding: 1rem 1.5rem; border-radius: 12px; border: 1px solid #333; flex-wrap: wrap; gap: 1rem; }
.month-controls { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.month-controls h2 { margin: 0; font-size: 1.3rem; color: #FFF; font-weight: 800; min-width: 190px; text-align: center; }
.btn-arrow { background: #111; color: #A0A5AA; border: 1px solid #333; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
.btn-arrow:hover { color: #FFF; border-color: #555; }
.status-chip { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-left: 0.5rem; }
.status-chip.open { background-color: rgba(0, 255, 102, 0.15); color: #00FF66; }
.status-chip.closed { background-color: rgba(255, 255, 255, 0.1); color: #999; }
.header-actions-group { display: flex; gap: 0.75rem; align-items: center; }
.btn-secondary { background: transparent; color: #A0A5AA; border: 1px solid #333; font-weight: 600; padding: 0.8rem 1.2rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; transition: 0.2s; }
.btn-secondary:hover { background: #222; color: #FFF; border-color: #555; }
.icon-import { font-size: 1.1rem; }
.icon-plus { font-size: 1.2rem; line-height: 1; }

.empty-state { text-align: center; padding: 4rem 2rem; background-color: #1A1C1D; border: 1px dashed #333; border-radius: 12px; color: #7E8286; }

/* SUMMARY CARDS */
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
.card { padding: 1.5rem; border-radius: 12px; border: 1px solid #333; }
.card.bg-dark { background-color: #1A1C1D; }
.card.bg-success { background-color: rgba(0, 255, 102, 0.05); border-color: rgba(0, 255, 102, 0.2); }
.card.bg-danger { background-color: rgba(255, 74, 74, 0.05); border-color: rgba(255, 74, 74, 0.2); }
.card .label { margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #7E8286; text-transform: uppercase; font-weight: 600; }
.card h3 { margin: 0; font-size: 2rem; color: #FFF; font-weight: 800; letter-spacing: -1px; }

.section-title h3 { color: #FFF; font-size: 1.1rem; border-bottom: 1px solid #333; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }

/* MEMBERS GRID */
.member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2.5rem; }
.member-card { background: #1A1C1D; padding: 1.5rem; border-radius: 12px; border: 1px solid #333; display: flex; flex-direction: column; gap: 1.2rem; }
.member-header { display: flex; align-items: center; gap: 1rem; }
.m-avatar { width: 44px; height: 44px; border-radius: 50%; background: #2A2C2E; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800; color: #FFF; }
.m-info h4 { margin: 0 0 0.25rem 0; color: #FFF; font-size: 1.1rem; }
.m-target { margin: 0; font-size: 0.8rem; color: #7E8286; }
.m-target b { color: #A0A5AA; }

/* PROGRESS BAR */
.progress-bar-container { width: 100%; height: 8px; background: #2A2C2E; border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: #00FF66; border-radius: 4px; transition: width 0.5s ease-out; }
.progress-bar-fill.over-budget { background: #00E5FF; }

.m-footer { display: flex; justify-content: space-between; }
.m-stat { display: flex; flex-direction: column; }
.m-stat.rt { text-align: right; }
.muted { font-size: 0.75rem; color: #7E8286; text-transform: uppercase; margin-bottom:0.2rem; }
.val { font-size: 1rem; color: #FFF; font-weight: 700; }
.val.warn { color: #FFB020; }
.val.exito { color: #00E5FF; }

/* TABLE RECENT */
.table-container { background-color: #1A1C1D; border-radius: 12px; overflow-x: auto; border: 1px solid #333; margin-bottom: 2rem; }
.data-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td { padding: 1rem 1.5rem; border-bottom: 1px solid #2A2C2E; }
.data-table th { color: #7E8286; font-weight: 500; font-size: 0.85rem; }
.data-table tr:hover { background-color: #24272A; }
.font-bold { font-weight: 600; color: #FFF; }
.text-emerald { color: #00FF66; }

/* MODALS (Globalized snippet) */
.modal-backdrop { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #1A1C1D; padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 450px; border: 1px solid #333; box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-top: 4px solid #00FF66;}
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

@media (max-width: 600px) {
  .header-navigator { flex-direction: column; align-items: stretch; text-align: center; }
  .month-controls { justify-content: center; }
  .month-controls h2 { min-width: auto; font-size: 1.1rem; }
  .btn-primary { width: 100%; justify-content: center; }
  .summary-cards { grid-template-columns: 1fr; }
  .card h3 { font-size: 1.5rem; }
}
</style>
