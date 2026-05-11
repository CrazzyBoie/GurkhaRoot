import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/services/api';
import type { User } from '@/types';
import { useCartStore } from './cartStore';

const CART_STORAGE_KEY = 'cart-storage';

const saveCartForUser = (userId: string) => {
  try {
    const items = useCartStore.getState().items;
    localStorage.setItem(`cart-user-${userId}`, JSON.stringify(items));
  } catch {}
};

const clearCartStorage = () => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch {}
};

const restoreCartForUser = (userId: string) => {
  try {
    clearCartStorage();
    const saved = localStorage.getItem(`cart-user-${userId}`);
    if (!saved) return;
    const items = JSON.parse(saved);
    if (!Array.isArray(items) || items.length === 0) return;
    useCartStore.setState({ items });
  } catch {}
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          const user = response.data.user;
          const token = response.data.token || response.data.accessToken || null;
          
          set({ user, isAuthenticated: true, token });
          restoreCartForUser(user.id);
        } finally {
          set({ isLoading: false });
        }
      },

      loginWithToken: async (token: string) => {
        try {
          const existing = localStorage.getItem('auth-storage');
          const parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 };
          parsed.state = { ...parsed.state, token, isAuthenticated: true };
          localStorage.setItem('auth-storage', JSON.stringify(parsed));
        } catch {}

        set({ isLoading: true, token });
        try {
          const response = await authApi.getMe(token);
          const user = response.data.user;
          try {
            const existing = localStorage.getItem('auth-storage');
            const parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 };
            parsed.state = { ...parsed.state, user, token, isAuthenticated: true };
            localStorage.setItem('auth-storage', JSON.stringify(parsed));
          } catch {}
          set({ user, isAuthenticated: true });
          restoreCartForUser(user.id);
        } catch (err) {
          console.error('[authStore] loginWithToken failed:', err);
          set({ user: null, isAuthenticated: false, token: null });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const user = response.data.user;
          const token = response.data.token || response.data.accessToken || null;
          
          set({ user, isAuthenticated: true, token });
          clearCartStorage();
          useCartStore.getState().clearCart();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { user } = get();
        try {
          await authApi.logout();
        } catch {}
        finally {
          if (user?.id) saveCartForUser(user.id);
          useCartStore.getState().clearCart();
          clearCartStorage();
          set({ user: null, isAuthenticated: false, token: null });
        }
      },

      fetchUser: async () => {
        const { token } = get();

        if (token) {
          set({ isLoading: true });
          try {
            const response = await authApi.getMe(token);
            const user = response.data.user;
            set({ user, isAuthenticated: true });
            restoreCartForUser(user.id);
          } catch {
            set({ user: null, isAuthenticated: false, token: null });
          } finally {
            set({ isLoading: false });
          }
          return;
        }

        set({ isLoading: true });
        try {
          const response = await authApi.getMe();
          const fetchedUser = response.data.user;
          set({ user: fetchedUser, isAuthenticated: true });
          restoreCartForUser(fetchedUser.id);
        } catch {
          set({ user: null, isAuthenticated: false, token: null });
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);