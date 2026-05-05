import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateLinkDto {
  @IsInt()
  source!: number;

  @IsInt()
  target!: number;

  /** "0"=FS | "1"=SS | "2"=FF | "3"=SF */
  @IsOptional()
  @IsString()
  type?: string;

  /** Atraso em dias (positivo=delay, negativo=lead) */
  @IsOptional()
  @IsInt()
  lag?: number;
}
