import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { TOKEN_KEY } from '../api/axios';

const sampleUser = {
  id: '1',
  email: 'a@b.fr',
  name: 'Karim',
  role: 'owner' as const,
  isActive: true,
  createdAt: '2026-01-01',
};

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it('setToken enregistre le token et marque l’utilisateur authentifié', () => {
    useAuthStore.getState().setToken('jwt-123');
    const s = useAuthStore.getState();
    expect(s.token).toBe('jwt-123');
    expect(s.isAuthenticated).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-123');
  });

  it('logout purge le token, l’utilisateur et le localStorage', () => {
    useAuthStore.getState().setToken('jwt-123');
    useAuthStore.getState().setUser(sampleUser);
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.token).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('setUser renseigne le profil connecté', () => {
    useAuthStore.getState().setUser(sampleUser);
    expect(useAuthStore.getState().user?.name).toBe('Karim');
  });
});
