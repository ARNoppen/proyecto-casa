<script setup>
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="auth-layout">
    <div class="auth-container">
      <div class="auth-branding">
        <h1>Gestión Personal</h1>
        <p>Finanzas Familiares</p>
      </div>
      <div class="auth-card">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0D0D0D;
}

.auth-container {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.auth-branding {
  text-align: center;
  margin-bottom: 2rem;
}

.auth-branding h1 {
  color: #00FF66; /* Esmeralda acento */
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
}

.auth-branding p {
  color: #7E8286;
  margin: 0;
}

.auth-card {
  background-color: #1A1C1D;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5);
}
</style>
