import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { AbsenceType } from '@prisma/client';

export class CreateAbsenceDto {
  @IsEnum(AbsenceType)
  type: AbsenceType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;

  /** Override du nombre de jours (ex. 0.5 pour une demi-journée). Sinon calculé (jours ouvrés). */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.5)
  days?: number;

  /** Requis pour l'owner ; ignoré pour un employé (sa propre fiche). */
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
