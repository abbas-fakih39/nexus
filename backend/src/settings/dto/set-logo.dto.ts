import { IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class SetLogoDto {
  /** Image en data URL base64, ou `null` pour retirer le logo. */
  @ValidateIf((o) => o.logo !== null)
  @IsString()
  @Matches(/^data:image\/(png|jpe?g);base64,/, {
    message: 'Format de logo invalide (image PNG ou JPG attendue).',
  })
  @MaxLength(6_000_000, { message: 'Logo trop volumineux (max ~4 Mo).' })
  logo!: string | null;
}
