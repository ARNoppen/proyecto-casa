<script setup>
import { ref, computed, onMounted } from 'vue';
import * as XLSX from 'xlsx';
import api from '../api/axios';
import { useRouter } from 'vue-router';

const router = useRouter();
const users = ref([]);
const existingMonths = ref([]);
const currentStep = ref(1); // 1: Upload, 2: Sheet (optional), 3: Mapping, 4: Preview, 5: Result

// File data
const fileName = ref('');
const workbook = ref(null);
const sheetNames = ref([]);
const selectedSheet = ref('');
const rawData = ref([]); // Data from the selected sheet

// Mapping state
const headers = ref([]);
const mapping = ref({
  description: '',
  date: '',
  amount: '',
  personType: 'single', // 'single' o 'multiple'
  person: '', // Si es single
  personColumns: [], // Si es multiple
  month: '',
  logicType: 'auto' // 'auto' (negativo es gasto), 'forced-expense', 'forced-income', 'column-based'
});

// Validation results
const movements = ref([]);
const validationSummary = ref({
  valid: 0,
  ignoredEmpty: 0,
  invalidDate: 0,
  noAmount: 0,
  noPerson: 0,
  multipleImpacts: 0,
  totalToImport: 0,
  newMonths: []
});

const isProcessing = ref(false);
const importResult = ref(null);

onMounted(async () => {
  try {
    const [uRes, mRes] = await Promise.all([
      api.get('/users'),
      api.get('/months')
    ]);
    users.value = uRes.data.filter(u => u.is_active);
    existingMonths.value = mRes.data;
  } catch (err) {
    console.error('Error al cargar datos maestros:', err);
  }
});

// --- STEP 1: UPLOAD ---
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    alert('Formato no válido. Solo se permiten archivos Excel (.xlsx, .xls) o CSV.');
    return;
  }

  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const bstr = evt.target.result;
      workbook.value = XLSX.read(bstr, { type: 'binary' });
      sheetNames.value = workbook.value.SheetNames;
      
      if (sheetNames.value.length === 1) {
        selectedSheet.value = sheetNames.value[0];
        processSheet();
      } else {
        currentStep.value = 2;
      }
    } catch (err) {
      alert('No pudimos leer el archivo. Verificá que sea un Excel o CSV válido.');
    }
  };
  reader.readAsBinaryString(file);
};

// --- STEP 2: SHEET SELECTION ---
const processSheet = () => {
  const worksheet = workbook.value.Sheets[selectedSheet.value];
  rawData.value = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rawData.value.length > 0) {
    headers.value = Object.keys(rawData.value[0]);
    // Sugerencias básicas de mapping
    autoSuggestMapping();
    currentStep.value = 3;
  } else {
    alert('La hoja seleccionada parece estar vacía.');
  }
};

const autoSuggestMapping = () => {
  headers.value.forEach(h => {
    const low = h.toLowerCase();
    if (low.includes('desc') || low.includes('concep')) mapping.value.description = h;
    if (low.includes('fec')) mapping.value.date = h;
    if (low.includes('mont') || low.includes('impor') || low.includes('total')) mapping.value.amount = h;
    if (low.includes('pers') || low.includes('quien')) mapping.value.person = h;
    if (low.includes('mes')) mapping.value.month = h;
    
    // Si detecta nombres de usuarios, sugerir múltiple
    const isUser = users.value.some(u => low.includes(u.name.toLowerCase()));
    if (isUser && !mapping.value.personColumns.includes(h)) {
      mapping.value.personColumns.push(h);
      mapping.value.personType = 'multiple';
    }
  });
};

// --- ROBUST MONTH PARSING ---
const parseSpanishMonth = (val) => {
  if (!val) return null;
  const s = String(val).toLowerCase().trim();
  const months = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
  };
  if (months[s]) return months[s];
  const num = parseInt(s);
  return isNaN(num) ? null : (num >= 1 && num <= 12 ? num : null);
};

