import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, InvoiceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  findAll(params: { type?: InvoiceType; status?: InvoiceStatus }) {
    const where: Prisma.InvoiceWhereInput = {};
    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;

    return this.prisma.invoice.findMany({
      where,
      include: {
        sale: {
          select: {
            id: true,
            clientName: true,
            finalAmount: true,
            soldBy: { select: { name: true } },
          },
        },
        purchase: {
          select: {
            id: true,
            totalAmount: true,
            supplier: { select: { name: true } },
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Détail complet (lignes incluses) — sert aussi à la génération PDF. */
  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        sale: {
          include: {
            items: { include: { product: true } },
            soldBy: { select: { name: true } },
          },
        },
        purchase: {
          include: {
            items: { include: { product: true } },
            supplier: true,
            createdBy: { select: { name: true } },
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  async updateStatus(id: string, status: InvoiceStatus) {
    await this.findOne(id); // 404 si absente
    return this.prisma.invoice.update({
      where: { id },
      data: { status },
    });
  }
}
