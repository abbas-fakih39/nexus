import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDb, registerOwner } from './e2e-utils';

describe('Auth & RBAC (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDb(app);
  });

  afterAll(async () => {
    await resetDb(app);
    await app.close();
  });

  it('inscrit un owner et renvoie un token', async () => {
    const res = await request(http)
      .post('/auth/register')
      .send({ email: 'o@test.fr', password: 'secret123', name: 'Karim' })
      .expect(201);
    expect(res.body.token).toBeDefined();
  });

  it('refuse une seconde inscription avec le même email', async () => {
    await registerOwner(app, 'o@test.fr');
    await request(http)
      .post('/auth/register')
      .send({ email: 'o@test.fr', password: 'secret123', name: 'X' })
      .expect(400);
  });

  it('login avec un mauvais mot de passe → 401', async () => {
    await registerOwner(app, 'o@test.fr', 'secret123');
    await request(http)
      .post('/auth/login')
      .send({ email: 'o@test.fr', password: 'wrong' })
      .expect(401);
  });

  it('login owner OK puis /auth/me renvoie le profil sans mot de passe', async () => {
    const token = await registerOwner(app, 'o@test.fr');
    const me = await request(http)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(me.body.email).toBe('o@test.fr');
    expect(me.body.role).toBe('owner');
    expect(me.body).not.toHaveProperty('password');
  });

  it('route protégée sans token → 401', async () => {
    await request(http).get('/employees').expect(401);
  });

  it('un employé ne peut pas lister les employés (403) mais voit les produits (200)', async () => {
    const ownerToken = await registerOwner(app, 'o@test.fr');
    await request(http)
      .post('/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Sofiane', email: 'emp@test.fr', password: 'secret123' })
      .expect(201);
    const login = await request(http)
      .post('/auth/login')
      .send({ email: 'emp@test.fr', password: 'secret123' })
      .expect(201);
    const empToken = login.body.token;

    await request(http)
      .get('/employees')
      .set('Authorization', `Bearer ${empToken}`)
      .expect(403);
    await request(http)
      .get('/products')
      .set('Authorization', `Bearer ${empToken}`)
      .expect(200);
  });

  it('un compte désactivé ne peut plus se connecter (401)', async () => {
    const ownerToken = await registerOwner(app, 'o@test.fr');
    const created = await request(http)
      .post('/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Sofiane', email: 'emp@test.fr', password: 'secret123' })
      .expect(201);

    await request(http)
      .patch(`/users/${created.body.id}/active`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isActive: false })
      .expect(200);

    await request(http)
      .post('/auth/login')
      .send({ email: 'emp@test.fr', password: 'secret123' })
      .expect(401);
  });
});
