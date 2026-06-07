import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class PurchasesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée un achat : Purchase + PurchaseItems + incrément du stock + mouvements `in`,
   * et met à jour le costPrice de chaque produit (dernière valeur d'achat). En transaction.
   */
  async create(userId: string, dto: CreatePurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException('Fournisseur introuvable');
      }

      let totalAmount = 0;
      const itemsData: {
        productId: string;
        quantity: number;
        unitCost: number;
      }[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new BadRequestException(
            `Produit introuvable (${item.productId})`,
          );
        }
        const unitCost = round2(item.unitCost);
        totalAmount += unitCost * item.quantity;
        itemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitCost,
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          notes: dto.notes,
          totalAmount: round2(totalAmount),
          createdById: userId,
          items: { create: itemsData },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of itemsData) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            // Le dernier coût d'achat devient le coût courant du produit.
            costPrice: item.unitCost,
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.in,
            quantity: item.quantity,
            reason: 'Achat',
            sourceId: purchase.id,
          },
        });
      }

      return purchase;
    });
  }

  findAll(params: { from?: string; to?: string }) {
    const where: Prisma.PurchaseWhereInput = {};
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    return this.prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        supplier: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Achat introuvable');
    return purchase;
  }
}
