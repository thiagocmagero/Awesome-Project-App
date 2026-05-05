import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateLocaleDto {
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'code must be BCP 47 format (e.g. en, pt-PT, pt-BR)',
  })
  declare code: string;

  @IsString()
  declare name: string;

  @IsOptional()
  @IsString()
  flag?: string;
}