// --- ROBUST DATE PARSING ---
const parseExcelDate = (val) => {
  if (!val) return null;
  
  // 1. Objeto Date (Normalmente de SheetJS en UTC 00:00)
  if (val instanceof Date) {
    // Extraemos año/mes/día directos en UTC para crear un objeto Local puro
    return new Date(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate());
  }

  // 2. Serial Numérico de Excel (Días desde 1899-12-30)
  if (typeof val === 'number') {
    const dateUTC = new Date(Math.round((val - 25569) * 86400 * 1000));
    return new Date(dateUTC.getUTCFullYear(), dateUTC.getUTCMonth(), dateUTC.getUTCDate());
  }

  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;

    // 3. Formato dd/mm/yyyy o d/m/yy (Soporta 1 o 2 dígitos y años de 2 o 4 dígitos)
    const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += (year < 50 ? 2000 : 1900); // Milenio actual
      return new Date(year, month, day);
    }

    // 4. Formato yyyy-mm-dd (ISO)
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      return new Date(y, m, d);
    }

    // 5. Fallback desesperado: Extracción de números cruda
    // Si el texto es "2025-10-01 10:30" o algo raro, intentamos sacar los 3 primeros grupos
    const parts = s.match(/\d+/g);
    if (parts && parts.length >= 3) {
      if (parts[0].length === 4) { // Asumimos YYYY-MM-DD
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else { // Asumimos DD-MM-YYYY
        let yearPart = parseInt(parts[2]);
        if (yearPart < 100) yearPart += 2000;
        return new Date(yearPart, parseInt(parts[1]) - 1, parseInt(parts[0]));
      }
    }
  }
  return null;
};

// --- STEP 4: PREVIEW & VALIDATION ---
const validateAndPreview = () => {
  const results = [];
  const summary = {
    valid: 0,
    ignoredEmpty: 0,
    invalidDate: 0,
    noAmount: 0,
    noPerson: 0,
    multipleImpacts: 0,
    totalToImport: 0,
    newMonths: new Set()
  };

  rawData.value.forEach(row => {
    const desc = row[mapping.value.description];
    const dateRaw = row[mapping.value.date];
    const monthRaw = row[mapping.value.month];
    
    // Si descripción está vacía, ignorar
    if (!desc || String(desc).trim() === '') {
      summary.ignoredEmpty++;
      return;
    }

    // Procesar fecha robustamente
    let dateObj = parseExcelDate(dateRaw);
    
    // Resolución de Período (Regla: Prioridad Fecha > Columna Mes)
    let year, month;
    if (dateObj) {
      year = dateObj.getFullYear();
      month = dateObj.getMonth() + 1;
    } else if (mapping.value.month) {
      // Fallback a columna mes si no hay fecha válida
      month = parseSpanishMonth(monthRaw);
      year = new Date().getFullYear(); // Fallback de año si no hay
      if (!month) {
        summary.invalidDate++;
        return;
      }
      // Si no había fecha pero sí hay mes, creamos una fecha base para el registro (día 1)
      dateObj = new Date(year, month - 1, 1);
    } else {
      summary.invalidDate++;
      return;
    }

    // Generar string de periodo formateado para la previsualización (MM/YYYY)
    const periodStr = `${String(month).padStart(2, '0')}/${year}`;

    // Procesar Personas y Montos (Split logic)
    const subMovements = [];
    if (mapping.value.personType === 'single') {
      const personName = row[mapping.value.person];
      const amountRaw = row[mapping.value.amount];
      let amount = parseFloat(amountRaw);

      if (isNaN(amount)) {
        summary.noAmount++;
      } else {
        // Lógica de signo
        if (mapping.value.logicType === 'forced-expense') amount = -Math.abs(amount);
        if (mapping.value.logicType === 'forced-income') amount = Math.abs(amount);

        const userId = users.value.find(u => u.name.toLowerCase() === String(personName).trim().toLowerCase())?.id;
        if (!userId) {
          summary.noPerson++;
        } else {
          // Formatear fecha localmente para evitar shift de timezone (YYYY-MM-DD HH:mm:ss)
          const localISO = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} 00:00:00`;
          
          subMovements.push({ 
            amount, 
            description: desc, 
            date: localISO, 
            assigned_to_user_id: userId, 
            month, 
            year,
            periodDisplay: periodStr // Solo para la tabla de previsualización
          });
        }
      }
    } else {
      // Multiple Columns
      let rowHadImpact = 0;
      mapping.value.personColumns.forEach(h => {
        const amountRaw = row[h];
        let amount = parseFloat(amountRaw);
        if (!isNaN(amount) && amount !== 0) {
          // Lógica de signo
          if (mapping.value.logicType === 'forced-expense') amount = -Math.abs(amount);
          if (mapping.value.logicType === 'forced-income') amount = Math.abs(amount);
          
          const userId = users.value.find(u => h.toLowerCase().includes(u.name.toLowerCase()))?.id;
          if (userId) {
            const localISO = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} 00:00:00`;
            subMovements.push({ 
              amount, 
              description: desc, 
              date: localISO, 
              assigned_to_user_id: userId, 
              month, 
              year,
              periodDisplay: periodStr
            });
            rowHadImpact++;
          }
        }
      });
      if (rowHadImpact > 1) summary.multipleImpacts++;
      if (rowHadImpact === 0) summary.noPerson++;
    }

    if (subMovements.length > 0) {
      summary.valid++;
      summary.totalToImport += subMovements.length;
      subMovements.forEach(m => {
        results.push(m);
        // Solo agregar a la lista de "Nuevos" si realmente no existe en la DB
        const exists = existingMonths.value.some(em => em.month === m.month && em.year === m.year);
        if (!exists) {
          summary.newMonths.add(periodStr);
        }
      });
    }
  });

  movements.value = results;
  validationSummary.value = { ...summary, newMonths: Array.from(summary.newMonths) };
  currentStep.value = 4;
};

