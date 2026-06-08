import { IsBoolean } from 'class-validator';

/** Activation / désactivation d'un compte employé. */
export class SetActiveDto {
  @IsBoolean()
  isActive: boolean;
}
