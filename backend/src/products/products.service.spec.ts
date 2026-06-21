import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { ProductsService } from './products.service';

function makeTx() {
  return {
    product: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn().mockResolvedValue({ id: 'p1' }),
    },
    stockMovement: {
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let tx: ReturnType<typeof makeTx>;
  let prisma: {
    product: { findMany: jest.Mock; findUnique: jest.Mock };
    category: { findUnique: jest.Mock };
    supplier: { findUnique: jest.Mock };
    saleItem: { count: jest.Mock };
    purchaseItem: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    tx = makeTx();
    prisma = {
      product: { findMany: jest.fn(), findUnique: jest.fn() },
      category: { findUnique: jest.fn() },
      supplier: { findUnique: jest.fn() },
      saleItem: { count: jest.fn().mockResolvedValue(0) },
      purchaseItem: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };
    service = new ProductsService(prisma as never);
  });

  describe('findLowStock', () => {
    it('ne garde que les produits au seuil ou en dessous', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: 'a', stock: 2, alertThreshold: 5 }, // sous le seuil → gardé
        { id: 'b', stock: 5, alertThreshold: 5 }, // au seuil → gardé
        { id: 'c', stock: 8, alertThreshold: 5 }, // au-dessus → exclu
      ]);
      const low = await service.findLowStock();
      expect(low.map((p) => p.id)).toEqual(['a', 'b']);
    });
  });

  describe('create', () => {
    const dto = { name: 'Ballon', price: 30, categoryId: 'c1', stock: 5 };

    it('400 si la catégorie est introuvable', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('400 si le SKU est déjà utilisé', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.product.findUnique.mockResolvedValue({ id: 'other' });
      await expect(service.create({ ...dto, sku: 'SKU-1' })).rejects.toThrow(
        'SKU',
      );
    });

    it('crée le produit et un mouvement d’entrée pour le stock initial', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      tx.product.create.mockResolvedValue({ id: 'p1', stock: 5 });
      await service.create(dto);
      expect(tx.product.create).toHaveBeenCalled();
      expect(tx.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: MovementType.in,
            quantity: 5,
            reason: 'Stock initial',
          }),
        }),
      );
    });

    it('ne crée pas de mouvement si le stock initial est nul', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      tx.product.create.mockResolvedValue({ id: 'p1', stock: 0 });
      await service.create({ ...dto, stock: 0 });
      expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('404 si le produit est introuvable', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove('p1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 si le produit est utilisé dans des ventes', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.saleItem.count.mockResolvedValue(2);
      await expect(service.remove('p1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(tx.product.delete).not.toHaveBeenCalled();
    });

    it('supprime le produit et son journal de mouvements quand il est libre', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      await service.remove('p1');
      expect(tx.stockMovement.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
      });
      expect(tx.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });
});
