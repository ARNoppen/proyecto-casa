<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import { formatCurrency, normalizeMoney } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal.vue';

const authStore = useAuthStore();
const loans = ref([]);
const users = ref([]);
const loading = ref(true);
const error = ref(null);

// Modals de Datos
const showLoanModal = ref(false);
const showPaymentModal = ref(false);
const submitting = ref(false);
const editingLoan = ref(null);
const editingPayment = ref(null);

// Modals de Confirmación
const confirmModal = ref({
  show: false,
  title: '',
  message: '',
  onConfirm: null,
  type: 'primary',
  isAlert: false
});

const loanForm = ref({
  name: '',
  entity: '',
  total_amount: '',
  installments_count: '',
  start_date: new Date().toISOString().split('T')[0],
  due_day: 10,
  status: 'active'
});

const paymentForm = ref({
  loan_id: null,
  installment_number: '',
  payment_date: new Date().toISOString().split('T')[0],
  amount: '',
  assigned_to_user_id: authStore.currentUser?.id,
  payment_method: '',
  comment: ''
});

// Detalle expandible
const expandedLoanId = ref(null);
const loanPayments = ref({}); // { loanId: [payments] }

const statusLabels = {
  active: 'Activo',
  paused: 'Pausado',
  completed: 'Finalizado',
  paid: 'Pagada',
  pending: 'Pendiente',
  partial: 'Parcial',
  overdue: 'Vencida'
};

