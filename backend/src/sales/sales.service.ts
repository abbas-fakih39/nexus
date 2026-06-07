import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  /** Crée une vente : Sale + SaleItems + décrément du stock + mouvements, en transaction. */
  async create(userId: string, dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const itemsData: {
        productId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
      }[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (!product) {
          throw new BadRequestException(`Produit introuvable (${item.productId})`);
        }
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour « ${product.name} » : ${product.stock} en stock, ${item.quantity} demandé(s)`,
          );
        }
        // Prix figé depuis la base (jamais depuis le client).
        const unitPrice = Number(product.price);
        const itemDiscount = item.discount ?? 0;
        totalAmount += unitPrice * item.quantity * (1 - itemDiscount / 100);
        itemsData.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: round2(unitPrice),
          discount: itemDiscount,
        });
      }

      const globalDiscount = dto.discount ?? 0;
      const finalAmount = round2(totalAmount * (1 - globalDiscount / 100));

      const sale = await tx.sale.create({
        data: {
          clientName: dto.clientName,
          discount: globalDiscount,
          totalAmount: round2(totalAmount),
          finalAmount,
          paymentMethod: dto.paymentMethod,
          soldById: userId,
          items: { create: itemsData },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.out,
            quantity: item.quantity,
            reason: 'Vente',
            sourceId: sale.id,
          },
        });
      }

      return sale;
    });
  }

  findAll(params: { from?: string; to?: string }) {
    const where: Prisma.SaleWhereInput = {};
    if (params.from || params.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = new Date(params.from);
      if (params.to) where.createdAt.lte = new Date(params.to);
    }
    return this.prisma.sale.findMany({
      where,
      include: {
        soldBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        soldBy: { select: { id: true, name: true } },
      },
    });
    if (!sale) throw new NotFoundException('Vente introuvable');
    return sale;
  }

  /** Annule une vente (owner) : restaure le stock + mouvements d'entrée, en transaction. */
  async cancel(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Vente introuvable');
    if (sale.status === SaleStatus.cancelled) {
      throw new BadRequestException('Cette vente est déjà annulée');
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.in,
            quantity: item.quantity,
            reason: 'Annulation vente',
            sourceId: sale.id,
          },
        });
      }
      return tx.sale.update({
        where: { id },
        data: { status: SaleStatus.cancelled },
        include: { items: true },
      });
    });
  }
}