// --- STEP 5: EXECUTION ---
const finalizeImport = async () => {
  isProcessing.value = true;
  try {
    const res = await api.post('/expenses/bulk', { movements: movements.value });
    importResult.value = res.data.results;
    currentStep.value = 5;
  } catch (err) {
    alert('Error al importar: ' + (err.response?.data?.error || err.message));
  } finally {
    isProcessing.value = false;
  }
};

const reset = () => {
  currentStep.value = 1;
  fileName.value = '';
  rawData.value = [];
  movements.value = [];
  importResult.value = null;
};
</script>

<template>
  <div class="import-view">
    <div class="import-header">
      <h1>Asistente de Importación</h1>
      <p>Convertí tus hojas de cálculo en registros financieros limpios.</p>
    </div>

    <!-- STEPS INDICATOR -->
    <div class="steps-nav">
      <div :class="['step', { active: currentStep >= 1 }]">1. Carga</div>
      <div class="line"></div>
      <div :class="['step', { active: currentStep >= 3 }]">2. Mapeo</div>
      <div class="line"></div>
      <div :class="['step', { active: currentStep >= 4 }]">3. Validación</div>
      <div class="line"></div>
      <div :class="['step', { active: currentStep >= 5 }]">4. Fin</div>
    </div>

    <!-- STEP 1: UPLOAD -->
    <div v-if="currentStep === 1" class="step-container upload-step">
      <div class="upload-box" @click="$refs.fileInput.click()">
        <div class="icon">📊</div>
        <h3>Elegí tu archivo</h3>
        <p>Soportamos .xlsx, .xls y .csv</p>
        <div v-if="fileName" class="selected-file">Seleccionado: <strong>{{ fileName }}</strong></div>
      </div>
      <input type="file" ref="fileInput" hidden @change="handleFileUpload" accept=".xlsx,.xls,.csv" />
    </div>

    <!-- STEP 2: SHEET SELECTOR -->
    <div v-if="currentStep === 2" class="step-container">
      <h3>El archivo tiene varias hojas</h3>
      <p>¿Cuál de estas hojas contiene los movimientos?</p>
      <div class="sheet-grid">
        <button v-for="name in sheetNames" :key="name" @click="selectedSheet = name; processSheet()" class="sheet-btn">
          {{ name }}
        </button>
      </div>
    </div>

    <!-- STEP 3: MAPPING -->
    <div v-if="currentStep === 3" class="step-container">
      <h3>Configura las columnas</h3>
      <p>Indicale al sistema qué significa cada columna de tu Excel.</p>
      
      <div class="mapping-grid">
        <div class="form-group">
          <label>¿Cuál es la Descripción? (p.ej: Compra Super)</label>
          <select v-model="mapping.description">
            <option value="">-- No mapear --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>¿Cuál es la Fecha?</label>
          <select v-model="mapping.date">
            <option value="">-- No mapear --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>¿Cuál es el Mes? (opcional)</label>
          <select v-model="mapping.month">
            <option value="">-- Tomar de la Fecha --</option>
            <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
          </select>
        </div>

        <div class="form-divider"></div>

        <div class="form-group">
          <label>Esquema de Personas</label>
          <div class="radio-group">
            <label><input type="radio" v-model="mapping.personType" value="single" /> Columna única (ej: "Persona")</label>
            <label><input type="radio" v-model="mapping.personType" value="multiple" /> Columnas múltiples (ej: una por persona)</label>
          </div>
        </div>

        <div v-if="mapping.personType === 'single'" class="form-group animate-in">
          <label>Columna de Persona y Monto</label>
          <div class="double-select">
            <select v-model="mapping.person">
              <option value="">-- Columna Nombre --</option>
              <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
            </select>
            <select v-model="mapping.amount">
              <option value="">-- Columna Monto --</option>
              <option v-for="h in headers" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
        </div>

        <div v-else class="form-group animate-in">
          <label>Seleccioná las columnas correspondientes a cada persona:</label>
          <div class="checkbox-grid">
            <label v-for="h in headers" :key="h" class="check-box">
              <input type="checkbox" :value="h" v-model="mapping.personColumns" /> {{ h }}
            </label>
          </div>
        </div>
        <div class="form-group">
          <label>Criterio de Signos (Ingresos/Gastos)</label>
          <select v-model="mapping.logicType">
            <option value="auto">Automático (Negativos son gastos, Positivos ingresos)</option>
            <option value="forced-expense">Forzar como GASTOS (todo se importa negativo)</option>
            <option value="forced-income">Forzar como INGRESOS (todo se importa positivo)</option>
          </select>
          <p class="help-text">Útil si tu Excel tiene montos positivos pero son gastos.</p>
        </div>

      </div>

      <div class="actions">
        <button @click="currentStep = 1" class="btn-outline">Atrás</button>
        <button @click="validateAndPreview" class="btn-primary" :disabled="!mapping.description || !mapping.date">Validar Datos</button>
      </div>
    </div>

    <!-- STEP 4: PREVIEW & VALIDATION -->
    <div v-if="currentStep === 4" class="step-container">
      <h3>Resumen de Validación</h3>
      <div class="summary-stats detailed">
        <div class="stat-card valid">
          <span class="val">{{ validationSummary.valid }}</span>
          <span class="lab">Filas Válidas</span>
        </div>
        <div class="stat-card muted" v-if="validationSummary.ignoredEmpty > 0">
          <span class="val">{{ validationSummary.ignoredEmpty }}</span>
          <span class="lab">Vacías/Ignoradas</span>
        </div>
        <div class="stat-card err" v-if="validationSummary.invalidDate > 0">
          <span class="val">{{ validationSummary.invalidDate }}</span>
          <span class="lab">Fecha Inválida</span>
        </div>
        <div class="stat-card err" v-if="validationSummary.noAmount > 0">
          <span class="val">{{ validationSummary.noAmount }}</span>
          <span class="lab">Sin Monto</span>
        </div>
        <div class="stat-card err" v-if="validationSummary.noPerson > 0">
          <span class="val">{{ validationSummary.noPerson }}</span>
          <span class="lab">Persona Desconocida</span>
        </div>
        <div class="stat-card warn" v-if="validationSummary.multipleImpacts > 0">
          <span class="val">{{ validationSummary.multipleImpacts }}</span>
          <span class="lab">Filas con Split</span>
        </div>
        <div class="stat-card total">
          <span class="val">{{ validationSummary.totalToImport }}</span>
          <span class="lab">Registros Finales</span>
        </div>
      </div>

      <div v-if="validationSummary.newMonths.length" class="new-months-alert">
        <span class="icon">🗓️</span>
        <div>
          <strong>Se abrirán nuevos períodos:</strong>
          <p>{{ validationSummary.newMonths.join(', ') }}</p>
        </div>
      </div>

      <div class="preview-scroll">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Periodo</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Para</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in movements.slice(0, 50)" :key="idx">
              <td>{{ m.date.split(' ')[0].split('-').reverse().join('/') }}</td>
              <td>{{ m.periodDisplay }}</td>
              <td>{{ m.description }}</td>
              <td class="text-amount">${{ m.amount.toFixed(2) }}</td>
              <td>{{ users.find(u => u.id === m.assigned_to_user_id)?.name }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="movements.length > 50" class="muted-text">...y {{ movements.length - 50 }} registros más.</p>
      </div>

      <div class="actions">
        <button @click="currentStep = 3" class="btn-outline">Ajustar Mapeo</button>
        <button @click="finalizeImport" class="btn-primary" :disabled="isProcessing || movements.length === 0">
          {{ isProcessing ? 'Importando...' : 'Confirmar Importación' }}
        </button>
      </div>
    </div>

    <!-- STEP 5: RESULT -->
    <div v-if="currentStep === 5" class="step-container result-step">
      <div class="success-icon">✅</div>
      <h2>¡Importación Exitosa!</h2>
      <div class="result-box">
        <p>Se procesaron <strong>{{ importResult.total }}</strong> movimientos.</p>
        <p>Éxito: <span class="text-success">{{ importResult.success }}</span></p>
        <p>Fallidos: <span class="text-danger">{{ importResult.failed }}</span></p>
        <p>Meses abiertos: <strong>{{ importResult.monthsCreated }}</strong></p>
      </div>
      <div class="actions centered">
        <button @click="reset" class="btn-outline">Importar otro</button>
        <button @click="router.push('/')" class="btn-primary">Ir al Dashboard</button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.import-view { max-width: 900px; margin: 0 auto; padding: 1rem; }
.import-header { margin-bottom: 2rem; }
.import-header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #FFF; }
.import-header p { color: #A0A5AA; }

/* NAV */
.steps-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3rem; }
.step { font-size: 0.9rem; font-weight: 600; color: #444; transition: 0.3s; }
.step.active { color: #00FF66; }
.line { flex: 1; height: 1px; background: #333; margin: 0 1rem; }

.step-container { background: #1A1C1D; border: 1px solid #333; border-radius: 12px; padding: 2rem; }
.step-container h3 { color: #FFF; margin-bottom: 1rem; }

/* UPLOAD */
.upload-box { border: 2px dashed #333; border-radius: 12px; padding: 4rem 2rem; text-align: center; cursor: pointer; transition: 0.2s; }
.upload-box:hover { border-color: #00FF66; background: rgba(0,255,102,0.02); }
.upload-box .icon { font-size: 3rem; margin-bottom: 1rem; }
.selected-file { margin-top: 1.5rem; color: #00FF66; font-size: 0.9rem; }

/* SHEETS */
.sheet-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
.sheet-btn { background: #111; border: 1px solid #333; color: #FFF; padding: 1rem; border-radius: 8px; cursor: pointer; }
.sheet-btn:hover { border-color: #00FF66; }

/* MAPPING */
.mapping-grid { display: flex; flex-direction: column; gap: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.6rem; color: #A0A5AA; font-size: 0.9rem; }
.form-group select { width: 100%; padding: 0.8rem; background: #111; border: 1px solid #333; color: #FFF; border-radius: 8px; font-size: 1rem; }
.radio-group { display: flex; gap: 2rem; margin-top: 0.5rem; }
.radio-group label { color: #FFF; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.double-select { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.75rem; background: #111; padding: 1rem; border-radius: 8px; }
.check-box { font-size: 0.85rem; color: #FFF; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
.form-divider { height: 1px; background: #333; margin: 0.5rem 0; }
.animate-in { animation: fadeIn 0.3s ease-out; }

/* PREVIEW */
.summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { border: 1px solid #333; padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; align-items: center; }
.stat-card .val { font-size: 1.5rem; font-weight: 800; color: #FFF; }
.stat-card .lab { font-size: 0.75rem; color: #7E8286; text-transform: uppercase; margin-top: 0.25rem; }
.stat-card.valid { border-color: #00FF66; }
.stat-card.warn { border-color: #FFB020; }
.stat-card.err { border-color: #FF4A4A; }

.new-months-alert { background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.2); padding: 1rem; border-radius: 8px; display: flex; gap: 1rem; margin-bottom: 2rem; color: #00E5FF; align-items: center; }
.preview-scroll { max-height: 350px; overflow-y: auto; border: 1px solid #222; border-radius: 8px; }
.preview-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
.preview-table th { position: sticky; top: 0; background: #111; padding: 0.75rem 1rem; color: #7E8286; }
.preview-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #222; color: #A0A5AA; }
.text-amount { color: #FFF; font-weight: 600; }

/* RESULTS */
.result-step { text-align: center; padding: 3rem 1rem; }
.success-icon { font-size: 4rem; margin-bottom: 1rem; }
.result-box { background: #111; padding: 1.5rem; border-radius: 12px; margin: 2rem auto; max-width: 300px; text-align: left; }
.result-box p { margin: 0.5rem 0; font-size: 1rem; }
.text-success { color: #00FF66; }
.text-danger { color: #FF4A4A; }

/* ACTIONS */
.actions { display: flex; justify-content: space-between; margin-top: 2.5rem; }
.actions.centered { justify-content: center; gap: 2rem; }
.btn-primary { background: #00FF66; color: #000; border: none; padding: 1rem 2rem; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.2s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,255,102,0.3); }
.btn-primary:disabled { background: #333; color: #666; cursor: not-allowed; }
.btn-outline { background: transparent; color: #FFF; border: 1px solid #444; padding: 1rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-outline:hover { border-color: #FFF; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
