import axios from 'axios';

/** Clé de stockage du JWT dans le localStorage (partagée avec l'authStore). */
export const TOKEN_KEY = 'nexus_token';

/** Instance Axios centrale. Tous les appels API passent par ici. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Injecte le token JWT (s'il existe) dans l'en-tête Authorization de chaque requête.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si le backend répond 401 (token absent/expiré/invalide), on purge la session
// et on renvoie vers /login — sauf si on y est déjà.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
