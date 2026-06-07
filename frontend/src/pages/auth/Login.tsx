import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login, getMe } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { homeForRole } from '../../router/RoleRoute';

export default function Login() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Déjà connecté → on quitte la page de login.
  if (token && user) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const jwt = await login({ email, password });
      setToken(jwt);
      const profile = await getMe();
      setUser(profile);
      navigate(homeForRole(profile.role), { replace: true });
    } catch {
      setError('Identifiants invalides. Vérifiez votre e-mail et votre mot de passe.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ============ GAUCHE · FORMULAIRE ============ */}
      <main className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="mb-9 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent shadow-sm">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4.5 17V5L17.5 17V5"
                  stroke="white"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-ink">Nexus</span>
          </div>

          {/* En-tête */}
          <div className="mb-7">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Bienvenue sur Nexus</h1>
            <p className="mt-1.5 text-[15px] text-ink-mute">
              Connectez-vous pour piloter votre commerce.
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            {/* E-mail */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
                Adresse e-mail
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@amrani-sport.fr"
                  className="h-11 w-full rounded-xl border border-border bg-canvas pl-11 pr-3 text-[15px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink-faint hover:border-border-strong focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-[13px] font-semibold text-ink-soft">
                  Mot de passe
                </label>
                <a href="#" className="text-[13px] font-semibold text-accent-deep hover:text-accent-darker hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="10" width="16" height="11" rx="2" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-border bg-canvas pl-11 pr-11 text-[15px] font-medium text-ink outline-none transition placeholder:text-ink-faint hover:border-border-strong focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-faint transition hover:bg-canvas hover:text-ink"
                >
                  {showPassword ? (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 4.22-5.06" />
                      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a19.8 19.8 0 0 1-3.17 4.19" />
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-white shadow-sm transition hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
              ) : (
                <>
                  Se connecter
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Accès démo */}
          <div className="mt-7">
            <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-ink-mute">
              <svg className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Connexion rapide pour démonstration
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => fillDemo('owner@nexus.fr', 'admin123')}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-border-strong hover:bg-canvas"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-softer text-accent-deep">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold text-ink">Démo Gérant</span>
                  <span className="text-[11px] text-ink-faint">Accès complet</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('employe@nexus.fr', 'employe123')}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-border-strong hover:bg-canvas"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-softer text-accent-deep">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-semibold text-ink">Démo Employé</span>
                  <span className="text-[11px] text-ink-faint">Caisse &amp; ventes</span>
                </span>
              </button>
            </div>
          </div>

          {/* Pied */}
          <div className="mt-7 text-[13px] text-ink-mute">
            Pas encore de compte ?{' '}
            <a href="#" className="font-semibold text-accent-deep hover:underline">
              Demander un accès
            </a>
          </div>
        </div>
      </main>

      {/* ============ DROITE · MARQUE ============ */}
      <aside className="hidden flex-col justify-between bg-sidebar p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
              <path d="M4.5 17V5L17.5 17V5" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Nexus</span>
        </div>

        <div className="max-w-md">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            Plateforme de gestion
          </span>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">
            Pilotez votre commerce <span className="text-accent">d'une main de maître.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-white/60">
            Stock, ventes, factures et équipe : tout votre commerce réuni dans un seul espace clair et rapide.
          </p>

          <div className="mt-8 flex flex-col gap-3.5">
            {[
              'Suivi du stock en temps réel',
              'Encaissement & factures en un clic',
              "Gestion d'équipe et des accès",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3 text-[15px] text-white/85">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {point}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-white/40">
          <span>© 2026 Nexus</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono">v1.0.0</span>
        </div>
      </aside>
    </div>
  );
}
