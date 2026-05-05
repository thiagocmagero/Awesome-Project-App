import { IsNumber, Min, Max } from 'class-validator';

export class UpsertMemberHoursDto {
  @IsNumber()
  @Min(0)
  @Max(24)
  hoursPerDay!: number;
}
