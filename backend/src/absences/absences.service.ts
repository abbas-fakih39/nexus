import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AbsenceStatus, AbsenceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';

const ABSENCE_INCLUDE = {
  employee: {
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  },
} satisfies Prisma.AbsenceInclude;

/** Nombre de jours ouvrés (lun–ven) entre deux dates incluses. */
function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (d <= last) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

interface CurrentUser {
  id: string;
  role: string;
}

@Injectable()
export class AbsencesService {
  constructor(private prisma: PrismaService) {}

  findAll(filters: { employeeId?: string; status?: string; type?: string }) {
    const where: Prisma.AbsenceWhereInput = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (
      filters.status &&
      (Object.values(AbsenceStatus) as string[]).includes(filters.status)
    ) {
      where.status = filters.status as AbsenceStatus;
    }
    if (
      filters.type &&
      (Object.values(AbsenceType) as string[]).includes(filters.type)
    ) {
      where.type = filters.type as AbsenceType;
    }
    return this.prisma.absence.findMany({
      where,
      orderBy: [{ startDate: 'desc' }],
      include: ABSENCE_INCLUDE,
    });
  }

  async create(dto: CreateAbsenceDto, user: CurrentUser) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start)
      throw new BadRequestException(
        'La date de fin doit être après la date de début',
      );

    // L'employé concerné et le statut dépendent du rôle.
    let employeeId: string;
    let status: AbsenceStatus;
    let decidedAt: Date | null;

    if (user.role === 'owner') {
      if (!dto.employeeId)
        throw new BadRequestException('Sélectionnez un employé');
      const emp = await this.prisma.employee.findUnique({
        where: { id: dto.employeeId },
        select: { id: true },
      });
      if (!emp) throw new NotFoundException('Fiche employé introuvable');
      employeeId = emp.id;
      status = AbsenceStatus.approved; // saisie directe par l'owner
      decidedAt = new Date();
    } else {
      const emp = await this.prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!emp)
        throw new BadRequestException(
          "Aucune fiche employé n'est associée à votre compte",
        );
      employeeId = emp.id;
      status = AbsenceStatus.pending; // demande à valider
      decidedAt = null;
    }

    const days = dto.days ?? countWeekdays(start, end);
    if (days <= 0)
      throw new BadRequestException('La période ne contient aucun jour ouvré');

    return this.prisma.absence.create({
      data: {
        type: dto.type,
        startDate: start,
        endDate: end,
        days,
        reason: dto.reason ?? null,
        status,
        decidedAt,
        employeeId,
      },
      include: ABSENCE_INCLUDE,
    });
  }

  async decide(id: string, status: AbsenceStatus) {
    if (
      status !== AbsenceStatus.approved &&
      status !== AbsenceStatus.rejected
    ) {
      throw new BadRequestException('Décision invalide (approved ou rejected)');
    }
    const absence = await this.prisma.absence.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!absence) throw new NotFoundException('Absence introuvable');
    return this.prisma.absence.update({
      where: { id },
      data: { status, decidedAt: new Date() },
      include: ABSENCE_INCLUDE,
    });
  }

  async remove(id: string, user: CurrentUser) {
    const absence = await this.prisma.absence.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        employee: { select: { userId: true } },
      },
    });
    if (!absence) throw new NotFoundException('Absence introuvable');

    // Un employé ne peut annuler que sa propre demande encore en attente.
    if (user.role !== 'owner') {
      if (absence.employee.userId !== user.id)
        throw new ForbiddenException('Action non autorisée');
      if (absence.status !== AbsenceStatus.pending) {
        throw new BadRequestException(
          'Seule une demande en attente peut être annulée',
        );
      }
    }
    await this.prisma.absence.delete({ where: { id } });
    return { ok: true };
  }
}
