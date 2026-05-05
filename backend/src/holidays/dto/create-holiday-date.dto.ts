import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateHolidayDateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsDateString()
  date!: string;
}
