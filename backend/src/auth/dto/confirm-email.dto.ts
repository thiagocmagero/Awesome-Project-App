import { IsString, Length } from 'class-validator';

export class ConfirmEmailDto {
  @IsString()
  @Length(64, 64)
  token!: string;
}
