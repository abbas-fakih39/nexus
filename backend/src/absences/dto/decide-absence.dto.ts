import { IsEnum } from 'class-validator';
import { AbsenceStatus } from '@prisma/client';

export class DecideAbsenceDto {
  /** Décision de l'owner : approved ou rejected. */
  @IsEnum(AbsenceStatus)
  status: AbsenceStatus;
}
