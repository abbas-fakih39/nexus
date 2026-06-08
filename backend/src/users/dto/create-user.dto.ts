import { IsEmail, IsString, MinLength } from 'class-validator';

/** Création d'un compte employé par l'Owner (module Paramètres). */
export class CreateUserDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Le nom est requis' })
  name: string;
}
