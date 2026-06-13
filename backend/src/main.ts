import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // Garde-fou : sans secret JWT, les tokens ne sont pas fiables → on refuse de démarrer.
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET manquant : définissez-le dans le fichier .env avant de démarrer.',
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // En-têtes de sécurité HTTP (X-Content-Type-Options, X-Frame-Options, HSTS…).
  app.use(helmet());

  // Logo de boutique transmis en base64 → on relève la limite du body JSON.
  app.useBodyParser('json', { limit: '6mb' });

  // whitelist : retire les champs non déclarés ; forbidNonWhitelisted : rejette la requête s'il y en a.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // CORS restreint au(x) front(s) autorisé(s). Configurable via CORS_ORIGIN (séparés par des virgules).
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
