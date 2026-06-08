import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDb, registerOwner } from './e2e-utils';

describe('Congés / absences (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let ownerToken: string;
  const Y = new Date().getFullYear();

  const owner = () => ({ Authorization: `Bearer ${ownerToken}` });

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDb(app);
    ownerToken = await registerOwner(app);
  });

  afterAll(async () => {
    await resetDb(app);
    await app.close();
  });

  /** Crée un compte employé + sa fiche liée, renvoie son token et l'id de fiche. */
  async function setupEmployee() {
    const acc = await request(http)
      .post('/users')
      .set(owner())
      .send({ name: 'Sofiane Benali', email: 'emp@test.fr', password: 'secret123' })
      .expect(201);
    const fiche = await request(http)
      .post('/employees')
      .set(owner())
      .send({ firstName: 'Sofiane', lastName: 'Benali', jobTitle: 'Caissier', baseSalary: 1700, hiredAt: '2023-01-01', userId: acc.body.id })
      .expect(201);
    const login = await request(http).post('/auth/login').send({ email: 'emp@test.fr', password: 'secret123' }).expect(201);
    return { empToken: login.body.token as string, ficheId: fiche.body.id as string };
  }

  const emp = (t: string) => ({ Authorization: `Bearer ${t}` });

  it('flux complet : demande employé → en attente → validation owner → solde mis à jour', async () => {
    const { empToken } = await setupEmployee();

    const req = await request(http)
      .post('/absences')
      .set(emp(empToken))
      .send({ type: 'paid_leave', startDate: `${Y}-03-02`, endDate: `${Y}-03-06`, days: 5 })
      .expect(201);
    expect(req.body.status).toBe('pending');

    // L'employé voit sa demande en attente dans son solde.
    let me = await request(http).get('/employees/me').set(emp(empToken)).expect(200);
    expect(me.body.leaveBalance.pending).toBe(5);
    expect(me.body.leaveBalance.taken).toBe(0);
    expect(me.body.absences).toHaveLength(1);

    // L'owner voit la demande et l'approuve.
    const list = await request(http).get('/absences').set(owner()).expect(200);
    expect(list.body).toHaveLength(1);
    await request(http).patch(`/absences/${req.body.id}/status`).set(owner()).send({ status: 'approved' }).expect(200);

    // Le solde est mis à jour côté employé.
    me = await request(http).get('/employees/me').set(emp(empToken)).expect(200);
    expect(me.body.leaveBalance.taken).toBe(5);
    expect(me.body.leaveBalance.pending).toBe(0);
    expect(me.body.leaveBalance.remaining).toBe(20); // quota 25 - 5
  });

  it('une absence saisie par l’owner est directement approuvée', async () => {
    const { ficheId } = await setupEmployee();
    const a = await request(http)
      .post('/absences')
      .set(owner())
      .send({ type: 'paid_leave', startDate: `${Y}-04-01`, endDate: `${Y}-04-03`, days: 3, employeeId: ficheId })
      .expect(201);
    expect(a.body.status).toBe('approved');
  });

  it('l’employé peut annuler sa demande en attente', async () => {
    const { empToken } = await setupEmployee();
    const req = await request(http)
      .post('/absences')
      .set(emp(empToken))
      .send({ type: 'unpaid_leave', startDate: `${Y}-05-04`, endDate: `${Y}-05-05`, days: 2 })
      .expect(201);
    await request(http).delete(`/absences/${req.body.id}`).set(emp(empToken)).expect(200);
    const me = await request(http).get('/employees/me').set(emp(empToken)).expect(200);
    expect(me.body.absences).toHaveLength(0);
  });

  it('un employé ne peut pas approuver une absence (403)', async () => {
    const { empToken } = await setupEmployee();
    const req = await request(http)
      .post('/absences')
      .set(emp(empToken))
      .send({ type: 'paid_leave', startDate: `${Y}-06-01`, endDate: `${Y}-06-01`, days: 1 })
      .expect(201);
    await request(http).patch(`/absences/${req.body.id}/status`).set(emp(empToken)).send({ status: 'approved' }).expect(403);
  });
});
