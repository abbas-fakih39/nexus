import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType, SaleStatus } from '@prisma/client';
import { SalesService } from './sales.service';

/** Construit un faux client de transaction Prisma avec des jest.fn(). */
function makeTx() {
  return {
    product: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    sale: { create: jest.fn(), update: jest.fn() },
    invoice: { create: jest.fn(), count: jest.fn().mockResolvedValue(0), updateMany: jest.fn().mockResolvedValue({}) },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
  };
}

describe('SalesService', () => {
  let service: SalesService;
  let prisma: {
    $transaction: jest.Mock;
    sale: { findUnique: jest.Mock };
  };
  let tx: ReturnType<typeof makeTx>;

  beforeEach(() => {
    tx = makeTx();
    prisma = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
      sale: { findUnique: jest.fn() },
    };
    service = new SalesService(prisma as never);
  });

  describe('create', () => {
    const P1 = { id: 'p1', name: 'Ballon', price: 100, costPrice: 60, stock: 5 };
    const P2 = { id: 'p2', name: 'Maillot', price: 50, costPrice: 20, stock: 3 };

    const dto = {
      clientName: 'Jean',
      paymentMethod: 'card' as const,
      discount: 10, // remise globale 10 %
      items: [
        { productId: 'p1', quantity: 2, discount: 0 },
        { productId: 'p2', quantity: 1, discount: 50 }, // remise article 50 %
      ],
    };

    beforeEach(() => {
      tx.product.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve(where.id === 'p1' ? P1 : P2),
      );
      tx.sale.create.mockResolvedValue({ id: 'sale1', items: [] });
      tx.invoice.create.mockResolvedValue({ id: 'inv1', number: 'FV-2026-0001' });
    });

    it('calcule les totaux avec remises article + globale', async () => {
      await service.create('user1', dto);
      // 100*2 + 50*1*0.5 = 225 ; final = 225 * 0.9 = 202.5
      expect(tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalAmount: 225, finalAmount: 202.5, soldById: 'user1', discount: 10 }),
        }),
      );
    });

    it('décrémente le stock et crée un mouvement de sortie par article', async () => {
      await service.create('user1', dto);
      expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { decrement: 2 } } });
      expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { stock: { decrement: 1 } } });
      expect(tx.stockMovement.create).toHaveBeenCalledTimes(2);
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: MovementType.out, sourceId: 'sale1' }) }),
      );
    });

    it('crée une facture de vente payée', async () => {
      await service.create('user1', dto);
      expect(tx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: 'sale', status: 'paid', saleId: 'sale1' }) }),
      );
    });

    it('refuse si le stock est insuffisant (et ne crée pas la vente)', async () => {
      tx.product.findUnique.mockResolvedValue({ ...P1, stock: 1 });
      await expect(service.create('user1', { ...dto, items: [{ productId: 'p1', quantity: 2 }] }))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(tx.sale.create).not.toHaveBeenCalled();
    });

    it('refuse si un produit est introuvable', async () => {
      tx.product.findUnique.mockResolvedValue(null);
      await expect(service.create('user1', { ...dto, items: [{ productId: 'x', quantity: 1 }] }))
        .rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('échoue si la vente est introuvable', async () => {
      prisma.sale.findUnique.mockResolvedValue(null);
      await expect(service.cancel('s1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('refuse une vente déjà annulée', async () => {
      prisma.sale.findUnique.mockResolvedValue({ id: 's1', status: SaleStatus.cancelled, items: [] });
      await expect(service.cancel('s1')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('restaure le stock, crée des mouvements d’entrée et annule la facture', async () => {
      prisma.sale.findUnique.mockResolvedValue({
        id: 's1',
        status: SaleStatus.completed,
        items: [{ productId: 'p1', quantity: 2 }],
      });
      tx.sale.update.mockResolvedValue({ id: 's1', status: SaleStatus.cancelled, items: [] });

      await service.cancel('s1');

      expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: 2 } } });
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: MovementType.in, sourceId: 's1' }) }),
      );
      expect(tx.invoice.updateMany).toHaveBeenCalledWith({ where: { saleId: 's1' }, data: { status: 'cancelled' } });
      expect(tx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: { status: SaleStatus.cancelled } }),
      );
    });
  });
});
