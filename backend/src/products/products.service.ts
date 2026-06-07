import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { category: true, supplier: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Produits dont le stock est au niveau ou sous le seuil d'alerte. */
  async findLowStock() {
    const products = await this.prisma.product.findMany({
      include: { category: true, supplier: true },
      orderBy: { stock: 'asc' },
    });
    return products.filter((p) => p.stock <= p.alertThreshold);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true },
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async create(dto: CreateProductDto) {
    await this.ensureCategory(dto.categoryId);
    if (dto.supplierId) await this.ensureSupplier(dto.supplierId);
    if (dto.sku) await this.ensureSkuFree(dto.sku);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: dto });
      // Stock initial → mouvement d'entrée.
      if (product.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: MovementType.in,
            quantity: product.stock,
            reason: 'Stock initial',
          },
        });
      }
      return product;
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.findOne(id);
    if (dto.categoryId) await this.ensureCategory(dto.categoryId);
    if (dto.supplierId) await this.ensureSupplier(dto.supplierId);
    if (dto.sku) await this.ensureSkuFree(dto.sku, id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id }, data: dto });
      // Ajustement manuel du stock → mouvement entrée/sortie selon le delta.
      if (dto.stock !== undefined && dto.stock !== current.stock) {
        const delta = dto.stock - current.stock;
        await tx.stockMovement.create({
          data: {
            productId: id,
            type: delta > 0 ? MovementType.in : MovementType.out,
            quantity: Math.abs(delta),
            reason: 'Ajustement manuel',
          },
        });
      }
      return updated;
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [saleCount, purchaseCount] = await Promise.all([
      this.prisma.saleItem.count({ where: { productId: id } }),
      this.prisma.purchaseItem.count({ where: { productId: id } }),
    ]);
    if (saleCount > 0 || purchaseCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un produit déjà utilisé dans des ventes ou des achats',
      );
    }
    // On retire d'abord les mouvements de stock du produit (son propre journal).
    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { productId: id } });
      return tx.product.delete({ where: { id } });
    });
  }

  private async ensureCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new BadRequestException('Catégorie introuvable');
  }

  private async ensureSupplier(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new BadRequestException('Fournisseur introuvable');
  }

  private async ensureSkuFree(sku: string, exceptId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Ce SKU est déjà utilisé');
    }
  }
}