const loadData = async () => {
  loading.value = true;
  error.value = null;
  try {
    const [loansRes, usersRes] = await Promise.all([
      api.get('/loans'),
      api.get('/users')
    ]);
    loans.value = loansRes.data;
    users.value = usersRes.data.filter(u => u.is_active);
  } catch (err) {
    showAlert('Error', 'No se pudo cargar la información de préstamos.');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const toggleExpand = async (loanId) => {
  if (expandedLoanId.value === loanId) {
    expandedLoanId.value = null;
  } else {
    expandedLoanId.value = loanId;
    if (!loanPayments.value[loanId]) {
      try {
        const res = await api.get(`/loans/${loanId}/payments`);
        loanPayments.value[loanId] = res.data;
      } catch (err) {
        console.error('Error cargando pagos:', err);
      }
    }
  }
};

// Global Stats
const globalStats = computed(() => {
  const stats = {
    total_debt: 0,
    total_paid: 0,
    total_pending: 0,
    active_count: 0,
    finished_count: 0
  };
  loans.value.forEach(l => {
    stats.total_debt += parseFloat(l.total_amount);
    stats.total_paid += parseFloat(l.total_paid);
    stats.total_pending += parseFloat(l.remaining_amount);
    if (l.status === 'active') stats.active_count++;
    if (l.status === 'completed') stats.finished_count++;
  });
  return stats;
});

// Lógica de Cuotas (Generación Visual)
const getInstallments = (loan) => {
  const installments = [];
  const startDate = new Date(loan.start_date);
  const expectedAmount = normalizeMoney(parseFloat(loan.total_amount) / parseInt(loan.installments_count));
  const payments = loanPayments.value[loan.id] || [];

  for (let i = 1; i <= loan.installments_count; i++) {
    const dueDate = new Date(startDate.getFullYear(), startDate.getMonth() + i - 1, loan.due_day);
    const paidForThis = payments
      .filter(p => p.installment_number === i)
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    let status = 'pending';
    if (paidForThis >= expectedAmount * 0.99) status = 'paid';
    else if (paidForThis > 0) status = 'partial';
    else if (dueDate < new Date()) status = 'overdue';

    installments.push({
      number: i,
      dueDate,
      expectedAmount,
      paidAmount: paidForThis,
      status,
      payments: payments.filter(p => p.installment_number === i)
    });
  }
  return installments;
};

const getNextDueDate = (loan) => {
  const installments = getInstallments(loan);
  const next = installments.find(inst => inst.status === 'pending' || inst.status === 'partial' || inst.status === 'overdue');
  return next ? next.dueDate : null;
};

const isOverdue = (loan) => {
  const next = getNextDueDate(loan);
  return next && next < new Date();
};

// Actions Préstamos
const openNewLoanModal = () => {
  editingLoan.value = null;
  loanForm.value = {
    name: '',
    entity: '',
    total_amount: '',
    installments_count: '',
    start_date: new Date().toISOString().split('T')[0],
    due_day: 10,
    status: 'active'
  };
  showLoanModal.value = true;
};

const openEditLoanModal = (loan) => {
  editingLoan.value = loan;
  loanForm.value = { 
    ...loan, 
    start_date: loan.start_date.split('T')[0]
  };
  showLoanModal.value = true;
};

const saveLoan = async () => {
  submitting.value = true;
  // Normalizar antes de enviar
  const payload = {
    ...loanForm.value,
    total_amount: normalizeMoney(loanForm.value.total_amount)
  };
  try {
    if (editingLoan.value) {
      await api.put(`/loans/${editingLoan.value.id}`, payload);
    } else {
      await api.post('/loans', payload);
    }
    showLoanModal.value = false;
    loadData();
  } catch (err) {
    showAlert('Error', err.response?.data?.error || 'Error al guardar el préstamo');
  } finally {
    submitting.value = false;
  }
};

const confirmDeleteLoan = (loan) => {
  showConfirm(
    'Eliminar Préstamo',
    `¿Estás seguro de eliminar el préstamo "${loan.name}"? Se borrarán permanentemente todos sus pagos asociados.`,
    async () => {
      try {
        await api.delete(`/loans/${loan.id}`);
        loadData();
      } catch (err) {
        showAlert('Error', 'No se pudo eliminar el préstamo.');
      }
    },
    'danger'
  );
};

// Actions Pagos
const openPaymentModal = (loan, installment = null) => {
  editingPayment.value = null;
  paymentForm.value = {
    loan_id: loan.id,
    installment_number: installment ? installment.number : '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: installment ? normalizeMoney(installment.expectedAmount - installment.paidAmount) : '',
    assigned_to_user_id: authStore.currentUser?.id,
    payment_method: '',
    comment: ''
  };
  showPaymentModal.value = true;
};

const openEditPaymentModal = (loan, payment) => {
  editingPayment.value = payment;
  paymentForm.value = {
    loan_id: loan.id,
    installment_number: payment.installment_number || '',
    payment_date: payment.payment_date.split('T')[0],
    amount: payment.amount,
    assigned_to_user_id: payment.assigned_to_user_id,
    payment_method: payment.payment_method || '',
    comment: payment.comment || ''
  };
  showPaymentModal.value = true;
};

const savePayment = async () => {
  submitting.value = true;
  const payload = {
    ...paymentForm.value,
    amount: normalizeMoney(paymentForm.value.amount)
  };
  try {
    if (editingPayment.value) {
        await api.put(`/loans/payments/${editingPayment.value.id}`, payload);
    } else {
        await api.post(`/loans/${paymentForm.value.loan_id}/payments`, payload);
    }
    showPaymentModal.value = false;
    // Recargar pagos del préstamo específico
    const res = await api.get(`/loans/${paymentForm.value.loan_id}/payments`);
    loanPayments.value[paymentForm.value.loan_id] = res.data;
    loadData();
  } catch (err) {
    showAlert('Error', err.response?.data?.error || 'Error al registrar el pago');
  } finally {
    submitting.value = false;
  }
};

const confirmDeletePayment = (loanId, payment) => {
  showConfirm(
    'Eliminar Pago',
    `¿Seguro que querés eliminar este pago de $${formatCurrency(payment.amount)}?`,
    async () => {
      try {
        await api.delete(`/loans/payments/${payment.id}`);
        const res = await api.get(`/loans/${loanId}/payments`);
        loanPayments.value[loanId] = res.data;
        loadData();
      } catch (err) {
        showAlert('Error', 'No se pudo eliminar el pago.');
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

onMounted(loadData);
</script>

<template>
  <div class="loans-view">
    <div class="view-header">
      <div class="title-section">
        <h1>Préstamos Felicia</h1>
        <p class="subtitle">Administración de deudas y compromisos familiares</p>
      </div>
      <div class="header-actions" v-if="authStore.isAdmin">
        <button @click="openNewLoanModal" class="btn btn-primary">
          <span class="icon">+</span> Nuevo Préstamo
        </button>
      </div>
    </div>

    <!-- Resumen Global -->
    <section class="global-summary" v-if="!loading">
      <div class="summary-card">
        <span class="label">Deuda Total Global</span>
        <span class="value">${{ formatCurrency(globalStats.total_debt) }}</span>
      </div>
      <div class="summary-card highlight-success">
        <span class="label">Total Pagado</span>
        <span class="value">${{ formatCurrency(globalStats.total_paid) }}</span>
      </div>
      <div class="summary-card highlight-warn">
        <span class="label">Total Pendiente</span>
        <span class="value">${{ formatCurrency(globalStats.total_pending) }}</span>
      </div>
      <div class="summary-card mini">
        <div class="mini-stat">
          <span class="label">Activos</span>
          <span class="value small">{{ globalStats.active_count }}</span>
        </div>
        <div class="mini-stat">
          <span class="label">Finalizados</span>
          <span class="value small">{{ globalStats.finished_count }}</span>
        </div>
      </div>
    </section>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Cargando préstamos...</p>
    </div>

    <div v-else-if="loans.length === 0" class="empty-state">
      <p>No hay préstamos registrados actualmente.</p>
    </div>

    <!-- Grid de Préstamos -->
    <div v-else class="loans-grid">
      <div v-for="loan in loans" :key="loan.id" class="loan-card" :class="{ 'overdue-card': isOverdue(loan) && loan.status === 'active' }">
        <div class="card-body">
          <div class="card-header">
            <div class="loan-info">
              <h3>{{ loan.name }}</h3>
              <p class="entity">{{ loan.entity || 'Sin descripción' }}</p>
            </div>
            <div class="loan-status">
              <span :class="['status-badge', loan.status]">{{ statusLabels[loan.status] || loan.status }}</span>
            </div>
          </div>

          <div class="progress-section">
            <div class="progress-info">
              <span class="pct">{{ Math.round((loan.total_paid / loan.total_amount) * 100) }}% pagado</span>
              <span class="ratio">{{ loan.payments_count }} pagos registrados</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (loan.total_paid / loan.total_amount * 100) + '%' }"></div>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat">
              <span class="s-label">Monto Total</span>
              <span class="s-val">${{ formatCurrency(loan.total_amount) }}</span>
            </div>
            <div class="stat">
              <span class="s-label">Falta pagar</span>
              <span class="s-val highlight">${{ formatCurrency(loan.remaining_amount) }}</span>
            </div>
          </div>

          <div class="vencimiento-box" v-if="loan.status === 'active'">
            <span class="v-label">Próximo Vencimiento:</span>
            <span :class="['v-date', { 'overdue-text': isOverdue(loan) }]">
              {{ getNextDueDate(loan) ? getNextDueDate(loan).toLocaleDateString() : 'N/A' }}
            </span>
            <span v-if="isOverdue(loan)" class="overdue-tag">VENCIDO</span>
          </div>

          <div class="card-footer">
            <button @click="openPaymentModal(loan)" class="btn btn-primary btn-grow" v-if="authStore.isAdmin && loan.status === 'active'">
              Registrar Pago
            </button>
            <button @click="toggleExpand(loan.id)" class="btn btn-secondary">
              {{ expandedLoanId === loan.id ? 'Cerrar Detalle' : 'Ver Detalle' }}
              <span class="arrow" :class="{ rotated: expandedLoanId === loan.id }">▼</span>
            </button>
            
            <div class="admin-actions" v-if="authStore.isAdmin">
                <button @click="openEditLoanModal(loan)" class="btn-icon" title="Editar">✏️</button>
                <button @click="confirmDeleteLoan(loan)" class="btn-icon danger" title="Eliminar">🗑️</button>
            </div>
          </div>
        </div>

        <!-- Detalle Desplegable -->
        <div v-if="expandedLoanId === loan.id" class="loan-detail">
          <div class="detail-section">
            <h4>Plan de Cuotas (Estimado)</h4>
            <div class="installments-list">
              <div v-for="inst in getInstallments(loan)" :key="inst.number" class="inst-item" :class="inst.status">
                <div class="inst-info">
                  <span class="inst-num">Cuota {{ inst.number }} de {{ loan.installments_count }}</span>
                  <span class="inst-date">{{ inst.dueDate.toLocaleDateString() }}</span>
                </div>
                <div class="inst-amounts">
                  <span class="inst-expected">Esp: ${{ formatCurrency(inst.expectedAmount) }}</span>
                  <span class="inst-paid">Pag: ${{ formatCurrency(inst.paidAmount) }}</span>
                </div>
                <div class="inst-status">
                  <span :class="['status-pill', inst.status]">{{ statusLabels[inst.status] || inst.status }}</span>
                  <button v-if="authStore.isAdmin && inst.status !== 'paid'" @click="openPaymentModal(loan, inst)" class="btn btn-primary btn-sm">Pagar</button>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>Historial de Pagos Reales</h4>
            <div class="payments-table-wrapper">
              <table class="payments-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto</th>
                    <th>Usuario</th>
                    <th>Comentario</th>
                    <th v-if="authStore.isAdmin"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="pay in loanPayments[loan.id]" :key="pay.id">
                    <td>{{ new Date(pay.payment_date).toLocaleDateString() }}</td>
                    <td class="amount">${{ formatCurrency(pay.amount) }}</td>
                    <td>{{ pay.assigned_to_name }} <small>(por {{ pay.created_by_name }})</small></td>
                    <td>{{ pay.comment || '-' }}</td>
                    <td v-if="authStore.isAdmin">
                        <div class="action-buttons">
                            <button @click="openEditPaymentModal(loan, pay)" class="btn-icon" title="Editar">✏️</button>
                            <button @click="confirmDeletePayment(loan.id, pay)" class="btn-icon danger" title="Borrar">🗑️</button>
                        </div>
                    </td>
                  </tr>
                  <tr v-if="!loanPayments[loan.id]?.length">
                    <td colspan="5" class="empty-table">No hay pagos registrados.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL PRESTAMO -->
    <div v-if="showLoanModal" class="modal-backdrop">
      <div class="modal-content">
        <h3>{{ editingLoan ? 'Editar Préstamo' : 'Nuevo Préstamo' }}</h3>
        <form @submit.prevent="saveLoan">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre del Préstamo</label>
              <input v-model="loanForm.name" type="text" placeholder="Ej: Préstamo Santander" required />
            </div>
            <div class="form-group">
              <label>Entidad / Descripción</label>
              <input v-model="loanForm.entity" type="text" placeholder="Ej: Crédito Personal" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Monto Total</label>
                <input v-model="loanForm.total_amount" type="number" step="0.01" required />
              </div>
              <div class="form-group">
                <label>Cuotas</label>
                <input v-model="loanForm.installments_count" type="number" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Fecha Inicio</label>
                <input v-model="loanForm.start_date" type="date" required />
              </div>
              <div class="form-group">
                <label>Día Vencimiento</label>
                <input v-model="loanForm.due_day" type="number" min="1" max="31" required />
              </div>
            </div>
            <div class="form-group">
              <label>Estado</label>
              <select v-model="loanForm.status">
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="completed">Finalizado</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showLoanModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ editingLoan ? 'Actualizar' : 'Crear Préstamo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL PAGO -->
    <div v-if="showPaymentModal" class="modal-backdrop">
      <div class="modal-content">
        <h3>{{ editingPayment ? 'Editar Pago' : 'Registrar Pago' }}</h3>
        <form @submit.prevent="savePayment">
          <div class="form-grid">
            <div class="form-group">
              <label>Monto Pagado</label>
              <input v-model="paymentForm.amount" type="number" step="0.01" required autofocus />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Fecha de Pago</label>
                <input v-model="paymentForm.payment_date" type="date" required />
              </div>
              <div class="form-group">
                <label>Cuota # (Opcional)</label>
                <input v-model="paymentForm.installment_number" type="number" />
              </div>
            </div>
            <div class="form-group">
              <label>A cuenta de</label>
              <select v-model="paymentForm.assigned_to_user_id" required>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>Medio de Pago</label>
              <input v-model="paymentForm.payment_method" type="text" placeholder="Ej: Transferencia, Efectivo..." />
            </div>
            <div class="form-group">
              <label>Comentario</label>
              <textarea v-model="paymentForm.comment" rows="2"></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" @click="showPaymentModal = false" class="btn btn-secondary">Cancelar</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ editingPayment ? 'Actualizar Pago' : 'Registrar Pago' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN -->
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
.loans-view { color: #FFF; }
.view-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
.title-section h1 { margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: -1px; }
.subtitle { color: #7E8286; margin: 0.2rem 0 0 0; }

/* Global Summary */
.global-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
.summary-card { background: #1A1C1D; padding: 1.5rem; border-radius: 12px; border: 1px solid #333; display: flex; flex-direction: column; gap: 0.5rem; }
.summary-card .label { font-size: 0.8rem; color: #7E8286; text-transform: uppercase; font-weight: 600; }
.summary-card .value { font-size: 1.8rem; font-weight: 800; }
.highlight-success .value { color: #00FF66; }
.highlight-warn .value { color: #FFB020; }
.summary-card.mini { display: flex; flex-direction: row; justify-content: space-around; padding: 1rem; }
.mini-stat { display: flex; flex-direction: column; align-items: center; }
.mini-stat .value.small { font-size: 1.4rem; }

/* Loans Grid */
.loans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 2rem; }
.loan-card { background: #1A1C1D; border-radius: 16px; border: 1px solid #333; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s; }
.loan-card:hover { border-color: #444; }
.overdue-card { border-color: rgba(255, 74, 74, 0.5); box-shadow: 0 0 15px rgba(255, 74, 74, 0.1); }
.card-body { padding: 1.5rem; }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.loan-info h3 { margin: 0; font-size: 1.25rem; font-weight: 700; }
.entity { margin: 0.2rem 0 0 0; color: #7E8286; font-size: 0.9rem; }

.status-badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.status-badge.active { background: rgba(0, 255, 102, 0.1); color: #00FF66; }
.status-badge.paused { background: rgba(255, 176, 32, 0.1); color: #FFB020; }
.status-badge.completed { background: rgba(255, 255, 255, 0.1); color: #A0A5AA; }

.progress-section { margin-bottom: 1.5rem; }
.progress-info { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem; }
.pct { color: #00FF66; font-weight: 700; }
.ratio { color: #7E8286; }
.progress-bar { height: 8px; background: #2A2C2E; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: #00FF66; border-radius: 4px; transition: width 0.5s ease-out; }

.stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.stat { display: flex; flex-direction: column; gap: 0.2rem; }
.s-label { font-size: 0.75rem; color: #7E8286; text-transform: uppercase; }
.s-val { font-size: 1.1rem; font-weight: 700; }
.s-val.highlight { color: #FFB020; }

.vencimiento-box { background: #111; padding: 0.75rem 1rem; border-radius: 8px; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; font-size: 0.9rem; border: 1px solid #222; }
.v-label { color: #7E8286; }
.v-date { font-weight: 700; }
.overdue-text { color: #FF4A4A; }
.overdue-tag { background: #FF4A4A; color: #FFF; font-size: 0.65rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 900; }

.card-footer { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
.btn-grow { flex: 1; }
.arrow { font-size: 0.7rem; transition: transform 0.3s; }
.arrow.rotated { transform: rotate(180deg); }

.admin-actions { display: flex; gap: 0.5rem; }

/* Detail Section */
.loan-detail { background: #111; border-top: 1px solid #333; padding: 1.5rem; display: flex; flex-direction: column; gap: 2rem; }
.detail-section h4 { margin: 0 0 1rem 0; font-size: 0.9rem; color: #7E8286; text-transform: uppercase; letter-spacing: 1px; }

.installments-list { display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem; }
.inst-item { background: #1A1C1D; padding: 1rem; border-radius: 10px; border: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
.inst-item.paid { border-left: 4px solid #00FF66; }
.inst-item.partial { border-left: 4px solid #FFB020; }
.inst-item.overdue { border-left: 4px solid #FF4A4A; }
.inst-item.pending { border-left: 4px solid #444; }

.inst-info { display: flex; flex-direction: column; }
.inst-num { font-weight: 700; font-size: 0.95rem; }
.inst-date { font-size: 0.8rem; color: #7E8286; }

.inst-amounts { display: flex; flex-direction: column; text-align: center; }
.inst-expected { font-size: 0.75rem; color: #7E8286; }
.inst-paid { font-weight: 700; font-size: 0.9rem; color: #00FF66; }

.inst-status { display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; }
.status-pill { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 10px; text-transform: uppercase; font-weight: 800; }
.status-pill.paid { background: rgba(0, 255, 102, 0.15); color: #00FF66; }
.status-pill.partial { background: rgba(255, 176, 32, 0.15); color: #FFB020; }
.status-pill.overdue { background: rgba(255, 74, 74, 0.15); color: #FF4A4A; }
.status-pill.pending { background: #2A2C2E; color: #7E8286; }

/* Payments Table */
.payments-table-wrapper { overflow-x: auto; }
.payments-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.payments-table th { text-align: left; padding: 0.75rem; border-bottom: 1px solid #333; color: #7E8286; font-weight: 500; }
.payments-table td { padding: 0.75rem; border-bottom: 1px solid #222; }
.payments-table .amount { font-weight: 700; color: #00FF66; }
.empty-table { text-align: center; color: #555; padding: 2rem !important; }
.action-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }

/* Modal Custom Styles (Para el grid de forms) */
.form-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.form-group label { display: block; margin-bottom: 0.5rem; color: #A0A5AA; font-size: 0.85rem; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem 1rem; background: #111; border: 1px solid #333; border-radius: 8px; color: #FFF; font-size: 1rem; }
.form-group input:focus { border-color: #00FF66; outline: none; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }

.loading-state { display: flex; flex-direction: column; align-items: center; padding: 5rem; gap: 1rem; color: #7E8286; }
.spinner { width: 40px; height: 40px; border: 4px solid rgba(0,255,102,0.1); border-top: 4px solid #00FF66; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .view-header { flex-direction: column; gap: 1.5rem; }
  .header-actions { width: 100%; }
  .btn-primary { width: 100%; justify-content: center; }
  .loans-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
</style>
