import { IsString, MinLength } from 'class-validator';

/** DTO para alteração de password do próprio utilizador. */
export class UpdateMyPasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
