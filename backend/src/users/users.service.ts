import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

/** Champs renvoyés au frontend (jamais le hash du mot de passe). */
const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ── Utilisé par AuthService (renvoie le hash, usage interne) ──
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  // ── Gestion des comptes (module Paramètres, Owner) ──

  /** Liste tous les comptes avec leur activité (pour décider de la suppression). */
  listAccounts() {
    return this.prisma.user.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      select: {
        ...SAFE_SELECT,
        _count: { select: { sales: true, purchases: true } },
        employee: { select: { id: true } },
      },
    });
  }

  /** Crée un compte employé (seul rôle créable depuis l'appli). */
  async createEmployeeAccount(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new BadRequestException('Cet email est déjà utilisé');

    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { email: dto.email, password, name: dto.name, role: 'employee' },
      select: SAFE_SELECT,
    });
  }

  /** Active / désactive un compte employé (un compte désactivé ne peut plus se connecter). */
  async setActive(id: string, isActive: boolean, currentUserId: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('Compte introuvable');
    if (id === currentUserId) throw new BadRequestException('Vous ne pouvez pas modifier votre propre compte');
    if (user.role === 'owner') throw new BadRequestException('Impossible de modifier un compte propriétaire');

    return this.prisma.user.update({ where: { id }, data: { isActive }, select: SAFE_SELECT });
  }

  /** Supprime un compte employé sans historique. Sinon, on impose la désactivation. */
  async remove(id: string, currentUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        _count: { select: { sales: true, purchases: true } },
        employee: { select: { id: true } },
      },
    });
    if (!user) throw new NotFoundException('Compte introuvable');
    if (id === currentUserId) throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    if (user.role === 'owner') throw new BadRequestException('Impossible de supprimer un compte propriétaire');
    if (user._count.sales > 0 || user._count.purchases > 0) {
      throw new BadRequestException(
        "Ce compte a un historique de ventes ou d'achats. Désactivez-le plutôt que de le supprimer.",
      );
    }

    // Une fiche employé liée est conservée : on la délie simplement du compte.
    if (user.employee) {
      await this.prisma.employee.update({ where: { id: user.employee.id }, data: { userId: null } });
    }
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
