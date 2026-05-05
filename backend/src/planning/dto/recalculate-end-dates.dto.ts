import { IsString } from 'class-validator';

export class RecalculateEndDatesDto {
  @IsString()
  endDateMode!: string;
}
