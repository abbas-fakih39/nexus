import { create } from 'zustand';
import { TOKEN_KEY } from '../api/axios';

export type Role = 'owner' | 'employee';

/** Utilisateur connecté, tel que renvoyé par `GET /auth/me` (sans le mot de passe). */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  /** Enregistre le JWT après un login réussi (token seul renvoyé par le backend). */
  setToken: (token: string) => void;
  /** Renseigne le profil après l'appel `GET /auth/me`. */
  setUser: (user: User) => void;
  /** Déconnexion : purge le token (localStorage + state) et l'utilisateur. */
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Au démarrage, on restaure le token depuis le localStorage. `user` reste null
  // tant que /auth/me n'a pas répondu (la restauration du profil se fait au boot).
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),

  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
