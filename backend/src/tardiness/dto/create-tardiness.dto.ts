import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTardinessDto {
  @IsUUID()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsInt()
  @Min(1)
  minutes: number;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
