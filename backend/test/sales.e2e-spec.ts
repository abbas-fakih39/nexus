import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, resetDb, registerOwner } from './e2e-utils';

describe('Ventes (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;
  let token: string;

  const bearer = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
  });

  beforeEach(async () => {
    await resetDb(app);
    token = await registerOwner(app);
  });

  afterAll(async () => {
    await resetDb(app);
    await app.close();
  });

  async function createProduct(stock: number, price = 100) {
    const cat = await request(http)
      .post('/categories')
      .set(bearer())
      .send({ name: 'Sport' })
      .expect(201);
    const prod = await request(http)
      .post('/products')
      .set(bearer())
      .send({ name: 'Ballon', price, categoryId: cat.body.id, stock })
      .expect(201);
    return prod.body;
  }

  async function getStock(productId: string): Promise<number> {
    const list = await request(http).get('/products').set(bearer()).expect(200);
    return list.body.find((p: { id: string }) => p.id === productId).stock;
  }

  it('crée une vente : décrémente le stock et génère une facture payée', async () => {
    const product = await createProduct(10, 100);

    const sale = await request(http)
      .post('/sales')
      .set(bearer())
      .send({
        paymentMethod: 'card',
        items: [{ productId: product.id, quantity: 3 }],
      })
      .expect(201);

    expect(Number(sale.body.finalAmount)).toBe(300);
    expect(sale.body.invoice?.number).toMatch(/^FV-\d{4}-\d{4}$/);
    expect(await getStock(product.id)).toBe(7);

    // La facture apparaît dans la liste, statut payé.
    const invoices = await request(http)
      .get('/invoices')
      .set(bearer())
      .expect(200);
    expect(invoices.body).toHaveLength(1);
    expect(invoices.body[0].status).toBe('paid');
  });

  it('refuse une vente si le stock est insuffisant (et ne touche pas au stock)', async () => {
    const product = await createProduct(5);
    await request(http)
      .post('/sales')
      .set(bearer())
      .send({
        paymentMethod: 'cash',
        items: [{ productId: product.id, quantity: 999 }],
      })
      .expect(400);
    expect(await getStock(product.id)).toBe(5);
  });

  it('annule une vente : restaure le stock', async () => {
    const product = await createProduct(10);
    const sale = await request(http)
      .post('/sales')
      .set(bearer())
      .send({
        paymentMethod: 'card',
        items: [{ productId: product.id, quantity: 4 }],
      })
      .expect(201);
    expect(await getStock(product.id)).toBe(6);

    await request(http)
      .post(`/sales/${sale.body.id}/cancel`)
      .set(bearer())
      .expect(201);
    expect(await getStock(product.id)).toBe(10);
  });

  it('rejette un article avec un champ inconnu (validation durcie)', async () => {
    const product = await createProduct(10);
    await request(http)
      .post('/sales')
      .set(bearer())
      .send({
        paymentMethod: 'card',
        items: [{ productId: product.id, quantity: 1, evil: 1 }],
      })
      .expect(400);
  });
});
