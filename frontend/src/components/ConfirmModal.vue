<script setup>
defineProps({
  show: Boolean,
  title: String,
  message: String,
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  type: { type: String, default: 'primary' }, // primary, danger
  isAlert: { type: Boolean, default: false }
});

defineEmits(['confirm', 'cancel']);
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="$emit('cancel')">
      <div class="modal-content confirm-modal" :class="{ 'border-danger': type === 'danger' }">
        <h3 class="modal-title">{{ title }}</h3>
        <p class="modal-message">{{ message }}</p>
        
        <div class="modal-actions">
          <button v-if="!isAlert" class="btn btn-secondary" @click="$emit('cancel')">
            {{ cancelText }}
          </button>
          <button 
            class="btn" 
            :class="type === 'danger' ? 'btn-danger' : 'btn-primary'" 
            @click="$emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-modal {
  max-width: 400px;
  border-top: 4px solid #00FF66;
}

.confirm-modal.border-danger {
  border-top-color: #FF4A4A;
}

.modal-title {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #FFF;
}

.modal-message {
  margin: 0 0 2rem 0;
  color: #A0A5AA;
  line-height: 1.5;
  font-size: 0.95rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
