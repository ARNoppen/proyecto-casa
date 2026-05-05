<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');

const handleLogin = async () => {
  const success = await authStore.login(email.value, password.value);
  if (success) {
    router.push('/');
  }
};
</script>

<template>
  <div class="login-box">
    <h2>Bienvenido a Proyecto Casa</h2>

    <div v-if="authStore.error" class="error-banner">
      {{ authStore.error }}
    </div>

    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label>Correo Electrónico</label>
        <input 
          v-model="email" 
          type="email" 
          placeholder="Escribí tu correo" 
          required 
        />
      </div>
      
      <div class="form-group">
        <label>Contraseña</label>
        <input 
          v-model="password" 
          type="password" 
          placeholder="Escribí tu contraseña" 
          required 
        />
      </div>

      <button type="submit" class="btn-primary" :disabled="authStore.loading">
        {{ authStore.loading ? 'Validando...' : 'Acceder al Panel' }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.login-box h2 {
  margin: 0 0 1.5rem 0;
  color: #fff;
}

.error-banner {
  background-color: rgba(255, 74, 74, 0.1);
  color: #FF4A4A;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  border: 1px solid rgba(255, 74, 74, 0.2);
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #A0A5AA;
  font-size: 0.85rem;
}

input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #111111;
  border: 1px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s;
}

input:focus {
  outline: none;
  border-color: #00FF66;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  background-color: #00FF66;
  color: #000;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  margin-top: 1rem;
  transition: background-color 0.2s;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary:disabled {
  background-color: #24272A;
  color: #7E8286;
  cursor: not-allowed;
}
</style>
