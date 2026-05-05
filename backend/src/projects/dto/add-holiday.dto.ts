import { IsString, IsUUID } from 'class-validator';

export class AddHolidayDto {
  @IsString()
  @IsUUID()
  holidayId!: string;
}
