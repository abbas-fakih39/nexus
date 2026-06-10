# Nexus — Application de gestion pour petits commerces

Application web full-stack de gestion de commerce (stock, ventes, achats, factures PDF, employés, RH, dashboard).

Réalisée dans le cadre de la certification **CDA Niveau 6 – TP-01281** à MyDigitalSchool Lille.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + Vite + TailwindCSS v4 + Recharts |
| Backend | NestJS 11 (TypeScript) |
| ORM | Prisma 7 + adaptateur PostgreSQL |
| Base de données | PostgreSQL 16 |
| Auth | JWT + Passport + bcrypt |
| Génération PDF | PDFKit |
| State | Zustand |

---

## Comptes de démo (seed)

| Rôle | Email | Mot de passe |
|---|---|---|
| Owner (gérant) | `owner@nexus.fr` | `admin123` |
| Employé | `employe@nexus.fr` | `emp123` |

---

## Installation locale (sans Docker)

### Prérequis
- Node.js 22+
- PostgreSQL 16+

### Backend

```bash
cd backend
npm install
# Copier et adapter les variables d'environnement
cp .env.example .env   # ou créer manuellement
# Contenu minimal : DATABASE_URL + JWT_SECRET
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

### Frontend

```bash
cd frontend
npm install
# Optionnel : créer frontend/.env.local avec VITE_API_URL=http://localhost:3000
npm run dev
```

L'app est accessible sur `http://localhost:5173`.

---

## Démarrage rapide avec Docker Compose

```bash
docker compose up --build
```

- Frontend : `http://localhost:80`
- Backend API : `http://localhost:3000`
- Base de données : port `5433` (local)

Pour lancer le seed après le premier démarrage :

```bash
docker compose exec backend npx ts-node prisma/seed.ts
```

---

## Déploiement sur Railway

### 1. Créer le projet

1. Aller sur [railway.app](https://railway.app) → **New Project**
2. Ajouter un service **PostgreSQL** → copier la variable `DATABASE_URL` générée

### 2. Déployer le backend

1. **New Service → GitHub Repo** → sélectionner ce repo, dossier `backend/`
2. Variables d'environnement à configurer :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | *(fournie par Railway PostgreSQL)* |
| `JWT_SECRET` | *(chaîne aléatoire longue, ex: `openssl rand -hex 32`)* |
| `CORS_ORIGIN` | URL du frontend Railway (ex: `https://nexus-front.up.railway.app`) |
| `NODE_ENV` | `production` |

3. Railway détecte le `Dockerfile` et lance le build.
4. Après déploiement, exécuter le seed via Railway Shell :
   ```bash
   npx ts-node prisma/seed.ts
   ```

### 3. Déployer le frontend

1. **New Service → GitHub Repo** → même repo, dossier `frontend/`
2. Variables de build à configurer :

| Variable | Valeur |
|---|---|
| `VITE_API_URL` | URL du backend Railway (ex: `https://nexus-api.up.railway.app`) |

3. Railway détecte le `Dockerfile` et sert le build Vite via Nginx.

---

## Variables d'environnement

### Backend (`.env`)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nexus
JWT_SECRET=nexus_jwt_secret_key_changeme
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
PORT=3000
```

### Frontend (`.env.local`, optionnel)

```env
VITE_API_URL=http://localhost:3000
```

---

## Tests

```bash
# Backend — unitaires
cd backend && npm run test

# Backend — e2e (base nexus_test requise)
cd backend && npm run test:e2e

# Frontend — Vitest + RTL
cd frontend && npm run test
```

---

## Structure du projet

```
nexus/
├── backend/          → API NestJS (port 3000)
├── frontend/         → App React/Vite (port 5173 en dev)
├── docker-compose.yml
└── README.md
```
