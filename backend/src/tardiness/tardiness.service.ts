import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTardinessDto } from './dto/create-tardiness.dto';

const TARDINESS_INCLUDE = {
  employee: {
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  },
} satisfies Prisma.TardinessInclude;

@Injectable()
export class TardinessService {
  constructor(private prisma: PrismaService) {}

  findAll(employeeId?: string) {
    return this.prisma.tardiness.findMany({
      where: employeeId ? { employeeId } : undefined,
      orderBy: [{ date: 'desc' }],
      include: TARDINESS_INCLUDE,
    });
  }

  async create(dto: CreateTardinessDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');

    return this.prisma.tardiness.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        minutes: dto.minutes,
        justified: dto.justified ?? false,
        note: dto.note ?? null,
      },
      include: TARDINESS_INCLUDE,
    });
  }

  async remove(id: string) {
    const tardiness = await this.prisma.tardiness.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tardiness) throw new NotFoundException('Retard introuvable');
    await this.prisma.tardiness.delete({ where: { id } });
    return { ok: true };
  }
}
