import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType, PurchaseStatus } from '@prisma/client';
import { PurchasesService } from './purchases.service';

function makeTx() {
  return {
    supplier: { findUnique: jest.fn() },
    product: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    purchase: { create: jest.fn(), update: jest.fn() },
    invoice: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'inv1', number: 'FA-2026-0001' }),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
  };
}

describe('PurchasesService', () => {
  let service: PurchasesService;
  let tx: ReturnType<typeof makeTx>;
  let prisma: { $transaction: jest.Mock; purchase: { findUnique: jest.Mock } };

  beforeEach(() => {
    tx = makeTx();
    prisma = {
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
      purchase: { findUnique: jest.fn() },
    };
    service = new PurchasesService(prisma as never);
  });

  describe('create', () => {
    const dto = {
      supplierId: 's1',
      notes: 'Réassort',
      items: [{ productId: 'p1', quantity: 10, unitCost: 7 }],
    };

    beforeEach(() => {
      tx.supplier.findUnique.mockResolvedValue({ id: 's1' });
      tx.purchase.create.mockResolvedValue({ id: 'pur1', items: [] });
    });

    it('400 si le fournisseur est introuvable', async () => {
      tx.supplier.findUnique.mockResolvedValue(null);
      await expect(service.create('u1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si un produit est introuvable', async () => {
      tx.product.findUnique.mockResolvedValue(null);
      await expect(service.create('u1', dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('incrémente le stock et recalcule le CMUP (10@5 + 10@7 → coût 6)', async () => {
      tx.product.findUnique.mockResolvedValue({
        id: 'p1',
        stock: 10,
        costPrice: 5,
      });
      await service.create('u1', dto);
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { increment: 10 }, costPrice: 6 },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MovementType.in,
            reason: 'Achat',
            sourceId: 'pur1',
          }),
        }),
      );
    });

    it('repart du coût d’achat quand le stock précédent est nul ou négatif', async () => {
      tx.product.findUnique.mockResolvedValue({
        id: 'p1',
        stock: 0,
        costPrice: 0,
      });
      await service.create('u1', dto);
      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { increment: 10 }, costPrice: 7 },
      });
    });

    it('crée une facture d’achat en attente', async () => {
      tx.product.findUnique.mockResolvedValue({
        id: 'p1',
        stock: 10,
        costPrice: 5,
      });
      await service.create('u1', dto);
      expect(tx.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'purchase',
            status: 'pending',
            purchaseId: 'pur1',
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    it('404 si l’achat est introuvable', async () => {
      prisma.purchase.findUnique.mockResolvedValue(null);
      await expect(service.cancel('pur1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 si l’achat est déjà annulé', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'pur1',
        status: PurchaseStatus.cancelled,
        items: [],
      });
      await expect(service.cancel('pur1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuse si la marchandise a déjà été vendue (stock insuffisant)', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'pur1',
        status: PurchaseStatus.received,
        items: [
          {
            productId: 'p1',
            quantity: 10,
            product: { name: 'Ballon', stock: 4 },
          },
        ],
      });
      await expect(service.cancel('pur1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('retire le stock, crée des mouvements de sortie et annule la facture', async () => {
      prisma.purchase.findUnique.mockResolvedValue({
        id: 'pur1',
        status: PurchaseStatus.received,
        items: [
          {
            productId: 'p1',
            quantity: 10,
            product: { name: 'Ballon', stock: 12 },
          },
        ],
      });
      tx.purchase.update.mockResolvedValue({
        id: 'pur1',
        status: PurchaseStatus.cancelled,
        items: [],
      });

      await service.cancel('pur1');

      expect(tx.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { stock: { decrement: 10 } },
      });
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MovementType.out,
            reason: 'Annulation achat',
          }),
        }),
      );
      expect(tx.invoice.updateMany).toHaveBeenCalledWith({
        where: { purchaseId: 'pur1' },
        data: { status: 'cancelled' },
      });
      expect(tx.purchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pur1' },
          data: { status: PurchaseStatus.cancelled },
        }),
      );
    });
  });
});
