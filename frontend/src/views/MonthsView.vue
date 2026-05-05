<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import api from '../api/axios';
import { formatCurrency } from '../utils/formatters';

const router = useRouter();
const authStore = useAuthStore();
const monthsList = ref([]);
const loading = ref(true);
const error = ref(null);

const goToDashboard = (month, year) => {
  router.push({ path: '/', query: { month, year } });
};

const showModal = ref(false);
const submitting = ref(false);

const form = ref({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  copyFromPreviousId: ''
});

const fetchMonths = async () => {
  error.value = null;
  try {
    const { data } = await api.get('/months');
    monthsList.value = data;
  } catch (err) {
    console.error(err);
    error.value = 'No se pudieron cargar los periodos.';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchMonths();
});

const openNewMonthModal = () => {
  // Autocompletar con el próximo mes libre si hay historial
  if (monthsList.value.length > 0) {
    let lastM = monthsList.value[0].month;
    let lastY = monthsList.value[0].year;
    
    if (lastM === 12) {
      form.value.month = 1;
      form.value.year = lastY + 1;
    } else {
      form.value.month = lastM + 1;
      form.value.year = lastY;
    }
  }
  
  showModal.value = true;
};

const closeMonthModal = () => {
  showModal.value = false;
  error.value = null;
};

const saveMonth = async () => {
  submitting.value = true;
  error.value = null;
  try {
    await api.post('/months', {
      month: form.value.month,
      year: form.value.year,
      copyFromPreviousId: form.value.copyFromPreviousId ? form.value.copyFromPreviousId : null
    });
    
    await fetchMonths();
    closeMonthModal();
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al aperturar el mes.';
  } finally {
    submitting.value = false;
  }
};

// Utilidad rápida para cerrar periodo desde esta vista (Solo Admin)
const toggleMonthStatus = async (id, currentStatus) => {
  if (!authStore.isAdmin) return;
  const newStatus = currentStatus === 'open' ? 'closed' : 'open';
  
  if(!confirm(`¿Seguro que quieres pasar este mes a estado ${newStatus.toUpperCase()}?`)) return;

  try {
    await api.put(`/months/${id}/status`, { status: newStatus });
    await fetchMonths();
  } catch(err) {
    alert('Error al cambiar el estado del mes.');
  }
};
</script>

