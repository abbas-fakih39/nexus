import { useEffect, useRef, useState } from "react";
import {
  updateSettings,
  setLogo,
  type UpdateSettingsInput,
} from "../../api/settings";
import { useSettingsStore } from "../../store/settingsStore";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

function monogram(name: string): string {
  const parts = name
    .replace(/[^a-zA-ZÀ-ÿ ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || "N"
  ).toUpperCase();
}

const EMPTY: UpdateSettingsInput = {
  shopName: "",
  address: "",
  phone: "",
  email: "",
  siret: "",
};

export default function StoreSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);

  const [form, setForm] = useState<UpdateSettingsInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Logo : aperçu local (nouvelle sélection) sinon logo courant.
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        shopName: settings.shopName,
        address: settings.address ?? "",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        siret: settings.siret ?? "",
      });
    }
  }, [settings]);

  const field =
    (key: keyof UpdateSettingsInput) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setMsg(null);
    };

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const updated = await updateSettings(form);
      setSettings(updated);
      setMsg("Informations enregistrées.");
    } catch (err: unknown) {
      const m = (
        err as { response?: { data?: { message?: string | string[] } } }
      )?.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(", ") : (m ?? "Échec de l'enregistrement."),
      );
    } finally {
      setSaving(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      setLogoError("Image PNG ou JPG attendue.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Image trop lourde (max 2 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function saveLogo() {
    if (!logoPreview) return;
    setLogoBusy(true);
    setLogoError(null);
    try {
      const updated = await setLogo(logoPreview);
      setSettings(updated);
      setLogoPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setLogoError("Échec de l'envoi du logo.");
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setLogoError(null);
    try {
      const updated = await setLogo(null);
      setSettings(updated);
      setLogoPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setLogoError("Échec du retrait du logo.");
    } finally {
      setLogoBusy(false);
    }
  }

  const currentLogo = logoPreview ?? settings?.logoPath ?? null;
  const name = form.shopName || settings?.shopName || "Nexus";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Logo */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="text-[15px] font-bold text-ink">Logo</h3>
        <p className="mt-0.5 text-[12px] text-ink-faint">
          Affiché dans la sidebar et sur les factures.
        </p>

        <div className="mt-4 flex flex-col items-center gap-4">
          {currentLogo ? (
            <img
              src={currentLogo}
              alt="Logo"
              className="h-28 w-28 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="grid h-28 w-28 place-items-center rounded-2xl bg-accent text-3xl font-bold text-white">
              {monogram(name)}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={onFile}
            className="hidden"
          />
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={logoBusy}
            >
              Choisir une image
            </Button>
            {logoPreview && (
              <Button size="sm" onClick={saveLogo} loading={logoBusy}>
                Enregistrer le logo
              </Button>
            )}
            {settings?.logoPath && !logoPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeLogo}
                loading={logoBusy}
              >
                Retirer le logo
              </Button>
            )}
          </div>
          {logoError && (
            <p className="text-center text-[12px] font-medium text-danger">
              {logoError}
            </p>
          )}
          <p className="text-center text-[11px] text-ink-faint">
            PNG ou JPG · max 2 Mo
          </p>
        </div>
      </div>

      {/* Informations */}
      <form
        onSubmit={saveInfo}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <h3 className="text-[15px] font-bold text-ink">
          Informations du magasin
        </h3>

        <Input
          label="Nom du magasin"
          value={form.shopName}
          onChange={field("shopName")}
          required
        />
        <Input
          label="Adresse"
          value={form.address}
          onChange={field("address")}
          placeholder="14 rue du Stade, 75011 Paris"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Téléphone"
            value={form.phone}
            onChange={field("phone")}
            placeholder="+33 1 84 80 12 12"
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={field("email")}
            placeholder="contact@maboutique.fr"
          />
        </div>
        <Input
          label="SIRET"
          value={form.siret}
          onChange={field("siret")}
          placeholder="894 217 330 00018"
        />

        {error && (
          <p className="text-[13px] font-medium text-danger">{error}</p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            Enregistrer
          </Button>
          {msg && (
            <span className="text-[13px] font-medium text-accent-deep">
              {msg}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
