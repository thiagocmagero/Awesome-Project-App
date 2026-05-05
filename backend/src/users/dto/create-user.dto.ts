import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  /**
   * Palavra-passe inicial. Obrigatória para PLATFORM_ADMIN (validada no service).
   * Para BASIC_USER pode ser omitida — o backend gera uma palavra-passe aleatória.
   * Sem decoradores de validação aqui para evitar conflito com @IsOptional e o pipe do NestJS.
   */
  @IsOptional()
  password?: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @IsUUID()
  userTypeId?: string;

  @IsOptional()
  @IsUUID()
  levelId?: string;
}
