import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

// Vistas / Componentes (lazy loading para no saturar bundle inicial)
const LoginView = () => import('../views/LoginView.vue');
const DashboardView = () => import('../views/DashboardView.vue');
const UsersView = () => import('../views/UsersView.vue');
const MonthsView = () => import('../views/MonthsView.vue');
const ExpensesView = () => import('../views/ExpensesView.vue');

const AuthLayout = () => import('../layouts/AuthLayout.vue');
const MainLayout = () => import('../layouts/MainLayout.vue');

const routes = [
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'Login',
        component: LoginView,
        meta: { guestOnly: true }
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: DashboardView
      },
      {
        path: 'users',
        name: 'Users',
        component: UsersView,
        meta: { requiresAdmin: true }
      },
      {
        path: 'months',
        name: 'Months',
        component: MonthsView
      },
      {
        path: 'expenses',
        name: 'Expenses',
        component: ExpensesView
      }
    ]
  },
  {
    // Catcher global para redirigir 404
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guarda de navegación global
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Refrescar perfil en back de fondo, pero no bloquear instantáneamente el F5 a menos que sea falso
  if (authStore.token && !authStore.user) {
    await authStore.checkAuth();
  }

  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin;

  if (to.meta.requiresAuth && !isAuthenticated) {
    // Si la ruta requiere auth y no lo está, echalo al login
    next({ name: 'Login' });
  } else if (to.meta.guestOnly && isAuthenticated) {
    // Si la ruta es solo para invitados y ya entró, llevalo al dashboard
    next({ name: 'Dashboard' });
  } else if (to.meta.requiresAdmin && !isAdmin) {
    // Rutas protegidas exclusivamente para rol admin
    next({ name: 'Dashboard' });
  } else {
    // Adelante
    next();
  }
});

export default router;
