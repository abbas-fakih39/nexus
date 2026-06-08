// Exécuté avant chaque fichier e2e (jest setupFiles) : charge .env puis bascule
// la connexion sur la base de test dédiée nexus_test (jamais la base de dev).
import { config } from 'dotenv';

config({ quiet: true });

const url = new URL(process.env.DATABASE_URL as string);
url.pathname = '/nexus_test';
process.env.DATABASE_URL = url.toString();
