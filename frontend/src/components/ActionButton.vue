<script setup>
defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  type: { type: String, default: 'secondary' }, // 'primary' or 'secondary'
  disabled: { type: Boolean, default: false }
});

defineEmits(['click']);
</script>

<template>
  <button 
    @click="$emit('click')" 
    :class="['action-btn', type]"
    :disabled="disabled"
  >
    <span v-if="icon" class="btn-icon">{{ icon }}</span>
    <span class="btn-label">{{ label }}</span>
  </button>
</template>

<style scoped>
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 42px; /* Altura unificada */
  border: 1px solid transparent;
  white-space: nowrap;
}

/* Estilo Secundario (Default) */
.secondary {
  background: #111;
  color: #A0A5AA;
  border-color: #333;
}

.secondary:hover:not(:disabled) {
  background: #222;
  border-color: #555;
  color: #FFF;
}

/* Estilo Primario */
.primary {
  background: #00FF66;
  color: #000;
  border-color: #00FF66;
}

.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 255, 102, 0.3);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(1);
}

.btn-icon {
  font-size: 1.1rem;
}

@media (max-width: 600px) {
  .btn-label {
    display: none; /* En móviles muy pequeños podrías querer ocultar el texto, 
                     pero el usuario pidió consistencia. 
                     Dejemos el texto pero con padding reducido si hace falta. */
  }
  .action-btn {
    padding: 0.6rem 0.8rem;
  }
  .btn-label {
    display: inline;
  }
}
</style>
