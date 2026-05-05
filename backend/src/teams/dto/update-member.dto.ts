import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateMemberDto {
  @IsBoolean()
  @IsOptional()
  isLead?: boolean;

  @IsString()
  @IsOptional()
  role?: string;
}
