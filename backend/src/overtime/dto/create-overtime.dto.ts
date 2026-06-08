import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateOvertimeDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  hours: number;

  @IsOptional()
  @IsString()
  note?: string;
}
