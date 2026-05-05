import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApproveMonthDto {
  @IsUUID()
  userPublicId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  @IsInt()
  @Min(2020)
  @Max(2099)
  year!: number;

  @Transform(({ value }) => (typeof value === 'string' ? parseInt(value, 10) : value))
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}
