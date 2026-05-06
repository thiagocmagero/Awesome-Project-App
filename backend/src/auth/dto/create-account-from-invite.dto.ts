import { IsString, Length, MinLength } from 'class-validator';

export class CreateAccountFromInviteDto {
  @IsString()
  @Length(64, 64)
  token!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
