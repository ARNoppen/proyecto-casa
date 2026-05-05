import { defineStore } from 'pinia';
import api from '../api/axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    isAdmin: (state) => state.user?.role === 'admin',
    currentUser: (state) => state.user,
  },
  actions: {
    async login(email, password) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/auth/login', { email, password });
        this.token = response.data.token;
        this.user = response.data.user;
        
        // Persistir sesión localmente
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        return true;
      } catch (err) {
        if (!err.response) {
          this.error = 'No se pudo conectar con el servidor. Intentá de nuevo.';
        } else if (err.response.status === 401) {
          this.error = 'Correo o contraseña incorrectos.';
        } else {
          this.error = err.response?.data?.error || 'Error al iniciar sesión';
        }
        return false;
      } finally {
        this.loading = false;
      }
    },
    
    async checkAuth() {
      // Esta función rehidrata y valida el token con el servidor
      if (!this.token) return false;
      
      try {
        const response = await api.get('/auth/me');
        this.user = response.data;
        localStorage.setItem('user', JSON.stringify(this.user));
        return true;
      } catch (err) {
        this.logout();
        return false;
      }
    },
    
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
