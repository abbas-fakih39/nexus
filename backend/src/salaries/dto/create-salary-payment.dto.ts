import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateSalaryPaymentDto {
  @IsUUID()
  employeeId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  /** Mois concerné au format AAAA-MM (ex. 2026-06). */
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'Le mois doit être au format AAAA-MM',
  })
  month: string;

  @IsOptional()
  @IsString()
  note?: string;
}
