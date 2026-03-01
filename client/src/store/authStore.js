import { create } from 'zustand';
import { authApi } from '../api/auth';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,

  login(user, token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token });
  },

  async logout() {
    try {
      // Invalidate the token server-side (increments tokenVersion)
      await authApi.logout();
    } catch {
      // Ignore errors — still clear local state
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null });
  },

  updateUser(user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user });
  },

  hydrate() {
    try {
      const token = localStorage.getItem('auth_token');
      const user = JSON.parse(localStorage.getItem('auth_user'));
      if (token && user) set({ user, token });
    } catch {
      // Ignore corrupt localStorage
    }
  },
}));
