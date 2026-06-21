import api from "./axios";

export interface Settings {
  id: string;
  shopName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  siret: string | null;
  logoPath: string | null;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  shopName?: string;
  address?: string;
  phone?: string;
  email?: string;
  siret?: string;
}

export const getSettings = () =>
  api.get<Settings>("/settings").then((r) => r.data);

export const updateSettings = (data: UpdateSettingsInput) =>
  api.patch<Settings>("/settings", data).then((r) => r.data);

/** Envoie le logo en data URL base64, ou `null` pour le retirer. */
export const setLogo = (logo: string | null) =>
  api.post<Settings>("/settings/logo", { logo }).then((r) => r.data);
