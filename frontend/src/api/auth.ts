import api from './axios';
import type { User } from '../store/authStore';

export interface LoginPayload {
  email: string;
  password: string;
}

interface TokenResponse {
  token: string;
}

/** POST /auth/login → renvoie le JWT (le profil se récupère ensuite via getMe). */
export async function login(payload: LoginPayload): Promise<string> {
  const { data } = await api.post<TokenResponse>('/auth/login', payload);
  return data.token;
}

/** GET /auth/me → profil de l'utilisateur connecté (token injecté par l'intercepteur). */
export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}
