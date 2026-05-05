import { IsBoolean } from 'class-validator';

export class ToggleSwimlaneCollapsedDto {
  @IsBoolean()
  collapsed!: boolean;
}
