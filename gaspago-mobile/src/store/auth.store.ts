import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '@/api/client';

const TOKEN_KEY = 'gaspago_token';

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setToken: (token: string) => {
    // Persist to secure storage asynchronously — fire and forget
    SecureStore.setItemAsync(TOKEN_KEY, token).catch(() => {});
    set({ token });
  },

  setUser: (user: User) => {
    set({ user });
  },

  logout: () => {
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
    set({ token: null, user: null });
  },
}));
