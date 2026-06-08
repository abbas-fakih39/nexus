import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  jobTitle: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  baseSalary: number;

  @IsDateString()
  hiredAt: string;

  /** Quota annuel de congés payés (jours). Défaut 25 si omis. */
  @IsOptional()
  @IsInt()
  @Min(0)
  leaveQuota?: number;

  /** Lien optionnel vers un compte de connexion (rôle employee, non déjà lié). */
  @IsOptional()
  @IsUUID()
  userId?: string | null;
}
