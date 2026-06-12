import { create } from 'zustand';
import type { User, AuthResponse } from '@/types';
import api from '@/api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      localStorage.setItem('flowforge_token', data.token);
      localStorage.setItem('flowforge_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || '登录失败，请重试';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', { email, username, password });
      localStorage.setItem('flowforge_token', data.token);
      localStorage.setItem('flowforge_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || '注册失败，请重试';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('flowforge_token');
    localStorage.removeItem('flowforge_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  initialize: () => {
    const token = localStorage.getItem('flowforge_token');
    const userStr = localStorage.getItem('flowforge_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('flowforge_token');
        localStorage.removeItem('flowforge_user');
      }
    }
  },

  clearError: () => set({ error: null }),
}));
