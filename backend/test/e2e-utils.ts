import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Démarre l'app de test : on rejoue la config de main.ts (ValidationPipe durci).
 * Le rate-limiting est neutralisé en env de test via `skipIf` dans AppModule.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  await app.init();
  return app;
}

// Ordre indifférent (CASCADE), on vide tout sauf l'historique des migrations.
const TABLES = [
  'Absence', 'Tardiness', 'Overtime', 'SalaryPayment', 'Invoice',
  'SaleItem', 'Sale', 'PurchaseItem', 'Purchase', 'StockMovement',
  'Product', 'Supplier', 'Category', 'Employee', 'User', 'Settings',
];

/** Vide toutes les tables métier entre les tests. */
export async function resetDb(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

/** Inscrit un owner et renvoie son token (seule inscription publique). */
export async function registerOwner(
  app: INestApplication,
  email = 'owner@test.fr',
  password = 'secret123',
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, name: 'Owner Test' })
    .expect(201);
  return res.body.token as string;
}
