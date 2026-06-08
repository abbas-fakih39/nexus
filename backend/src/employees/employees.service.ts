import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { computeLeaveBalance } from '../absences/leave-balance';

/** Données renvoyées avec chaque fiche : compte lié, nb paiements, absences (pour le solde). */
const EMPLOYEE_INCLUDE = {
  user: { select: { id: true, email: true, name: true, isActive: true } },
  _count: { select: { payments: true } },
  absences: { select: { type: true, status: true, startDate: true, days: true } },
} satisfies Prisma.EmployeeInclude;

type EmployeeWithInclude = Prisma.EmployeeGetPayload<{ include: typeof EMPLOYEE_INCLUDE }>;

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  /** Remplace les absences brutes par le solde de congés calculé. */
  private decorate({ absences, ...employee }: EmployeeWithInclude) {
    return { ...employee, leaveBalance: computeLeaveBalance(employee.leaveQuota, absences) };
  }

  async findAll() {
    const employees = await this.prisma.employee.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: EMPLOYEE_INCLUDE,
    });
    return employees.map((e) => this.decorate(e));
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: EMPLOYEE_INCLUDE,
    });
    if (!employee) throw new NotFoundException('Fiche employé introuvable');
    return this.decorate(employee);
  }

  /** Fiche de l'utilisateur connecté : salaires, absences, retards, heures sup, solde & compteurs. */
  async findMine(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, email: true, name: true, isActive: true } },
        payments: { orderBy: [{ month: 'desc' }, { paidAt: 'desc' }] },
        absences: { orderBy: [{ startDate: 'desc' }] },
        tardiness: { orderBy: [{ date: 'desc' }] },
        overtimes: { orderBy: [{ date: 'desc' }] },
      },
    });
    if (!employee) {
      throw new NotFoundException("Aucune fiche employé n'est associée à votre compte");
    }

    // Compteurs sur l'année en cours.
    const year = new Date().getFullYear();
    const inYear = (d: Date) => new Date(d).getFullYear() === year;
    const tardThisYear = employee.tardiness.filter((t) => inYear(t.date));
    const counters = {
      tardinessCount: tardThisYear.length,
      tardinessMinutes: tardThisYear.reduce((s, t) => s + t.minutes, 0),
      overtimeHours:
        Math.round(
          employee.overtimes
            .filter((o) => inYear(o.date))
            .reduce((s, o) => s + Number(o.hours), 0) * 100,
        ) / 100,
    };

    return {
      ...employee,
      leaveBalance: computeLeaveBalance(employee.leaveQuota, employee.absences),
      counters,
    };
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
    const employee = await this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        jobTitle: dto.jobTitle,
        baseSalary: dto.baseSalary,
        hiredAt: new Date(dto.hiredAt),
        leaveQuota: dto.leaveQuota ?? undefined,
        userId: dto.userId ?? null,
      },
      include: EMPLOYEE_INCLUDE,
    });
    return this.decorate(employee);
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    if (dto.userId) await this.assertLinkable(dto.userId, id);

    const { hiredAt, ...rest } = dto;
    const employee = await this.prisma.employee.update({
      where: { id },
      // Prisma ignore les valeurs `undefined` ; `userId: null` délie le compte.
      data: { ...rest, ...(hiredAt ? { hiredAt: new Date(hiredAt) } : {}) },
      include: EMPLOYEE_INCLUDE,
    });
    return this.decorate(employee);
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
