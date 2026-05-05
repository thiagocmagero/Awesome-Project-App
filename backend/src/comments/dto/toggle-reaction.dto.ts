import { IsString, MinLength } from 'class-validator';

export class ToggleReactionDto {
  @IsString()
  @MinLength(1)
  emoji!: string;
}
