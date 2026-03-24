<script setup>
import { ref, watch } from 'vue';
import { RouterView, RouterLink, useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const isSidebarOpen = ref(false);

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

// Cerrar sidebar al cambiar de ruta (importante en móvil)
watch(() => route.path, () => {
  isSidebarOpen.value = false;
});
</script>

<template>
  <div class="main-layout">
    <!-- Capa oscura de fondo para cerrar el menú en móvil -->
    <div 
      v-if="isSidebarOpen" 
      class="sidebar-backdrop" 
      @click="isSidebarOpen = false"
    ></div>

    <aside :class="['sidebar', { 'sidebar-open': isSidebarOpen }]">
      <div class="brand">
        <h2>Gestión Personal<span class="dot">.</span></h2>
      </div>
      <nav class="nav-links">
        <RouterLink to="/" class="nav-item" exact-active-class="active-link">Dashboard</RouterLink>
        <RouterLink to="/months" class="nav-item" active-class="active-link">Meses</RouterLink>
        <RouterLink to="/expenses" class="nav-item" active-class="active-link">Historial Gastos</RouterLink>
        <RouterLink to="/import" class="nav-item" active-class="active-link">Importar Excel</RouterLink>
        <RouterLink v-if="authStore.isAdmin" to="/users" class="nav-item admin-only" active-class="active-link">Usuarios (Admin)</RouterLink>
      </nav>
      
      <div class="user-profile">
        <div class="info">
          <span class="name">{{ authStore.currentUser?.name }}</span>
          <span class="role">{{ authStore.isAdmin ? 'Administrador' : 'Familiar' }}</span>
        </div>
        <button @click="handleLogout" class="logout-btn">Salir</button>
      </div>
    </aside>

    <main class="content">
      <header class="top-header">
        <!-- Botón Hamburguesa (solo visible en móvil) -->
        <button class="menu-toggle" @click="toggleSidebar" aria-label="Abrir menú">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>

        <div class="breadcrumbs">
          <span>Hogar</span> / <span class="active">{{ $route.name }}</span>
        </div>
      </header>
      
      <div class="page-content">
        <!-- Renderiza Dashboard, Users, o lo que venga -->
        <RouterView />
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background-color: #111111;
  position: relative;
  overflow-x: hidden; /* Previene scroll horizontal accidental */
}

/* Sidebar behavior */
.sidebar {
  width: 260px;
  background-color: #1A1C1D;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-right: 1px solid #333;
  transition: transform 0.3s ease;
  z-index: 100;
}

.brand h2 {
  color: #fff;
  margin: 0 0 2rem 0;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.brand .dot {
  color: #00FF66;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.nav-item {
  color: #A0A5AA;
  text-decoration: none;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  transition: all 0.2s;
  font-weight: 500;
}

.nav-item:hover {
  background-color: #24272A;
  color: #FFF;
}

.nav-item.active-link {
  background-color: rgba(0, 255, 102, 0.1);
  color: #00FF66;
}

.admin-only {
  border: 1px dashed #444;
  margin-top: 1rem;
}

.user-profile {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: bold;
  font-size: 0.9rem;
}

.role {
  font-size: 0.75rem;
  color: #7E8286;
}

.logout-btn {
  background: none;
  border: none;
  color: #FF4A4A;
  font-size: 0.85rem;
  padding: 0.5rem;
  border-radius: 6px;
}
.logout-btn:hover {
  background-color: rgba(255, 74, 74, 0.1);
}

/* Content Area */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* Permite que el contenido se encoja correctamente */
}

.top-header {
  height: 60px;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #222;
  gap: 1rem;
}

.menu-toggle {
  display: none; /* Oculto en desktop */
  background: none;
  border: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  cursor: pointer;
}

.hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background-color: #FFF;
  border-radius: 2px;
}

.breadcrumbs {
  color: #7E8286;
  font-size: 0.9rem;
}

.breadcrumbs .active {
  color: #FFF;
  font-weight: 500;
}

.page-content {
  padding: 2rem;
  flex: 1;
  overflow-y: auto;
}

/* RESPONSIVE: Mobile & Tablet */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(-100%);
    box-shadow: 10px 0 30px rgba(0,0,0,0.5);
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    z-index: 90;
  }

  .menu-toggle {
    display: flex;
  }

  .top-header {
    padding: 0 1rem;
  }

  .page-content {
    padding: 1.5rem 1rem;
  }
}
</style>
