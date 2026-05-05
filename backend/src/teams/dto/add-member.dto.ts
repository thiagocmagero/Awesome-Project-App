import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId!: string;

  @IsBoolean()
  @IsOptional()
  isLead?: boolean;

  @IsString()
  @IsOptional()
  role?: string;
}