<template>
  <div class="months-view">
    <div class="header-actions">
      <div>
        <h2>Catálogo de Meses</h2>
        <p class="subtitle">Todos los ciclos de recuento financiero de la casa históricos y vigentes.</p>
      </div>

      <button v-if="authStore.isAdmin" @click="openNewMonthModal" class="btn-outline">Abrir Período</button>
    </div>

    <div v-if="loading" class="loading">Cargando períodos base...</div>
    <div v-else-if="error" class="error-banner">{{ error }}</div>
    
    <div v-else class="cards-grid">
      <div v-for="month in monthsList" :key="month.id" class="month-card clickable" @click="goToDashboard(month.month, month.year)">
        <div class="card-top">
          <h4>
            Mes {{ month.month }} <span class="dim">/</span> {{ month.year }}
          </h4>
          <button v-if="authStore.isAdmin" @click.stop="toggleMonthStatus(month.id, month.status)" :class="['status-badge', 'status-toggle', month.status]">
            {{ month.status === 'open' ? 'Abierto' : 'Cerrado' }}
          </button>
          <span v-else :class="['status-badge', month.status]">{{ month.status === 'open' ? 'Abierto' : 'Cerrado' }}</span>
        </div>
        
        <div class="card-bottom">
          <span class="label">Presupuesto Consolidado:</span>
          <span class="value">${{ formatCurrency(month.total_budget) }}</span>
        </div>
      </div>
      
      <div v-if="monthsList.length === 0" class="empty-state">
        <p>No hay períodos configurados en la Base de Datos.</p>
        <button v-if="authStore.isAdmin" @click="openNewMonthModal" class="btn-primary" style="margin-top:1rem;">Empezar este mes</button>
      </div>
    </div>

    <!-- MODAL APERTURA MES -->
    <div v-if="showModal" class="modal-backdrop">
      <div class="modal">
        <h3>Aperturar Nuevo Mes</h3>
        <p class="modal-sub">Define el mes fiscal para el hogar. Se importarán los integrantes activos automáticamente.</p>

        <div v-if="error" class="error-banner">{{ error }}</div>

        <form @submit.prevent="saveMonth">
          <div class="form-grid">
            <div class="form-row">
              <div class="form-group half">
                <label>Mes</label>
                <select v-model.number="form.month" required>
                  <option v-for="m in 12" :key="m" :value="m">{{ m }}</option>
                </select>
              </div>

              <div class="form-group half">
                <label>Año</label>
                <input v-model.number="form.year" type="number" required min="2020" max="2050" />
              </div>
            </div>

            <div class="form-group" v-if="monthsList.length > 0">
              <label>Replicar configuración desde (Opcional)</label>
              <select v-model="form.copyFromPreviousId">
                <option value="">-- No copiar (usar aportes base por defecto) --</option>
                <option v-for="m in monthsList" :key="m.id" :value="m.id">
                  Mes {{ m.month }} / {{ m.year }}
                </option>
              </select>
              <small class="help-text">Si copias un mes particular, se heredarán temporalmente los aportes y acuerdos que rigieron en ese periodo específico.</small>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" @click="closeMonthModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="submitting">
              {{ submitting ? 'Guardando...' : 'Abrir Período' }}
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
.header-actions h2 { margin: 0 0 0.25rem 0; color: #FFF; }
.subtitle { margin: 0; color: #7E8286; font-size: 0.9rem; }

.btn-outline {
  background: transparent; color: #00FF66; border: 1px solid #00FF66; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-outline:hover { background: rgba(0, 255, 102, 0.1); }

/* GRID */
.cards-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;
}

.month-card {
  background-color: #1A1C1D; border-radius: 12px; padding: 1.5rem; border: 1px solid #333; transition: transform 0.2s, border-color 0.2s;
}
.month-card.clickable { cursor: pointer; }
.month-card.clickable:hover { border-color: #00FF66; transform: translateY(-2px); }
.month-card:hover { border-color: #555; }

.card-top {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #2A2C2E; padding-bottom: 1rem;
}

.card-top h4 { margin: 0; font-size: 1.25rem; color: #FFF; }
.dim { color: #555; font-weight: 300; }

.status-badge {
  padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;
}
.status-toggle { cursor: pointer; border: none; font-family: inherit; }
.status-toggle:hover { opacity: 0.8; }

.status-badge.open { background-color: rgba(0, 255, 102, 0.15); color: #00FF66; }
.status-badge.closed { background-color: rgba(255, 255, 255, 0.1); color: #999; }

.card-bottom { display: flex; flex-direction: column; }
.label { font-size: 0.8rem; color: #A0A5AA; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
.value { font-size: 1.8rem; font-weight: 800; color: #FFF; }

.empty-state {
  grid-column: 1 / -1; text-align: center; padding: 3rem; background-color: #1A1C1D; border: 1px dashed #333; border-radius: 12px;
}
.empty-state p { color: #7E8286; margin: 0; }

/* MODAL STYLES (Reutilizados globalmente para consistencia) */
.modal-backdrop {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background-color: #1A1C1D; padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 450px; border: 1px solid #333; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}
.modal h3 { margin: 0 0 0.25rem 0; color: #FFF; font-size: 1.4rem; }
.modal-sub { margin: 0 0 1.5rem 0; color: #7E8286; font-size: 0.9rem; line-height: 1.4; }

.form-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.form-row { display: flex; gap: 1rem; }
.form-group.half { flex: 1; }

.form-group label { display: block; margin-bottom: 0.4rem; color: #A0A5AA; font-size: 0.85rem; font-weight: 500; }
.form-group input, .form-group select {
  width: 100%; padding: 0.8rem 1rem; background-color: #111111; border: 1px solid #333; border-radius: 8px; color: #FFF; font-size: 1rem;
}
.form-group input:focus, .form-group select:focus { border-color: #00FF66; outline: none; }
.help-text { display: block; margin-top: 0.5rem; color: #666; font-size: 0.75rem; line-height: 1.3; }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2.5rem; }
.btn-cancel { background: transparent; color: #A0A5AA; border: none; font-weight: 600; cursor: pointer; padding: 0.6rem 1rem; }
.btn-cancel:hover { color: #FFF; }
.btn-primary { background-color: #00FF66; color: #000; border: none; font-weight: 700; padding: 0.8rem 1.5rem; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { background-color: #24272A; color: #555; cursor: not-allowed; transform: none; }

.error-banner { background-color: rgba(255, 74, 74, 0.1); color: #FF4A4A; padding: 0.75rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem; border: 1px solid rgba(255, 74, 74, 0.2); }
</style>
