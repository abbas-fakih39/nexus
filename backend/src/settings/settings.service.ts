import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Settings est mono-instance : on récupère la ligne, ou on en crée une par défaut. */
  private async ensure() {
    const existing = await this.prisma.settings.findFirst();
    if (existing) return existing;
    return this.prisma.settings.create({ data: { shopName: 'Ma boutique' } });
  }

  get() {
    return this.ensure();
  }

  async update(dto: UpdateSettingsDto) {
    const s = await this.ensure();
    return this.prisma.settings.update({ where: { id: s.id }, data: dto });
  }

  async setLogo(logo: string | null) {
    const s = await this.ensure();
    return this.prisma.settings.update({
      where: { id: s.id },
      data: { logoPath: logo },
    });
  }
}
