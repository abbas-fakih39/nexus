import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

/** Données renvoyées avec chaque fiche : compte lié + nombre de paiements. */
const EMPLOYEE_INCLUDE = {
  user: { select: { id: true, email: true, name: true, isActive: true } },
  _count: { select: { payments: true } },
} satisfies Prisma.EmployeeInclude;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: EMPLOYEE_INCLUDE,
    });
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: EMPLOYEE_INCLUDE,
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');
    return employee;
  }

  /** Fiche de l'utilisateur connecté + historique de ses salaires (lecture seule). */
  async findMine(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true } },
        payments: { orderBy: [{ month: 'desc' }, { paidAt: 'desc' }] },
      },
    });
    if (!employee) {
      throw new NotFoundException("Aucune fiche employé n'est associée à votre compte");
    }
    return employee;
  }

  /** Vérifie qu'un compte peut être rattaché à une fiche (employé, libre). */
  private async assertLinkable(userId: string, exceptEmployeeId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, employee: { select: { id: true } } },
    });
    if (!user) throw new BadRequestException('Compte introuvable');
    if (user.role !== 'employee') {
      throw new BadRequestException('Seul un compte employé peut être lié à une fiche');
    }
    if (user.employee && user.employee.id !== exceptEmployeeId) {
      throw new BadRequestException('Ce compte est déjà lié à une autre fiche');
    }
  }

  async create(dto: CreateEmployeeDto) {
    if (dto.userId) await this.assertLinkable(dto.userId);
    return this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        baseSalary: dto.baseSalary,
        hiredAt: new Date(dto.hiredAt),
        userId: dto.userId ?? null,
      },
      include: EMPLOYEE_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    if (dto.userId) await this.assertLinkable(dto.userId, id);

    const { hiredAt, ...rest } = dto;
    return this.prisma.employee.update({
      where: { id },
      // Prisma ignore les valeurs `undefined` ; `userId: null` délie le compte.
      data: { ...rest, ...(hiredAt ? { hiredAt: new Date(hiredAt) } : {}) },
      include: EMPLOYEE_INCLUDE,
    });
  }

  async remove(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true, _count: { select: { payments: true } } },
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');
    if (employee._count.payments > 0) {
      throw new BadRequestException(
        'Cette fiche a des paiements de salaire enregistrés. Suppression impossible.',
      );
    }
    await this.prisma.employee.delete({ where: { id } });
    return { ok: true };
  }
}
