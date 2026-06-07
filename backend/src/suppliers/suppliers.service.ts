import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');
    return supplier;
  }

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    const [productCount, purchaseCount] = await Promise.all([
      this.prisma.product.count({ where: { supplierId: id } }),
      this.prisma.purchase.count({ where: { supplierId: id } }),
    ]);
    if (productCount > 0 || purchaseCount > 0) {
      throw new BadRequestException(
        'Impossible de supprimer un fournisseur lié à des produits ou des achats',
      );
    }
    return this.prisma.supplier.delete({ where: { id } });
  }
}
