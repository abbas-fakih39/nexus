import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';

const OVERTIME_INCLUDE = {
  employee: {
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  },
} satisfies Prisma.OvertimeInclude;

@Injectable()
export class OvertimeService {
  constructor(private prisma: PrismaService) {}

  findAll(employeeId?: string) {
    return this.prisma.overtime.findMany({
      where: employeeId ? { employeeId } : undefined,
      orderBy: [{ date: 'desc' }],
      include: OVERTIME_INCLUDE,
    });
  }

  async create(dto: CreateOvertimeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
      select: { id: true },
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');

    return this.prisma.overtime.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        hours: dto.hours,
        note: dto.note ?? null,
      },
      include: OVERTIME_INCLUDE,
    });
  }

  async remove(id: string) {
    const overtime = await this.prisma.overtime.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!overtime)
      throw new NotFoundException('Heures supplémentaires introuvables');
    await this.prisma.overtime.delete({ where: { id } });
    return { ok: true };
  }
}
