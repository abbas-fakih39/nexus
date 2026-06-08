import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  InvoiceType,
  MovementType,
  Prisma,
  PurchaseStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { nextInvoiceNumber } from '../invoices/invoice-number';

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
        prevStock: number;
        prevCost: number;
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
          prevStock: product.stock,
          prevCost: Number(product.costPrice),
        });
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          notes: dto.notes,
          totalAmount: round2(totalAmount),
          createdById: userId,
          items: {
            create: itemsData.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              unitCost: it.unitCost,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Facture d'achat : à régler au fournisseur → statut « en attente » par défaut.
      const invoice = await tx.invoice.create({
        data: {
          number: await nextInvoiceNumber(tx, InvoiceType.purchase),
          type: InvoiceType.purchase,
          status: InvoiceStatus.pending,
          purchaseId: purchase.id,
        },
        select: { id: true, number: true },
      });

      for (const it of itemsData) {
        // CMUP (coût moyen unitaire pondéré) : on recalcule le coût courant.
        // Stock nul/négatif → on repart du coût de cet achat.
        const newStock = it.prevStock + it.quantity;
        const newCost =
          it.prevStock <= 0
            ? it.unitCost
            : round2(
                (it.prevStock * it.prevCost + it.quantity * it.unitCost) /
                  newStock,
              );
        await tx.product.update({
          where: { id: it.productId },
          data: {
            stock: { increment: it.quantity },
            costPrice: newCost,
          },
        });
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            type: MovementType.in,
            quantity: it.quantity,
            reason: 'Achat',
            sourceId: purchase.id,
          },
        });
      }

      return { ...purchase, invoice };
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
        invoice: { select: { id: true, number: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Achat introuvable');
    return purchase;
  }

  /**
   * Annule un achat (owner) : retire du stock la marchandise reçue + mouvements `out`.
   * Refuse si la marchandise a déjà été (partiellement) revendue — le stock passerait sous 0.
   * Note : le CMUP (costPrice) n'est PAS recalculé à l'annulation — l'inverser proprement
   * supposerait de rejouer tout l'historique. Simplification assumée (correction en avant).
   */
  async cancel(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
    if (!purchase) throw new NotFoundException('Achat introuvable');
    if (purchase.status === PurchaseStatus.cancelled) {
      throw new BadRequestException('Cet achat est déjà annulé');
    }

    // Garde anti-stock-négatif : on ne peut pas retirer plus que le stock courant.
    for (const item of purchase.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Annulation impossible : « ${item.product.name} » n'a que ${item.product.stock} en stock ` +
            `(marchandise déjà vendue), ${item.quantity} à retirer`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: MovementType.out,
            quantity: item.quantity,
            reason: 'Annulation achat',
            sourceId: purchase.id,
          },
        });
      }
      // La facture liée suit le sort de l'achat.
      await tx.invoice.updateMany({
        where: { purchaseId: id },
        data: { status: InvoiceStatus.cancelled },
      });
      return tx.purchase.update({
        where: { id },
        data: { status: PurchaseStatus.cancelled },
        include: { items: true },
      });
    });
  }
}
